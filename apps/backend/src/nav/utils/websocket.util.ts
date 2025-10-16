import { Logger } from '@nestjs/common';
import { AuthenticatedSocket } from '../../shared/utils/ws-auth.util';
import { MessagePackUtil } from '../../shared/utils/msgpack.util';
import { MetricsService } from '../../metrics/metrics.service';

export interface QueuedMessage {
  event: string;
  data: any;
  timestamp: number;
  priority: 'high' | 'medium' | 'low';
}

export interface ConnectionMetrics {
  userId: string | null;
  connectedAt: number;
  lastHeartbeat: number;
  messageCount: number;
  lastMessageTime: number;
  rateLimitReset: number;
  messageQueue: QueuedMessage[];
  isAlive: boolean;
  lastSequenceNumber: number; // Track sequence numbers for rejection
}

export class WebSocketUtil {
  private static readonly logger = new Logger(WebSocketUtil.name);
  private static connectionMetrics = new Map<AuthenticatedSocket, ConnectionMetrics>();
  private static metricsService: MetricsService;
  
  // Rate limiting constants
  private static readonly CLIENT_RATE_LIMIT = 10; // 10 messages per second max
  private static readonly SERVER_COALESCE_RATE = 200; // Send every 200ms (5Hz)
  private static readonly QUEUE_LIMIT = 50;
  private static readonly HEARTBEAT_INTERVAL = 15000; // 15 seconds
  private static readonly MESSAGE_STALE_TIME = 5000; // 5 seconds

  // Timers for server-side coalescing
  private static coalesceTimers = new Map<AuthenticatedSocket, NodeJS.Timeout>();

  static setMetricsService(metricsService: MetricsService): void {
    this.metricsService = metricsService;
  }

  static initializeConnection(socket: AuthenticatedSocket, userId: string | null): void {
    const metrics: ConnectionMetrics = {
      userId,
      connectedAt: Date.now(),
      lastHeartbeat: Date.now(),
      messageCount: 0,
      lastMessageTime: 0,
      rateLimitReset: Date.now() + 1000, // Reset every second
      messageQueue: [],
      isAlive: true,
      lastSequenceNumber: 0, // Initialize sequence tracking
    };

    this.connectionMetrics.set(socket, metrics);
    this.startHeartbeat(socket);
    this.startCoalesceTimer(socket);
    
    this.logger.log(`WebSocket connection initialized for user: ${userId}`);
  }

  static cleanupConnection(socket: AuthenticatedSocket): void {
    const metrics = this.connectionMetrics.get(socket);
    if (metrics) {
      this.logger.log(`Cleaning up WebSocket connection for user: ${metrics.userId}`);
    }

    // Clear timers
    const coalesceTimer = this.coalesceTimers.get(socket);
    if (coalesceTimer) {
      clearTimeout(coalesceTimer);
      this.coalesceTimers.delete(socket);
    }

    // Remove metrics
    this.connectionMetrics.delete(socket);
  }

  static checkRateLimit(socket: AuthenticatedSocket): boolean {
    const metrics = this.connectionMetrics.get(socket);
    if (!metrics) return false;

    const now = Date.now();
    
    // Reset counter if time window has passed
    if (now >= metrics.rateLimitReset) {
      metrics.messageCount = 0;
      metrics.rateLimitReset = now + 1000; // Next second
    }

    // Check if rate limit exceeded
    if (metrics.messageCount >= this.CLIENT_RATE_LIMIT) {
      this.logger.warn(`Rate limit exceeded for user: ${metrics.userId}`);
      this.sendError(socket, 'Rate limit exceeded. Maximum 10 messages per second.');
      // Track rejection in metrics
      if (this.metricsService && metrics.userId) {
        this.metricsService.incrementQueueDrops(metrics.userId, 'rate_limit');
      }
      return false;
    }

    // Increment counter
    metrics.messageCount++;
    metrics.lastMessageTime = now;
    return true;
  }

  /**
   * Check sequence number for rejection (reject drift >15s or seq↓)
   * Requirement: reject drift >15s or seq↓
   */
  static checkSequenceValid(socket: AuthenticatedSocket, messageSeq?: number, messageTs?: number): boolean {
    const metrics = this.connectionMetrics.get(socket);
    if (!metrics) return false;

    // If no sequence number provided, accept (for backward compatibility)
    if (messageSeq === undefined) return true;

    const now = Date.now();
    
    // Check sequence number order (reject if sequence decreases)
    if (messageSeq <= metrics.lastSequenceNumber) {
      this.logger.warn(`Rejecting message with sequence decrease for user: ${metrics.userId}, current: ${messageSeq}, last: ${metrics.lastSequenceNumber}`);
      // Track rejection in metrics
      if (this.metricsService && metrics.userId) {
        this.metricsService.incrementQueueDrops(metrics.userId, 'sequence_reject');
      }
      return false;
    }

    // Check timestamp drift >15s if provided
    if (messageTs !== undefined) {
      const drift = Math.abs(now - messageTs);
      if (drift > 15000) {
        this.logger.warn(`Rejecting message with timestamp drift >15s for user: ${metrics.userId}, drift: ${drift}ms`);
        // Track rejection in metrics
        if (this.metricsService && metrics.userId) {
          this.metricsService.incrementQueueDrops(metrics.userId, 'timestamp_drift');
        }
        return false;
      }
    }

    // Update last sequence number
    metrics.lastSequenceNumber = messageSeq;
    return true;
  }

  static queueMessage(socket: AuthenticatedSocket, event: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium'): void {
    const metrics = this.connectionMetrics.get(socket);
    if (!metrics) return;

    const message: QueuedMessage = {
      event,
      data,
      timestamp: Date.now(),
      priority,
    };

    // Remove stale messages
    this.cleanStaleMessages(metrics);

    // Check queue limit
    if (metrics.messageQueue.length >= this.QUEUE_LIMIT) {
      // Remove oldest low-priority message
      const lowPriorityIndex = metrics.messageQueue.findIndex(m => m.priority === 'low');
      if (lowPriorityIndex !== -1) {
        metrics.messageQueue.splice(lowPriorityIndex, 1);
        this.logger.debug(`Dropped low-priority message for user: ${metrics.userId}`);
        if (this.metricsService && metrics.userId) {
          this.metricsService.incrementQueueDrops(metrics.userId, 'low');
        }
      } else {
        // Remove oldest medium-priority message
        const mediumPriorityIndex = metrics.messageQueue.findIndex(m => m.priority === 'medium');
        if (mediumPriorityIndex !== -1) {
          metrics.messageQueue.splice(mediumPriorityIndex, 1);
          this.logger.debug(`Dropped medium-priority message for user: ${metrics.userId}`);
          if (this.metricsService && metrics.userId) {
            this.metricsService.incrementQueueDrops(metrics.userId, 'medium');
          }
        } else {
          // Queue is full of high-priority messages, drop oldest
          metrics.messageQueue.shift();
          this.logger.warn(`Dropped high-priority message for user: ${metrics.userId} - queue full`);
          if (this.metricsService && metrics.userId) {
            this.metricsService.incrementQueueDrops(metrics.userId, 'high');
          }
        }
      }
    }

    // Add message to queue (maintain priority order)
    if (priority === 'high') {
      // Insert at beginning for high priority
      metrics.messageQueue.unshift(message);
    } else if (priority === 'medium') {
      // Insert after high priority messages
      const highPriorityCount = metrics.messageQueue.filter(m => m.priority === 'high').length;
      metrics.messageQueue.splice(highPriorityCount, 0, message);
    } else {
      // Add at end for low priority
      metrics.messageQueue.push(message);
    }
  }

  static broadcastToAll(server: any, event: string, data: any, excludeSocket?: AuthenticatedSocket): void {
    server.clients.forEach((client: AuthenticatedSocket) => {
      if (client !== excludeSocket && client.readyState === client.OPEN) {
        this.queueMessage(client, event, data);
      }
    });
  }

  static sendToUser(server: any, userId: string, event: string, data: any): void {
    server.clients.forEach((client: AuthenticatedSocket) => {
      if (client.readyState === client.OPEN) {
        const metrics = this.connectionMetrics.get(client);
        if (metrics && metrics.userId === userId) {
          this.queueMessage(client, event, data, 'high');
        }
      }
    });
  }

  private static cleanStaleMessages(metrics: ConnectionMetrics): void {
    const now = Date.now();
    const initialLength = metrics.messageQueue.length;
    
    metrics.messageQueue = metrics.messageQueue.filter(
      message => now - message.timestamp < this.MESSAGE_STALE_TIME
    );

    const removedCount = initialLength - metrics.messageQueue.length;
    if (removedCount > 0) {
      this.logger.debug(`Removed ${removedCount} stale messages for user: ${metrics.userId}`);
    }
  }

  private static startCoalesceTimer(socket: AuthenticatedSocket): void {
    const processQueue = () => {
      const metrics = this.connectionMetrics.get(socket);
      if (!metrics || socket.readyState !== socket.OPEN) {
        return;
      }

      // Process messages from queue
      if (metrics.messageQueue.length > 0) {
        // Take up to 5 messages (to maintain 5Hz rate)
        const messagesToSend = metrics.messageQueue.splice(0, 5);
        
        messagesToSend.forEach(message => {
          if (socket.readyState === socket.OPEN) {
            try {
              const messageData = {
                event: message.event,
                data: message.data,
                timestamp: Date.now(),
              };
              const formattedMessage = MessagePackUtil.prepareOutgoingMessage(messageData);
              socket.send(formattedMessage);
              
              // Track outgoing message metrics
              if (this.metricsService) {
                this.metricsService.incrementMessageOut(message.event, message.priority);
              }
            } catch (error) {
              this.logger.error(`Failed to send message: ${error.message}`);
            }
          }
        });
      }

      // Schedule next processing
      const timer = setTimeout(processQueue, this.SERVER_COALESCE_RATE);
      this.coalesceTimers.set(socket, timer);
    };

    // Start processing
    processQueue();
  }

  private static startHeartbeat(socket: AuthenticatedSocket): void {
    const heartbeatInterval = setInterval(() => {
      const metrics = this.connectionMetrics.get(socket);
      if (!metrics) {
        clearInterval(heartbeatInterval);
        return;
      }

      // Check for drift >15s (heartbeat drift rejection as per requirements)
      const now = Date.now();
      const heartbeatDrift = now - metrics.lastHeartbeat;
      if (heartbeatDrift > 15000) {
        this.logger.warn(`Rejecting connection due to heartbeat drift >15s for user: ${metrics.userId}, drift: ${heartbeatDrift}ms`);
        // Track rejection in metrics
        if (this.metricsService && metrics.userId) {
          this.metricsService.incrementQueueDrops(metrics.userId, 'heartbeat_drift');
        }
        clearInterval(heartbeatInterval);
        socket.terminate();
        return;
      }

      if (!metrics.isAlive) {
        this.logger.warn(`Terminating unresponsive connection for user: ${metrics.userId}`);
        clearInterval(heartbeatInterval);
        socket.terminate();
        return;
      }

      // Mark as not alive and send ping
      metrics.isAlive = false;
      if (socket.readyState === socket.OPEN) {
        socket.ping();
      }
    }, this.HEARTBEAT_INTERVAL);

    // Handle pong responses
    socket.on('pong', () => {
      const metrics = this.connectionMetrics.get(socket);
      if (metrics) {
        metrics.isAlive = true;
        metrics.lastHeartbeat = Date.now();
      }
    });

    // Clean up interval when socket closes
    socket.on('close', () => {
      clearInterval(heartbeatInterval);
    });
  }

  static handlePing(socket: AuthenticatedSocket): void {
    if (socket.readyState === socket.OPEN) {
      socket.pong();
    }
  }

  static handlePong(socket: AuthenticatedSocket): void {
    const metrics = this.connectionMetrics.get(socket);
    if (metrics) {
      metrics.isAlive = true;
      metrics.lastHeartbeat = Date.now();
    }
  }

  private static sendError(socket: AuthenticatedSocket, message: string): void {
    if (socket.readyState === socket.OPEN) {
      try {
        const errorMessage = {
          event: 'error',
          data: { success: false, message, timestamp: Date.now() }
        };
        const formattedMessage = MessagePackUtil.prepareOutgoingMessage(errorMessage);
        socket.send(formattedMessage);
      } catch (error) {
        this.logger.error(`Failed to send error message: ${error.message}`);
      }
    }
  }

  static sendSuccess(socket: AuthenticatedSocket, event: string): void {
    if (socket.readyState === socket.OPEN) {
      try {
        const successMessage = {
          event: 'ack',
          data: { success: true, event, timestamp: Date.now() }
        };
        const formattedMessage = MessagePackUtil.prepareOutgoingMessage(successMessage);
        socket.send(formattedMessage);
      } catch (error) {
        this.logger.error(`Failed to send success message: ${error.message}`);
      }
    }
  }

  // Get connection statistics
  static getConnectionStats(): any {
    const stats = {
      totalConnections: this.connectionMetrics.size,
      connections: Array.from(this.connectionMetrics.entries()).map(([socket, metrics]) => ({
        userId: metrics.userId,
        connectedAt: metrics.connectedAt,
        lastHeartbeat: metrics.lastHeartbeat,
        messageCount: metrics.messageCount,
        queueLength: metrics.messageQueue.length,
        isAlive: metrics.isAlive,
      })),
    };
    return stats;
  }
}