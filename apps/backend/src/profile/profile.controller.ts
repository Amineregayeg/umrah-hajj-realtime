import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Request,
  UseGuards,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { CreateProfileDto, Gender } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ProfileResponseDto } from './dto/profile-response.dto';

@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  // Mock data for Gate A testing
  private getMockProfile(): ProfileResponseDto {
    return {
      id: 'profile-123',
      userId: 'user-456',
      firstName: 'Ahmed',
      lastName: 'Al-Rashid',
      dateOfBirth: '1990-05-15',
      gender: Gender.MALE,
      phoneNumber: '+966501234567',
      nationality: 'SA',
      preferredLanguage: 'en',
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-15T10:30:00Z'),
    };
  }

  @Post()
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async create(
    @Request() req: any, // TODO: Type this properly when auth is implemented
    @Body() createProfileDto: CreateProfileDto,
  ): Promise<ProfileResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.profileService.create(userId, createProfileDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully', type: ProfileResponseDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  // @ApiBearerAuth() // TODO: Uncomment when auth is implemented
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async findCurrent(@Request() req: any): Promise<ProfileResponseDto | null> {
    // TODO: Extract user ID from JWT token once auth is implemented
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.profileService.findByUserId(userId);
  }

  @Put()
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully', type: ProfileResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  // @ApiBearerAuth() // TODO: Uncomment when auth is implemented
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async updateCurrent(
    @Request() req: any,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    // TODO: Extract user ID from JWT token once auth is implemented
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.profileService.update(userId, updateProfileDto);
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async findOne(@Param('id') id: string): Promise<ProfileResponseDto> {
    return this.profileService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async update(
    @Param('id') id: string,
    @Body() updateProfileDto: UpdateProfileDto,
  ): Promise<ProfileResponseDto> {
    return this.profileService.update(id, updateProfileDto);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async remove(@Param('id') id: string): Promise<void> {
    return this.profileService.remove(id);
  }
}