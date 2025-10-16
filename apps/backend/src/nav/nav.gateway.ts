import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAuthUtil, AuthenticatedSocket } from '../shared/utils/ws-auth.util';
import { WebSocketUtil } from './utils/websocket.util';
import { MessagePackUtil } from '../shared/utils/msgpack.util';
import { NavigationCorrectionService } from './services/navigation-correction.service';
import { MetricsService } from '../metrics/metrics.service';
import {
  NavUpdateSchema,
  NavCorrectionSchema,
  AiPromptSchema,
  UiBannerSchema,
  StateSetSchema,
  WebSocketMessageSchema,
  type NavUpdateType,
  type NavCorrectionType,
  type AiPromptType,
  type UiBannerType,
  type StateSetType,
} from './schemas/websocket.schema';
import type { NavUpdateDto } from './dto/nav-update.dto';
import type { NavCorrectionDto } from './dto/nav-correction.dto';
import type { AiPromptDto } from './dto/ai-prompt.dto';
import type { UiBannerDto } from './dto/ui-banner.dto';
import type { StateSetDto } from './dto/state-set.dto';

@WebSocketGateway({
  transports: ['websocket'],
  cors: true,
})
export class NavGateway implements OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('NavGateway');
  private allowedOrigins: string[] = [];
  private wsOrigin: string;

  private navCorrectionTimers = new Map<string, NodeJS.Timeout>();
  private navCorrectionRateLimiter = new Map<string, number>();

  constructor(
    private readonly configService: ConfigService,
    private readonly navCorrectionService: NavigationCorrectionService,
    private readonly metricsService: MetricsService
  ) {}

  afterInit(server: Server) {
    // Initialize WebSocket auth utility
    WsAuthUtil.initialize(this.configService);
    
    // Initialize WebSocket utility with metrics service
    WebSocketUtil.setMetricsService(this.metricsService);
    
    // Get allowed origins from config
    this.allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000').split(',');
    this.wsOrigin = this.configService.get<string>('WS_ORIGIN', 'http://localhost:3000');
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const msgpackEnabled = MessagePackUtil.isMessagePackEnabled();
    
    this.logger.log(`WebSocket server initialized (sharing HTTP server port)`);
    this.logger.log(`Environment: ${nodeEnv}`);
    this.logger.log(`Required WebSocket origin: ${this.wsOrigin}`);
    this.logger.log(`Allowed WebSocket origins: ${this.allowedOrigins.join(', ')}`);
    this.logger.log(`MessagePack support: ${msgpackEnabled ? 'ENABLED' : 'DISABLED'} (WS_MSGPACK_ENABLED=${process.env.WS_MSGPACK_ENABLED})`);
    this.logger.log('Features enabled: JWT auth, origin enforcement, heartbeat (15s), rate limiting (10Hz client/5Hz server), message queues (≤50), Zod validation');
  }

  async handleConnection(client: AuthenticatedSocket, request: IncomingMessage) {
    try {
      // CRITICAL: Validate origin header against WS_ORIGIN environment variable
      const origin = request.headers.origin;
      if (!this.isOriginAllowed(origin)) {
        this.logger.warn(`WebSocket connection REJECTED: Origin '${origin}' does not match required WS_ORIGIN '${this.wsOrigin}' - SECURITY VIOLATION DETECTED`);
        client.close();
        return;
      }

      // Authenticate the WebSocket connection
      const isAuthenticated = await WsAuthUtil.authenticateSocket(client, request);
      
      if (!isAuthenticated) {
        this.logger.warn(`WebSocket authentication failed for socket`);
        client.close();
        return;
      }

      const userId = WsAuthUtil.getUserId(client);
      this.logger.log(`WebSocket client connected and authenticated (user: ${userId})`);
      
      // Track WebSocket connection metrics
      this.metricsService.incrementActiveConnections();
      
      // Initialize connection with WebSocket utilities
      WebSocketUtil.initializeConnection(client, userId);

      // Set up message handling with MessagePack support
      client.on('message', (message: Buffer) => {
        this.handleMessage(client, message);
      });

      // Set up ping/pong handling for heartbeat
      client.on('ping', () => {
        WebSocketUtil.handlePing(client);
      });

      client.on('pong', () => {
        WebSocketUtil.handlePong(client);
      });

      // Send welcome message with format support info
      if (client.readyState === client.OPEN) {
        const welcomeMessage = {
          event: 'connection_status',
          data: { 
            status: 'connected', 
            authenticated: true,
            userId,
            timestamp: Date.now(),
            features: {
              heartbeat_interval: 15000,
              rate_limit: '10Hz client, 5Hz server',
              queue_limit: 50,
              validation: 'Zod schemas',
              messagepack_enabled: MessagePackUtil.isMessagePackEnabled(),
              content_type: MessagePackUtil.getContentType()
            }
          }
        };
        
        this.sendMessage(client, welcomeMessage);
      }
    } catch (error) {
      this.logger.error(`WebSocket connection error: ${error.message}`);
      client.close();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const userId = WsAuthUtil.getUserId(client);
    this.logger.log(`WebSocket client disconnected (user: ${userId})`);
    
    // Track WebSocket disconnection metrics
    this.metricsService.decrementActiveConnections();
    
    // Clean up connection resources
    WebSocketUtil.cleanupConnection(client);
    
    // Clean up navigation correction timers
    if (userId) {
      const timer = this.navCorrectionTimers.get(userId);
      if (timer) {
        clearTimeout(timer);
        this.navCorrectionTimers.delete(userId);
      }
      this.navCorrectionRateLimiter.delete(userId);
      this.navCorrectionService.clearUserState(userId);
    }
  }

  private isOriginAllowed(origin: string | undefined): boolean {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    // CRITICAL: WebSocket Origin header enforcement - reject if no origin header
    if (!origin) {
      this.logger.error(`WebSocket connection REJECTED: Missing Origin header - SECURITY VIOLATION`);
      return false;
    }

    // CRITICAL: Strict origin validation against WS_ORIGIN environment variable
    if (origin === this.wsOrigin) {
      this.logger.log(`WebSocket origin validation PASSED: '${origin}' matches required WS_ORIGIN`);
      return true;
    }

    // Check if origin is in additional allowed list (for backward compatibility)
    if (this.allowedOrigins.includes(origin)) {
      this.logger.log(`WebSocket origin validation PASSED: '${origin}' found in ALLOWED_ORIGINS`);
      return true;
    }

    // In development only, allow localhost with any port as fallback
    if (nodeEnv === 'development' && origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
      this.logger.warn(`WebSocket origin validation PASSED (DEV ONLY): '${origin}' is localhost - would be REJECTED in production`);
      return true;
    }

    // All other origins are rejected
    this.logger.error(`WebSocket connection REJECTED: Origin '${origin}' not in allowed list. Expected: '${this.wsOrigin}' or one of [${this.allowedOrigins.join(', ')}]`);
    return false;
  }

  handleMessage(client: AuthenticatedSocket, message: Buffer | string) {
    try {
      // Check rate limiting first
      if (!WebSocketUtil.checkRateLimit(client)) {
        return; // Rate limit exceeded, error already sent
      }

      // Parse message with MessagePack support
      const parsedMessage = MessagePackUtil.processIncomingMessage(message);
      const messageValidation = WebSocketMessageSchema.safeParse(parsedMessage);
      
      if (!messageValidation.success) {
        this.logger.warn(`Invalid message structure: ${messageValidation.error.message}`);
        this.sendError(client, 'Invalid message structure');
        return;
      }

      const { event, data } = messageValidation.data;

      // Check sequence validation for drift >15s or seq↓ rejection
      if (!WebSocketUtil.checkSequenceValid(client, data.seq, data.ts)) {
        return; // Sequence invalid, rejection already logged and counted
      }

      // Require authentication
      WsAuthUtil.requireAuth(client);
      const userId = WsAuthUtil.getUserId(client);
      
      // Track incoming message metrics
      this.metricsService.incrementMessageIn(event, userId || undefined);
      
      this.logger.debug(`WebSocket message received from user ${userId}: ${event}`);
      
      // Handle different event types with validation
      switch (event) {
        case 'nav.update':
          this.handleNavUpdate(client, data, userId);
          break;
        case 'nav.correction':
          this.handleNavCorrection(client, data, userId);
          break;
        case 'ai.prompt':
          this.handleAiPrompt(client, data, userId);
          break;
        case 'ui.banner':
          this.handleUiBanner(client, data, userId);
          break;
        case 'state.set':
          this.handleStateSet(client, data, userId);
          break;
        case 'ping':
          this.handleClientPing(client);
          break;
        case 'pong':
          this.handleClientPong(client);
          break;
        default:
          this.logger.warn(`Unknown event type: ${event}`);
          this.sendError(client, `Unknown event type: ${event}`);
      }
    } catch (error) {
      this.logger.error(`Message handling error: ${error.message}`);
      this.sendError(client, 'Invalid message format');
    }
  }

  private async handleNavUpdate(client: AuthenticatedSocket, data: any, userId: string | null) {
    // Validate data against schema
    const validation = NavUpdateSchema.safeParse(data);
    if (!validation.success) {
      this.logger.warn(`Invalid nav.update data: ${validation.error.message}`);
      this.sendError(client, `Invalid nav.update data: ${validation.error.message}`);
      return;
    }

    this.logger.debug(`Nav update received from user ${userId || 'unknown'}`);
    
    // Process navigation correction
    if (userId) {
      try {
        const correction = await this.navCorrectionService.processNavigationUpdate(validation.data);
        
        if (correction) {
          // Track navigation corrections
          this.metricsService.incrementCorrections(userId);
          
          // Rate limit nav.correction emissions to ~5Hz per user
          this.scheduleNavCorrection(userId, correction);
        }
      } catch (error) {
        this.logger.error(`Navigation correction error: ${error.message}`);
      }
    }
    
    // Broadcast to all clients except sender using queue system
    WebSocketUtil.broadcastToAll(
      this.server, 
      'nav.update', 
      { ...validation.data, sourceUserId: userId }, 
      client
    );

    WebSocketUtil.sendSuccess(client, 'nav.update');
  }

  private handleNavCorrection(client: AuthenticatedSocket, data: any, userId: string | null) {
    // Validate data against schema
    const validation = NavCorrectionSchema.safeParse(data);
    if (!validation.success) {
      this.logger.warn(`Invalid nav.correction data: ${validation.error.message}`);
      this.sendError(client, `Invalid nav.correction data: ${validation.error.message}`);
      return;
    }

    this.logger.debug(`Nav correction received from user ${userId || 'unknown'}`);
    
    // Broadcast to all clients except sender using queue system
    WebSocketUtil.broadcastToAll(
      this.server, 
      'nav.correction', 
      { ...validation.data, sourceUserId: userId }, 
      client
    );

    WebSocketUtil.sendSuccess(client, 'nav.correction');
  }

  private handleAiPrompt(client: AuthenticatedSocket, data: any, userId: string | null) {
    // Validate data against schema
    const validation = AiPromptSchema.safeParse(data);
    if (!validation.success) {
      this.logger.warn(`Invalid ai.prompt data: ${validation.error.message}`);
      this.sendError(client, `Invalid ai.prompt data: ${validation.error.message}`);
      return;
    }

    this.logger.debug(`AI prompt received from user ${userId || 'unknown'}`);
    
    // Broadcast to all clients using queue system (high priority)
    this.server.clients.forEach((clientSocket: AuthenticatedSocket) => {
      if (clientSocket.readyState === clientSocket.OPEN) {
        WebSocketUtil.queueMessage(
          clientSocket,
          'ai.prompt',
          { ...validation.data, sourceUserId: userId },
          'high'
        );
      }
    });

    WebSocketUtil.sendSuccess(client, 'ai.prompt');
  }

  private handleUiBanner(client: AuthenticatedSocket, data: any, userId: string | null) {
    // Validate data against schema
    const validation = UiBannerSchema.safeParse(data);
    if (!validation.success) {
      this.logger.warn(`Invalid ui.banner data: ${validation.error.message}`);
      this.sendError(client, `Invalid ui.banner data: ${validation.error.message}`);
      return;
    }

    this.logger.debug(`UI banner received from user ${userId || 'unknown'}`);
    
    // Broadcast to all clients using queue system (medium priority)
    this.server.clients.forEach((clientSocket: AuthenticatedSocket) => {
      if (clientSocket.readyState === clientSocket.OPEN) {
        WebSocketUtil.queueMessage(
          clientSocket,
          'ui.banner',
          { ...validation.data, sourceUserId: userId },
          'medium'
        );
      }
    });

    WebSocketUtil.sendSuccess(client, 'ui.banner');
  }

  private handleStateSet(client: AuthenticatedSocket, data: any, userId: string | null) {
    // Validate data against schema
    const validation = StateSetSchema.safeParse(data);
    if (!validation.success) {
      this.logger.warn(`Invalid state.set data: ${validation.error.message}`);
      this.sendError(client, `Invalid state.set data: ${validation.error.message}`);
      return;
    }

    this.logger.debug(`State set received from user ${userId || 'unknown'}`);
    
    // Broadcast to all clients except sender using queue system
    WebSocketUtil.broadcastToAll(
      this.server, 
      'state.set', 
      { ...validation.data, sourceUserId: userId }, 
      client
    );

    WebSocketUtil.sendSuccess(client, 'state.set');
  }

  private handleClientPing(client: AuthenticatedSocket) {
    // Respond to client ping with pong
    if (client.readyState === client.OPEN) {
      const userId = WsAuthUtil.getUserId(client);
      
      // Track heartbeat metrics
      if (userId) {
        this.metricsService.incrementHeartbeatSent(userId);
      }
      
      this.sendMessage(client, {
        event: 'pong',
        data: { timestamp: Date.now() }
      });
    }
  }

  private handleClientPong(client: AuthenticatedSocket) {
    // Handle client pong response
    WebSocketUtil.handlePong(client);
  }

  private sendError(client: AuthenticatedSocket, message: string) {
    if (client.readyState === client.OPEN) {
      this.sendMessage(client, {
        event: 'error',
        data: { success: false, message, timestamp: Date.now() }
      });
    }
  }

  /**
   * Send message using appropriate format (JSON or MessagePack)
   */
  private sendMessage(client: AuthenticatedSocket, data: any) {
    if (client.readyState === client.OPEN) {
      try {
        const message = MessagePackUtil.prepareOutgoingMessage(data);
        client.send(message);
        
        // Track outgoing message metrics
        const eventType = data.event || 'unknown';
        this.metricsService.incrementMessageOut(eventType, 'medium');
      } catch (error) {
        this.logger.error(`Failed to send message: ${error.message}`);
      }
    }
  }

  /**
   * Schedule navigation correction emission with rate limiting (~5Hz per user)
   */
  private scheduleNavCorrection(userId: string, correction: any) {
    const now = Date.now();
    const lastEmission = this.navCorrectionRateLimiter.get(userId) || 0;
    const timeSinceLastEmission = now - lastEmission;
    
    // If more than 200ms (5Hz) since last emission, emit immediately
    if (timeSinceLastEmission >= 200) {
      this.emitNavCorrection(userId, correction);
      this.navCorrectionRateLimiter.set(userId, now);
    } else {
      // Schedule emission to maintain ~5Hz rate
      const existingTimer = this.navCorrectionTimers.get(userId);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }
      
      const delay = 200 - timeSinceLastEmission;
      const timer = setTimeout(() => {
        this.emitNavCorrection(userId, correction);
        this.navCorrectionRateLimiter.set(userId, Date.now());
        this.navCorrectionTimers.delete(userId);
      }, delay);
      
      this.navCorrectionTimers.set(userId, timer);
    }
  }

  /**
   * Emit navigation correction to user
   */
  private emitNavCorrection(userId: string, correction: any) {
    // Find the user's socket
    let userSocket: AuthenticatedSocket | null = null;
    this.server.clients.forEach((client: AuthenticatedSocket) => {
      if (WsAuthUtil.getUserId(client) === userId && client.readyState === client.OPEN) {
        userSocket = client;
      }
    });
    
    if (!userSocket) {
      return;
    }
    
    // Prepare nav.correction message
    const correctionMessage: NavCorrectionDto = {
      ts: Date.now(),
      seq: Date.now(), // Use timestamp as sequence for now
      delta: correction.delta,
      snapTo: correction.snapTo,
      confidence: correction.confidence
    };
    
    // Queue the message with medium priority
    WebSocketUtil.queueMessage(
      userSocket,
      'nav.correction',
      correctionMessage,
      'medium'
    );
    
    this.logger.debug(
      `Nav correction emitted to user ${userId}: ` +
      `snapTo=${correction.snapTo}, confidence=${correction.confidence.toFixed(2)}`
    );
  }

  // Public API methods for external use
  sendToUser(userId: string, event: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    WebSocketUtil.sendToUser(this.server, userId, event, data);
  }

  broadcast(event: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    WebSocketUtil.broadcastToAll(this.server, event, data);
  }

  // Get connection statistics for monitoring
  getConnectionStats() {
    return WebSocketUtil.getConnectionStats();
  }
}