import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AIController } from './ai.controller';
import { AIService } from './ai.service';
import { VoiceTokenService } from './services/voice-token.service';
import { VoiceLanguage, VoiceGender } from './dto/voice-token.dto';

// Mock the SupabaseJwtGuard to avoid jose import issues in tests
jest.mock('../auth/guards/supabase-jwt.guard', () => ({
  SupabaseJwtGuard: jest.fn().mockImplementation(() => ({
    canActivate: jest.fn(() => true),
  })),
}));

describe('AIController - Voice Token Endpoint', () => {
  let controller: AIController;
  let voiceTokenService: VoiceTokenService;

  const mockAIService = {
    chat: jest.fn(),
    generateContent: jest.fn(),
    translate: jest.fn(),
    getRecommendations: jest.fn(),
    getPrayerGuidance: jest.fn(),
    getRitualAssistance: jest.fn(),
    getUsageStats: jest.fn(),
    getChatHistory: jest.fn(),
    deleteChatHistory: jest.fn(),
  };

  const mockVoiceTokenService = {
    createVoiceToken: jest.fn(),
    verifyVoiceToken: jest.fn(),
    getRateLimitStatus: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn(),
    verifyAsync: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AIController],
      providers: [
        {
          provide: AIService,
          useValue: mockAIService,
        },
        {
          provide: VoiceTokenService,
          useValue: mockVoiceTokenService,
        },
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

    controller = module.get<AIController>(AIController);
    voiceTokenService = module.get<VoiceTokenService>(VoiceTokenService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /ai/voice/token', () => {
    const mockRequest = {
      user: {
        sub: 'user-123',
        email: 'user@example.com',
      },
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'Test Agent',
      },
    };

    const mockCreateVoiceTokenDto = {
      language: VoiceLanguage.ARABIC,
      gender: VoiceGender.MALE,
      sessionId: 'test-session',
    };

    const mockTokenResponse = {
      token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test.token',
      expiresAt: Math.floor(Date.now() / 1000) + 60,
      ttl: 60,
      scope: ['realtime.voice'],
      language: VoiceLanguage.ARABIC,
      gender: VoiceGender.MALE,
    };

    it('should create voice token successfully', async () => {
      mockVoiceTokenService.createVoiceToken.mockResolvedValue(mockTokenResponse);

      const result = await controller.createVoiceToken(
        mockRequest,
        mockCreateVoiceTokenDto
      );

      expect(result).toEqual(mockTokenResponse);
      expect(voiceTokenService.createVoiceToken).toHaveBeenCalledWith(
        'user-123',
        'user@example.com',
        mockCreateVoiceTokenDto,
        expect.objectContaining({
          ipAddress: '127.0.0.1',
          userAgent: 'Test Agent',
          userId: 'user-123',
          userEmail: 'user@example.com',
        })
      );
    });

    it('should handle missing user ID in token', async () => {
      const requestWithoutUserId = {
        ...mockRequest,
        user: {
          email: 'user@example.com',
          // sub is missing
        },
      };

      await expect(
        controller.createVoiceToken(requestWithoutUserId, mockCreateVoiceTokenDto)
      ).rejects.toThrow(BadRequestException);

      expect(voiceTokenService.createVoiceToken).not.toHaveBeenCalled();
    });

    it('should handle rate limit exceeded error', async () => {
      const rateLimitError = new BadRequestException({
        error: 'Rate limit exceeded',
        code: 'RATE_LIMIT_EXCEEDED',
        retryAfter: Math.floor(Date.now() / 1000) + 60,
        message: 'Rate limit exceeded. Please try again in 60 seconds.',
      });

      mockVoiceTokenService.createVoiceToken.mockRejectedValue(rateLimitError);

      await expect(
        controller.createVoiceToken(mockRequest, mockCreateVoiceTokenDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle service errors gracefully', async () => {
      mockVoiceTokenService.createVoiceToken.mockRejectedValue(
        new Error('Internal service error')
      );

      await expect(
        controller.createVoiceToken(mockRequest, mockCreateVoiceTokenDto)
      ).rejects.toThrow(BadRequestException);
    });

    it('should work with AUTH_MODE=mock', async () => {
      const mockRequestAuth = {
        user: {
          sub: 'mock-user-123',
          email: 'mock@example.com',
          aud: 'authenticated',
          role: 'authenticated',
          exp: Math.floor(Date.now() / 1000) + 3600,
          iat: Math.floor(Date.now() / 1000),
        },
        ip: '127.0.0.1',
        headers: {
          'user-agent': 'Mock Test Agent',
        },
      };

      mockVoiceTokenService.createVoiceToken.mockResolvedValue({
        ...mockTokenResponse,
        token: 'mock.jwt.token',
      });

      const result = await controller.createVoiceToken(
        mockRequestAuth,
        mockCreateVoiceTokenDto
      );

      expect(result.token).toBe('mock.jwt.token');
      expect(voiceTokenService.createVoiceToken).toHaveBeenCalledWith(
        'mock-user-123',
        'mock@example.com',
        mockCreateVoiceTokenDto,
        expect.any(Object)
      );
    });

    it('should handle different language and gender combinations', async () => {
      const testCases = [
        {
          language: VoiceLanguage.ENGLISH,
          gender: VoiceGender.FEMALE,
        },
        {
          language: VoiceLanguage.URDU,
          gender: VoiceGender.NEUTRAL,
        },
        {
          language: VoiceLanguage.INDONESIAN,
          gender: VoiceGender.MALE,
        },
      ];

      for (const testCase of testCases) {
        mockVoiceTokenService.createVoiceToken.mockResolvedValue({
          ...mockTokenResponse,
          language: testCase.language,
          gender: testCase.gender,
        });

        const result = await controller.createVoiceToken(mockRequest, testCase);

        expect(result.language).toBe(testCase.language);
        expect(result.gender).toBe(testCase.gender);
      }
    });

    it('should extract correct request context information', async () => {
      const requestWithHeaders = {
        user: {
          sub: 'user-456',
          email: 'user456@example.com',
        },
        ip: '192.168.1.100',
        headers: {
          'user-agent': 'Mozilla/5.0 (Test Browser)',
          'x-forwarded-for': '203.0.113.1, 192.168.1.100',
        },
        connection: {
          remoteAddress: '10.0.0.1',
        },
      };

      mockVoiceTokenService.createVoiceToken.mockResolvedValue(mockTokenResponse);

      await controller.createVoiceToken(requestWithHeaders, mockCreateVoiceTokenDto);

      expect(voiceTokenService.createVoiceToken).toHaveBeenCalledWith(
        'user-456',
        'user456@example.com',
        mockCreateVoiceTokenDto,
        expect.objectContaining({
          ipAddress: expect.any(String),
          userAgent: 'Mozilla/5.0 (Test Browser)',
          userId: 'user-456',
          userEmail: 'user456@example.com',
        })
      );
    });

    it('should enforce TTL <= 60 seconds in response', async () => {
      mockVoiceTokenService.createVoiceToken.mockResolvedValue(mockTokenResponse);

      const result = await controller.createVoiceToken(
        mockRequest,
        mockCreateVoiceTokenDto
      );

      expect(result.ttl).toBeLessThanOrEqual(60);
      expect(result.expiresAt).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(result.expiresAt).toBeLessThanOrEqual(
        Math.floor(Date.now() / 1000) + 60
      );
    });

    it('should include correct scope in response', async () => {
      mockVoiceTokenService.createVoiceToken.mockResolvedValue(mockTokenResponse);

      const result = await controller.createVoiceToken(
        mockRequest,
        mockCreateVoiceTokenDto
      );

      expect(result.scope).toContain('realtime.voice');
      expect(result.scope).toHaveLength(1);
    });

    it('should handle optional sessionId parameter', async () => {
      const dtoWithoutSession = {
        language: VoiceLanguage.ARABIC,
        gender: VoiceGender.MALE,
        // sessionId is optional
      };

      mockVoiceTokenService.createVoiceToken.mockResolvedValue(mockTokenResponse);

      const result = await controller.createVoiceToken(mockRequest, dtoWithoutSession);

      expect(result).toEqual(mockTokenResponse);
      expect(voiceTokenService.createVoiceToken).toHaveBeenCalledWith(
        'user-123',
        'user@example.com',
        dtoWithoutSession,
        expect.any(Object)
      );
    });
  });
});