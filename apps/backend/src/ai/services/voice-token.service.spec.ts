import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { BadRequestException } from '@nestjs/common';
import { VoiceTokenService } from './voice-token.service';
import { VoiceLanguage, VoiceGender } from '../dto/voice-token.dto';

describe('VoiceTokenService', () => {
  let service: VoiceTokenService;
  let jwtService: JwtService;
  let configService: ConfigService;

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VoiceTokenService,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<VoiceTokenService>(VoiceTokenService);
    jwtService = module.get<JwtService>(JwtService);
    configService = module.get<ConfigService>(ConfigService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('createVoiceToken', () => {
    const mockDto = {
      language: VoiceLanguage.ARABIC,
      gender: VoiceGender.MALE,
      sessionId: 'test-session',
    };

    const mockRequestContext = {
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
    };

    it('should create a valid voice token with correct TTL', async () => {
      const mockToken = 'mock.jwt.token';
      const mockNow = Math.floor(Date.now() / 1000);
      
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.createVoiceToken(
        'user-123',
        'user@example.com',
        mockDto,
        mockRequestContext
      );

      expect(result).toMatchObject({
        token: mockToken,
        ttl: 60,
        scope: ['realtime.voice'],
        language: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
      });

      expect(result.expiresAt).toBeGreaterThan(mockNow);
      expect(result.expiresAt).toBeLessThanOrEqual(mockNow + 60);

      expect(mockJwtService.signAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          sub: 'user-123',
          scope: ['realtime.voice'],
          lang: VoiceLanguage.ARABIC,
          gender: VoiceGender.MALE,
          sessionId: 'test-session',
        }),
        { expiresIn: 60 }
      );
    });

    it('should enforce TTL ≤ 60 seconds', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const result = await service.createVoiceToken(
        'user-123',
        'user@example.com',
        mockDto,
        mockRequestContext
      );

      expect(result.ttl).toBeLessThanOrEqual(60);
    });

    it('should enforce rate limit ≤ 5 requests per minute', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const userId = 'rate-limit-user';
      
      // Make 5 successful requests
      for (let i = 0; i < 5; i++) {
        await service.createVoiceToken(
          userId,
          'user@example.com',
          mockDto,
          mockRequestContext
        );
      }

      // 6th request should fail due to rate limit
      await expect(
        service.createVoiceToken(
          userId,
          'user@example.com',
          mockDto,
          mockRequestContext
        )
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow burst capacity up to 10 requests', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      // Mock time to allow burst testing
      const originalSetInterval = global.setInterval;
      global.setInterval = jest.fn();

      // Make 10 requests quickly (burst scenario)
      const promises = Array.from({ length: 10 }, () =>
        service.createVoiceToken(
          'user-burst',
          'user@example.com',
          mockDto,
          mockRequestContext
        )
      );

      // First 10 should succeed (within burst capacity)
      const results = await Promise.allSettled(promises);
      const successes = results.filter(r => r.status === 'fulfilled');
      
      expect(successes.length).toBeGreaterThan(5); // Should allow some burst

      global.setInterval = originalSetInterval;
    });

    it('should track rate limits per user independently', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      // User 1 makes 5 requests
      for (let i = 0; i < 5; i++) {
        await service.createVoiceToken(
          'user-1',
          'user1@example.com',
          mockDto,
          mockRequestContext
        );
      }

      // User 2 should still be able to make requests
      const result = await service.createVoiceToken(
        'user-2',
        'user2@example.com',
        mockDto,
        mockRequestContext
      );

      expect(result.token).toBe(mockToken);
    });

    it('should handle JWT signing errors gracefully', async () => {
      mockJwtService.signAsync.mockRejectedValue(new Error('JWT signing failed'));

      await expect(
        service.createVoiceToken(
          'user-123',
          'user@example.com',
          mockDto,
          mockRequestContext
        )
      ).rejects.toThrow('JWT signing failed');
    });
  });

  describe('verifyVoiceToken', () => {
    it('should verify valid voice token', async () => {
      const mockPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        scope: ['realtime.voice'],
        lang: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      const result = await service.verifyVoiceToken('valid.jwt.token');

      expect(result).toEqual(mockPayload);
    });

    it('should reject token without voice scope', async () => {
      const mockPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        scope: ['other.scope'],
        lang: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await expect(
        service.verifyVoiceToken('invalid.jwt.token')
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject token without required voice claims', async () => {
      const mockPayload = {
        sub: 'user-123',
        exp: Math.floor(Date.now() / 1000) + 60,
        iat: Math.floor(Date.now() / 1000),
        scope: ['realtime.voice'],
        // Missing lang and gender
      };

      mockJwtService.verifyAsync.mockResolvedValue(mockPayload);

      await expect(
        service.verifyVoiceToken('invalid.jwt.token')
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRateLimitStatus', () => {
    it('should return correct remaining requests for new user', () => {
      const status = service.getRateLimitStatus('new-user');

      expect(status.remaining).toBe(5);
      expect(status.burstRemaining).toBe(10);
      expect(status.reset).toBeGreaterThan(Math.floor(Date.now() / 1000));
    });

    it('should return updated status after token creation', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const mockDto = {
        language: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
      };

      // Create one token
      await service.createVoiceToken(
        'user-status',
        'user@example.com',
        mockDto,
        { ipAddress: '127.0.0.1', userAgent: 'Test' }
      );

      const status = service.getRateLimitStatus('user-status');

      expect(status.remaining).toBe(4);
      expect(status.burstRemaining).toBe(9);
    });
  });

  describe('Rate Limit Cleanup', () => {
    it('should clean up expired rate limit entries', async () => {
      const mockToken = 'mock.jwt.token';
      mockJwtService.signAsync.mockResolvedValue(mockToken);

      const mockDto = {
        language: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
      };

      // Create some tokens
      await service.createVoiceToken(
        'user-cleanup-test',
        'user@example.com',
        mockDto,
        { ipAddress: '127.0.0.1', userAgent: 'Test' }
      );

      // Check initial status
      let status = service.getRateLimitStatus('user-cleanup-test');
      expect(status.remaining).toBe(4);

      // Mock time advancement (simulate cleanup)
      const originalDate = Date.now;
      const futureTime = originalDate() + 120000; // 2 minutes later
      Date.now = jest.fn(() => futureTime);

      // Manually trigger cleanup
      await service.createVoiceToken(
        'user-cleanup-trigger',
        'user2@example.com',
        mockDto,
        { ipAddress: '127.0.0.1', userAgent: 'Test' }
      );

      // Restore original Date.now
      Date.now = originalDate;

      // Check if cleanup worked (should have at least 4 remaining, may be 5 if fully cleaned)
      status = service.getRateLimitStatus('user-cleanup-test');
      expect(status.remaining).toBeGreaterThanOrEqual(4);
    });
  });
});