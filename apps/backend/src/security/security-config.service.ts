import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response, NextFunction } from 'express';
import { randomBytes } from 'crypto';

export interface SecurityConfig {
  helmet: {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: string[];
        styleSrc: string[];
        scriptSrc: string[];
        imgSrc: string[];
        connectSrc: string[];
        fontSrc: string[];
        objectSrc: string[];
        mediaSrc: string[];
        frameSrc: string[];
        formAction: string[];
        upgradeInsecureRequests: boolean;
      };
      reportOnly: boolean;
    };
    hsts: {
      maxAge: number;
      includeSubDomains: boolean;
      preload: boolean;
    };
    xssFilter: boolean;
    noSniff: boolean;
    frameguard: {
      action: string;
    };
    referrerPolicy: {
      policy: string;
    };
  };
  cors: {
    allowedOrigins: string[];
    allowCredentials: boolean;
    maxAge: number;
  };
}

@Injectable()
export class SecurityConfigService {
  private readonly logger = new Logger(SecurityConfigService.name);
  private readonly allowedDomains: string[];
  private readonly cdnDomains: string[];
  private readonly nodeEnv: string;

  constructor(private readonly configService: ConfigService) {
    this.nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    this.allowedDomains = this.configService
      .get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
      .split(',')
      .map(origin => origin.trim());
    
    this.cdnDomains = this.configService
      .get<string>('CDN_DOMAINS', '')
      .split(',')
      .map(domain => domain.trim())
      .filter(domain => domain.length > 0);
    
    this.logger.log('Security configuration initialized');
    this.logger.log(`Environment: ${this.nodeEnv}`);
    this.logger.log(`Allowed domains: ${this.allowedDomains.join(', ')}`);
    this.logger.log(`CDN domains: ${this.cdnDomains.join(', ') || 'none'}`);
  }

  /**
   * Generate CSP nonce for inline scripts/styles
   */
  generateNonce(): string {
    return randomBytes(16).toString('base64');
  }

  /**
   * Middleware to add CSP nonce to response locals
   */
  nonceMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    res.locals.nonce = this.generateNonce();
    next();
  };

  /**
   * Get security configuration based on environment
   */
  getSecurityConfig(): SecurityConfig {
    const isProd = this.nodeEnv === 'production';
    const allowedOrigins = isProd ? this.allowedDomains : [...this.allowedDomains, 'http://localhost:*'];

    // Build script-src and style-src with CDN domains
    const scriptSrc = ["'self'"];
    const styleSrc = ["'self'"];
    const connectSrc = ["'self'", "wss:", "ws:"];

    // Add CDN domains if configured
    if (this.cdnDomains.length > 0) {
      scriptSrc.push(...this.cdnDomains);
      styleSrc.push(...this.cdnDomains);
      connectSrc.push(...this.cdnDomains);
    }

    // Add nonce support for production, unsafe-inline only for development
    if (isProd) {
      scriptSrc.push("'nonce-{{nonce}}'");
      styleSrc.push("'nonce-{{nonce}}'");
    } else {
      // Allow unsafe-inline only in development for easier debugging
      styleSrc.push("'unsafe-inline'");
      this.logger.warn('CSP: unsafe-inline allowed for styles in development mode');
    }

    return {
      helmet: {
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            styleSrc,
            scriptSrc,
            imgSrc: ["'self'", "data:", "https:", ...this.cdnDomains],
            connectSrc,
            fontSrc: ["'self'", ...this.cdnDomains],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
            formAction: ["'self'"],
            upgradeInsecureRequests: isProd,
          },
          reportOnly: !isProd, // Report-only in development, enforce in production
        },
        hsts: {
          maxAge: 31536000, // 1 year in seconds
          includeSubDomains: true,
          preload: true,
        },
        xssFilter: true,
        noSniff: true,
        frameguard: {
          action: 'deny',
        },
        referrerPolicy: {
          policy: 'strict-origin-when-cross-origin',
        },
      },
      cors: {
        allowedOrigins,
        allowCredentials: true,
        maxAge: 86400, // 24 hours
      },
    };
  }

  /**
   * HSTS middleware with strict configuration
   */
  hstsMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    const config = this.getSecurityConfig();
    const hstsValue = `max-age=${config.helmet.hsts.maxAge}; includeSubDomains; preload`;
    
    // Only set HSTS on HTTPS connections
    if (req.secure || req.headers['x-forwarded-proto'] === 'https' || this.nodeEnv === 'production') {
      res.setHeader('Strict-Transport-Security', hstsValue);
    }
    
    next();
  };

  /**
   * Additional security headers middleware
   */
  securityHeadersMiddleware = (req: Request, res: Response, next: NextFunction): void => {
    // Prevent MIME type sniffing
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // Prevent page from being displayed in iframe
    res.setHeader('X-Frame-Options', 'DENY');
    
    // XSS protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Referrer policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Prevent DNS prefetching
    res.setHeader('X-DNS-Prefetch-Control', 'off');
    
    // Disable IE compatibility mode
    res.setHeader('X-UA-Compatible', 'IE=edge');
    
    // Feature policy / Permissions policy
    res.setHeader('Permissions-Policy', 
      'geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()'
    );
    
    next();
  };

  /**
   * Content Security Policy violation reporting endpoint
   */
  cspReportHandler = (req: Request, res: Response): void => {
    const report = req.body;
    this.logger.error('CSP Violation Report:', {
      'blocked-uri': report['csp-report']?.['blocked-uri'],
      'document-uri': report['csp-report']?.['document-uri'],
      'violated-directive': report['csp-report']?.['violated-directive'],
      'original-policy': report['csp-report']?.['original-policy'],
      userAgent: req.headers['user-agent'],
      timestamp: new Date().toISOString(),
    });
    
    res.status(204).send();
  };

  /**
   * Validate configuration and log security warnings
   */
  validateConfiguration(): void {
    const config = this.getSecurityConfig();
    const isProd = this.nodeEnv === 'production';

    // Production security checks
    if (isProd) {
      // Check for wildcard origins
      if (config.cors.allowedOrigins.some(origin => origin.includes('*'))) {
        this.logger.error('SECURITY WARNING: Wildcard origins detected in production');
      }

      // Check for HTTP origins in production
      const httpOrigins = config.cors.allowedOrigins.filter(origin => origin.startsWith('http://'));
      if (httpOrigins.length > 0) {
        this.logger.warn(`SECURITY WARNING: HTTP origins in production: ${httpOrigins.join(', ')}`);
      }

      // Check if HSTS max-age is sufficient
      if (config.helmet.hsts.maxAge < 31536000) {
        this.logger.warn('SECURITY WARNING: HSTS max-age should be at least 1 year (31536000 seconds)');
      }

      // Check for unsafe CSP directives
      const hasUnsafeInline = config.helmet.contentSecurityPolicy.directives.styleSrc.includes("'unsafe-inline'") ||
                              config.helmet.contentSecurityPolicy.directives.scriptSrc.includes("'unsafe-inline'");
      if (hasUnsafeInline) {
        this.logger.error('SECURITY ERROR: unsafe-inline detected in production CSP');
      }
    }

    this.logger.log('Security configuration validation completed');
  }

  /**
   * Get rate limiting configuration
   */
  getRateLimitConfig() {
    return {
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: this.nodeEnv === 'production' ? 100 : 1000, // limit each IP to 100 requests per windowMs in prod
      message: 'Too many requests from this IP, please try again later.',
      standardHeaders: true,
      legacyHeaders: false,
    };
  }
}