/**
 * Comprehensive unit tests for Supabase JWT Guard
 * Covers AUTH_MODE=mock|supabase guards, token validation, and origin rejection
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { SupabaseJwtGuard } from './supabase-jwt.guard';
import { jwtVerify } from 'jose';

// Mock jose library
jest.mock('jose', () => ({
  jwtVerify: jest.fn(),
  createRemoteJWKSet: jest.fn().mockImplementation(() => ({
    url: 'mock-jwks-url'
  }))
}));

const mockJwtVerify = jwtVerify as jest.MockedFunction<typeof jwtVerify>;

describe('SupabaseJwtGuard', () => {
  let guard: SupabaseJwtGuard;
  let configService: jest.Mocked<ConfigService>;
  let mockExecutionContext: jest.Mocked<ExecutionContext>;
  let mockRequest: any;

  const createMockExecutionContext = (request: any): jest.Mocked<ExecutionContext> => ({
    switchToHttp: jest.fn().mockReturnValue({
      getRequest: jest.fn().mockReturnValue(request)
    }),
    getClass: jest.fn(),
    getHandler: jest.fn(),
    getArgs: jest.fn(),
    getArgByIndex: jest.fn(),
    switchToRpc: jest.fn(),
    switchToWs: jest.fn(),
    getType: jest.fn()
  });

  beforeEach(async () => {
    const mockConfigService = {
      get: jest.fn()
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseJwtGuard,
        {
          provide: ConfigService,
          useValue: mockConfigService
        }
      ]
    }).compile();

    configService = module.get(ConfigService);
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Mock Mode Configuration', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'development';
          case 'AUTH_MODE': return 'mock';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);
    });

    it('should initialize in mock mode when AUTH_MODE=mock', () => {
      expect(configService.get).toHaveBeenCalledWith('AUTH_MODE', '');
      // Guard should be initialized without throwing
      expect(guard).toBeDefined();
    });

    it('should allow requests in mock mode with default user', async () => {
      mockRequest = {
        headers: {}
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toBeDefined();
      expect(mockRequest.user.id).toBe('mock-user-123');
      expect(mockRequest.user.email).toBe('mock@example.com');
    });

    it('should extract user ID from Bearer token in mock mode', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer dummy-jwt-custom-user-456'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user.id).toBe('custom-user-456');
      expect(mockRequest.user.sub).toBe('custom-user-456');
    });

    it('should handle various mock user IDs', async () => {
      const testUserIds = ['user1', 'test-123', 'admin-user', 'special-chars-@#$'];
      
      for (const userId of testUserIds) {
        mockRequest = {
          headers: {
            authorization: `Bearer dummy-jwt-${userId}`
          }
        };
        mockExecutionContext = createMockExecutionContext(mockRequest);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(mockRequest.user.id).toBe(userId);
      }
    });

    it('should set proper mock user properties', async () => {
      mockRequest = { headers: {} };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await guard.canActivate(mockExecutionContext);

      expect(mockRequest.user).toMatchObject({
        id: 'mock-user-123',
        sub: 'mock-user-123',
        email: 'mock@example.com',
        aud: 'authenticated',
        role: 'authenticated'
      });
      expect(mockRequest.user.exp).toBeGreaterThan(Math.floor(Date.now() / 1000));
      expect(mockRequest.user.iat).toBeLessThanOrEqual(Math.floor(Date.now() / 1000));
    });
  });

  describe('Supabase Mode Configuration', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'production';
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });
    });

    it('should initialize in supabase mode when AUTH_MODE=supabase', () => {
      guard = new SupabaseJwtGuard(configService);
      expect(configService.get).toHaveBeenCalledWith('SUPABASE_URL');
      expect(guard).toBeDefined();
    });

    it('should throw error if SUPABASE_URL is missing in supabase mode', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return undefined;
          default: return defaultValue;
        }
      });

      expect(() => new SupabaseJwtGuard(configService)).toThrow(
        'SUPABASE_URL environment variable is required for Supabase auth mode'
      );
    });

    it('should default to supabase mode in production', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'production';
          case 'AUTH_MODE': return ''; // Empty string
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });

      guard = new SupabaseJwtGuard(configService);
      expect(guard).toBeDefined();
    });
  });

  describe('Supabase Mode Token Validation', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);
    });

    it('should reject requests without authorization header', async () => {
      mockRequest = { headers: {} };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('No token provided')
      );
    });

    it('should reject requests with invalid authorization format', async () => {
      mockRequest = {
        headers: {
          authorization: 'InvalidFormat token123'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('No token provided')
      );
    });

    it('should reject requests with missing Bearer token', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('No token provided')
      );
    });

    it('should validate valid JWT token successfully', async () => {
      const mockPayload = {
        sub: 'user-123',
        aud: 'authenticated',
        email: 'test@example.com',
        exp: Math.floor(Date.now() / 1000) + 3600,
        iat: Math.floor(Date.now() / 1000)
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' }
      });

      mockRequest = {
        headers: {
          authorization: 'Bearer valid.jwt.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user).toEqual(mockPayload);
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'valid.jwt.token',
        expect.any(Object),
        {
          algorithms: ['RS256'],
          audience: 'authenticated'
        }
      );
    });

    it('should reject tokens with invalid audience', async () => {
      const mockPayload = {
        sub: 'user-123',
        aud: 'invalid-audience',
        email: 'test@example.com'
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' }
      });

      mockRequest = {
        headers: {
          authorization: 'Bearer invalid.audience.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should reject tokens without required sub field', async () => {
      const mockPayload = {
        aud: 'authenticated',
        email: 'test@example.com'
        // Missing sub field
      };

      mockJwtVerify.mockResolvedValue({
        payload: mockPayload,
        protectedHeader: { alg: 'RS256' }
      });

      mockRequest = {
        headers: {
          authorization: 'Bearer missing.sub.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle JWT verification failures', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Invalid signature'));

      mockRequest = {
        headers: {
          authorization: 'Bearer invalid.signature.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle expired tokens', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Token expired'));

      mockRequest = {
        headers: {
          authorization: 'Bearer expired.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle malformed tokens', async () => {
      mockJwtVerify.mockRejectedValue(new Error('Malformed token'));

      mockRequest = {
        headers: {
          authorization: 'Bearer malformed-token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });
  });

  describe('Environment-based Mode Selection', () => {
    it('should use mock mode in development by default', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'development';
          case 'AUTH_MODE': return ''; // Not specified
          default: return defaultValue;
        }
      });

      guard = new SupabaseJwtGuard(configService);
      expect(guard).toBeDefined();
    });

    it('should use supabase mode in test environment when AUTH_MODE=supabase', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'test';
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });

      guard = new SupabaseJwtGuard(configService);
      expect(guard).toBeDefined();
    });

    it('should respect explicit AUTH_MODE=mock in production', () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'NODE_ENV': return 'production';
          case 'AUTH_MODE': return 'mock';
          default: return defaultValue;
        }
      });

      guard = new SupabaseJwtGuard(configService);
      expect(guard).toBeDefined();
    });
  });

  describe('Token Extraction Edge Cases', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);
    });

    it('should handle authorization header with extra spaces', async () => {
      mockRequest = {
        headers: {
          authorization: '  Bearer   token123  '
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      // Should still extract token123 correctly
      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
      
      // Verify that jwtVerify was called with the trimmed token
      expect(mockJwtVerify).toHaveBeenCalledWith(
        'token123',
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle case-sensitive Bearer keyword', async () => {
      mockRequest = {
        headers: {
          authorization: 'bearer token123'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('No token provided')
      );
    });

    it('should handle empty token after Bearer', async () => {
      mockRequest = {
        headers: {
          authorization: 'Bearer '
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('No token provided')
      );
    });
  });

  describe('Security Edge Cases', () => {
    it('should not leak sensitive information in error messages', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);

      mockJwtVerify.mockRejectedValue(new Error('Detailed internal error with sensitive data'));

      mockRequest = {
        headers: {
          authorization: 'Bearer some.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });

    it('should handle null/undefined request objects gracefully', async () => {
      configService.get.mockImplementation((key: string) => {
        switch (key) {
          case 'AUTH_MODE': return 'mock';
          default: return undefined;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);

      const mockContextWithNullRequest = {
        switchToHttp: jest.fn().mockReturnValue({
          getRequest: jest.fn().mockReturnValue(null)
        })
      } as any;

      // Should handle gracefully without crashing
      await expect(guard.canActivate(mockContextWithNullRequest)).rejects.toThrow();
    });

    it('should validate payload structure completely', async () => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'supabase';
          case 'SUPABASE_URL': return 'https://test.supabase.co';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);

      const incompletePayload = {
        sub: 'user-123',
        // Missing aud field
        email: 'test@example.com'
      };

      mockJwtVerify.mockResolvedValue({
        payload: incompletePayload,
        protectedHeader: { alg: 'RS256' }
      });

      mockRequest = {
        headers: {
          authorization: 'Bearer incomplete.payload.token'
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await expect(guard.canActivate(mockExecutionContext)).rejects.toThrow(
        new UnauthorizedException('Invalid token')
      );
    });
  });

  describe('Mock Mode Special Cases', () => {
    beforeEach(() => {
      configService.get.mockImplementation((key: string, defaultValue?: any) => {
        switch (key) {
          case 'AUTH_MODE': return 'mock';
          default: return defaultValue;
        }
      });
      
      guard = new SupabaseJwtGuard(configService);
    });

    it('should handle special characters in mock user IDs', async () => {
      const specialUserIds = [
        'user@domain.com',
        'user-with-dashes',
        'user_with_underscores',
        'user.with.dots',
        'user123456789'
      ];

      for (const userId of specialUserIds) {
        mockRequest = {
          headers: {
            authorization: `Bearer dummy-jwt-${userId}`
          }
        };
        mockExecutionContext = createMockExecutionContext(mockRequest);

        const result = await guard.canActivate(mockExecutionContext);

        expect(result).toBe(true);
        expect(mockRequest.user.id).toBe(userId);
      }
    });

    it('should handle empty authorization headers gracefully in mock mode', async () => {
      mockRequest = {
        headers: {
          authorization: ''
        }
      };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      const result = await guard.canActivate(mockExecutionContext);

      expect(result).toBe(true);
      expect(mockRequest.user.id).toBe('mock-user-123'); // Default user
    });

    it('should generate consistent mock tokens', async () => {
      mockRequest = { headers: {} };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await guard.canActivate(mockExecutionContext);
      const firstUser = { ...mockRequest.user };

      // Clear and test again
      mockRequest = { headers: {} };
      mockExecutionContext = createMockExecutionContext(mockRequest);

      await guard.canActivate(mockExecutionContext);
      const secondUser = { ...mockRequest.user };

      expect(firstUser.id).toBe(secondUser.id);
      expect(firstUser.email).toBe(secondUser.email);
      expect(firstUser.role).toBe(secondUser.role);
    });
  });
});