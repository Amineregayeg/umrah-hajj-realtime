import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WsAuthUtil } from './ws-auth.util';
import { AuditLogUtil } from './audit-log.util';

@Injectable()
export class SecurityInitService implements OnModuleInit {
  private readonly logger = new Logger(SecurityInitService.name);

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    this.logger.log('Initializing security utilities...');
    
    // Initialize WebSocket authentication utility
    WsAuthUtil.initialize(this.configService);
    
    // Initialize audit logging utility
    AuditLogUtil.initialize(this.configService);
    
    this.logSecurityConfiguration();
  }

  private logSecurityConfiguration() {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    const authMode = this.configService.get<string>('AUTH_MODE', '');
    const auditEnabled = this.configService.get<boolean>('AUDIT_LOGGING_ENABLED', true);
    const allowedOrigins = this.configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000');

    this.logger.log('Security Configuration:');
    this.logger.log(`- Environment: ${nodeEnv}`);
    this.logger.log(`- Auth Mode: ${authMode || (nodeEnv === 'development' ? 'mock (default)' : 'supabase')}`);
    this.logger.log(`- WebSocket Auth: ${WsAuthUtil.getAuthMode()}`);
    this.logger.log(`- Audit Logging: ${auditEnabled ? 'enabled' : 'disabled'}`);
    this.logger.log(`- Allowed Origins: ${allowedOrigins}`);
    
    if (nodeEnv === 'production') {
      // Additional production security checks
      if (!this.configService.get<string>('SUPABASE_URL')) {
        this.logger.error('CRITICAL: SUPABASE_URL not configured in production');
      }
      if (allowedOrigins.includes('*')) {
        this.logger.error('CRITICAL: Wildcard origins not allowed in production');
      }
      if (authMode === 'mock') {
        this.logger.error('CRITICAL: Mock authentication mode enabled in production');
      }
    }
  }
}