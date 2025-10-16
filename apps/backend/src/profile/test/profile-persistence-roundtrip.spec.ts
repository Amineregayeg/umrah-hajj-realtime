/**
 * Table-driven tests for profile service persistence and round-trip operations
 * Tests CRUD operations, data integrity, and validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { ProfileService } from '../profile.service';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { UpdateProfileDto } from '../dto/update-profile.dto';

describe('Profile Persistence Round-trip Tests', () => {
  let service: ProfileService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    profile: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
    prismaService = module.get<PrismaService>(PrismaService);
    
    jest.clearAllMocks();
  });

  describe('Profile Creation Round-trip', () => {
    const createProfileCases = [
      {
        name: 'basic profile with minimal data',
        input: {
          userId: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          language: 'en',
        },
        expectedOutput: {
          id: 'profile-123',
          userId: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          language: 'en',
          phoneNumber: null,
          dateOfBirth: null,
          gender: null,
          nationality: null,
          preferences: {},
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        shouldSucceed: true,
      },
      {
        name: 'complete profile with all fields',
        input: {
          userId: 'user-456',
          name: 'Ahmed Al-Rashid',
          email: 'ahmed@example.com',
          phoneNumber: '+966501234567',
          dateOfBirth: '1985-03-15',
          gender: 'male',
          nationality: 'SA',
          language: 'ar',
          preferences: {
            notifications: {
              prayer: true,
              navigation: true,
              emergency: true,
            },
            accessibility: {
              fontSize: 'large',
              highContrast: false,
              voiceGuidance: true,
            },
            privacy: {
              shareLocation: false,
              analytics: true,
            },
          },
        },
        expectedOutput: {
          id: 'profile-456',
          userId: 'user-456',
          name: 'Ahmed Al-Rashid',
          email: 'ahmed@example.com',
          phoneNumber: '+966501234567',
          dateOfBirth: new Date('1985-03-15'),
          gender: 'male',
          nationality: 'SA',
          language: 'ar',
          preferences: {
            notifications: {
              prayer: true,
              navigation: true,
              emergency: true,
            },
            accessibility: {
              fontSize: 'large',
              highContrast: false,
              voiceGuidance: true,
            },
            privacy: {
              shareLocation: false,
              analytics: true,
            },
          },
          createdAt: expect.any(Date),
          updatedAt: expect.any(Date),
        },
        shouldSucceed: true,
      },
      {
        name: 'profile with invalid email format',
        input: {
          userId: 'user-789',
          name: 'Invalid User',
          email: 'not-an-email',
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'email',
      },
      {
        name: 'profile with invalid phone number',
        input: {
          userId: 'user-101',
          name: 'Test User',
          email: 'test@example.com',
          phoneNumber: '123', // Too short
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'phoneNumber',
      },
      {
        name: 'profile with future date of birth',
        input: {
          userId: 'user-202',
          name: 'Future User',
          email: 'future@example.com',
          dateOfBirth: '2050-01-01',
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'dateOfBirth',
      },
      {
        name: 'profile with invalid gender',
        input: {
          userId: 'user-303',
          name: 'Test User',
          email: 'test@example.com',
          gender: 'invalid-gender',
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'gender',
      },
      {
        name: 'profile with invalid nationality code',
        input: {
          userId: 'user-404',
          name: 'Test User',
          email: 'test@example.com',
          nationality: 'INVALID',
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'nationality',
      },
    ] as const;

    createProfileCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.profile.create.mockResolvedValue(testCase.expectedOutput);

          const result = await service.create(testCase.input as CreateProfileDto);
          
          expect(result).toEqual(testCase.expectedOutput);
          expect(mockPrismaService.profile.create).toHaveBeenCalledWith({
            data: expect.objectContaining({
              userId: testCase.input.userId,
              name: testCase.input.name,
              email: testCase.input.email,
            }),
          });
        } else {
          await expect(service.create(testCase.input as CreateProfileDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Profile Update Round-trip', () => {
    const updateProfileCases = [
      {
        name: 'update name only',
        profileId: 'profile-123',
        existingProfile: {
          id: 'profile-123',
          userId: 'user-123',
          name: 'Old Name',
          email: 'test@example.com',
          language: 'en',
          preferences: {},
        },
        updateData: {
          name: 'New Name',
        },
        expectedResult: {
          id: 'profile-123',
          userId: 'user-123',
          name: 'New Name',
          email: 'test@example.com',
          language: 'en',
          preferences: {},
          updatedAt: expect.any(Date),
        },
        shouldSucceed: true,
      },
      {
        name: 'update preferences only',
        profileId: 'profile-456',
        existingProfile: {
          id: 'profile-456',
          userId: 'user-456',
          name: 'Test User',
          email: 'test@example.com',
          language: 'en',
          preferences: {
            notifications: { prayer: false },
          },
        },
        updateData: {
          preferences: {
            notifications: { prayer: true, navigation: true },
            accessibility: { fontSize: 'large' },
          },
        },
        expectedResult: {
          id: 'profile-456',
          userId: 'user-456',
          name: 'Test User',
          email: 'test@example.com',
          language: 'en',
          preferences: {
            notifications: { prayer: true, navigation: true },
            accessibility: { fontSize: 'large' },
          },
          updatedAt: expect.any(Date),
        },
        shouldSucceed: true,
      },
      {
        name: 'update multiple fields',
        profileId: 'profile-789',
        existingProfile: {
          id: 'profile-789',
          userId: 'user-789',
          name: 'Old Name',
          email: 'old@example.com',
          phoneNumber: null,
          language: 'en',
          preferences: {},
        },
        updateData: {
          name: 'Updated Name',
          phoneNumber: '+1234567890',
          language: 'ar',
          preferences: {
            notifications: { emergency: true },
          },
        },
        expectedResult: {
          id: 'profile-789',
          userId: 'user-789',
          name: 'Updated Name',
          email: 'old@example.com',
          phoneNumber: '+1234567890',
          language: 'ar',
          preferences: {
            notifications: { emergency: true },
          },
          updatedAt: expect.any(Date),
        },
        shouldSucceed: true,
      },
      {
        name: 'update non-existent profile',
        profileId: 'non-existent',
        existingProfile: null,
        updateData: {
          name: 'New Name',
        },
        shouldSucceed: false,
        expectedError: 'not found',
      },
      {
        name: 'update with invalid email',
        profileId: 'profile-invalid',
        existingProfile: {
          id: 'profile-invalid',
          userId: 'user-invalid',
          name: 'Test User',
          email: 'valid@example.com',
          language: 'en',
        },
        updateData: {
          email: 'invalid-email-format',
        },
        shouldSucceed: false,
        expectedError: 'email',
      },
    ] as const;

    updateProfileCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.profile.findUnique.mockResolvedValue(testCase.existingProfile);
          mockPrismaService.profile.update.mockResolvedValue(testCase.expectedResult);

          const result = await service.update(testCase.profileId, testCase.updateData as UpdateProfileDto);
          
          expect(result).toEqual(testCase.expectedResult);
          expect(mockPrismaService.profile.update).toHaveBeenCalledWith({
            where: { id: testCase.profileId },
            data: expect.objectContaining(testCase.updateData),
          });
        } else {
          if (testCase.existingProfile === null) {
            mockPrismaService.profile.findUnique.mockResolvedValue(null);
          } else {
            mockPrismaService.profile.findUnique.mockResolvedValue(testCase.existingProfile);
          }

          await expect(service.update(testCase.profileId, testCase.updateData as UpdateProfileDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Profile Retrieval and Filtering', () => {
    const retrievalCases = [
      {
        name: 'find profile by ID',
        profileId: 'profile-123',
        mockResult: {
          id: 'profile-123',
          userId: 'user-123',
          name: 'John Doe',
          email: 'john@example.com',
          language: 'en',
          preferences: {},
        },
        shouldSucceed: true,
      },
      {
        name: 'find non-existent profile',
        profileId: 'non-existent',
        mockResult: null,
        shouldSucceed: false,
      },
      {
        name: 'find profile by user ID',
        userId: 'user-456',
        mockResult: {
          id: 'profile-456',
          userId: 'user-456',
          name: 'Jane Doe',
          email: 'jane@example.com',
          language: 'en',
          preferences: {},
        },
        shouldSucceed: true,
      },
    ] as const;

    retrievalCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if ('profileId' in testCase) {
          mockPrismaService.profile.findUnique.mockResolvedValue(testCase.mockResult);
          
          if (testCase.shouldSucceed) {
            const result = await service.findOne(testCase.profileId);
            expect(result).toEqual(testCase.mockResult);
          } else {
            await expect(service.findOne(testCase.profileId))
              .rejects
              .toThrow('not found');
          }
        } else if ('userId' in testCase) {
          mockPrismaService.profile.findMany.mockResolvedValue(
            testCase.mockResult ? [testCase.mockResult] : []
          );
          
          const result = await service.findByUserId(testCase.userId);
          if (testCase.shouldSucceed) {
            expect(result).toEqual(testCase.mockResult);
          } else {
            expect(result).toBeNull();
          }
        }
      });
    });
  });

  describe('Profile Deletion', () => {
    const deletionCases = [
      {
        name: 'delete existing profile',
        profileId: 'profile-delete',
        existingProfile: {
          id: 'profile-delete',
          userId: 'user-delete',
          name: 'To Delete',
          email: 'delete@example.com',
        },
        shouldSucceed: true,
      },
      {
        name: 'delete non-existent profile',
        profileId: 'non-existent',
        existingProfile: null,
        shouldSucceed: false,
        expectedError: 'not found',
      },
    ] as const;

    deletionCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        mockPrismaService.profile.findUnique.mockResolvedValue(testCase.existingProfile);
        
        if (testCase.shouldSucceed) {
          mockPrismaService.profile.delete.mockResolvedValue(testCase.existingProfile);
          
          const result = await service.remove(testCase.profileId);
          expect(result).toEqual(testCase.existingProfile);
          expect(mockPrismaService.profile.delete).toHaveBeenCalledWith({
            where: { id: testCase.profileId },
          });
        } else {
          await expect(service.remove(testCase.profileId))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Data Integrity and Consistency', () => {
    it('should maintain data consistency during concurrent updates', async () => {
      const profileId = 'profile-concurrent';
      const existingProfile = {
        id: profileId,
        userId: 'user-concurrent',
        name: 'Original Name',
        email: 'original@example.com',
        language: 'en',
        preferences: { version: 1 },
      };

      mockPrismaService.profile.findUnique.mockResolvedValue(existingProfile);
      
      // Simulate concurrent updates
      const update1 = { name: 'Updated by User 1' };
      const update2 = { name: 'Updated by User 2' };

      mockPrismaService.profile.update
        .mockResolvedValueOnce({ ...existingProfile, ...update1, updatedAt: new Date() })
        .mockResolvedValueOnce({ ...existingProfile, ...update2, updatedAt: new Date() });

      const [result1, result2] = await Promise.all([
        service.update(profileId, update1),
        service.update(profileId, update2),
      ]);

      expect(result1.name).toBe('Updated by User 1');
      expect(result2.name).toBe('Updated by User 2');
      expect(mockPrismaService.profile.update).toHaveBeenCalledTimes(2);
    });

    it('should preserve existing data when updating subset of fields', async () => {
      const profileId = 'profile-partial';
      const existingProfile = {
        id: profileId,
        userId: 'user-partial',
        name: 'Full Name',
        email: 'full@example.com',
        phoneNumber: '+1234567890',
        language: 'en',
        preferences: {
          notifications: { prayer: true },
          accessibility: { fontSize: 'medium' },
        },
      };

      const partialUpdate = {
        preferences: {
          notifications: { prayer: false, navigation: true },
        },
      };

      mockPrismaService.profile.findUnique.mockResolvedValue(existingProfile);
      mockPrismaService.profile.update.mockResolvedValue({
        ...existingProfile,
        preferences: {
          notifications: { prayer: false, navigation: true },
          accessibility: { fontSize: 'medium' },
        },
        updatedAt: new Date(),
      });

      const result = await service.update(profileId, partialUpdate);

      expect(result.name).toBe('Full Name'); // Unchanged
      expect(result.email).toBe('full@example.com'); // Unchanged
      expect(result.phoneNumber).toBe('+1234567890'); // Unchanged
      expect(result.preferences.notifications.prayer).toBe(false); // Updated
      expect(result.preferences.notifications.navigation).toBe(true); // Added
      expect(result.preferences.accessibility.fontSize).toBe('medium'); // Preserved
    });
  });

  describe('Complex Preference Management', () => {
    const preferencesCases = [
      {
        name: 'nested preference updates',
        existing: {
          notifications: {
            prayer: true,
            navigation: false,
            emergency: true,
          },
          accessibility: {
            fontSize: 'medium',
            highContrast: false,
          },
        },
        update: {
          notifications: {
            navigation: true,
          },
          accessibility: {
            voiceGuidance: true,
          },
        },
        expected: {
          notifications: {
            prayer: true,
            navigation: true,
            emergency: true,
          },
          accessibility: {
            fontSize: 'medium',
            highContrast: false,
            voiceGuidance: true,
          },
        },
      },
      {
        name: 'complete preference replacement',
        existing: {
          notifications: { prayer: true },
          oldSetting: 'should be removed',
        },
        update: {
          notifications: { emergency: true },
          privacy: { shareLocation: false },
        },
        expected: {
          notifications: { emergency: true },
          privacy: { shareLocation: false },
        },
      },
    ] as const;

    preferencesCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const profileId = `profile-prefs-${index}`;
        const existingProfile = {
          id: profileId,
          userId: `user-prefs-${index}`,
          name: 'Test User',
          email: 'test@example.com',
          language: 'en',
          preferences: testCase.existing,
        };

        mockPrismaService.profile.findUnique.mockResolvedValue(existingProfile);
        mockPrismaService.profile.update.mockResolvedValue({
          ...existingProfile,
          preferences: testCase.expected,
          updatedAt: new Date(),
        });

        const result = await service.update(profileId, {
          preferences: testCase.update,
        });

        expect(result.preferences).toEqual(testCase.expected);
      });
    });
  });

  describe('Profile Validation Edge Cases', () => {
    const validationEdgeCases = [
      {
        name: 'very long name',
        input: {
          userId: 'user-long-name',
          name: 'A'.repeat(256),
          email: 'test@example.com',
          language: 'en',
        },
        shouldSucceed: false,
        expectedError: 'name',
      },
      {
        name: 'special characters in name',
        input: {
          userId: 'user-special',
          name: 'José María García-López',
          email: 'jose@example.com',
          language: 'es',
        },
        shouldSucceed: true,
      },
      {
        name: 'unicode characters in name',
        input: {
          userId: 'user-unicode',
          name: 'أحمد محمد',
          email: 'ahmed@example.com',
          language: 'ar',
        },
        shouldSucceed: true,
      },
      {
        name: 'empty preferences object',
        input: {
          userId: 'user-empty-prefs',
          name: 'Test User',
          email: 'test@example.com',
          language: 'en',
          preferences: {},
        },
        shouldSucceed: true,
      },
      {
        name: 'null preferences',
        input: {
          userId: 'user-null-prefs',
          name: 'Test User',
          email: 'test@example.com',
          language: 'en',
          preferences: null,
        },
        shouldSucceed: true,
      },
    ] as const;

    validationEdgeCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        if (testCase.shouldSucceed) {
          mockPrismaService.profile.create.mockResolvedValue({
            id: `profile-edge-${index}`,
            ...testCase.input,
            createdAt: new Date(),
            updatedAt: new Date(),
          });

          const result = await service.create(testCase.input as CreateProfileDto);
          expect(result).toBeDefined();
          expect(result.name).toBe(testCase.input.name);
        } else {
          await expect(service.create(testCase.input as CreateProfileDto))
            .rejects
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});