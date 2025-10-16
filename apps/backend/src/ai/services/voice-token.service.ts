import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AuditLogUtil, AuditLogCategory, AuditLogLevel } from '../../shared/utils/audit-log.util';
import { 
  CreateVoiceTokenDto, 
  VoiceTokenResponseDto,
  VoiceLanguage,
  VoiceGender
} from '../dto/voice-token.dto';

interface VoiceTokenClaims {
  sub: string;
  exp: number;
  iat: number;
  scope: string[];
  lang: VoiceLanguage;
  gender: VoiceGender;
  sessionId?: string;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  tokens: number[]; // Timestamps of token creations
}

@Injectable()
export class VoiceTokenService {
  private readonly logger = new Logger(VoiceTokenService.name);
  private readonly rateLimitStore = new Map<string, RateLimitEntry>();
  
  // Configuration constants
  private readonly TOKEN_TTL_SECONDS = 60; // Maximum 60 seconds TTL
  private readonly RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute window
  private readonly RATE_LIMIT_MAX_REQUESTS = 5; // 5 requests per minute
  private readonly RATE_LIMIT_BURST_CAPACITY = 10; // Burst capacity
  
  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
  ) {
    // Clean up expired rate limit entries every minute
    setInterval(() => this.cleanupRateLimits(), 60000);
  }

  async createVoiceToken(
    userId: string,
    userEmail: string,
    dto: CreateVoiceTokenDto,
    requestContext: { ipAddress?: string; userAgent?: string }
  ): Promise<VoiceTokenResponseDto> {
    const startTime = Date.now();

    try {
      // Check rate limit
      this.checkRateLimit(userId);

      // Generate token claims
      const now = Math.floor(Date.now() / 1000);
      const exp = now + this.TOKEN_TTL_SECONDS;

      const claims: VoiceTokenClaims = {
        sub: userId,
        exp,
        iat: now,
        scope: ['realtime.voice'],
        lang: dto.language,
        gender: dto.gender,
        sessionId: dto.sessionId,
      };

      // Sign the token
      const token = await this.jwtService.signAsync(claims, {
        expiresIn: this.TOKEN_TTL_SECONDS,
      });

      // Update rate limit
      this.updateRateLimit(userId);

      // Log successful token creation
      AuditLogUtil.log({
        level: AuditLogLevel.INFO,
        category: AuditLogCategory.API_ACCESS,
        timestamp: new Date(),
        userId,
        userEmail,
        action: 'voice_token_created',
        resource: 'ai_voice_token',
        details: {
          language: dto.language,
          gender: dto.gender,
          sessionId: dto.sessionId,
          ttl: this.TOKEN_TTL_SECONDS,
          scope: claims.scope,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        result: 'success',
        metadata: {
          processingTime: Date.now() - startTime,
        },
      });

      return {
        token,
        expiresAt: exp,
        ttl: this.TOKEN_TTL_SECONDS,
        scope: claims.scope,
        language: dto.language,
        gender: dto.gender,
      };
    } catch (error) {
      // Log failure
      AuditLogUtil.log({
        level: AuditLogLevel.WARN,
        category: AuditLogCategory.API_ACCESS,
        timestamp: new Date(),
        userId,
        userEmail,
        action: 'voice_token_creation_failed',
        resource: 'ai_voice_token',
        details: {
          language: dto.language,
          gender: dto.gender,
          sessionId: dto.sessionId,
        },
        ipAddress: requestContext.ipAddress,
        userAgent: requestContext.userAgent,
        result: 'failure',
        errorMessage: error.message,
        metadata: {
          processingTime: Date.now() - startTime,
          errorType: error.name,
        },
      });

      throw error;
    }
  }

  private checkRateLimit(userId: string): void {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS;
    
    let entry = this.rateLimitStore.get(userId);
    
    if (!entry) {
      entry = {
        count: 0,
        windowStart: now,
        tokens: [],
      };
      this.rateLimitStore.set(userId, entry);
    }

    // Clean up old tokens outside the window
    entry.tokens = entry.tokens.filter(timestamp => timestamp > windowStart);
    entry.count = entry.tokens.length;
    
    // Check if we're within the rate limit for the current window
    if (entry.tokens.length >= this.RATE_LIMIT_MAX_REQUESTS) {
      const oldestToken = Math.min(...entry.tokens);
      const retryAfter = Math.ceil((oldestToken + this.RATE_LIMIT_WINDOW_MS - now) / 1000);
      
      throw new BadRequestException({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.floor((oldestToken + this.RATE_LIMIT_WINDOW_MS) / 1000),
        message: `Rate limit exceeded. Please try again in ${retryAfter} seconds.`,
      });
    }

    // Check burst capacity across a longer window
    const burstWindowStart = now - (this.RATE_LIMIT_WINDOW_MS * 2);
    const totalInBurstWindow = entry.tokens.filter(
      timestamp => timestamp > burstWindowStart
    ).length;
    
    if (totalInBurstWindow >= this.RATE_LIMIT_BURST_CAPACITY) {
      const oldestInBurst = Math.min(...entry.tokens.filter(t => t > burstWindowStart));
      const retryAfter = Math.ceil((oldestInBurst + this.RATE_LIMIT_WINDOW_MS - now) / 1000);
      
      throw new BadRequestException({
        error: 'Burst capacity exceeded',
        code: 'BURST_LIMIT_EXCEEDED',
        retryAfter: Math.floor((oldestInBurst + this.RATE_LIMIT_WINDOW_MS) / 1000),
        message: `Burst limit exceeded. Please try again in ${retryAfter} seconds.`,
      });
    }
  }

  private updateRateLimit(userId: string): void {
    const entry = this.rateLimitStore.get(userId);
    if (entry) {
      entry.tokens.push(Date.now());
      entry.count = entry.tokens.length;
    }
  }

  private cleanupRateLimits(): void {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS * 2; // Keep 2 windows for burst calculation
    
    for (const [userId, entry] of this.rateLimitStore.entries()) {
      entry.tokens = entry.tokens.filter(timestamp => timestamp > windowStart);
      
      if (entry.tokens.length === 0) {
        this.rateLimitStore.delete(userId);
      }
    }
  }

  // Method to verify voice tokens (for testing or validation)
  async verifyVoiceToken(token: string): Promise<VoiceTokenClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<VoiceTokenClaims>(token);
      
      // Verify required claims
      if (!payload.scope || !payload.scope.includes('realtime.voice')) {
        throw new Error('Invalid token scope');
      }
      
      if (!payload.lang || !payload.gender) {
        throw new Error('Missing required voice claims');
      }
      
      return payload;
    } catch (error) {
      throw new BadRequestException('Invalid voice token');
    }
  }

  // Get current rate limit status for a user
  getRateLimitStatus(userId: string): { 
    remaining: number; 
    reset: number; 
    burstRemaining: number;
  } {
    const now = Date.now();
    const windowStart = now - this.RATE_LIMIT_WINDOW_MS;
    const entry = this.rateLimitStore.get(userId);
    
    if (!entry) {
      return {
        remaining: this.RATE_LIMIT_MAX_REQUESTS,
        reset: Math.floor((now + this.RATE_LIMIT_WINDOW_MS) / 1000),
        burstRemaining: this.RATE_LIMIT_BURST_CAPACITY,
      };
    }
    
    const activeTokens = entry.tokens.filter(timestamp => timestamp > windowStart);
    const burstTokens = entry.tokens.filter(
      timestamp => timestamp > (now - this.RATE_LIMIT_WINDOW_MS * 2)
    );
    
    const oldestToken = activeTokens.length > 0 ? Math.min(...activeTokens) : now;
    
    return {
      remaining: Math.max(0, this.RATE_LIMIT_MAX_REQUESTS - activeTokens.length),
      reset: Math.floor((oldestToken + this.RATE_LIMIT_WINDOW_MS) / 1000),
      burstRemaining: Math.max(0, this.RATE_LIMIT_BURST_CAPACITY - burstTokens.length),
    };
  }
}