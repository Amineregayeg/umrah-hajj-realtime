import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UseGuards } from '@nestjs/common';
import { Server, WebSocket } from 'ws';
import { RealtimeService } from './realtime.service';
import { RealtimeSessionManager } from './realtime.session';
import type { UnityMessage, BackendMessage, UserContext } from './realtime.types';

/**
 * Realtime Gateway - WebSocket endpoint for Unity clients
 * Endpoint: ws://backend/realtime
 * Protocol: JSON messages with binary audio (base64 PCM16)
 */

@WebSocketGateway({ path: '/realtime', transports: ['websocket'] })
export class RealtimeGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(RealtimeGateway.name);

  // Map Unity WebSocket to session ID
  private readonly clientSessions = new Map<WebSocket, string>();

  constructor(
    private readonly realtimeService: RealtimeService,
    private readonly sessionManager: RealtimeSessionManager,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Realtime WebSocket Gateway initialized on /realtime');
  }

  async handleConnection(client: WebSocket, ...args: any[]) {
    this.logger.log(`Client connected: ${this.getClientId(client)}`);

    // Send connection acknowledgment
    this.sendToClient(client, {
      type: 'connection_ack',
      message: 'Connected to Umrah Realtime Voice Guidance',
      timestamp: Date.now(),
    } as any);
  }

  async handleDisconnect(client: WebSocket) {
    const sessionId = this.clientSessions.get(client);

    if (sessionId) {
      this.logger.log(`Client disconnected: session ${sessionId}`);

      // Close OpenAI connection
      this.realtimeService.closeOpenAIConnection(sessionId);

      // Close session and get metrics
      const metrics = this.sessionManager.closeSession(sessionId);
      if (metrics) {
        this.logger.log(`Session ${sessionId} metrics:`, metrics);
      }

      this.clientSessions.delete(client);
    } else {
      this.logger.log(`Client disconnected without session`);
    }
  }

  /**
   * Handle init message - create session and OpenAI connection
   */
  @SubscribeMessage('init')
  async handleInit(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: UnityMessage,
  ): Promise<void> {
    try {
      const userId = data.userId || `user_${Date.now()}`;

      this.logger.log(`Initializing session for user ${userId}`);

      // Create session
      const session = this.sessionManager.createSession(userId, client);
      this.clientSessions.set(client, session.id);

      // Create OpenAI Realtime connection
      await this.realtimeService.createRealtimeSession(session);

      this.logger.log(
        `Session ${session.id} created and OpenAI connected for user ${userId}`,
      );
    } catch (error) {
      this.logger.error('Init error:', error);
      this.sendToClient(client, {
        type: 'error',
        error: {
          code: 'INIT_FAILED',
          message:
            error instanceof Error ? error.message : 'Failed to initialize session',
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle audio frame from Unity
   */
  @SubscribeMessage('audio')
  async handleAudio(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: UnityMessage,
  ): Promise<void> {
    const sessionId = this.clientSessions.get(client);
    if (!sessionId) {
      this.logger.warn('Audio received but no active session');
      return;
    }

    if (!data.audio) {
      this.logger.warn('Audio message missing audio data');
      return;
    }

    try {
      // Forward audio to OpenAI
      await this.realtimeService.handleAudioFrame(sessionId, data.audio);
    } catch (error) {
      this.logger.error(`Audio handling error for session ${sessionId}:`, error);
      this.sendToClient(client, {
        type: 'error',
        error: {
          code: 'AUDIO_ERROR',
          message: error instanceof Error ? error.message : 'Audio processing failed',
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle context update from Unity (location, ritual step, etc.)
   */
  @SubscribeMessage('context_update')
  async handleContextUpdate(
    @ConnectedSocket() client: WebSocket,
    @MessageBody() data: UnityMessage,
  ): Promise<void> {
    const sessionId = this.clientSessions.get(client);
    if (!sessionId) {
      this.logger.warn('Context update received but no active session');
      return;
    }

    if (!data.context) {
      this.logger.warn('Context update missing context data');
      return;
    }

    try {
      this.logger.debug(`Context update for session ${sessionId}:`, data.context);

      // Update session context and refresh OpenAI instructions
      await this.realtimeService.updateContext(sessionId, data.context);

      // Acknowledge
      this.sendToClient(client, {
        type: 'context_updated',
        timestamp: Date.now(),
      } as any);
    } catch (error) {
      this.logger.error(
        `Context update error for session ${sessionId}:`,
        error,
      );
      this.sendToClient(client, {
        type: 'error',
        error: {
          code: 'CONTEXT_UPDATE_ERROR',
          message:
            error instanceof Error ? error.message : 'Context update failed',
        },
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Handle ping from Unity (keep-alive)
   */
  @SubscribeMessage('ping')
  handlePing(@ConnectedSocket() client: WebSocket): void {
    const sessionId = this.clientSessions.get(client);
    if (sessionId) {
      this.sessionManager.updateActivity(sessionId);
    }

    this.sendToClient(client, {
      type: 'pong',
      timestamp: Date.now(),
    });
  }

  /**
   * Send message to Unity client
   */
  private sendToClient(client: WebSocket, message: BackendMessage): void {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  /**
   * Get client ID for logging
   */
  private getClientId(client: WebSocket): string {
    return this.clientSessions.get(client) || 'unknown';
  }
}
