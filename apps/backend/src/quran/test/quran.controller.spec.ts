import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QuranController } from '../quran.controller';
import { QuranService } from '../quran.service';
import { QuranLanguage } from '../dto';

describe('QuranController', () => {
  let controller: QuranController;
  let service: QuranService;

  const mockQuranService = {
    getSurah: vi.fn(),
    getAyah: vi.fn(),
    searchQuran: vi.fn(),
    getReciters: vi.fn(),
    getCacheStats: vi.fn(),
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [QuranController],
      providers: [
        {
          provide: QuranService,
          useValue: mockQuranService,
        },
      ],
    }).compile();

    controller = module.get<QuranController>(QuranController);
    service = module.get<QuranService>(QuranService);
  });

  describe('getSurah', () => {
    const mockSurahData = {
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
          sajda: false,
        },
      ],
    };

    it('should return a surah', async () => {
      mockQuranService.getSurah.mockResolvedValueOnce(mockSurahData);

      const result = await controller.getSurah(1);

      expect(service.getSurah).toHaveBeenCalledWith(1, QuranLanguage.ARABIC);
      expect(result).toEqual(mockSurahData);
    });

    it('should return a surah in specified language', async () => {
      mockQuranService.getSurah.mockResolvedValueOnce(mockSurahData);

      const result = await controller.getSurah(1, QuranLanguage.ENGLISH);

      expect(service.getSurah).toHaveBeenCalledWith(1, QuranLanguage.ENGLISH);
      expect(result).toEqual(mockSurahData);
    });

    it('should validate surah ID range', async () => {
      await expect(controller.getSurah(0)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid surah ID. Must be between 1 and 114.',
        })
      );

      await expect(controller.getSurah(115)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid surah ID. Must be between 1 and 114.',
        })
      );
    });

    it('should handle service errors', async () => {
      mockQuranService.getSurah.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.getSurah(1)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve surah',
        })
      );
    });

    it('should propagate HttpExceptions from service', async () => {
      const httpError = new HttpException('Surah not found', HttpStatus.NOT_FOUND);
      mockQuranService.getSurah.mockRejectedValueOnce(httpError);

      await expect(controller.getSurah(1)).rejects.toThrow(httpError);
    });
  });

  describe('getAyah', () => {
    const mockAyahData = {
      id: 1,
      text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
      page: 1,
      juz: 1,
      sajda: false,
    };

    it('should return an ayah', async () => {
      mockQuranService.getAyah.mockResolvedValueOnce(mockAyahData);

      const result = await controller.getAyah({
        surah: 1,
        ayah: 1,
        lang: QuranLanguage.ARABIC,
      });

      expect(service.getAyah).toHaveBeenCalledWith(1, 1, QuranLanguage.ARABIC);
      expect(result).toEqual(mockAyahData);
    });

    it('should validate surah number range', async () => {
      await expect(
        controller.getAyah({
          surah: 0,
          ayah: 1,
          lang: QuranLanguage.ARABIC,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid surah number. Must be between 1 and 114.',
        })
      );

      await expect(
        controller.getAyah({
          surah: 115,
          ayah: 1,
          lang: QuranLanguage.ARABIC,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid surah number. Must be between 1 and 114.',
        })
      );
    });

    it('should validate ayah number', async () => {
      await expect(
        controller.getAyah({
          surah: 1,
          ayah: 0,
          lang: QuranLanguage.ARABIC,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Invalid ayah number. Must be positive.',
        })
      );
    });

    it('should handle service errors', async () => {
      mockQuranService.getAyah.mockRejectedValueOnce(new Error('Service error'));

      await expect(
        controller.getAyah({
          surah: 1,
          ayah: 1,
          lang: QuranLanguage.ARABIC,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve ayah',
        })
      );
    });
  });

  describe('searchQuran', () => {
    const mockSearchResults = {
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
      total: 1,
      count: 1,
      offset: 0,
      query: 'الله',
      language: 'ar',
      execution_time_ms: 15,
    };

    it('should search Quran text', async () => {
      mockQuranService.searchQuran.mockResolvedValueOnce(mockSearchResults);

      const result = await controller.searchQuran({
        q: 'الله',
        lang: QuranLanguage.ARABIC,
        limit: 20,
        offset: 0,
      });

      expect(service.searchQuran).toHaveBeenCalledWith('الله', QuranLanguage.ARABIC, 20, 0);
      expect(result).toEqual(mockSearchResults);
    });

    it('should validate search query length', async () => {
      // Too short
      await expect(
        controller.searchQuran({
          q: 'a',
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Search query must be at least 2 characters long.',
        })
      );

      // Too long
      const longQuery = 'a'.repeat(101);
      await expect(
        controller.searchQuran({
          q: longQuery,
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Search query must not exceed 100 characters.',
        })
      );
    });

    it('should handle empty or whitespace-only queries', async () => {
      await expect(
        controller.searchQuran({
          q: '   ',
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.BAD_REQUEST,
          message: 'Search query must be at least 2 characters long.',
        })
      );
    });

    it('should handle service errors', async () => {
      mockQuranService.searchQuran.mockRejectedValueOnce(new Error('Service error'));

      await expect(
        controller.searchQuran({
          q: 'الله',
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to search Quran',
        })
      );
    });
  });

  describe('getReciters', () => {
    const mockRecitersData = {
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
      total: 1,
    };

    it('should return list of reciters', async () => {
      mockQuranService.getReciters.mockResolvedValueOnce(mockRecitersData);

      const result = await controller.getReciters();

      expect(service.getReciters).toHaveBeenCalled();
      expect(result).toEqual(mockRecitersData);
    });

    it('should handle service errors', async () => {
      mockQuranService.getReciters.mockRejectedValueOnce(new Error('Service error'));

      await expect(controller.getReciters()).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Failed to retrieve reciters list',
        })
      );
    });
  });

  describe('getCacheStats', () => {
    const mockCacheStats = {
      hits: 150,
      misses: 25,
      hitRate: 85.71,
      size: 42,
      capacity: 100,
    };

    it('should return cache statistics', async () => {
      mockQuranService.getCacheStats.mockReturnValueOnce(mockCacheStats);

      const result = await controller.getCacheStats();

      expect(service.getCacheStats).toHaveBeenCalled();
      expect(result).toEqual(mockCacheStats);
    });
  });

  describe('error handling', () => {
    it('should handle unexpected errors gracefully', async () => {
      mockQuranService.getSurah.mockRejectedValueOnce(new Error('Unexpected error'));

      await expect(controller.getSurah(1)).rejects.toThrow(
        expect.objectContaining({
          status: HttpStatus.INTERNAL_SERVER_ERROR,
        })
      );
    });

    it('should preserve HttpExceptions from service', async () => {
      const customHttpError = new HttpException('Custom error', HttpStatus.FORBIDDEN);
      mockQuranService.getSurah.mockRejectedValueOnce(customHttpError);

      await expect(controller.getSurah(1)).rejects.toThrow(customHttpError);
    });
  });

  describe('validation and transformation', () => {
    it('should handle numeric parameters correctly', async () => {
      mockQuranService.getSurah.mockResolvedValueOnce({} as any);

      // Test that string numbers are parsed correctly
      await controller.getSurah(1);
      expect(service.getSurah).toHaveBeenCalledWith(1, QuranLanguage.ARABIC);
    });

    it('should use default values for optional parameters', async () => {
      mockQuranService.getSurah.mockResolvedValueOnce({} as any);

      await controller.getSurah(1);
      expect(service.getSurah).toHaveBeenCalledWith(1, QuranLanguage.ARABIC);
    });
  });
});