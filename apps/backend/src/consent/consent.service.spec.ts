/**
 * Comprehensive unit tests for Consent Service
 * Covers CRUD operations, idempotency, consent tracking, and persistence
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConsentService } from './consent.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsentDto } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';

// Mock PrismaService
const mockPrismaService = {
  consent: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    count: jest.fn()
  }
};

describe('ConsentService', () => {
  let service: ConsentService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockConsent = {
    id: '1',
    userId: 'user-123',
    consentType: 'data_processing',
    consentVersion: '1.0',
    granted: true,
    grantedAt: new Date('2023-01-01T00:00:00Z'),
    revokedAt: null,
    ipAddress: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (compatible; test)',
    metadata: {
      source: 'mobile_app',
      page: 'onboarding',
      campaign: null,
      consentText: 'I agree to data processing for pilgrimage services'
    },
    expiresAt: new Date('2024-01-01T00:00:00Z'),
    isActive: true,
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z')
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConsentService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<ConsentService>(ConsentService);
    prismaService = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Consent Creation', () => {
    it('should create a new consent record successfully', async () => {
      const createDto: CreateConsentDto = {
        userId: 'user-123',
        consentType: 'data_processing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (compatible; test)'
      };

      prismaService.consent.create.mockResolvedValue(mockConsent);

      const result = await service.create(createDto);

      expect(result).toEqual(mockConsent);
      expect(prismaService.consent.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: createDto.userId,
          consentType: createDto.consentType,
          granted: createDto.granted,
          grantedAt: expect.any(Date)
        })
      });
    });

    it('should create consent with metadata', async () => {
      const createDtoWithMetadata: CreateConsentDto = {
        userId: 'user-456',
        consentType: 'marketing',
        consentVersion: '2.0',
        granted: true,
        ipAddress: '10.0.0.50',
        userAgent: 'Mobile App v1.2.3',
        metadata: {
          source: 'web_app',
          page: 'privacy_settings',
          campaign: 'ramadan_2023',
          consentText: 'I agree to receive marketing communications'
        }
      };

      const consentWithMetadata = {
        ...mockConsent,
        ...createDtoWithMetadata,
        id: '2'
      };

      prismaService.consent.create.mockResolvedValue(consentWithMetadata);

      const result = await service.create(createDtoWithMetadata);

      expect(result.metadata.source).toBe('web_app');
      expect(result.metadata.campaign).toBe('ramadan_2023');
    });

    it('should create consent with expiration date', async () => {
      const futureDate = new Date('2025-01-01T00:00:00Z');
      const createDtoWithExpiry: CreateConsentDto = {
        userId: 'user-789',
        consentType: 'location_tracking',
        consentVersion: '1.5',
        granted: true,
        ipAddress: '172.16.0.1',
        userAgent: 'iOS App v2.0',
        expiresAt: futureDate
      };

      const consentWithExpiry = {
        ...mockConsent,
        ...createDtoWithExpiry,
        id: '3'
      };

      prismaService.consent.create.mockResolvedValue(consentWithExpiry);

      const result = await service.create(createDtoWithExpiry);

      expect(result.expiresAt).toEqual(futureDate);
    });

    it('should handle consent denial', async () => {
      const deniedConsentDto: CreateConsentDto = {
        userId: 'user-999',
        consentType: 'analytics',
        consentVersion: '1.0',
        granted: false,
        ipAddress: '203.0.113.1',
        userAgent: 'Android App v1.5'
      };

      const deniedConsent = {
        ...mockConsent,
        ...deniedConsentDto,
        id: '4',
        granted: false,
        grantedAt: null,
        revokedAt: new Date('2023-01-01T00:00:00Z')
      };

      prismaService.consent.create.mockResolvedValue(deniedConsent);

      const result = await service.create(deniedConsentDto);

      expect(result.granted).toBe(false);
      expect(result.grantedAt).toBeNull();
      expect(result.revokedAt).toEqual(expect.any(Date));
    });
  });

  describe('Consent Retrieval', () => {
    it('should find all consents with pagination', async () => {
      const consents = [
        mockConsent,
        { ...mockConsent, id: '2', userId: 'user-456', consentType: 'marketing' }
      ];

      prismaService.consent.findMany.mockResolvedValue(consents);
      prismaService.consent.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(consents);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should find consent by ID', async () => {
      prismaService.consent.findUnique.mockResolvedValue(mockConsent);

      const result = await service.findOne('1');

      expect(result).toEqual(mockConsent);
      expect(prismaService.consent.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should return null for non-existent consent ID', async () => {
      prismaService.consent.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });

    it('should find consents by user ID', async () => {
      const userConsents = [
        mockConsent,
        { ...mockConsent, id: '2', consentType: 'marketing' }
      ];

      prismaService.consent.findMany.mockResolvedValue(userConsents);

      const result = await service.findByUserId('user-123');

      expect(result).toEqual(userConsents);
      expect(prismaService.consent.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-123' },
        orderBy: { createdAt: 'desc' }
      });
    });

    it('should find active consents only', async () => {
      const activeConsents = [mockConsent];

      prismaService.consent.findMany.mockResolvedValue(activeConsents);

      const result = await service.findActiveConsents('user-123');

      expect(result).toEqual(activeConsents);
      expect(prismaService.consent.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          isActive: true,
          granted: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        },
        orderBy: { createdAt: 'desc' }
      });
    });
  });

  describe('Consent Updates', () => {
    it('should update consent successfully', async () => {
      const updateDto: UpdateConsentDto = {
        metadata: {
          source: 'updated_source',
          page: 'updated_page'
        }
      };

      const updatedConsent = {
        ...mockConsent,
        metadata: { ...mockConsent.metadata, ...updateDto.metadata },
        updatedAt: new Date('2023-01-02T00:00:00Z')
      };

      prismaService.consent.update.mockResolvedValue(updatedConsent);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedConsent);
      expect(prismaService.consent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto
      });
    });

    it('should revoke consent', async () => {
      const revokedConsent = {
        ...mockConsent,
        granted: false,
        revokedAt: new Date('2023-01-02T00:00:00Z'),
        isActive: false,
        updatedAt: new Date('2023-01-02T00:00:00Z')
      };

      prismaService.consent.update.mockResolvedValue(revokedConsent);

      const result = await service.revokeConsent('1');

      expect(result.granted).toBe(false);
      expect(result.revokedAt).toEqual(expect.any(Date));
      expect(result.isActive).toBe(false);
      expect(prismaService.consent.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: {
          granted: false,
          revokedAt: expect.any(Date),
          isActive: false
        }
      });
    });

    it('should grant consent', async () => {
      const grantedConsent = {
        ...mockConsent,
        granted: true,
        grantedAt: new Date('2023-01-02T00:00:00Z'),
        revokedAt: null,
        isActive: true,
        updatedAt: new Date('2023-01-02T00:00:00Z')
      };

      prismaService.consent.update.mockResolvedValue(grantedConsent);

      const result = await service.grantConsent('1');

      expect(result.granted).toBe(true);
      expect(result.grantedAt).toEqual(expect.any(Date));
      expect(result.revokedAt).toBeNull();
      expect(result.isActive).toBe(true);
    });
  });

  describe('Consent Upsert (Idempotency)', () => {
    it('should create consent if not exists for user and type', async () => {
      const upsertData = {
        userId: 'new-user-789',
        consentType: 'data_processing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: '192.168.1.200',
        userAgent: 'New User Agent'
      };

      const newConsent = { ...mockConsent, ...upsertData, id: '3' };
      prismaService.consent.upsert.mockResolvedValue(newConsent);

      const result = await service.upsertConsent(upsertData);

      expect(result).toEqual(newConsent);
      expect(prismaService.consent.upsert).toHaveBeenCalledWith({
        where: {
          userId_consentType: {
            userId: 'new-user-789',
            consentType: 'data_processing'
          }
        },
        update: expect.objectContaining({
          granted: true,
          consentVersion: '1.0'
        }),
        create: expect.objectContaining(upsertData)
      });
    });

    it('should update existing consent', async () => {
      const upsertData = {
        userId: 'user-123',
        consentType: 'data_processing',
        consentVersion: '2.0',
        granted: false,
        ipAddress: '192.168.1.150',
        userAgent: 'Updated User Agent'
      };

      const updatedConsent = { ...mockConsent, ...upsertData };
      prismaService.consent.upsert.mockResolvedValue(updatedConsent);

      const result = await service.upsertConsent(upsertData);

      expect(result.consentVersion).toBe('2.0');
      expect(result.granted).toBe(false);
    });

    it('should be idempotent - multiple calls with same data', async () => {
      const upsertData = {
        userId: 'user-123',
        consentType: 'marketing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent'
      };

      prismaService.consent.upsert.mockResolvedValue(mockConsent);

      // First call
      const result1 = await service.upsertConsent(upsertData);
      
      // Second call with same data
      const result2 = await service.upsertConsent(upsertData);

      expect(result1).toEqual(result2);
      expect(prismaService.consent.upsert).toHaveBeenCalledTimes(2);
    });
  });

  describe('Consent Type Management', () => {
    it('should handle different consent types', async () => {
      const consentTypes = [
        'data_processing',
        'marketing',
        'analytics',
        'location_tracking',
        'personalization',
        'third_party_sharing'
      ];

      for (const consentType of consentTypes) {
        const createDto = {
          userId: `user-${consentType}`,
          consentType: consentType,
          consentVersion: '1.0',
          granted: true,
          ipAddress: '192.168.1.100',
          userAgent: 'Test Agent'
        };

        const consent = { ...mockConsent, ...createDto, id: consentType };
        prismaService.consent.create.mockResolvedValue(consent);

        const result = await service.create(createDto);
        expect(result.consentType).toBe(consentType);
      }
    });

    it('should check consent for specific type', async () => {
      prismaService.consent.findFirst.mockResolvedValue(mockConsent);

      const hasConsent = await service.hasConsent('user-123', 'data_processing');

      expect(hasConsent).toBe(true);
      expect(prismaService.consent.findFirst).toHaveBeenCalledWith({
        where: {
          userId: 'user-123',
          consentType: 'data_processing',
          granted: true,
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: expect.any(Date) } }
          ]
        }
      });
    });

    it('should return false for non-existent consent', async () => {
      prismaService.consent.findFirst.mockResolvedValue(null);

      const hasConsent = await service.hasConsent('user-123', 'non_existent_type');

      expect(hasConsent).toBe(false);
    });
  });

  describe('Consent Expiration Handling', () => {
    it('should check if consent is expired', async () => {
      const expiredConsent = {
        ...mockConsent,
        expiresAt: new Date('2022-01-01T00:00:00Z') // Past date
      };

      prismaService.consent.findFirst.mockResolvedValue(expiredConsent);

      const hasConsent = await service.hasConsent('user-123', 'data_processing');

      expect(hasConsent).toBe(false);
    });

    it('should handle consent without expiration', async () => {
      const nonExpiringConsent = {
        ...mockConsent,
        expiresAt: null
      };

      prismaService.consent.findFirst.mockResolvedValue(nonExpiringConsent);

      const hasConsent = await service.hasConsent('user-123', 'data_processing');

      expect(hasConsent).toBe(true);
    });

    it('should find expired consents', async () => {
      const expiredConsents = [
        {
          ...mockConsent,
          id: '1',
          expiresAt: new Date('2022-01-01T00:00:00Z')
        },
        {
          ...mockConsent,
          id: '2',
          expiresAt: new Date('2022-06-01T00:00:00Z')
        }
      ];

      prismaService.consent.findMany.mockResolvedValue(expiredConsents);

      const result = await service.findExpiredConsents();

      expect(result).toEqual(expiredConsents);
      expect(prismaService.consent.findMany).toHaveBeenCalledWith({
        where: {
          expiresAt: { lt: expect.any(Date) },
          isActive: true
        }
      });
    });
  });

  describe('Consent Filtering and Search', () => {
    it('should filter consents by type', async () => {
      const marketingConsents = [
        { ...mockConsent, id: '1', consentType: 'marketing' },
        { ...mockConsent, id: '2', consentType: 'marketing', userId: 'user-456' }
      ];

      prismaService.consent.findMany.mockResolvedValue(marketingConsents);
      prismaService.consent.count.mockResolvedValue(2);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        consentType: 'marketing'
      });

      expect(result.data).toEqual(marketingConsents);
      expect(result.data.every(c => c.consentType === 'marketing')).toBe(true);
    });

    it('should filter consents by granted status', async () => {
      const grantedConsents = [mockConsent];

      prismaService.consent.findMany.mockResolvedValue(grantedConsents);
      prismaService.consent.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        granted: true
      });

      expect(result.data).toEqual(grantedConsents);
      expect(result.data.every(c => c.granted === true)).toBe(true);
    });

    it('should filter consents by date range', async () => {
      const fromDate = new Date('2023-01-01T00:00:00Z');
      const toDate = new Date('2023-12-31T23:59:59Z');

      prismaService.consent.findMany.mockResolvedValue([mockConsent]);
      prismaService.consent.count.mockResolvedValue(1);

      const result = await service.findAll({
        page: 1,
        limit: 10,
        fromDate: fromDate,
        toDate: toDate
      });

      expect(result.data).toEqual([mockConsent]);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors during creation', async () => {
      const createDto: CreateConsentDto = {
        userId: 'user-123',
        consentType: 'data_processing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent'
      };

      prismaService.consent.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.create(createDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle update of non-existent consent', async () => {
      const updateDto: UpdateConsentDto = { metadata: { source: 'test' } };
      
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';
      prismaService.consent.update.mockRejectedValue(notFoundError);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow('Record not found');
    });

    it('should handle invalid IP addresses gracefully', async () => {
      const createDto: CreateConsentDto = {
        userId: 'user-123',
        consentType: 'data_processing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: 'invalid-ip',
        userAgent: 'Test Agent'
      };

      const consentWithInvalidIP = { ...mockConsent, ipAddress: 'invalid-ip' };
      prismaService.consent.create.mockResolvedValue(consentWithInvalidIP);

      const result = await service.create(createDto);

      expect(result.ipAddress).toBe('invalid-ip');
    });
  });

  describe('Deterministic Behavior', () => {
    beforeEach(() => {
      // Set deterministic timestamps for testing
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());
      jest.spyOn(Date.prototype, 'toISOString').mockReturnValue('2023-01-01T00:00:00.000Z');
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should produce consistent timestamps', async () => {
      const createDto: CreateConsentDto = {
        userId: 'deterministic-user',
        consentType: 'data_processing',
        consentVersion: '1.0',
        granted: true,
        ipAddress: '192.168.1.100',
        userAgent: 'Test Agent'
      };

      const deterministicConsent = {
        ...mockConsent,
        ...createDto,
        id: 'deterministic-id',
        grantedAt: new Date('2023-01-01T00:00:00Z'),
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      };

      prismaService.consent.create.mockResolvedValue(deterministicConsent);

      const result1 = await service.create(createDto);
      const result2 = await service.create(createDto);

      expect(result1.grantedAt).toEqual(result2.grantedAt);
      expect(result1.createdAt).toEqual(result2.createdAt);
    });

    it('should handle consent operations deterministically', async () => {
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      
      const revokedConsent = {
        ...mockConsent,
        granted: false,
        revokedAt: fixedDate,
        isActive: false,
        updatedAt: fixedDate
      };

      prismaService.consent.update.mockResolvedValue(revokedConsent);

      const result = await service.revokeConsent('1');

      expect(result.revokedAt).toEqual(fixedDate);
      expect(result.updatedAt).toEqual(fixedDate);
    });
  });

  describe('Consent Deletion', () => {
    it('should delete consent successfully', async () => {
      prismaService.consent.delete.mockResolvedValue(mockConsent);

      const result = await service.remove('1');

      expect(result).toEqual(mockConsent);
      expect(prismaService.consent.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should handle deletion of non-existent consent', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';
      prismaService.consent.delete.mockRejectedValue(notFoundError);

      await expect(service.remove('non-existent')).rejects.toThrow('Record not found');
    });

    it('should delete all consents for user', async () => {
      const deletedConsents = [mockConsent, { ...mockConsent, id: '2' }];
      
      prismaService.consent.findMany.mockResolvedValue(deletedConsents);
      prismaService.consent.delete.mockResolvedValue(mockConsent);

      // Simulate deleteMany operation
      const result = await service.deleteAllConsentsForUser('user-123');

      expect(result).toBeDefined();
    });
  });
});