import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { JwtRotationService, RotationTestResult } from '../jwt-rotation.service';

describe('JwtRotationService', () => {
  let service: JwtRotationService;
  let configService: ConfigService;
  let jwtService: JwtService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtRotationService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                SUPABASE_JWT_SECRET: 'test-jwt-secret',
                SUPABASE_URL: 'https://test.supabase.co',
                NODE_ENV: 'test',
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn(),
            verify: jest.fn(),
            decode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<JwtRotationService>(JwtRotationService);
    configService = module.get<ConfigService>(ConfigService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Key Rotation Simulation', () => {
    it('should successfully simulate key rotation', async () => {
      const result: RotationTestResult = await service.simulateKeyRotation();

      expect(result).toBeDefined();
      expect(result.scenario).toBe('Key Rotation Simulation');
      expect(result.duration).toBeGreaterThan(0);
      expect(result.details).toHaveProperty('oldKeyValidation');
      expect(result.details).toHaveProperty('newKeyValidation');
      expect(result.details).toHaveProperty('gracePeriodHandling');
      expect(result.details).toHaveProperty('cacheInvalidation');
    });

    it('should validate tokens with old key', async () => {
      const result = await service.simulateKeyRotation();
      
      expect(result.details.oldKeyValidation).toBe(true);
      expect(result.errors).not.toContain('Failed to validate token with old key');
    });

    it('should validate tokens with new key', async () => {
      const result = await service.simulateKeyRotation();
      
      expect(result.details.newKeyValidation).toBe(true);
      expect(result.errors).not.toContain('Failed to validate token with new key');
    });

    it('should handle grace period correctly', async () => {
      const result = await service.simulateKeyRotation();
      
      expect(result.details.gracePeriodHandling).toBe(true);
      expect(result.errors).not.toContain('Grace period handling failed');
    });

    it('should invalidate cache correctly', async () => {
      const result = await service.simulateKeyRotation();
      
      expect(result.details.cacheInvalidation).toBe(true);
      expect(result.errors).not.toContain('Cache invalidation failed');
    });
  });

  describe('Rotation Status Management', () => {
    it('should track rotation status', async () => {
      await service.simulateKeyRotation();
      
      const status = service.getRotationStatus();
      expect(status).toBeDefined();
      expect(status?.currentKeyId).toBeDefined();
      expect(status?.rotationInProgress).toBe(false);
      expect(status?.validKeys).toContain(status?.currentKeyId);
    });

    it('should update rotation status during simulation', async () => {
      const rotationPromise = service.simulateKeyRotation();
      
      // Check status during rotation
      setTimeout(() => {
        const status = service.getRotationStatus();
        if (status?.rotationInProgress) {
          expect(status.nextKeyId).toBeDefined();
          expect(status.gracePeriodEnd).toBeInstanceOf(Date);
        }
      }, 10);
      
      await rotationPromise;
    });
  });

  describe('Cache Management', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();
      
      expect(stats).toHaveProperty('cacheSize');
      expect(stats).toHaveProperty('keys');
      expect(stats).toHaveProperty('lastAccess');
      expect(typeof stats.cacheSize).toBe('number');
      expect(Array.isArray(stats.keys)).toBe(true);
    });

    it('should clear cache when requested', () => {
      service.clearCache();
      
      const stats = service.getCacheStats();
      expect(stats.cacheSize).toBe(0);
      expect(stats.keys).toHaveLength(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle simulation errors gracefully', async () => {
      // Create a service that will fail
      const failingService = new JwtRotationService(
        {
          get: jest.fn(() => null), // Return null for all config
        } as any,
        jwtService,
      );

      const result = await failingService.simulateKeyRotation();
      
      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.duration).toBeGreaterThan(0);
    });
  });

  describe('Token Generation and Validation', () => {
    it('should generate valid mock tokens', async () => {
      const result = await service.simulateKeyRotation();
      
      // If the simulation succeeded, tokens were generated and validated
      expect(result.details.oldKeyValidation).toBe(true);
      expect(result.details.newKeyValidation).toBe(true);
    });
  });

  describe('Key Monitoring', () => {
    it('should initialize monitoring without errors', async () => {
      await expect(service.monitorKeyRotation()).resolves.not.toThrow();
    });

    it('should handle missing JWKS configuration', async () => {
      const noConfigService = new JwtRotationService(
        {
          get: jest.fn(() => null),
        } as any,
        jwtService,
      );

      await expect(noConfigService.monitorKeyRotation()).resolves.not.toThrow();
    });
  });

  describe('Integration Test Scenarios', () => {
    it('should handle multiple concurrent rotations', async () => {
      const rotationPromises = [
        service.simulateKeyRotation(),
        service.simulateKeyRotation(),
        service.simulateKeyRotation(),
      ];

      const results = await Promise.all(rotationPromises);
      
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.duration).toBeGreaterThan(0);
      });
    });

    it('should maintain consistency across rotations', async () => {
      const result1 = await service.simulateKeyRotation();
      const status1 = service.getRotationStatus();
      
      const result2 = await service.simulateKeyRotation();
      const status2 = service.getRotationStatus();
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(status1?.currentKeyId).not.toBe(status2?.currentKeyId);
    });
  });

  describe('Performance Tests', () => {
    it('should complete rotation simulation within reasonable time', async () => {
      const startTime = Date.now();
      const result = await service.simulateKeyRotation();
      const endTime = Date.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.duration).toBeLessThan(5000);
    });

    it('should handle cache operations efficiently', () => {
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        service.getCacheStats();
      }
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Security Validations', () => {
    it('should generate unique key IDs', async () => {
      const keyIds = new Set<string>();
      
      for (let i = 0; i < 10; i++) {
        await service.simulateKeyRotation();
        const status = service.getRotationStatus();
        if (status?.currentKeyId) {
          keyIds.add(status.currentKeyId);
        }
      }
      
      expect(keyIds.size).toBeGreaterThan(1); // Should generate unique IDs
    });

    it('should properly handle key expiration', async () => {
      const result = await service.simulateKeyRotation();
      const status = service.getRotationStatus();
      
      expect(status?.gracePeriodEnd).toBeInstanceOf(Date);
      expect(status?.nextRotation).toBeInstanceOf(Date);
      expect(status?.lastRotation).toBeInstanceOf(Date);
    });
  });
});