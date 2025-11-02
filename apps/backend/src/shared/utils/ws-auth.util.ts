import { Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JWTPayload, jwtVerify, createRemoteJWKSet } from 'jose';
import { WebSocket } from 'ws';
import { IncomingMessage } from 'http';
import { parse } from 'url';

export interface AuthenticatedSocket extends WebSocket {
  user?: JWTPayload & {
    sub: string;
    email?: string;
    aud: string;
    role: string;
    exp: number;
    iat: number;
  };
  request?: IncomingMessage;
}

export class WsAuthUtil {
  private static readonly logger = new Logger(WsAuthUtil.name);
  private static jwksSet: ReturnType<typeof createRemoteJWKSet> | null = null;
  private static authMode: 'mock' | 'supabase' = 'supabase';
  private static configService: ConfigService;

  static initialize(configService: ConfigService) {
    this.configService = configService;
    
    // Determine auth mode
    const nodeEnv = configService.get<string>('NODE_ENV');
    const authModeConfig = configService.get<string>('AUTH_MODE', '');
    
    if (authModeConfig === 'mock' || (nodeEnv === 'development' && authModeConfig !== 'supabase')) {
      this.authMode = 'mock';
      this.logger.warn('WebSocket authentication running in MOCK mode');
    } else {
      this.authMode = 'supabase';
      this.initializeJWKS();
    }
  }

  private static initializeJWKS() {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    if (!supabaseUrl) {
      throw new Error('SUPABASE_URL environment variable is required for Supabase auth mode');
    }

    const jwksUri = `${supabaseUrl}/auth/v1/jwks`;
    this.jwksSet = createRemoteJWKSet(new URL(jwksUri));
    this.logger.log(`JWKS initialized with URI: ${jwksUri}`);
  }

  static async authenticateSocket(socket: AuthenticatedSocket, request: IncomingMessage): Promise<boolean> {
    try {
      socket.request = request;
      
      if (this.authMode === 'mock') {
        return this.handleMockAuth(socket);
      }

      return await this.handleSupabaseAuth(socket);
    } catch (error) {
      this.logger.error(`WebSocket authentication failed: ${error.message}`);
      this.sendAuthError(socket, 'Authentication failed');
      return false;
    }
  }

  private static handleMockAuth(socket: AuthenticatedSocket): boolean {
    // Create mock user for development
    socket.user = {
      sub: 'mock-user-ws-123',
      email: 'mock-ws@example.com',
      aud: 'authenticated',
      role: 'authenticated',
      exp: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
      iat: Math.floor(Date.now() / 1000),
    };

    this.logger.log(`Mock WebSocket authentication for socket`);
    return true;
  }

  private static async handleSupabaseAuth(socket: AuthenticatedSocket): Promise<boolean> {
    const token = this.extractTokenFromSocket(socket);
    
    if (!token) {
      throw new UnauthorizedException('No token provided');
    }

    if (!this.jwksSet) {
      throw new Error('JWKS not initialized');
    }

    try {
      // Verify JWT using jose library with JWKS
      const { payload } = await jwtVerify(token, this.jwksSet, {
        algorithms: ['RS256'],
        audience: 'authenticated',
      });

      // Validate required Supabase JWT fields
      if (!payload.sub || !payload.aud || payload.aud !== 'authenticated') {
        throw new UnauthorizedException('Invalid token payload');
      }

      socket.user = {
        sub: payload.sub,
        email: payload.email as string,
        aud: payload.aud as string,
        role: payload.role as string || 'authenticated',
        exp: payload.exp || 0,
        iat: payload.iat || 0,
      };

      this.logger.log(`WebSocket authenticated user: ${payload.sub}`);
      return true;
    } catch (error) {
      this.logger.error(`JWT verification failed: ${error.message}`);
      throw new UnauthorizedException('Invalid token');
    }
  }

  private static extractTokenFromSocket(socket: AuthenticatedSocket): string | null {
    if (!socket.request) {
      return null;
    }

    // 1. From Authorization header
    const authHeader = socket.request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. From URL query parameter
    const url = parse(socket.request.url || '', true);
    const tokenQuery = url.query.token;
    if (typeof tokenQuery === 'string') {
      return tokenQuery;
    }

    return null;
  }

  static getAuthMode(): 'mock' | 'supabase' {
    return this.authMode;
  }

  static isAuthenticated(socket: AuthenticatedSocket): boolean {
    return !!socket.user && !!socket.user.sub;
  }

  static getUserId(socket: AuthenticatedSocket): string | null {
    return socket.user?.sub || null;
  }

  static getUserEmail(socket: AuthenticatedSocket): string | null {
    return socket.user?.email || null;
  }

  static requireAuth(socket: AuthenticatedSocket): void {
    if (!this.isAuthenticated(socket)) {
      throw new UnauthorizedException('Socket not authenticated');
    }
  }

  private static sendAuthError(socket: AuthenticatedSocket, message: string): void {
    // Send error message as JSON string
    const errorMessage = JSON.stringify({
      event: 'auth_error',
      message,
      timestamp: Date.now(),
    });

    if (socket.readyState === socket.OPEN) {
      socket.send(errorMessage);
    }
  }
}