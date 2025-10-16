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
  Query,
  Put,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ConsentService } from './consent.service';
import { CreateConsentDto, ConsentType } from './dto/create-consent.dto';
import { UpdateConsentDto } from './dto/update-consent.dto';
import { ConsentResponseDto, ConsentSummaryDto } from './dto/consent-response.dto';

@ApiTags('Consent')
@Controller('consent')
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  // Mock data for Gate A testing
  private getMockConsent(): ConsentResponseDto {
    return {
      id: 'consent-123',
      userId: 'user-456',
      consentType: ConsentType.DATA_PROCESSING,
      granted: true,
      purpose: 'Processing user data for Umrah services',
      legalBasis: 'Legitimate interest',
      grantedAt: new Date('2024-01-01T00:00:00Z'),
      revokedAt: undefined,
      createdAt: new Date('2024-01-01T00:00:00Z'),
      updatedAt: new Date('2024-01-01T00:00:00Z'),
    };
  }

  private getMockConsentSummary(): ConsentSummaryDto {
    return {
      userId: 'user-456',
      consents: [
        this.getMockConsent(),
        {
          id: 'consent-124',
          userId: 'user-456',
          consentType: ConsentType.LOCATION_TRACKING,
          granted: true,
          purpose: 'Location tracking for navigation services',
          legalBasis: 'User consent',
          grantedAt: new Date('2024-01-01T00:00:00Z'),
          revokedAt: undefined,
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-01T00:00:00Z'),
        },
        {
          id: 'consent-125',
          userId: 'user-456',
          consentType: ConsentType.MARKETING_COMMUNICATIONS,
          granted: false,
          purpose: 'Marketing communications',
          legalBasis: 'User consent',
          grantedAt: undefined,
          revokedAt: new Date('2024-01-02T00:00:00Z'),
          createdAt: new Date('2024-01-01T00:00:00Z'),
          updatedAt: new Date('2024-01-02T00:00:00Z'),
        },
      ],
      lastUpdated: new Date('2024-01-02T00:00:00Z'),
    };
  }

  @Post()
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async create(
    @Request() req: any, // TODO: Type this properly when auth is implemented
    @Body() createConsentDto: CreateConsentDto,
  ): Promise<ConsentResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.consentService.create(userId, createConsentDto);
  }

  @Put()
  @ApiOperation({ summary: 'Update user consent preferences' })
  @ApiResponse({ status: 200, description: 'Consent updated successfully', type: ConsentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid input data' })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  // @ApiBearerAuth() // TODO: Uncomment when auth is implemented
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async updateConsent(
    @Request() req: any,
    @Body() updateConsentDto: UpdateConsentDto,
  ): Promise<ConsentResponseDto> {
    // TODO: Extract user ID from JWT token once auth is implemented
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.consentService.update(userId, updateConsentDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all user consents' })
  @ApiResponse({ status: 200, description: 'User consents retrieved successfully', type: ConsentSummaryDto })
  @ApiResponse({ status: 403, description: 'Unauthorized' })
  // @ApiBearerAuth() // TODO: Uncomment when auth is implemented
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async findAll(@Request() req: any): Promise<ConsentSummaryDto> {
    // TODO: Extract user ID from JWT token once auth is implemented
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.consentService.findAll(userId);
  }

  @Get('check')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async checkConsent(
    @Request() req: any,
    @Query('type') consentType: ConsentType,
  ): Promise<{ granted: boolean }> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    const granted = await this.consentService.checkConsent(userId, consentType);
    return { granted };
  }

  @Get(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async findOne(@Param('id') id: string): Promise<ConsentResponseDto> {
    return this.consentService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async update(
    @Param('id') id: string,
    @Body() updateConsentDto: UpdateConsentDto,
  ): Promise<ConsentResponseDto> {
    return this.consentService.update(id, updateConsentDto);
  }

  @Post('revoke/:type')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async revoke(
    @Request() req: any,
    @Param('type') consentType: ConsentType,
  ): Promise<ConsentResponseDto> {
    // TODO: Extract user ID from JWT token
    const userId = 'temp-user-id'; // Placeholder until auth is implemented
    return this.consentService.revoke(userId, consentType);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async remove(@Param('id') id: string): Promise<void> {
    return this.consentService.remove(id);
  }
}