import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateConsentDto, ConsentType } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { ConsentResponseDto, ConsentSummaryDto } from './dto/consent-response.dto';
import { 
  CreateConsentZodSchema, 
  UpdateConsentZodSchema, 
  ConsentResponseZodDto 
} from './dto/consent-zod.dto';

@Injectable()
export class ConsentService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, createConsentDto: CreateConsentDto): Promise<ConsentResponseDto> {
    // For the new Prisma schema, we'll create/update the single consent record
    // The old DTO with ConsentType doesn't match our new schema, so we'll adapt
    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Create or update the consent record with default values
      const consent = await this.prisma.consent.upsert({
        where: { userId },
        create: {
          userId,
          essential: true,
          crashReports: true,
          analytics: true,
          uploadTranscripts: false,
          uploadAudioClips: false,
          backgroundLocation: false,
          emailUpdates: false
        },
        update: {
          updatedAt: new Date()
        }
      });

      return this.transformToLegacyResponseDto(consent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create consent: ${error.message}`);
    }
  }

  async findAll(userId: string): Promise<ConsentSummaryDto> {
    try {
      const consent = await this.prisma.consent.findUnique({
        where: { userId }
      });

      if (!consent) {
        // Return default consent structure
        return {
          userId,
          consents: [],
          lastUpdated: new Date()
        };
      }

      // Transform single consent record to legacy format with multiple consent types
      const legacyConsents = this.transformToLegacyConsentList(consent);
      
      return {
        userId,
        consents: legacyConsents,
        lastUpdated: consent.updatedAt
      };
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve consents: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ConsentResponseDto> {
    try {
      // In the legacy API, id might be userId
      const consent = await this.prisma.consent.findUnique({
        where: { userId: id }
      });

      if (!consent) {
        throw new NotFoundException('Consent not found');
      }

      return this.transformToLegacyResponseDto(consent);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve consent: ${error.message}`);
    }
  }

  async findByType(userId: string, consentType: ConsentType): Promise<ConsentResponseDto | null> {
    try {
      const consent = await this.prisma.consent.findUnique({
        where: { userId }
      });

      if (!consent) {
        return null;
      }

      // Return consent data formatted as the specific type requested
      return this.transformToLegacyResponseDto(consent, consentType);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve consent: ${error.message}`);
    }
  }

  async update(userId: string, updateConsentDto: UpdateConsentDto): Promise<ConsentResponseDto> {
    // Validate with Zod for new schema
    const validationResult = UpdateConsentZodSchema.safeParse(updateConsentDto);
    if (!validationResult.success) {
      throw new BadRequestException(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    try {
      // Check if consent exists, create if not
      const consent = await this.prisma.consent.upsert({
        where: { userId },
        create: {
          userId,
          essential: validatedData.essential ?? true,
          crashReports: validatedData.crashReports ?? true,
          analytics: validatedData.analytics ?? true,
          uploadTranscripts: validatedData.uploadTranscripts ?? false,
          uploadAudioClips: validatedData.uploadAudioClips ?? false,
          backgroundLocation: validatedData.backgroundLocation ?? false,
          emailUpdates: validatedData.emailUpdates ?? false
        },
        update: {
          ...validatedData,
          updatedAt: new Date()
        }
      });

      return this.transformToLegacyResponseDto(consent);
    } catch (error) {
      throw new BadRequestException(`Failed to update consent: ${error.message}`);
    }
  }

  async revoke(userId: string, consentType: ConsentType): Promise<ConsentResponseDto> {
    try {
      const consent = await this.prisma.consent.findUnique({
        where: { userId }
      });

      if (!consent) {
        throw new NotFoundException('Consent not found');
      }

      // Map legacy consent types to new schema fields and revoke them
      const updateData: any = { updatedAt: new Date() };
      
      switch (consentType) {
        case ConsentType.ANALYTICS:
          updateData.analytics = false;
          break;
        case ConsentType.LOCATION_TRACKING:
          updateData.backgroundLocation = false;
          break;
        case ConsentType.MARKETING_COMMUNICATIONS:
          updateData.emailUpdates = false;
          break;
        case ConsentType.DATA_PROCESSING:
          // Essential consent cannot be revoked
          throw new BadRequestException('Essential consent cannot be revoked');
        default:
          throw new BadRequestException(`Unknown consent type: ${consentType}`);
      }

      const updatedConsent = await this.prisma.consent.update({
        where: { userId },
        data: updateData
      });

      return this.transformToLegacyResponseDto(updatedConsent, consentType);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to revoke consent: ${error.message}`);
    }
  }

  async checkConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    try {
      const consent = await this.prisma.consent.findUnique({
        where: { userId }
      });

      if (!consent) {
        return false;
      }

      // Map legacy consent types to new schema fields
      switch (consentType) {
        case ConsentType.DATA_PROCESSING:
          return consent.essential;
        case ConsentType.ANALYTICS:
          return consent.analytics;
        case ConsentType.LOCATION_TRACKING:
          return consent.backgroundLocation;
        case ConsentType.MARKETING_COMMUNICATIONS:
          return consent.emailUpdates;
        default:
          return false;
      }
    } catch (error) {
      throw new BadRequestException(`Failed to check consent: ${error.message}`);
    }
  }

  async remove(userId: string): Promise<void> {
    try {
      const consent = await this.prisma.consent.findUnique({
        where: { userId }
      });

      if (!consent) {
        throw new NotFoundException('Consent not found');
      }

      await this.prisma.consent.delete({
        where: { userId }
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete consent: ${error.message}`);
    }
  }

  private transformToLegacyResponseDto(consent: any, consentType?: ConsentType): ConsentResponseDto {
    // Transform the new consent schema to legacy format
    const baseResponse = {
      id: `consent-${consent.userId}`,
      userId: consent.userId,
      grantedAt: new Date(),
      revokedAt: undefined,
      createdAt: new Date(),
      updatedAt: consent.updatedAt,
      purpose: '',
      legalBasis: 'User consent'
    };

    // If specific consent type requested, return that type's data
    if (consentType) {
      switch (consentType) {
        case ConsentType.DATA_PROCESSING:
          return {
            ...baseResponse,
            consentType: ConsentType.DATA_PROCESSING,
            granted: consent.essential,
            purpose: 'Processing user data for Umrah services'
          };
        case ConsentType.ANALYTICS:
          return {
            ...baseResponse,
            consentType: ConsentType.ANALYTICS,
            granted: consent.analytics,
            purpose: 'Analytics and performance monitoring'
          };
        case ConsentType.LOCATION_TRACKING:
          return {
            ...baseResponse,
            consentType: ConsentType.LOCATION_TRACKING,
            granted: consent.backgroundLocation,
            purpose: 'Location tracking for navigation services'
          };
        case ConsentType.MARKETING_COMMUNICATIONS:
          return {
            ...baseResponse,
            consentType: ConsentType.MARKETING_COMMUNICATIONS,
            granted: consent.emailUpdates,
            purpose: 'Marketing communications'
          };
        default:
          return {
            ...baseResponse,
            consentType: ConsentType.DATA_PROCESSING,
            granted: consent.essential,
            purpose: 'Processing user data for Umrah services'
          };
      }
    }

    // Default to essential consent
    return {
      ...baseResponse,
      consentType: ConsentType.DATA_PROCESSING,
      granted: consent.essential,
      purpose: 'Processing user data for Umrah services'
    };
  }

  private transformToLegacyConsentList(consent: any): ConsentResponseDto[] {
    const baseData = {
      userId: consent.userId,
      grantedAt: new Date(),
      revokedAt: undefined,
      createdAt: new Date(),
      updatedAt: consent.updatedAt,
      legalBasis: 'User consent'
    };

    return [
      {
        id: `consent-${consent.userId}-essential`,
        consentType: ConsentType.DATA_PROCESSING,
        granted: consent.essential,
        purpose: 'Processing user data for Umrah services',
        ...baseData
      },
      {
        id: `consent-${consent.userId}-analytics`,
        consentType: ConsentType.ANALYTICS,
        granted: consent.analytics,
        purpose: 'Analytics and performance monitoring',
        ...baseData
      },
      {
        id: `consent-${consent.userId}-location`,
        consentType: ConsentType.LOCATION_TRACKING,
        granted: consent.backgroundLocation,
        purpose: 'Location tracking for navigation services',
        ...baseData
      },
      {
        id: `consent-${consent.userId}-marketing`,
        consentType: ConsentType.MARKETING_COMMUNICATIONS,
        granted: consent.emailUpdates,
        purpose: 'Marketing communications',
        ...baseData
      }
    ];
  }
}