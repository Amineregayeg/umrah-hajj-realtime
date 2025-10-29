import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAuthUtil, AuthenticatedSocket } from '../shared/utils/ws-auth.util';
import { FeatureFlagsService } from '../shared/config/feature-flags.service';
import { AIRealtimeService } from './services/ai-realtime.service';
import { VoiceCommandService, CommandResult } from './services/voice-command.service';
import { RitualStateService } from './services/ritual-state.service';
import { Language } from './services/prompt-builder.service';

/**
 * AI Realtime Gateway
 *
 * WebSocket gateway for OpenAI Realtime API integration.
 * Handles voice streaming and real-time AI interactions.
 *
 * Features:
 * - Feature flag protected (disabled by default)
 * - JWT authentication required
 * - Voice command detection
 * - Ritual state integration
 * - Multi-language support
 *
 * @see https://platform.openai.com/docs/guides/realtime
 */
@WebSocketGateway({
  path: '/ai/realtime',
  transports: ['websocket'],
  cors: true,
})
export class AIRealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(AIRealtimeGateway.name);
  private readonly allowedOrigins: string[] = [];

  // Track active sessions: userId -> OpenAI WebSocket connection
  private activeSessions = new Map<string, WebSocket>();

  // Track user contexts
  private userContexts = new Map<string, { language: Language; sessionId: string }>();

  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly aiRealtimeService: AIRealtimeService,
    private readonly voiceCommandService: VoiceCommandService,
    private readonly ritualStateService: RitualStateService,
  ) {}

  afterInit(server: Server) {
    // Initialize WebSocket auth utility
    WsAuthUtil.initialize(this.configService);

    // Get allowed origins from config
    this.allowedOrigins = this.configService
      .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',');

    this.logger.log('AI Realtime WebSocket Gateway initialized');
    this.logger.log(`Allowed origins: ${this.allowedOrigins.join(', ')}`);
    this.logger.log(
      `Feature enabled: ${this.featureFlagsService.isAIRealtimeEnabled()}`,
    );
  }

  async handleConnection(client: AuthenticatedSocket, request: IncomingMessage) {
    try {
      // Validate origin
      const origin = request.headers.origin;
      if (!this.isOriginAllowed(origin)) {
        this.logger.warn(`Connection rejected: invalid origin ${origin}`);
        client.close();
        return;
      }

      // Authenticate
      const isAuthenticated = await WsAuthUtil.authenticateSocket(client, request);
      if (!isAuthenticated) {
        this.logger.warn('AI Realtime connection: authentication failed');
        client.close();
        return;
      }

      const userId = WsAuthUtil.getUserId(client);

      // Check feature flags
      if (!this.featureFlagsService.isAIRealtimeEnabled()) {
        this.logger.warn('AI Realtime feature is disabled');
        this.sendError(client, 'AI Realtime feature is not available');
        client.close();
        return;
      }

      if (!this.featureFlagsService.isAIEnabledForUser(userId)) {
        this.logger.warn(`AI features not enabled for user ${userId}`);
        this.sendError(client, 'AI features not enabled for your account');
        client.close();
        return;
      }

      if (!this.aiRealtimeService.isAvailableForUser(userId)) {
        this.logger.warn(`AI Realtime not available for user ${userId}`);
        this.sendError(client, 'AI Realtime service is unavailable');
        client.close();
        return;
      }

      this.logger.log(`AI Realtime client connected (user: ${userId})`);

      // Send welcome message
      this.sendMessage(client, {
        type: 'connection_status',
        status: 'connected',
        userId,
        features: {
          voice_commands: true,
          multi_language: true,
          ritual_tracking: true,
        },
      });
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.close();
    }
  }

  async handleDisconnect(client: AuthenticatedSocket) {
    try {
      const userId = WsAuthUtil.getUserId(client);
      if (userId) {
        // Close OpenAI connection if exists
        const openAiWs = this.activeSessions.get(userId);
        if (openAiWs && openAiWs.readyState === WebSocket.OPEN) {
          openAiWs.close();
        }

        this.activeSessions.delete(userId);
        this.userContexts.delete(userId);

        this.logger.log(`AI Realtime client disconnected (user: ${userId})`);
      }
    } catch (error) {
      this.logger.error(`Disconnect error: ${error.message}`);
    }
  }

  /**
   * Create AI session and establish OpenAI connection
   */
  @SubscribeMessage('create_session')
  async handleCreateSession(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { language?: Language; ritualType?: 'umrah' | 'hajj' },
  ) {
    try {
      const userId = WsAuthUtil.getUserId(client);
      const language = data.language || 'en';

      // Get ritual state
      let ritualState = await this.ritualStateService.getRitualState(userId);
      if (!ritualState && data.ritualType) {
        ritualState = await this.ritualStateService.initializeRitual(
          userId,
          data.ritualType,
        );
      }

      // Create OpenAI session
      const session = await this.aiRealtimeService.createSession({
        userId,
        preferredLanguage: language,
        ritualType: ritualState?.ritualType || data.ritualType,
        currentStage: ritualState?.stage,
      });

      // Store user context
      this.userContexts.set(userId, {
        language,
        sessionId: session.sessionId,
      });

      // Establish WebSocket connection to OpenAI
      const openAiWs = new WebSocket(session.websocketUrl, {
        headers: {
          Authorization: `Bearer ${session.ephemeralToken}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      // Handle OpenAI connection open
      openAiWs.on('open', () => {
        this.logger.log(`OpenAI Realtime connection established for user ${userId}`);

        // Forward messages from OpenAI to client
        openAiWs.on('message', (message: Buffer) => {
          this.handleOpenAIMessage(userId, client, message);
        });

        // Handle OpenAI errors
        openAiWs.on('error', (error) => {
          this.logger.error(`OpenAI WebSocket error: ${error.message}`);
          this.sendError(client, 'AI service error');
        });

        // Handle OpenAI close
        openAiWs.on('close', () => {
          this.logger.log(`OpenAI connection closed for user ${userId}`);
          this.activeSessions.delete(userId);
        });
      });

      this.activeSessions.set(userId, openAiWs);

      // Send session info to client
      this.sendMessage(client, {
        type: 'session_created',
        sessionId: session.sessionId,
        voice: session.voice,
        language: session.language,
        expiresAt: session.expiresAt,
      });
    } catch (error) {
      this.logger.error(`Failed to create session: ${error.message}`);
      this.sendError(client, error.message);
    }
  }

  /**
   * Forward audio/messages from client to OpenAI
   */
  @SubscribeMessage('client_message')
  async handleClientMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: any,
  ) {
    try {
      const userId = WsAuthUtil.getUserId(client);
      const openAiWs = this.activeSessions.get(userId);

      if (!openAiWs || openAiWs.readyState !== WebSocket.OPEN) {
        this.sendError(client, 'No active AI session');
        return;
      }

      // Forward message to OpenAI
      openAiWs.send(JSON.stringify(data));
    } catch (error) {
      this.logger.error(`Failed to forward message: ${error.message}`);
      this.sendError(client, 'Failed to send message');
    }
  }

  /**
   * Update ritual state (called when navigation detects progress)
   */
  @SubscribeMessage('update_ritual_state')
  async handleUpdateRitualState(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody()
    data: {
      stage?: string;
      tawafLap?: number;
      saiLap?: number;
    },
  ) {
    try {
      const userId = WsAuthUtil.getUserId(client);

      if (data.stage) {
        await this.ritualStateService.updateStage(userId, data.stage as any);
      }

      if (data.tawafLap !== undefined) {
        await this.ritualStateService.updateTawafProgress(userId, data.tawafLap);
      }

      if (data.saiLap !== undefined) {
        await this.ritualStateService.updateSaiProgress(userId, data.saiLap);
      }

      this.sendMessage(client, {
        type: 'ritual_state_updated',
        success: true,
      });
    } catch (error) {
      this.logger.error(`Failed to update ritual state: ${error.message}`);
      this.sendError(client, 'Failed to update ritual state');
    }
  }

  /**
   * Handle messages from OpenAI
   */
  private async handleOpenAIMessage(
    userId: string,
    client: AuthenticatedSocket,
    message: Buffer,
  ) {
    try {
      const data = JSON.parse(message.toString());

      // Check for voice commands in transcripts
      if (data.type === 'conversation.item.input_audio_transcription.completed') {
        const transcript = data.transcript;
        const context = this.userContexts.get(userId);
        const language = context?.language || 'en';

        // Check if it's a voice command
        const commandResult = await this.voiceCommandService.processVoiceInput(
          transcript,
          language,
        );

        if (commandResult) {
          // Send command action to client
          this.sendMessage(client, {
            type: 'voice_command',
            command: commandResult.command,
            action: commandResult.action,
          });
        }
      }

      // Forward message to client
      this.sendMessage(client, {
        type: 'ai_message',
        data,
      });
    } catch (error) {
      this.logger.error(`Error handling OpenAI message: ${error.message}`);
    }
  }

  /**
   * Send message to client
   */
  private sendMessage(client: WebSocket, message: any): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Send error to client
   */
  private sendError(client: WebSocket, error: string): void {
    this.sendMessage(client, {
      type: 'error',
      error,
    });
  }

  /**
   * Check if origin is allowed
   */
  private isOriginAllowed(origin: string | undefined): boolean {
    if (!origin) return false;

    // In development, allow localhost
    if (this.configService.get('NODE_ENV') === 'development') {
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.includes('192.168.')
      ) {
        return true;
      }
    }

    return this.allowedOrigins.some((allowed) => origin.includes(allowed));
  }
}
