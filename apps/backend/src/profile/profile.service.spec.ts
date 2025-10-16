/**
 * Comprehensive unit tests for Profile Service
 * Covers CRUD operations, idempotency, error handling, and persistence
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from './profile.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

// Mock PrismaService
const mockPrismaService = {
  profile: {
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

describe('ProfileService', () => {
  let service: ProfileService;
  let prismaService: jest.Mocked<PrismaService>;

  const mockProfile = {
    id: '1',
    userId: 'user-123',
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    phone: '+1234567890',
    language: 'en',
    timezone: 'UTC',
    dateOfBirth: new Date('1990-01-01'),
    nationality: 'US',
    preferences: {
      notifications: true,
      audioGuide: true,
      hapticFeedback: false,
      theme: 'light'
    },
    pilgramageDetails: {
      type: 'umrah',
      groupSize: 2,
      arrivalDate: new Date('2023-12-01'),
      departureDate: new Date('2023-12-10'),
      accommodationHotel: 'Grand Mosque Hotel'
    },
    accessibility: {
      wheelchairAccess: false,
      visualImpairment: false,
      hearingImpairment: false,
      mobilityAssistance: false
    },
    emergencyContact: {
      name: 'Jane Doe',
      relationship: 'spouse',
      phone: '+1234567891',
      email: 'jane.doe@example.com'
    },
    createdAt: new Date('2023-01-01T00:00:00Z'),
    updatedAt: new Date('2023-01-01T00:00:00Z')
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService
        }
      ]
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get(PrismaService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Profile Creation', () => {
    it('should create a new profile successfully', async () => {
      const createDto: CreateProfileDto = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      prismaService.profile.create.mockResolvedValue(mockProfile);

      const result = await service.create(createDto);

      expect(result).toEqual(mockProfile);
      expect(prismaService.profile.create).toHaveBeenCalledWith({
        data: createDto
      });
    });

    it('should create profile with complete data', async () => {
      const completeCreateDto: CreateProfileDto = {
        userId: 'user-456',
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        phone: '+9876543210',
        language: 'ar',
        timezone: 'Asia/Riyadh',
        dateOfBirth: new Date('1985-05-15'),
        nationality: 'SA',
        preferences: {
          notifications: false,
          audioGuide: true,
          hapticFeedback: true,
          theme: 'dark'
        },
        pilgramageDetails: {
          type: 'hajj',
          groupSize: 4,
          arrivalDate: new Date('2023-06-15'),
          departureDate: new Date('2023-06-25'),
          accommodationHotel: 'Makkah Clock Tower'
        },
        accessibility: {
          wheelchairAccess: true,
          visualImpairment: false,
          hearingImpairment: true,
          mobilityAssistance: true
        },
        emergencyContact: {
          name: 'Ahmed Smith',
          relationship: 'brother',
          phone: '+9876543211',
          email: 'ahmed.smith@example.com'
        }
      };

      const completeProfile = { ...mockProfile, ...completeCreateDto, id: '2' };
      prismaService.profile.create.mockResolvedValue(completeProfile);

      const result = await service.create(completeCreateDto);

      expect(result).toEqual(completeProfile);
      expect(result.preferences.theme).toBe('dark');
      expect(result.pilgramageDetails.type).toBe('hajj');
      expect(result.accessibility.wheelchairAccess).toBe(true);
    });

    it('should handle database errors during creation', async () => {
      const createDto: CreateProfileDto = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      prismaService.profile.create.mockRejectedValue(new Error('Database connection failed'));

      await expect(service.create(createDto)).rejects.toThrow('Database connection failed');
    });

    it('should handle unique constraint violations', async () => {
      const createDto: CreateProfileDto = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'existing@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      const uniqueError = new Error('Unique constraint failed');
      (uniqueError as any).code = 'P2002';
      prismaService.profile.create.mockRejectedValue(uniqueError);

      await expect(service.create(createDto)).rejects.toThrow('Unique constraint failed');
    });
  });

  describe('Profile Retrieval', () => {
    it('should find all profiles with pagination', async () => {
      const profiles = [mockProfile, { ...mockProfile, id: '2', userId: 'user-456' }];
      prismaService.profile.findMany.mockResolvedValue(profiles);
      prismaService.profile.count.mockResolvedValue(2);

      const result = await service.findAll({ page: 1, limit: 10 });

      expect(result.data).toEqual(profiles);
      expect(result.meta.total).toBe(2);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(10);
      expect(result.meta.totalPages).toBe(1);
    });

    it('should handle pagination correctly', async () => {
      prismaService.profile.findMany.mockResolvedValue([mockProfile]);
      prismaService.profile.count.mockResolvedValue(25);

      const result = await service.findAll({ page: 3, limit: 5 });

      expect(prismaService.profile.findMany).toHaveBeenCalledWith({
        skip: 10, // (page - 1) * limit = (3 - 1) * 5
        take: 5,
        orderBy: { createdAt: 'desc' }
      });
      expect(result.meta.totalPages).toBe(5); // Math.ceil(25 / 5)
    });

    it('should find profile by ID', async () => {
      prismaService.profile.findUnique.mockResolvedValue(mockProfile);

      const result = await service.findOne('1');

      expect(result).toEqual(mockProfile);
      expect(prismaService.profile.findUnique).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should return null for non-existent profile ID', async () => {
      prismaService.profile.findUnique.mockResolvedValue(null);

      const result = await service.findOne('non-existent');

      expect(result).toBeNull();
    });

    it('should find profile by user ID', async () => {
      prismaService.profile.findFirst.mockResolvedValue(mockProfile);

      const result = await service.findByUserId('user-123');

      expect(result).toEqual(mockProfile);
      expect(prismaService.profile.findFirst).toHaveBeenCalledWith({
        where: { userId: 'user-123' }
      });
    });

    it('should return null for non-existent user ID', async () => {
      prismaService.profile.findFirst.mockResolvedValue(null);

      const result = await service.findByUserId('non-existent-user');

      expect(result).toBeNull();
    });
  });

  describe('Profile Updates', () => {
    it('should update profile successfully', async () => {
      const updateDto: UpdateProfileDto = {
        firstName: 'Johnny',
        phone: '+1111111111',
        preferences: {
          notifications: false,
          theme: 'dark'
        }
      };

      const updatedProfile = { 
        ...mockProfile, 
        ...updateDto,
        updatedAt: new Date('2023-01-02T00:00:00Z')
      };
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', updateDto);

      expect(result).toEqual(updatedProfile);
      expect(prismaService.profile.update).toHaveBeenCalledWith({
        where: { id: '1' },
        data: updateDto
      });
    });

    it('should update partial profile data', async () => {
      const partialUpdate: UpdateProfileDto = {
        language: 'ar'
      };

      const updatedProfile = { ...mockProfile, language: 'ar' };
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', partialUpdate);

      expect(result.language).toBe('ar');
      expect(result.firstName).toBe(mockProfile.firstName); // Should remain unchanged
    });

    it('should update nested objects', async () => {
      const nestedUpdate: UpdateProfileDto = {
        preferences: {
          notifications: false,
          audioGuide: false,
          hapticFeedback: true,
          theme: 'dark'
        },
        accessibility: {
          wheelchairAccess: true,
          visualImpairment: false,
          hearingImpairment: false,
          mobilityAssistance: true
        }
      };

      const updatedProfile = { ...mockProfile, ...nestedUpdate };
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', nestedUpdate);

      expect(result.preferences.theme).toBe('dark');
      expect(result.accessibility.wheelchairAccess).toBe(true);
    });

    it('should handle update of non-existent profile', async () => {
      const updateDto: UpdateProfileDto = { firstName: 'NonExistent' };
      
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';
      prismaService.profile.update.mockRejectedValue(notFoundError);

      await expect(service.update('non-existent', updateDto)).rejects.toThrow('Record not found');
    });
  });

  describe('Profile Upsert (Idempotency)', () => {
    it('should create profile if not exists', async () => {
      const upsertData = {
        userId: 'new-user-789',
        firstName: 'New',
        lastName: 'User',
        email: 'new.user@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      const newProfile = { ...mockProfile, ...upsertData, id: '3' };
      prismaService.profile.upsert.mockResolvedValue(newProfile);

      const result = await service.upsert('new-user-789', upsertData);

      expect(result).toEqual(newProfile);
      expect(prismaService.profile.upsert).toHaveBeenCalledWith({
        where: { userId: 'new-user-789' },
        update: upsertData,
        create: upsertData
      });
    });

    it('should update profile if exists', async () => {
      const upsertData = {
        userId: 'user-123',
        firstName: 'Updated John',
        language: 'ar'
      };

      const updatedProfile = { ...mockProfile, ...upsertData };
      prismaService.profile.upsert.mockResolvedValue(updatedProfile);

      const result = await service.upsert('user-123', upsertData);

      expect(result.firstName).toBe('Updated John');
      expect(result.language).toBe('ar');
    });

    it('should be idempotent - multiple calls with same data', async () => {
      const upsertData = {
        userId: 'user-123',
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      prismaService.profile.upsert.mockResolvedValue(mockProfile);

      // First call
      const result1 = await service.upsert('user-123', upsertData);
      
      // Second call with same data
      const result2 = await service.upsert('user-123', upsertData);

      expect(result1).toEqual(result2);
      expect(prismaService.profile.upsert).toHaveBeenCalledTimes(2);
    });

    it('should handle complex nested data in upsert', async () => {
      const complexUpsertData = {
        userId: 'user-complex',
        firstName: 'Complex',
        lastName: 'User',
        email: 'complex@example.com',
        language: 'en',
        timezone: 'UTC',
        preferences: {
          notifications: true,
          audioGuide: false,
          hapticFeedback: true,
          theme: 'auto'
        },
        pilgramageDetails: {
          type: 'umrah',
          groupSize: 1,
          arrivalDate: new Date('2024-01-15'),
          departureDate: new Date('2024-01-22'),
          accommodationHotel: 'Modern Hotel'
        }
      };

      const complexProfile = { ...mockProfile, ...complexUpsertData, id: '4' };
      prismaService.profile.upsert.mockResolvedValue(complexProfile);

      const result = await service.upsert('user-complex', complexUpsertData);

      expect(result.preferences.theme).toBe('auto');
      expect(result.pilgramageDetails.type).toBe('umrah');
    });
  });

  describe('Profile Deletion', () => {
    it('should delete profile successfully', async () => {
      prismaService.profile.delete.mockResolvedValue(mockProfile);

      const result = await service.remove('1');

      expect(result).toEqual(mockProfile);
      expect(prismaService.profile.delete).toHaveBeenCalledWith({
        where: { id: '1' }
      });
    });

    it('should handle deletion of non-existent profile', async () => {
      const notFoundError = new Error('Record not found');
      (notFoundError as any).code = 'P2025';
      prismaService.profile.delete.mockRejectedValue(notFoundError);

      await expect(service.remove('non-existent')).rejects.toThrow('Record not found');
    });
  });

  describe('Profile Search and Filtering', () => {
    it('should filter profiles by language', async () => {
      const arabicProfiles = [
        { ...mockProfile, id: '1', language: 'ar' },
        { ...mockProfile, id: '2', language: 'ar', userId: 'user-456' }
      ];

      prismaService.profile.findMany.mockResolvedValue(arabicProfiles);
      prismaService.profile.count.mockResolvedValue(2);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        language: 'ar' 
      });

      expect(result.data).toEqual(arabicProfiles);
      expect(result.data.every(p => p.language === 'ar')).toBe(true);
    });

    it('should filter profiles by pilgrimage type', async () => {
      const hajjProfiles = [
        { 
          ...mockProfile, 
          id: '1', 
          pilgramageDetails: { ...mockProfile.pilgramageDetails, type: 'hajj' }
        }
      ];

      prismaService.profile.findMany.mockResolvedValue(hajjProfiles);
      prismaService.profile.count.mockResolvedValue(1);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        pilgrimageType: 'hajj' 
      });

      expect(result.data).toEqual(hajjProfiles);
      expect(result.data[0].pilgramageDetails.type).toBe('hajj');
    });

    it('should search profiles by name', async () => {
      const searchResults = [mockProfile];

      prismaService.profile.findMany.mockResolvedValue(searchResults);
      prismaService.profile.count.mockResolvedValue(1);

      const result = await service.findAll({ 
        page: 1, 
        limit: 10, 
        search: 'John' 
      });

      expect(result.data).toEqual(searchResults);
    });
  });

  describe('Data Validation and Edge Cases', () => {
    it('should handle null/undefined values gracefully', async () => {
      const profileWithNulls = {
        ...mockProfile,
        phone: null,
        dateOfBirth: null,
        preferences: null,
        pilgramageDetails: null,
        accessibility: null,
        emergencyContact: null
      };

      prismaService.profile.findUnique.mockResolvedValue(profileWithNulls);

      const result = await service.findOne('1');

      expect(result).toEqual(profileWithNulls);
      expect(result.phone).toBeNull();
      expect(result.preferences).toBeNull();
    });

    it('should handle empty strings and default values', async () => {
      const createDto: CreateProfileDto = {
        userId: 'user-empty',
        firstName: '',
        lastName: '',
        email: 'empty@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      const profileWithEmptyStrings = { ...mockProfile, ...createDto, id: '5' };
      prismaService.profile.create.mockResolvedValue(profileWithEmptyStrings);

      const result = await service.create(createDto);

      expect(result.firstName).toBe('');
      expect(result.lastName).toBe('');
    });

    it('should handle very large text data', async () => {
      const largeText = 'A'.repeat(1000);
      const updateDto: UpdateProfileDto = {
        emergencyContact: {
          name: largeText,
          relationship: 'other',
          phone: '+1234567890',
          email: 'large@example.com'
        }
      };

      const updatedProfile = { ...mockProfile, ...updateDto };
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', updateDto);

      expect(result.emergencyContact.name).toBe(largeText);
    });

    it('should handle special characters in data', async () => {
      const specialCharsUpdate: UpdateProfileDto = {
        firstName: 'José María',
        lastName: 'García-López',
        phone: '+34-91-123-45-67'
      };

      const updatedProfile = { ...mockProfile, ...specialCharsUpdate };
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', specialCharsUpdate);

      expect(result.firstName).toBe('José María');
      expect(result.lastName).toBe('García-López');
    });
  });

  describe('Deterministic Behavior', () => {
    beforeEach(() => {
      // Set deterministic timestamps for testing
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should produce consistent results for same inputs', async () => {
      const createDto: CreateProfileDto = {
        userId: 'deterministic-user',
        firstName: 'Test',
        lastName: 'User',
        email: 'test@example.com',
        language: 'en',
        timezone: 'UTC'
      };

      const deterministicProfile = { 
        ...mockProfile, 
        ...createDto, 
        id: 'deterministic-id',
        createdAt: new Date('2023-01-01T00:00:00Z'),
        updatedAt: new Date('2023-01-01T00:00:00Z')
      };

      prismaService.profile.create.mockResolvedValue(deterministicProfile);

      const result1 = await service.create(createDto);
      const result2 = await service.create(createDto);

      expect(result1).toEqual(result2);
    });

    it('should handle date operations deterministically', async () => {
      const dateOfBirth = new Date('1990-06-15T00:00:00Z');
      const updateDto: UpdateProfileDto = {
        dateOfBirth: dateOfBirth
      };

      const updatedProfile = { 
        ...mockProfile, 
        dateOfBirth: dateOfBirth,
        updatedAt: new Date('2023-01-01T00:00:00Z')
      };
      
      prismaService.profile.update.mockResolvedValue(updatedProfile);

      const result = await service.update('1', updateDto);

      expect(result.dateOfBirth).toEqual(dateOfBirth);
      expect(result.updatedAt).toEqual(new Date('2023-01-01T00:00:00Z'));
    });
  });
});