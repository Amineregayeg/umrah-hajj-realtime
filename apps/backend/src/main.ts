import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { WsAdapter } from '@nestjs/platform-ws';
import { MetricsService } from './metrics/metrics.service';
import { MetricsMiddleware } from './metrics/metrics.middleware';
import { SecurityConfigService } from './security/security-config.service';
import { LogRedactionService } from './security/log-redaction.service';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Configure WebSocket adapter to use 'ws' library instead of socket.io
  app.useWebSocketAdapter(new WsAdapter(app));
  const configService = app.get(ConfigService);
  const securityConfigService = app.get(SecurityConfigService);
  const logRedactionService = app.get(LogRedactionService);

  // Validate security configuration on startup
  securityConfigService.validateConfiguration();
  logRedactionService.validateConfig();

  // CORS Configuration with Origin Validation
  // CRITICAL: CORS must be applied BEFORE Helmet to ensure preflight requests are handled correctly
  const allowedOrigins = configService.get<string>('ALLOWED_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');

  logger.log(`CORS allowed origins: ${allowedOrigins.join(', ')}`);

  app.enableCors({
    origin: (origin, callback) => {
      // In production, allow requests with no origin (for health checks and infrastructure)
      // In development, also allow for testing with curl, Postman, etc.
      if (!origin) {
        // Log in production for monitoring but still allow
        if (nodeEnv === 'production') {
          logger.debug('Request without origin header (likely infrastructure health check)');
        }
        return callback(null, true);
      }

      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        logger.debug(`CORS: Allowing origin ${origin}`);
        return callback(null, true);
      }

      // In development, allow localhost with any port
      if (nodeEnv === 'development' && origin.match(/^https?:\/\/localhost(:\d+)?$/)) {
        return callback(null, true);
      }

      logger.warn(`Request blocked: Origin '${origin}' not allowed. Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`Origin '${origin}' not allowed by CORS policy`), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
    exposedHeaders: ['Content-Length', 'Content-Type'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });

  // Enhanced Security: Use Helmet with strict CSP configuration
  // Applied AFTER CORS to prevent interference with preflight requests
  const securityConfig = securityConfigService.getSecurityConfig();

  app.use(helmet({
    contentSecurityPolicy: securityConfig.helmet.contentSecurityPolicy as any,
    hsts: securityConfig.helmet.hsts as any,
    xssFilter: securityConfig.helmet.xssFilter as any,
    noSniff: securityConfig.helmet.noSniff as any,
    frameguard: securityConfig.helmet.frameguard as any,
    referrerPolicy: securityConfig.helmet.referrerPolicy as any,
    crossOriginEmbedderPolicy: false, // Allow for WebSocket connections
    crossOriginResourcePolicy: false, // Allow CORS to work properly
  }));

  // Apply additional security middleware
  app.use(securityConfigService.nonceMiddleware);
  app.use(securityConfigService.hstsMiddleware);
  app.use(securityConfigService.securityHeadersMiddleware);

  // Additional security headers
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Configure metrics middleware
  const metricsService = app.get(MetricsService);
  app.use(new MetricsMiddleware(metricsService).use.bind(new MetricsMiddleware(metricsService)));

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    transform: true,
  }));

  // Swagger Documentation Setup
  const config = new DocumentBuilder()
    .setTitle('Umrah Hajj API')
    .setDescription(`API documentation for Umrah Hajj Real-time Application
    
**Phase B Features:**
- 🗄️ **PostgreSQL Persistence**: Profile and consent data stored in database
- 🔒 **Zod Validation**: Request validation with detailed error messages
- 🔥 **MessagePack WebSocket**: Binary encoding support (WS_MSGPACK_ENABLED=${process.env.WS_MSGPACK_ENABLED || 'false'})
- 🔄 **Round-trip Persistence**: Complete data lifecycle management
- 🛡️ **Error Handling**: 400 for validation errors, 403 for authorization

**Persistence Endpoints:**
- GET /profile - Retrieve user profile from database
- PUT /profile - Update user profile with validation
- GET /consent - Get user consent preferences  
- PUT /consent - Update consent settings with persistence

**WebSocket Protocol:**
- ${process.env.WS_MSGPACK_ENABLED === 'true' ? '📦 MessagePack binary frames (application/x-msgpack)' : '📄 JSON text frames (application/json)'}
- Backward compatible event contracts
- Auto-detection of message format`)
    .setVersion('1.0.0')
    .addTag('Profile', 'User profile management with PostgreSQL persistence')
    .addTag('Consent', 'User consent management with database storage')
    .addTag('Content', 'Content management and retrieval')
    .addTag('Health', 'Health check endpoints')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'Umrah Hajj API Documentation',
    customCss: '.swagger-ui .topbar { display: none }',
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = configService.get<number>('PORT', 3000);
  
  logger.log(`Application starting on port ${port}`);
  logger.log(`Environment: ${nodeEnv}`);
  logger.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
  logger.log(`Swagger documentation available at http://localhost:${port}/docs`);
  
  await app.listen(port);
}
bootstrap();
