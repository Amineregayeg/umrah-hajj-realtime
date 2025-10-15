import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

/**
 * JWT Rotation Service - Production Implementation
 *
 * Uses jose's createRemoteJWKSet for automatic JWKS fetching and caching.
 * Handles key rotation gracefully with automatic refresh on verification failure.
 */
@Injectable()
export class JwtRotationService {
  private readonly logger = new Logger(JwtRotationService.name);
  private jwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(private readonly configService: ConfigService) {
    this.initializeJwks();
  }

  /**
   * Initialize JWKS with the configured endpoint
   */
  private initializeJwks(): void {
    const jwksUri = this.configService.get<string>('SUPABASE_JWT_JWKS');

    if (!jwksUri) {
      this.logger.warn(
        'SUPABASE_JWT_JWKS not configured - JWT verification will fail in production. ' +
        'Set AUTH_MODE=mock for development/testing.',
      );
      return;
    }

    try {
      this.jwks = createRemoteJWKSet(new URL(jwksUri));
      this.logger.log(`JWKS initialized with endpoint: ${jwksUri}`);
    } catch (error) {
      this.logger.error(`Failed to initialize JWKS: ${error.message}`);
    }
  }

  /**
   * Verify JWT token with automatic JWKS rotation support
   *
   * On first verification failure, forces a fresh JWKS fetch and retries once.
   * This handles key rotation scenarios where the signing key has changed.
   *
   * @param token - JWT token to verify
   * @returns Decoded JWT payload
   * @throws UnauthorizedException if token is invalid or expired
   */
  async verify(token: string): Promise<any> {
    if (!this.jwks) {
      throw new UnauthorizedException(
        'JWT verification not available - SUPABASE_JWT_JWKS not configured',
      );
    }

    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        // Optional: Enforce issuer and audience
        // issuer: 'https://<your-project>.supabase.co/auth/v1',
        // audience: '<your-audience>',
      });
      return payload;
    } catch (err) {
      this.logger.warn(
        `JWT verify failed (will refresh JWKS & retry once): ${String(err)}`,
      );

      // Re-create JWKS (forces fresh fetch from remote endpoint) and retry exactly once
      const jwksUri = this.configService.get<string>('SUPABASE_JWT_JWKS');
      if (!jwksUri) {
        throw new UnauthorizedException('Invalid or expired token');
      }

      this.jwks = createRemoteJWKSet(new URL(jwksUri));

      try {
        const { payload } = await jwtVerify(token, this.jwks, {});
        this.logger.log('JWT verification succeeded after JWKS refresh');
        return payload;
      } catch {
        throw new UnauthorizedException('Invalid or expired token');
      }
    }
  }

  /**
   * Get JWKS initialization status
   */
  isInitialized(): boolean {
    return this.jwks !== null;
  }
}
