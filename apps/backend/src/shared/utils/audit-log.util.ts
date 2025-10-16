import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LogRedactionService } from '../../security/log-redaction.service';

export enum AuditLogLevel {
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  SECURITY = 'security',
}

export enum AuditLogCategory {
  PII_ACCESS = 'pii_access',
  DATA_EXPORT = 'data_export',
  AUTH_EVENT = 'auth_event',
  SYSTEM_EVENT = 'system_event',
  API_ACCESS = 'api_access',
  WEBSOCKET_EVENT = 'websocket_event',
}

export interface AuditLogEntry {
  timestamp: Date;
  level: AuditLogLevel;
  category: AuditLogCategory;
  userId?: string;
  userEmail?: string;
  action: string;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
  result: 'success' | 'failure' | 'denied';
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export class AuditLogUtil {
  private static readonly logger = new Logger('AuditLog');
  private static configService: ConfigService;
  private static redactionService: LogRedactionService;
  private static isEnabled: boolean = true;

  static initialize(configService: ConfigService, redactionService?: LogRedactionService) {
    this.configService = configService;
    this.redactionService = redactionService;
    this.isEnabled = this.configService.get<boolean>('AUDIT_LOGGING_ENABLED', true);
    
    if (this.isEnabled) {
      this.logger.log('Audit logging initialized and enabled');
      if (this.redactionService) {
        this.logger.log('PII redaction service integrated with audit logging');
      }
    } else {
      this.logger.warn('Audit logging is disabled');
    }
  }

  /**
   * Log PII access events - use this whenever sensitive user data is accessed
   */
  static logPiiAccess(entry: {
    userId?: string;
    userEmail?: string;
    action: string;
    resource: string;
    resourceId?: string;
    accessedFields?: string[];
    ipAddress?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
  }) {
    this.log({
      level: AuditLogLevel.SECURITY,
      category: AuditLogCategory.PII_ACCESS,
      timestamp: new Date(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      details: {
        accessedFields: entry.accessedFields || [],
        sensitiveDataAccess: true,
      },
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      result: entry.result,
      errorMessage: entry.errorMessage,
    });
  }

  /**
   * Log data export events - use when users export or download data
   */
  static logDataExport(entry: {
    userId?: string;
    userEmail?: string;
    exportType: string;
    recordCount?: number;
    fileFormat?: string;
    filters?: Record<string, any>;
    ipAddress?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
  }) {
    this.log({
      level: AuditLogLevel.INFO,
      category: AuditLogCategory.DATA_EXPORT,
      timestamp: new Date(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: 'data_export',
      resource: 'user_data',
      details: {
        exportType: entry.exportType,
        recordCount: entry.recordCount,
        fileFormat: entry.fileFormat,
        filters: entry.filters,
      },
      ipAddress: entry.ipAddress,
      result: entry.result,
      errorMessage: entry.errorMessage,
    });
  }

  /**
   * Log authentication events
   */
  static logAuthEvent(entry: {
    userId?: string;
    userEmail?: string;
    action: 'login' | 'logout' | 'token_refresh' | 'auth_failure' | 'password_change';
    ipAddress?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    this.log({
      level: entry.result === 'failure' ? AuditLogLevel.WARN : AuditLogLevel.INFO,
      category: AuditLogCategory.AUTH_EVENT,
      timestamp: new Date(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: 'authentication',
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      result: entry.result,
      errorMessage: entry.errorMessage,
      metadata: entry.metadata,
    });
  }

  /**
   * Log API access events
   */
  static logApiAccess(entry: {
    userId?: string;
    userEmail?: string;
    method: string;
    endpoint: string;
    statusCode: number;
    responseTime?: number;
    ipAddress?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
  }) {
    this.log({
      level: entry.statusCode >= 400 ? AuditLogLevel.WARN : AuditLogLevel.INFO,
      category: AuditLogCategory.API_ACCESS,
      timestamp: new Date(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: `${entry.method} ${entry.endpoint}`,
      resource: 'api_endpoint',
      details: {
        method: entry.method,
        endpoint: entry.endpoint,
        statusCode: entry.statusCode,
        responseTime: entry.responseTime,
      },
      ipAddress: entry.ipAddress,
      userAgent: entry.userAgent,
      result: entry.result,
      errorMessage: entry.errorMessage,
    });
  }

  /**
   * Log WebSocket events
   */
  static logWebSocketEvent(entry: {
    userId?: string;
    userEmail?: string;
    action: string;
    event?: string;
    socketId?: string;
    ipAddress?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
    metadata?: Record<string, any>;
  }) {
    this.log({
      level: entry.result === 'failure' ? AuditLogLevel.WARN : AuditLogLevel.INFO,
      category: AuditLogCategory.WEBSOCKET_EVENT,
      timestamp: new Date(),
      userId: entry.userId,
      userEmail: entry.userEmail,
      action: entry.action,
      resource: 'websocket',
      details: {
        event: entry.event,
        socketId: entry.socketId,
      },
      ipAddress: entry.ipAddress,
      result: entry.result,
      errorMessage: entry.errorMessage,
      metadata: entry.metadata,
    });
  }

  /**
   * Generic log method for custom audit events
   */
  static log(entry: AuditLogEntry) {
    if (!this.isEnabled) {
      return;
    }

    // Format the log entry for structured logging
    let logEntry = {
      timestamp: entry.timestamp.toISOString(),
      level: entry.level,
      category: entry.category,
      audit: true, // Flag to identify audit logs
      userId: entry.userId || 'anonymous',
      userEmail: entry.userEmail || 'unknown',
      action: entry.action,
      resource: entry.resource,
      resourceId: entry.resourceId,
      result: entry.result,
      ipAddress: entry.ipAddress || 'unknown',
      userAgent: entry.userAgent ? entry.userAgent.substring(0, 200) : 'unknown', // Truncate long user agents
      sessionId: entry.sessionId,
      details: entry.details || {},
      metadata: entry.metadata || {},
      errorMessage: entry.errorMessage,
    };

    // Apply PII redaction if service is available
    if (this.redactionService) {
      logEntry = this.redactionService.redactAuditLog(logEntry);
    }

    // Use appropriate log level
    switch (entry.level) {
      case AuditLogLevel.ERROR:
        this.logger.error(JSON.stringify(logEntry));
        break;
      case AuditLogLevel.WARN:
        this.logger.warn(JSON.stringify(logEntry));
        break;
      case AuditLogLevel.SECURITY:
        this.logger.warn(`[SECURITY] ${JSON.stringify(logEntry)}`);
        break;
      case AuditLogLevel.INFO:
      default:
        this.logger.log(JSON.stringify(logEntry));
        break;
    }

    // In production, you might want to send critical security events to an external system
    if (entry.level === AuditLogLevel.SECURITY && entry.result === 'denied') {
      this.handleSecurityAlert(logEntry);
    }
  }

  /**
   * Helper to extract IP address from request
   */
  static extractIpAddress(request: any): string {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.socket?.remoteAddress ||
           request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
           'unknown';
  }

  /**
   * Helper to extract user agent from request
   */
  static extractUserAgent(request: any): string {
    return request.headers?.['user-agent'] || 'unknown';
  }

  /**
   * Helper to create audit context from request
   */
  static createRequestContext(request: any): {
    ipAddress: string;
    userAgent: string;
    userId?: string;
    userEmail?: string;
  } {
    return {
      ipAddress: this.extractIpAddress(request),
      userAgent: this.extractUserAgent(request),
      userId: request.user?.sub,
      userEmail: request.user?.email,
    };
  }

  private static handleSecurityAlert(logEntry: any) {
    // In production, implement alerting mechanism
    // Examples: Send to security team, trigger monitoring alerts, etc.
    this.logger.error(`[SECURITY ALERT] ${JSON.stringify(logEntry)}`);
  }

  /**
   * Helper method for profile/PII access logging
   * Use this in profile controller when accessing sensitive user data
   */
  static logProfileAccess(params: {
    accessingUserId?: string;
    accessingUserEmail?: string;
    targetUserId: string;
    targetUserEmail?: string;
    action: 'read' | 'update' | 'delete';
    fields: string[];
    ipAddress?: string;
    userAgent?: string;
    result: 'success' | 'failure' | 'denied';
    errorMessage?: string;
  }) {
    this.logPiiAccess({
      userId: params.accessingUserId,
      userEmail: params.accessingUserEmail,
      action: `profile_${params.action}`,
      resource: 'user_profile',
      resourceId: params.targetUserId,
      accessedFields: params.fields,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
      result: params.result,
      errorMessage: params.errorMessage,
    });

    // Additional context for cross-user access
    if (params.accessingUserId !== params.targetUserId) {
      this.log({
        level: AuditLogLevel.SECURITY,
        category: AuditLogCategory.PII_ACCESS,
        timestamp: new Date(),
        userId: params.accessingUserId,
        userEmail: params.accessingUserEmail,
        action: 'cross_user_profile_access',
        resource: 'user_profile',
        resourceId: params.targetUserId,
        details: {
          targetUserEmail: params.targetUserEmail,
          accessedFields: params.fields,
          crossUserAccess: true,
        },
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        result: params.result,
        errorMessage: params.errorMessage,
      });
    }
  }
}