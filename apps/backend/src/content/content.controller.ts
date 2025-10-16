import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import { CreateContentDto, ContentType, ContentCategory } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentResponseDto, ContentListResponseDto } from './dto/content-response.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import { qiblaBearingDeg, distanceToKaabaKm, getKaabaCoordinates } from '../shared/utils/qibla-calculation.util';

@ApiTags('Content')
@Controller('content')
export class ContentController {
  constructor(private readonly contentService: ContentService) {}

  // Mock data for Gate A testing
  private getMockPrayerTimes() {
    return {
      location: {
        city: 'Mecca',
        country: 'Saudi Arabia',
        latitude: 21.4225,
        longitude: 39.8262,
      },
      date: new Date().toISOString().split('T')[0],
      times: {
        fajr: '04:45',
        sunrise: '06:05',
        dhuhr: '12:25',
        asr: '15:45',
        maghrib: '18:45',
        isha: '20:15',
      },
      hijriDate: {
        day: 15,
        month: 'Rajab',
        year: 1446,
      },
      timezone: 'Asia/Riyadh',
      method: 'Umm Al-Qura University, Makkah',
    };
  }

  private calculateQiblaDirection(latitude: number, longitude: number) {
    const kaabaCoords = getKaabaCoordinates();
    
    return {
      location: {
        latitude,
        longitude,
      },
      qibla: {
        direction: qiblaBearingDeg(latitude, longitude),
        distance: distanceToKaabaKm(latitude, longitude),
      },
      kaaba: {
        latitude: kaabaCoords.latitude,
        longitude: kaabaCoords.longitude,
      },
      calculatedAt: new Date().toISOString(),
    };
  }

  @Post()
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async create(@Body() createContentDto: CreateContentDto): Promise<ContentResponseDto> {
    return this.contentService.create(createContentDto);
  }

  @Get('prayer-times')
  @ApiOperation({ summary: 'Get prayer times for current location' })
  @ApiResponse({ status: 200, description: 'Prayer times retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid location parameters' })
  async getPrayerTimes(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
    @Query('date') date?: string,
  ) {
    // For Gate A testing, return mock data
    return this.getMockPrayerTimes();
  }

  @Get('qibla')
  @ApiOperation({ summary: 'Get Qibla direction for current location' })
  @ApiResponse({ status: 200, description: 'Qibla direction retrieved successfully' })
  @ApiResponse({ status: 400, description: 'Invalid location parameters' })
  async getQiblaDirection(
    @Query('lat') lat?: number,
    @Query('lng') lng?: number,
  ) {
    // Validate required parameters
    if (lat === undefined || lng === undefined) {
      throw new Error('Missing required parameters: lat and lng must be provided');
    }
    
    // Validate coordinate ranges
    if (Math.abs(lat) > 90) {
      throw new Error('Invalid latitude: must be between -90 and 90 degrees');
    }
    if (Math.abs(lng) > 180) {
      throw new Error('Invalid longitude: must be between -180 and 180 degrees');
    }
    
    // Calculate real Qibla direction using great-circle formula
    return this.calculateQiblaDirection(lat, lng);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content with optional filtering' })
  @ApiResponse({ status: 200, description: 'Content retrieved successfully', type: ContentListResponseDto })
  async findAll(@Query() query: ContentQueryDto): Promise<ContentListResponseDto> {
    return this.contentService.findAll(query);
  }

  @Get('popular')
  async findPopular(@Query('limit') limit?: number): Promise<ContentResponseDto[]> {
    return this.contentService.findPopular(limit);
  }

  @Get('recent')
  async findRecent(@Query('limit') limit?: number): Promise<ContentResponseDto[]> {
    return this.contentService.findRecent(limit);
  }

  @Get('search')
  async search(
    @Query('q') searchTerm: string,
    @Query() query: ContentQueryDto,
  ): Promise<ContentListResponseDto> {
    return this.contentService.search(searchTerm, query);
  }

  @Get('category/:category')
  async findByCategory(
    @Param('category') category: ContentCategory,
    @Query() query: ContentQueryDto,
  ): Promise<ContentListResponseDto> {
    return this.contentService.findByCategory(category, query);
  }

  @Get('type/:type')
  async findByType(
    @Param('type') type: ContentType,
    @Query() query: ContentQueryDto,
  ): Promise<ContentListResponseDto> {
    return this.contentService.findByType(type, query);
  }

  @Get(':id')
  async findOne(@Param('id') id: string): Promise<ContentResponseDto> {
    // Increment view count when content is accessed
    await this.contentService.incrementViewCount(id);
    return this.contentService.findOne(id);
  }

  @Patch(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async update(
    @Param('id') id: string,
    @Body() updateContentDto: UpdateContentDto,
  ): Promise<ContentResponseDto> {
    return this.contentService.update(id, updateContentDto);
  }

  @Post(':id/publish')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async publish(@Param('id') id: string): Promise<ContentResponseDto> {
    return this.contentService.publish(id);
  }

  @Post(':id/unpublish')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async unpublish(@Param('id') id: string): Promise<ContentResponseDto> {
    return this.contentService.unpublish(id);
  }

  @Delete(':id')
  // @UseGuards(JwtAuthGuard) // TODO: Uncomment when Auth_Security_Engineer completes auth guard
  async remove(@Param('id') id: string): Promise<void> {
    return this.contentService.remove(id);
  }
}