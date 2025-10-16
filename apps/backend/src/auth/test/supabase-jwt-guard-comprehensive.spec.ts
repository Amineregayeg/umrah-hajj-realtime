/**
 * Comprehensive table-driven tests for Supabase JWT Guard
 * Tests token validation, user extraction, and edge cases
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { SupabaseJwtGuard } from '../guards/supabase-jwt.guard';
import { JwtService } from '@nestjs/jwt';
import { createRequest } from 'node-mocks-http';

describe('Supabase JWT Guard Comprehensive Tests', () => {
  let guard: SupabaseJwtGuard;
  let jwtService: JwtService;

  const mockJwtService = {
    verify: jest.fn(),
    decode: jest.fn(),
  };

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupabaseJwtGuard,
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
      ],
    }).compile();

    guard = module.get<SupabaseJwtGuard>(SupabaseJwtGuard);
    jwtService = module.get<JwtService>(JwtService);
    
    jest.clearAllMocks();
  });

  describe('Token Extraction from Headers', () => {
    const tokenExtractionCases = [
      // [authorization_header, expected_token, should_succeed, description]
      ['Bearer valid.jwt.token', 'valid.jwt.token', true, 'valid Bearer token'],
      ['Bearer ', null, false, 'Bearer with empty token'],
      ['bearer valid.jwt.token', 'valid.jwt.token', true, 'lowercase bearer'],
      ['BEARER valid.jwt.token', 'valid.jwt.token', true, 'uppercase Bearer'],
      ['Bearer  valid.jwt.token', 'valid.jwt.token', true, 'Bearer with extra space'],
      ['Basic dXNlcjpwYXNz', null, false, 'Basic auth instead of Bearer'],
      ['valid.jwt.token', null, false, 'token without Bearer prefix'],
      ['', null, false, 'empty authorization header'],
      [null, null, false, 'missing authorization header'],
      [undefined, null, false, 'undefined authorization header'],
      ['Bearer token.with.multiple.dots.here', 'token.with.multiple.dots.here', true, 'token with many dots'],
      ['Bearer token-with-hyphens_and_underscores', 'token-with-hyphens_and_underscores', true, 'token with special chars'],
    ] as const;

    tokenExtractionCases.forEach(([authHeader, expectedToken, shouldSucceed, description], index) => {
      it(`should handle ${description} (case ${index + 1})`, async () => {
        const request = createRequest({
          headers: authHeader ? { authorization: authHeader } : {},
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        if (shouldSucceed && expectedToken) {
          // Mock successful JWT verification
          mockJwtService.verify.mockReturnValue({
            sub: 'user-123',
            email: 'test@example.com',
            role: 'authenticated',
            iat: Math.floor(Date.now() / 1000),
            exp: Math.floor(Date.now() / 1000) + 3600,
          });

          const result = await guard.canActivate(context);
          expect(result).toBe(true);
          expect(mockJwtService.verify).toHaveBeenCalledWith(expectedToken);
        } else {
          const result = await guard.canActivate(context);
          expect(result).toBe(false);
          
          if (expectedToken) {
            expect(mockJwtService.verify).toHaveBeenCalledWith(expectedToken);
          } else {
            expect(mockJwtService.verify).not.toHaveBeenCalled();
          }
        }
      });
    });
  });

  describe('JWT Token Validation', () => {
    const jwtValidationCases = [
      {
        name: 'valid token with all required fields',
        token: 'valid.token.here',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'expired token',
        token: 'expired.token.here',
        payload: null,
        shouldSucceed: false,
        expectedError: 'TokenExpiredError',
      },
      {
        name: 'invalid signature',
        token: 'invalid.signature.token',
        payload: null,
        shouldSucceed: false,
        expectedError: 'JsonWebTokenError',
      },
      {
        name: 'malformed token',
        token: 'malformed.token',
        payload: null,
        shouldSucceed: false,
        expectedError: 'JsonWebTokenError',
      },
      {
        name: 'token without sub claim',
        token: 'no.sub.token',
        payload: {
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
        expectedError: 'missing sub claim',
      },
      {
        name: 'token without email claim',
        token: 'no.email.token',
        payload: {
          sub: 'user-123',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
        expectedError: 'missing email claim',
      },
      {
        name: 'token with invalid role',
        token: 'invalid.role.token',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'anonymous',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
        expectedError: 'invalid role',
      },
      {
        name: 'token issued in future',
        token: 'future.token.here',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000) + 3600, // Future timestamp
          exp: Math.floor(Date.now() / 1000) + 7200,
        },
        shouldSucceed: false,
        expectedError: 'token not yet valid',
      },
    ] as const;

    jwtValidationCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const request = createRequest({
          headers: { authorization: `Bearer ${testCase.token}` },
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        if (testCase.shouldSucceed) {
          mockJwtService.verify.mockReturnValue(testCase.payload);
          
          const result = await guard.canActivate(context);
          expect(result).toBe(true);
          expect(request.user).toEqual(testCase.payload);
        } else {
          if (testCase.payload === null) {
            mockJwtService.verify.mockImplementation(() => {
              throw new Error(testCase.expectedError!);
            });
          } else {
            mockJwtService.verify.mockReturnValue(testCase.payload);
          }

          const result = await guard.canActivate(context);
          expect(result).toBe(false);
        }
      });
    });
  });

  describe('User Context Attachment', () => {
    it('should attach verified user to request object', async () => {
      const validPayload = {
        sub: 'user-456',
        email: 'user@example.com',
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
        app_metadata: {
          provider: 'supabase',
          providers: ['supabase'],
        },
        user_metadata: {
          name: 'Test User',
          avatar_url: 'https://example.com/avatar.jpg',
        },
      };

      const request = createRequest({
        headers: { authorization: 'Bearer valid.token' },
      });

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      mockJwtService.verify.mockReturnValue(validPayload);

      const result = await guard.canActivate(context);
      
      expect(result).toBe(true);
      expect(request.user).toEqual(validPayload);
      expect(request.user.sub).toBe('user-456');
      expect(request.user.email).toBe('user@example.com');
    });

    it('should not attach user on validation failure', async () => {
      const request = createRequest({
        headers: { authorization: 'Bearer invalid.token' },
      });

      const context = {
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext;

      mockJwtService.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      const result = await guard.canActivate(context);
      
      expect(result).toBe(false);
      expect(request.user).toBeUndefined();
    });
  });

  describe('Multiple Authentication Attempts', () => {
    it('should handle rapid sequential authentication attempts', async () => {
      const validPayload = {
        sub: 'user-789',
        email: 'rapid@example.com',
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(validPayload);

      const requests = Array.from({ length: 10 }, () => createRequest({
        headers: { authorization: 'Bearer valid.token' },
      }));

      const contexts = requests.map(request => ({
        switchToHttp: () => ({
          getRequest: () => request,
        }),
      } as ExecutionContext));

      // Execute all authentication attempts
      const results = await Promise.all(
        contexts.map(context => guard.canActivate(context))
      );

      // All should succeed
      expect(results.every(result => result === true)).toBe(true);
      
      // All requests should have user attached
      expect(requests.every(request => request.user?.sub === 'user-789')).toBe(true);
      
      // JWT service should be called for each attempt
      expect(mockJwtService.verify).toHaveBeenCalledTimes(10);
    });
  });

  describe('Token Refresh and Rotation', () => {
    const tokenRotationCases = [
      {
        name: 'token near expiry should still be valid',
        token: 'near.expiry.token',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000) - 3000, // 50 minutes ago
          exp: Math.floor(Date.now() / 1000) + 600,  // 10 minutes from now
        },
        shouldSucceed: true,
      },
      {
        name: 'freshly issued token should be valid',
        token: 'fresh.token',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000) - 60, // 1 minute ago
          exp: Math.floor(Date.now() / 1000) + 3540, // 59 minutes from now
        },
        shouldSucceed: true,
      },
      {
        name: 'token with very long expiry should be valid',
        token: 'long.expiry.token',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        },
        shouldSucceed: true,
      },
    ] as const;

    tokenRotationCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const request = createRequest({
          headers: { authorization: `Bearer ${testCase.token}` },
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        mockJwtService.verify.mockReturnValue(testCase.payload);

        const result = await guard.canActivate(context);
        
        if (testCase.shouldSucceed) {
          expect(result).toBe(true);
          expect(request.user).toEqual(testCase.payload);
        } else {
          expect(result).toBe(false);
        }
      });
    });
  });

  describe('Security Edge Cases', () => {
    const securityCases = [
      {
        name: 'token with SQL injection attempt in sub',
        payload: {
          sub: "'; DROP TABLE users; --",
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
      },
      {
        name: 'token with XSS attempt in email',
        payload: {
          sub: 'user-123',
          email: '<script>alert("xss")</script>@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
      },
      {
        name: 'token with extremely long sub claim',
        payload: {
          sub: 'x'.repeat(10000),
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
      },
      {
        name: 'token with null byte in email',
        payload: {
          sub: 'user-123',
          email: 'test\x00@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        },
        shouldSucceed: false,
      },
      {
        name: 'token with object injection attempt',
        payload: {
          sub: 'user-123',
          email: 'test@example.com',
          role: 'authenticated',
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
          __proto__: { admin: true },
        },
        shouldSucceed: false,
      },
    ] as const;

    securityCases.forEach((testCase, index) => {
      it(`should reject ${testCase.name} (case ${index + 1})`, async () => {
        const request = createRequest({
          headers: { authorization: 'Bearer malicious.token' },
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        mockJwtService.verify.mockReturnValue(testCase.payload);

        const result = await guard.canActivate(context);
        expect(result).toBe(false);
        expect(request.user).toBeUndefined();
      });
    });
  });

  describe('Performance and Rate Limiting', () => {
    it('should handle high frequency authentication requests efficiently', async () => {
      const validPayload = {
        sub: 'user-perf',
        email: 'perf@example.com',
        role: 'authenticated',
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600,
      };

      mockJwtService.verify.mockReturnValue(validPayload);

      const requestCount = 100;
      const startTime = Date.now();

      const authPromises = Array.from({ length: requestCount }, () => {
        const request = createRequest({
          headers: { authorization: 'Bearer valid.token' },
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        return guard.canActivate(context);
      });

      const results = await Promise.all(authPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      expect(results.every(result => result === true)).toBe(true);
      
      // Should complete within reasonable time (adjust threshold as needed)
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 100 requests
      
      // Average time per request should be reasonable
      const avgTimePerRequest = totalTime / requestCount;
      expect(avgTimePerRequest).toBeLessThan(50); // 50ms per request
    });
  });

  describe('Different User Types and Roles', () => {
    const userRoleCases = [
      {
        role: 'authenticated',
        shouldSucceed: true,
        description: 'authenticated user',
      },
      {
        role: 'service_role',
        shouldSucceed: true,
        description: 'service role user',
      },
      {
        role: 'anon',
        shouldSucceed: false,
        description: 'anonymous user',
      },
      {
        role: 'admin',
        shouldSucceed: true,
        description: 'admin user',
      },
      {
        role: '',
        shouldSucceed: false,
        description: 'empty role',
      },
      {
        role: null,
        shouldSucceed: false,
        description: 'null role',
      },
      {
        role: undefined,
        shouldSucceed: false,
        description: 'undefined role',
      },
    ] as const;

    userRoleCases.forEach((testCase, index) => {
      it(`should handle ${testCase.description} (case ${index + 1})`, async () => {
        const payload = {
          sub: 'user-123',
          email: 'test@example.com',
          role: testCase.role,
          iat: Math.floor(Date.now() / 1000),
          exp: Math.floor(Date.now() / 1000) + 3600,
        };

        const request = createRequest({
          headers: { authorization: 'Bearer test.token' },
        });

        const context = {
          switchToHttp: () => ({
            getRequest: () => request,
          }),
        } as ExecutionContext;

        mockJwtService.verify.mockReturnValue(payload);

        const result = await guard.canActivate(context);
        
        if (testCase.shouldSucceed) {
          expect(result).toBe(true);
          expect(request.user).toEqual(payload);
        } else {
          expect(result).toBe(false);
          expect(request.user).toBeUndefined();
        }
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});