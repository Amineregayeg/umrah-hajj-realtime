import {
  Controller,
  Get,
  Param,
  Query,
  HttpException,
  HttpStatus,
  Header,
  ParseIntPipe,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBadRequestResponse,
  ApiNotFoundResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { QuranService } from './quran.service';
import {
  QuranLanguage,
  QuranSurahRequestDto,
  QuranAyahRequestDto,
  QuranSearchRequestDto,
  QuranSurahDto,
  QuranAyahDto,
  QuranSearchResponseDto,
  QuranRecitersResponseDto,
} from './dto';

@ApiTags('Quran')
@Controller('content/quran')
export class QuranController {
  constructor(private readonly quranService: QuranService) {}

  @Get('surah/:id')
  @Header('Cache-Control', 'public, max-age=86400') // 24 hours cache
  @ApiOperation({
    summary: 'Get a complete Surah by ID',
    description: 'Retrieve a complete Surah with all its Ayahs in the specified language',
  })
  @ApiParam({
    name: 'id',
    description: 'Surah ID (1-114)',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'lang',
    description: 'Language for the response',
    enum: QuranLanguage,
    required: false,
    example: 'ar',
  })
  @ApiResponse({
    status: 200,
    description: 'Surah retrieved successfully',
    type: QuranSurahDto,
    examples: {
      arabic: {
        summary: 'Arabic text example',
        value: {
          id: 1,
          name: 'الفاتحة',
          transliteration: 'Al-Fatihah',
          translation: 'The Opening',
          type: 'makkiyyah',
          ayah_count: 7,
          ayahs: [
            {
              id: 1,
              text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              page: 1,
              juz: 1,
              manzil: 1,
              ruku: 1,
              hizbQuarter: 1,
              sajda: false,
            },
          ],
        },
      },
      english: {
        summary: 'English translation example',
        value: {
          id: 1,
          name: 'Al-Fatihah',
          translation: 'The Opening',
          type: 'makkiyyah',
          ayah_count: 7,
          ayahs: [
            {
              id: 1,
              text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
            },
          ],
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid surah ID or language' })
  @ApiNotFoundResponse({ description: 'Surah not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getSurah(
    @Param('id', ParseIntPipe) id: number,
    @Query('lang') lang: QuranLanguage = QuranLanguage.ARABIC,
  ): Promise<QuranSurahDto> {
    try {
      // Validate surah ID range
      if (id < 1 || id > 114) {
        throw new HttpException(
          'Invalid surah ID. Must be between 1 and 114.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.quranService.getSurah(id, lang);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve surah',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('ayah')
  @Header('Cache-Control', 'public, max-age=86400') // 24 hours cache
  @ApiOperation({
    summary: 'Get a specific Ayah',
    description: 'Retrieve a specific Ayah by Surah and Ayah number in the specified language',
  })
  @ApiQuery({
    name: 'surah',
    description: 'Surah number (1-114)',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'ayah',
    description: 'Ayah number within the surah',
    type: 'number',
    example: 1,
  })
  @ApiQuery({
    name: 'lang',
    description: 'Language for the response',
    enum: QuranLanguage,
    required: false,
    example: 'ar',
  })
  @ApiResponse({
    status: 200,
    description: 'Ayah retrieved successfully',
    type: QuranAyahDto,
    examples: {
      arabic: {
        summary: 'Arabic ayah example',
        value: {
          id: 1,
          text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
          page: 1,
          juz: 1,
          manzil: 1,
          ruku: 1,
          hizbQuarter: 1,
          sajda: false,
        },
      },
      english: {
        summary: 'English ayah example',
        value: {
          id: 1,
          text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid surah or ayah number, or language' })
  @ApiNotFoundResponse({ description: 'Ayah not found' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async getAyah(@Query() query: QuranAyahRequestDto): Promise<QuranAyahDto> {
    try {
      // Validate surah ID range
      if (query.surah < 1 || query.surah > 114) {
        throw new HttpException(
          'Invalid surah number. Must be between 1 and 114.',
          HttpStatus.BAD_REQUEST,
        );
      }

      // Validate ayah number (basic validation - service will do detailed validation)
      if (query.ayah < 1) {
        throw new HttpException(
          'Invalid ayah number. Must be positive.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.quranService.getAyah(query.surah, query.ayah, query.lang);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to retrieve ayah',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('search')
  @Header('Cache-Control', 'public, max-age=3600') // 1 hour cache (shorter for search)
  @ApiOperation({
    summary: 'Search Quran text',
    description: 'Search for specific terms in the Quran using trigram matching and fuzzy search with edit distance <= 1',
  })
  @ApiQuery({
    name: 'q',
    description: 'Search query term',
    type: 'string',
    example: 'الله',
  })
  @ApiQuery({
    name: 'lang',
    description: 'Language to search in',
    enum: QuranLanguage,
    required: false,
    example: 'ar',
  })
  @ApiQuery({
    name: 'limit',
    description: 'Maximum number of results to return',
    type: 'number',
    required: false,
    example: 20,
  })
  @ApiQuery({
    name: 'offset',
    description: 'Offset for pagination',
    type: 'number',
    required: false,
    example: 0,
  })
  @ApiResponse({
    status: 200,
    description: 'Search completed successfully',
    type: QuranSearchResponseDto,
    examples: {
      searchResults: {
        summary: 'Search results example',
        value: {
          results: [
            {
              surah: 1,
              surah_name: 'الفاتحة',
              surah_translation: 'The Opening',
              ayah: 1,
              text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
              score: 1.0,
              highlighted: 'بِسْمِ <mark>اللَّهِ</mark> الرَّحْمَٰنِ الرَّحِيمِ',
            },
          ],
          total: 42,
          count: 1,
          offset: 0,
          query: 'الله',
          language: 'ar',
          execution_time_ms: 15,
        },
      },
    },
  })
  @ApiBadRequestResponse({ description: 'Invalid search parameters' })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  @UsePipes(new ValidationPipe({ transform: true }))
  async searchQuran(@Query() query: QuranSearchRequestDto): Promise<QuranSearchResponseDto> {
    try {
      // Additional validation for search query
      if (!query.q || query.q.trim().length < 2) {
        throw new HttpException(
          'Search query must be at least 2 characters long.',
          HttpStatus.BAD_REQUEST,
        );
      }

      if (query.q.trim().length > 100) {
        throw new HttpException(
          'Search query must not exceed 100 characters.',
          HttpStatus.BAD_REQUEST,
        );
      }

      return await this.quranService.searchQuran(
        query.q,
        query.lang,
        query.limit,
        query.offset,
      );
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      
      throw new HttpException(
        'Failed to search Quran',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('audio/reciters')
  @Header('Cache-Control', 'public, max-age=86400') // 24 hours cache
  @ApiOperation({
    summary: 'Get list of available Quran reciters',
    description: 'Retrieve a static list of available Quran reciters with their audio URL templates',
  })
  @ApiResponse({
    status: 200,
    description: 'Reciters list retrieved successfully',
    type: QuranRecitersResponseDto,
    examples: {
      reciters: {
        summary: 'Reciters list example',
        value: {
          reciters: [
            {
              id: 'abdul_basit_murattal',
              name_ar: 'عبد الباسط عبد الصمد',
              name_en: 'Abdul Basit Abdul Samad',
              style: 'Murattal',
              audio_url_template: 'https://audio.quranapi.com/abdul_basit_murattal/{surah:03d}.mp3',
              format: 'mp3',
              quality: '128kbps',
            },
          ],
          total: 5,
        },
      },
    },
  })
  @ApiInternalServerErrorResponse({ description: 'Internal server error' })
  async getReciters(): Promise<QuranRecitersResponseDto> {
    try {
      return await this.quranService.getReciters();
    } catch (error) {
      throw new HttpException(
        'Failed to retrieve reciters list',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('cache/stats')
  @ApiOperation({
    summary: 'Get cache statistics',
    description: 'Retrieve cache performance statistics for monitoring purposes',
  })
  @ApiResponse({
    status: 200,
    description: 'Cache statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        hits: { type: 'number', example: 150 },
        misses: { type: 'number', example: 25 },
        hitRate: { type: 'number', example: 85.71 },
        size: { type: 'number', example: 42 },
        capacity: { type: 'number', example: 100 },
      },
    },
  })
  async getCacheStats() {
    return this.quranService.getCacheStats();
  }
}