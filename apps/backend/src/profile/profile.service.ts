import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';
import { 
  CreateProfileZodSchema, 
  UpdateProfileZodSchema, 
  CreateProfileZodDto, 
  UpdateProfileZodDto,
  ProfileResponseZodDto 
} from './dto/profile-zod.dto';

@Injectable()
export class ProfileService {
  constructor(private prisma: PrismaService) {}
  
  async create(userId: string, createProfileDto: CreateProfileDto): Promise<ProfileResponseDto> {
    // Validate with Zod
    const validationResult = CreateProfileZodSchema.safeParse(createProfileDto);
    if (!validationResult.success) {
      throw new BadRequestException(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    try {
      // Check if user exists
      const user = await this.prisma.user.findUnique({
        where: { id: userId }
      });
      
      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if profile already exists
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId }
      });

      if (existingProfile) {
        throw new BadRequestException('Profile already exists for this user');
      }

      // Create the profile
      const profile = await this.prisma.userProfile.create({
        data: {
          userId,
          firstName: validatedData.firstName,
          lastName: validatedData.lastName,
          country: validatedData.country,
          languageUi: validatedData.languageUi,
          languageAudio: validatedData.languageAudio,
          madhhab: validatedData.madhhab,
          gender: validatedData.gender,
          mobility: validatedData.mobility,
          accessibility: validatedData.accessibility as any, // Prisma JSON field
          guidanceMode: validatedData.guidanceMode
        }
      });

      // Transform to response DTO format
      return this.transformToResponseDto(profile);
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create profile: ${error.message}`);
    }
  }

  async findOne(id: string): Promise<ProfileResponseDto> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId: id }
      });

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      return this.transformToResponseDto(profile);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to retrieve profile: ${error.message}`);
    }
  }

  async findByUserId(userId: string): Promise<ProfileResponseDto | null> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        return null;
      }

      return this.transformToResponseDto(profile);
    } catch (error) {
      throw new BadRequestException(`Failed to retrieve profile: ${error.message}`);
    }
  }

  async update(userId: string, updateProfileDto: UpdateProfileDto): Promise<ProfileResponseDto> {
    // Validate with Zod
    const validationResult = UpdateProfileZodSchema.safeParse(updateProfileDto);
    if (!validationResult.success) {
      throw new BadRequestException(`Validation failed: ${validationResult.error.message}`);
    }

    const validatedData = validationResult.data;

    try {
      // Check if profile exists
      const existingProfile = await this.prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!existingProfile) {
        throw new NotFoundException('Profile not found');
      }

      // Update the profile
      const profile = await this.prisma.userProfile.update({
        where: { userId },
        data: {
          ...validatedData
        }
      });

      return this.transformToResponseDto(profile);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to update profile: ${error.message}`);
    }
  }

  async remove(userId: string): Promise<void> {
    try {
      const profile = await this.prisma.userProfile.findUnique({
        where: { userId }
      });

      if (!profile) {
        throw new NotFoundException('Profile not found');
      }

      await this.prisma.userProfile.delete({
        where: { userId }
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to delete profile: ${error.message}`);
    }
  }

  private transformToResponseDto(profile: any): ProfileResponseDto {
    // Transform the database model to the legacy response format for backwards compatibility
    return {
      id: profile.userId, // Use userId as id for backwards compatibility
      userId: profile.userId,
      firstName: profile.firstName,
      lastName: profile.lastName,
      dateOfBirth: null, // Not in new schema, return null for backwards compatibility
      gender: profile.gender?.toUpperCase() || 'MALE', // Transform to legacy enum format
      phoneNumber: null, // Not in new schema
      nationality: profile.country,
      preferredLanguage: profile.languageUi,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}