/**
 * Table-driven tests for consent DTO validation and business rules
 * Tests consent creation, updates, validation, and compliance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from '../consent.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateConsentDto } from '../dto/create-consent.dto';
import { UpdateConsentDto } from '../dto/update-consent.dto';
import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';

describe('Consent DTO Validation Tests', () => {
  let service: ConsentService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    consent: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ConsentService>(ConsentService);
    prismaService = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('CreateConsentDto Validation', () => {
    const createConsentCases = [
      {
        name: 'valid basic consent',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          metadata: {
            source: 'app',
            userAgent: 'mobile-app/1.0',
            ipAddress: '192.168.1.1',
          },
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'valid marketing consent',
        input: {
          userId: 'user-456',
          type: 'marketing',
          granted: false,
          version: '2.1',
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          metadata: {
            source: 'web',
            campaign: 'summer2024',
            channel: 'email',
          },
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'missing userId',
        input: {
          type: 'data_processing',
          granted: true,
          version: '1.0',
        },
        shouldPass: false,
        expectedErrors: ['userId'],
      },
      {
        name: 'empty userId',
        input: {
          userId: '',
          type: 'data_processing',
          granted: true,
          version: '1.0',
        },
        shouldPass: false,
        expectedErrors: ['userId'],
      },
      {
        name: 'invalid consent type',
        input: {
          userId: 'user-123',
          type: 'invalid_type',
          granted: true,
          version: '1.0',
        },
        shouldPass: false,
        expectedErrors: ['type'],
      },
      {
        name: 'missing granted field',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          version: '1.0',
        },
        shouldPass: false,
        expectedErrors: ['granted'],
      },
      {
        name: 'invalid granted type',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: 'yes', // Should be boolean
          version: '1.0',
        },
        shouldPass: false,
        expectedErrors: ['granted'],
      },
      {
        name: 'missing version',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
        },
        shouldPass: false,
        expectedErrors: ['version'],
      },
      {
        name: 'invalid version format',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '', // Empty version
        },
        shouldPass: false,
        expectedErrors: ['version'],
      },
      {
        name: 'expired consent date',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Yesterday
        },
        shouldPass: false,
        expectedErrors: ['expiresAt'],
      },
      {
        name: 'invalid metadata type',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          metadata: 'invalid', // Should be object
        },
        shouldPass: false,
        expectedErrors: ['metadata'],
      },
      {
        name: 'multiple validation errors',
        input: {
          userId: '',
          type: 'invalid_type',
          granted: 'maybe',
          version: '',
        },
        shouldPass: false,
        expectedErrors: ['userId', 'type', 'granted', 'version'],
      },
    ] as const;

    createConsentCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        const dto = plainToClass(CreateConsentDto, testCase.input);
        const errors = await validate(dto);

        if (testCase.shouldPass) {
          expect(errors).toHaveLength(0);
          
          // Test service creation
          mockPrismaService.consent.create.mockResolvedValue({
            id: 'consent-123',
            ...testCase.input,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(dto);
          expect(result).toBeDefined();
          expect(result.userId).toBe(testCase.input.userId);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          
          const errorProperties = errors.map(error => error.property);
          testCase.expectedErrors.forEach(expectedError => {
            expect(errorProperties).toContain(expectedError);
          });
        }
      });
    });
  });

  describe('UpdateConsentDto Validation', () => {
    const updateConsentCases = [
      {
        name: 'update granted status only',
        input: {
          granted: false,
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'update version only',
        input: {
          version: '2.0',
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'update expiration date',
        input: {
          expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'update metadata',
        input: {
          metadata: {
            source: 'api',
            reason: 'user_request',
            timestamp: new Date().toISOString(),
          },
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'multiple field updates',
        input: {
          granted: true,
          version: '3.0',
          expiresAt: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
          metadata: {
            updatedBy: 'user',
            reason: 'policy_update',
          },
        },
        shouldPass: true,
        expectedErrors: [],
      },
      {
        name: 'invalid granted type in update',
        input: {
          granted: 'true', // Should be boolean
        },
        shouldPass: false,
        expectedErrors: ['granted'],
      },
      {
        name: 'empty version in update',
        input: {
          version: '',
        },
        shouldPass: false,
        expectedErrors: ['version'],
      },
      {
        name: 'expired date in update',
        input: {
          expiresAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
        shouldPass: false,
        expectedErrors: ['expiresAt'],
      },
      {
        name: 'invalid metadata in update',
        input: {
          metadata: 'not an object',
        },
        shouldPass: false,
        expectedErrors: ['metadata'],
      },
    ] as const;

    updateConsentCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        const dto = plainToClass(UpdateConsentDto, testCase.input);
        const errors = await validate(dto);

        if (testCase.shouldPass) {
          expect(errors).toHaveLength(0);
          
          // Test service update
          const existingConsent = {
            id: 'consent-456',
            userId: 'user-456',
            type: 'data_processing',
            granted: true,
            version: '1.0',
            createdAt: new Date(),
            updatedAt: new Date(),
          };

          mockPrismaService.consent.findUnique.mockResolvedValue(existingConsent);
          mockPrismaService.consent.update.mockResolvedValue({
            ...existingConsent,
            ...testCase.input,
            updatedAt: new Date(),
          });

          const result = await service.update('consent-456', dto);
          expect(result).toBeDefined();
        } else {
          expect(errors.length).toBeGreaterThan(0);
          
          const errorProperties = errors.map(error => error.property);
          testCase.expectedErrors.forEach(expectedError => {
            expect(errorProperties).toContain(expectedError);
          });
        }
      });
    });
  });

  describe('Consent Type Validation', () => {
    const consentTypesCases = [
      // [type, should_be_valid, description]
      ['data_processing', true, 'data processing consent'],
      ['marketing', true, 'marketing consent'],
      ['analytics', true, 'analytics consent'],
      ['cookies_essential', true, 'essential cookies consent'],
      ['cookies_functional', true, 'functional cookies consent'],
      ['cookies_analytics', true, 'analytics cookies consent'],
      ['cookies_marketing', true, 'marketing cookies consent'],
      ['location_tracking', true, 'location tracking consent'],
      ['push_notifications', true, 'push notifications consent'],
      ['email_communications', true, 'email communications consent'],
      ['sms_communications', true, 'SMS communications consent'],
      ['data_sharing', true, 'data sharing consent'],
      ['profile_public', true, 'public profile consent'],
      ['invalid_type', false, 'invalid consent type'],
      ['', false, 'empty consent type'],
      ['DATA_PROCESSING', false, 'uppercase consent type'],
      ['data-processing', false, 'hyphenated consent type'],
    ] as const;

    consentTypesCases.forEach(([type, shouldBeValid, description], index) => {
      it(`should validate ${description} (case ${index + 1})`, async () => {
        const dto = plainToClass(CreateConsentDto, {
          userId: 'user-123',
          type: type,
          granted: true,
          version: '1.0',
        });

        const errors = await validate(dto);

        if (shouldBeValid) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          const typeErrors = errors.filter(error => error.property === 'type');
          expect(typeErrors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Consent Business Logic Validation', () => {
    const businessLogicCases = [
      {
        name: 'essential consent cannot be denied',
        input: {
          userId: 'user-123',
          type: 'cookies_essential',
          granted: false, // Should not be allowed
          version: '1.0',
        },
        shouldSucceed: false,
        expectedError: 'essential consent cannot be denied',
      },
      {
        name: 'marketing consent requires explicit opt-in',
        input: {
          userId: 'user-123',
          type: 'marketing',
          granted: true,
          version: '1.0',
          metadata: {
            source: 'pre_checked_box', // Should not be allowed
          },
        },
        shouldSucceed: false,
        expectedError: 'marketing consent requires explicit opt-in',
      },
      {
        name: 'data processing consent requires purpose',
        input: {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          metadata: {}, // Missing purpose
        },
        shouldSucceed: false,
        expectedError: 'data processing consent requires purpose',
      },
      {
        name: 'location tracking consent with valid purpose',
        input: {
          userId: 'user-123',
          type: 'location_tracking',
          granted: true,
          version: '1.0',
          metadata: {
            purpose: 'navigation',
            accuracy: 'high',
          },
        },
        shouldSucceed: true,
        expectedError: null,
      },
      {
        name: 'consent withdrawal requires reason',
        input: {
          userId: 'user-123',
          type: 'marketing',
          granted: false,
          version: '1.0',
          metadata: {
            action: 'withdrawal',
            // Missing reason
          },
        },
        shouldSucceed: false,
        expectedError: 'consent withdrawal requires reason',
      },
    ] as const;

    businessLogicCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.consent.create.mockResolvedValue({
            id: 'consent-business',
            ...testCase.input,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(testCase.input as CreateConsentDto);
          expect(result).toBeDefined();
        } else {
          await expect(service.create(testCase.input as CreateConsentDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Consent Version Management', () => {
    const versionCases = [
      {
        name: 'valid semantic version',
        version: '1.0.0',
        shouldBeValid: true,
      },
      {
        name: 'valid short version',
        version: '2.1',
        shouldBeValid: true,
      },
      {
        name: 'valid single digit version',
        version: '3',
        shouldBeValid: true,
      },
      {
        name: 'valid date-based version',
        version: '2024.03.15',
        shouldBeValid: true,
      },
      {
        name: 'valid alpha version',
        version: '1.0.0-alpha.1',
        shouldBeValid: true,
      },
      {
        name: 'invalid empty version',
        version: '',
        shouldBeValid: false,
      },
      {
        name: 'invalid version with spaces',
        version: '1.0 beta',
        shouldBeValid: false,
      },
      {
        name: 'invalid version with special chars',
        version: '1.0@beta',
        shouldBeValid: false,
      },
    ] as const;

    versionCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        const dto = plainToClass(CreateConsentDto, {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: testCase.version,
        });

        const errors = await validate(dto);

        if (testCase.shouldBeValid) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          const versionErrors = errors.filter(error => error.property === 'version');
          expect(versionErrors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Consent Metadata Validation', () => {
    const metadataCases = [
      {
        name: 'valid metadata with source',
        metadata: {
          source: 'app',
          timestamp: new Date().toISOString(),
        },
        shouldBeValid: true,
      },
      {
        name: 'valid metadata with tracking info',
        metadata: {
          source: 'web',
          userAgent: 'Mozilla/5.0...',
          ipAddress: '192.168.1.1',
          referrer: 'https://example.com',
        },
        shouldBeValid: true,
      },
      {
        name: 'valid metadata with consent details',
        metadata: {
          purpose: 'analytics',
          retention: '2 years',
          recipients: ['internal', 'google_analytics'],
          legalBasis: 'consent',
        },
        shouldBeValid: true,
      },
      {
        name: 'empty metadata object',
        metadata: {},
        shouldBeValid: true,
      },
      {
        name: 'null metadata',
        metadata: null,
        shouldBeValid: true,
      },
      {
        name: 'metadata with nested objects',
        metadata: {
          tracking: {
            ga: { enabled: true, id: 'GA-123' },
            fb: { enabled: false },
          },
          preferences: {
            frequency: 'weekly',
            categories: ['news', 'updates'],
          },
        },
        shouldBeValid: true,
      },
      {
        name: 'metadata with invalid data type',
        metadata: 'not an object',
        shouldBeValid: false,
      },
      {
        name: 'metadata with function (should be serializable)',
        metadata: {
          callback: () => {},
        },
        shouldBeValid: false,
      },
    ] as const;

    metadataCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        const dto = plainToClass(CreateConsentDto, {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          metadata: testCase.metadata,
        });

        const errors = await validate(dto);

        if (testCase.shouldBeValid) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          const metadataErrors = errors.filter(error => error.property === 'metadata');
          expect(metadataErrors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Consent Expiration Validation', () => {
    const now = new Date();
    const oneHour = new Date(now.getTime() + 60 * 60 * 1000);
    const oneDay = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const oneYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const fiveYears = new Date(now.getTime() + 5 * 365 * 24 * 60 * 60 * 1000);
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const expirationCases = [
      {
        name: 'one hour expiration',
        expiresAt: oneHour,
        shouldBeValid: true,
      },
      {
        name: 'one day expiration',
        expiresAt: oneDay,
        shouldBeValid: true,
      },
      {
        name: 'one year expiration',
        expiresAt: oneYear,
        shouldBeValid: true,
      },
      {
        name: 'five years expiration',
        expiresAt: fiveYears,
        shouldBeValid: true,
      },
      {
        name: 'no expiration',
        expiresAt: null,
        shouldBeValid: true,
      },
      {
        name: 'past expiration',
        expiresAt: yesterday,
        shouldBeValid: false,
      },
    ] as const;

    expirationCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, async () => {
        const dto = plainToClass(CreateConsentDto, {
          userId: 'user-123',
          type: 'data_processing',
          granted: true,
          version: '1.0',
          expiresAt: testCase.expiresAt,
        });

        const errors = await validate(dto);

        if (testCase.shouldBeValid) {
          expect(errors).toHaveLength(0);
        } else {
          expect(errors.length).toBeGreaterThan(0);
          const expirationErrors = errors.filter(error => error.property === 'expiresAt');
          expect(expirationErrors.length).toBeGreaterThan(0);
        }
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});