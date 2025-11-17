import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { jwtVerify, createRemoteJWKSet, JWTPayload } from 'jose';

@Injectable()
export class SupabaseJwtGuard implements CanActivate {
  private readonly logger = new Logger(SupabaseJwtGuard.name);
  private readonly jwksSet: ReturnType<typeof createRemoteJWKSet> | null;
  private readonly jwtSecret: Uint8Array | null;
  private readonly authMode: 'mock' | 'supabase';

  constructor(
    private readonly configService: ConfigService,
  ) {
    // Determine authentication mode
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const authModeConfig = this.configService.get<string>('AUTH_MODE', '');

    if (authModeConfig === 'mock' || (nodeEnv === 'development' && authModeConfig !== 'supabase')) {
      this.authMode = 'mock';
      this.jwksSet = null;
      this.jwtSecret = null;
      this.logger.warn('HTTP authentication running in MOCK mode');
    } else {
      this.authMode = 'supabase';
      const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
      const jwtSecret = this.configService.get<string>('SUPABASE_JWT_SECRET');

      if (!supabaseUrl) {
        throw new Error('SUPABASE_URL environment variable is required for Supabase auth mode');
      }
      if (!jwtSecret) {
        throw new Error('SUPABASE_JWT_SECRET environment variable is required for Supabase auth mode');
      }

      // Use JWT Secret for HS256 verification (Supabase default)
      this.jwtSecret = new TextEncoder().encode(jwtSecret);
      this.jwksSet = null; // Not used for HS256
      this.logger.log(`HTTP JWT Secret initialized for HS256 verification`);
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Mock mode for development/testing
    if (this.authMode === 'mock') {
      return this.handleMockMode(context);
    }

    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    try {
      const payload = await this.verifySupabaseToken(token);
      request.user = payload;
      return true;
    } catch (error) {
      this.logger.error(`Token verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private handleMockMode(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    
    // Extract user ID from Authorization header if present for testing
    const authHeader = request.headers.authorization;
    let userId = 'mock-user-123';
    
    if (authHeader && authHeader.startsWith('Bearer dummy-jwt-')) {
      userId = authHeader.replace('Bearer dummy-jwt-', '');
    }
    
    // In mock mode, create a mock user
    request.user = {
      id: userId,
      sub: userId,
      email: 'mock@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    };

    this.logger.log(`Mock mode: Authentication bypassed for user ${userId}`);
    return true;
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }

  private async verifySupabaseToken(token: string): Promise<JWTPayload> {
    if (!this.jwtSecret) {
      throw new Error('JWT Secret not initialized');
    }

    try {
      // Verify JWT using jose library with JWT Secret (HS256)
      const { payload } = await jwtVerify(token, this.jwtSecret, {
        algorithms: ['HS256'],
        audience: 'authenticated',
      });

      // Validate required Supabase JWT fields
      if (!payload.sub || !payload.aud || payload.aud !== 'authenticated') {
        throw new UnauthorizedException('Invalid token payload');
      }

      this.logger.log(`HTTP authenticated user: ${payload.sub}`);
      return payload;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }
}