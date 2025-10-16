import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { QuranService } from '../quran.service';
import { QuranLanguage } from '../dto';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  readFile: vi.fn(),
}));

// Mock path
vi.mock('path', () => ({
  join: vi.fn((...args) => args.join('/')),
}));

const { readFile } = await import('fs/promises');
const mockedReadFile = vi.mocked(readFile);

describe('QuranService', () => {
  let service: QuranService;

  const mockArabicData = {
    metadata: {
      name: 'القرآن الكريم',
      language: 'ar',
      total_surahs: 2,
      total_ayahs: 12,
    },
    surahs: [
      {
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
          {
            id: 2,
            text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ',
            page: 1,
            juz: 1,
            manzil: 1,
            ruku: 1,
            hizbQuarter: 1,
            sajda: false,
          },
        ],
      },
      {
        id: 112,
        name: 'الإخلاص',
        transliteration: 'Al-Ikhlas',
        translation: 'The Sincerity',
        type: 'makkiyyah',
        ayah_count: 4,
        ayahs: [
          {
            id: 1,
            text: 'قُلْ هُوَ اللَّهُ أَحَدٌ',
            page: 604,
            juz: 30,
            manzil: 7,
            ruku: 553,
            hizbQuarter: 240,
            sajda: false,
          },
        ],
      },
    ],
  };

  const mockEnglishData = {
    metadata: {
      name: 'The Noble Quran - English Translation',
      translator: 'Sahih International',
      language: 'en',
      total_surahs: 2,
      total_ayahs: 12,
    },
    surahs: [
      {
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
          {
            id: 2,
            text: '[All] praise is [due] to Allah, Lord of the worlds -',
          },
        ],
      },
      {
        id: 112,
        name: 'Al-Ikhlas',
        translation: 'The Sincerity',
        type: 'makkiyyah',
        ayah_count: 4,
        ayahs: [
          {
            id: 1,
            text: 'Say, "He is Allah, [who is] One,',
          },
        ],
      },
    ],
  };

  const mockFrenchData = {
    metadata: {
      name: 'Le Noble Coran - Traduction Française',
      translator: 'Muhammad Hamidullah',
      language: 'fr',
      total_surahs: 2,
      total_ayahs: 12,
    },
    surahs: [
      {
        id: 1,
        name: 'Al-Fatihah',
        translation: "L'Ouverture",
        type: 'makkiyyah',
        ayah_count: 7,
        ayahs: [
          {
            id: 1,
            text: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux.",
          },
          {
            id: 2,
            text: "Louange à Allah, Seigneur de l'univers.",
          },
        ],
      },
      {
        id: 112,
        name: 'Al-Ikhlas',
        translation: 'Le Monothéisme Pur',
        type: 'makkiyyah',
        ayah_count: 4,
        ayahs: [
          {
            id: 1,
            text: 'Dis: «Il est Allah, Unique.',
          },
        ],
      },
    ],
  };

  const mockSearchIndex = {
    metadata: {
      description: 'Trigram search index for Quran text search',
      languages: ['ar', 'en', 'fr'],
      generated: '2025-10-08',
    },
    trigrams: {
      ar: {
        الل: [
          { surah: 1, ayah: 1, score: 1.0 },
          { surah: 1, ayah: 2, score: 1.0 },
          { surah: 112, ayah: 1, score: 1.0 },
        ],
        قل: [{ surah: 112, ayah: 1, score: 1.0 }],
      },
      en: {
        all: [
          { surah: 1, ayah: 1, score: 0.9 },
          { surah: 1, ayah: 2, score: 0.9 },
        ],
        say: [{ surah: 112, ayah: 1, score: 0.9 }],
      },
      fr: {
        all: [{ surah: 1, ayah: 1, score: 0.8 }],
        dis: [{ surah: 112, ayah: 1, score: 0.8 }],
      },
    },
    word_index: {},
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    // Mock file reads for initialization
    mockedReadFile
      .mockResolvedValueOnce(JSON.stringify(mockArabicData))
      .mockResolvedValueOnce(JSON.stringify(mockEnglishData))
      .mockResolvedValueOnce(JSON.stringify(mockFrenchData))
      .mockResolvedValueOnce(JSON.stringify(mockSearchIndex));

    const module: TestingModule = await Test.createTestingModule({
      providers: [QuranService],
    }).compile();

    service = module.get<QuranService>(QuranService);
    
    // Initialize the service
    await service.onModuleInit();
  });

  describe('initialization', () => {
    it('should be defined', () => {
      expect(service).toBeDefined();
    });

    it('should load all data files during initialization', () => {
      expect(mockedReadFile).toHaveBeenCalledTimes(4);
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringContaining('quran_ar_hafs.json'),
        'utf-8'
      );
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringContaining('quran_en_translation.json'),
        'utf-8'
      );
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringContaining('quran_fr_translation.json'),
        'utf-8'
      );
      expect(mockedReadFile).toHaveBeenCalledWith(
        expect.stringContaining('search_index.json'),
        'utf-8'
      );
    });

    it('should throw error if data loading fails', async () => {
      vi.clearAllMocks();
      mockedReadFile.mockRejectedValueOnce(new Error('File not found'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [QuranService],
      }).compile();

      const failingService = module.get<QuranService>(QuranService);

      await expect(failingService.onModuleInit()).rejects.toThrow(
        'Failed to initialize Quran service'
      );
    });
  });

  describe('getSurah', () => {
    it('should return a surah in Arabic by default', async () => {
      const result = await service.getSurah(1);

      expect(result).toMatchObject({
        id: 1,
        name: 'الفاتحة',
        transliteration: 'Al-Fatihah',
        translation: 'The Opening',
        type: 'makkiyyah',
        ayah_count: 7,
        ayahs: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            page: 1,
            juz: 1,
            sajda: false,
          }),
        ]),
      });
    });

    it('should return a surah in English', async () => {
      const result = await service.getSurah(1, QuranLanguage.ENGLISH);

      expect(result).toMatchObject({
        id: 1,
        name: 'Al-Fatihah',
        translation: 'The Opening',
        type: 'makkiyyah',
        ayah_count: 7,
        ayahs: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: 'In the name of Allah, the Entirely Merciful, the Especially Merciful.',
          }),
        ]),
      });
    });

    it('should return a surah in French', async () => {
      const result = await service.getSurah(1, QuranLanguage.FRENCH);

      expect(result).toMatchObject({
        id: 1,
        name: 'Al-Fatihah',
        translation: "L'Ouverture",
        type: 'makkiyyah',
        ayah_count: 7,
        ayahs: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux.",
          }),
        ]),
      });
    });

    it('should throw NotFoundException for invalid surah ID', async () => {
      await expect(service.getSurah(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for unsupported language', async () => {
      await expect(service.getSurah(1, 'invalid' as QuranLanguage)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should cache results', async () => {
      // First call
      const result1 = await service.getSurah(1);
      
      // Second call should return cached result
      const result2 = await service.getSurah(1);
      
      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Should be the same reference from cache
    });
  });

  describe('getAyah', () => {
    it('should return a specific ayah', async () => {
      const result = await service.getAyah(1, 1);

      expect(result).toMatchObject({
        id: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        page: 1,
        juz: 1,
        sajda: false,
      });
    });

    it('should return ayah in different languages', async () => {
      const arabicResult = await service.getAyah(1, 1, QuranLanguage.ARABIC);
      const englishResult = await service.getAyah(1, 1, QuranLanguage.ENGLISH);
      const frenchResult = await service.getAyah(1, 1, QuranLanguage.FRENCH);

      expect(arabicResult.text).toBe('بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ');
      expect(englishResult.text).toBe(
        'In the name of Allah, the Entirely Merciful, the Especially Merciful.'
      );
      expect(frenchResult.text).toBe(
        "Au nom d'Allah, le Tout Miséricordieux, le Très Miséricordieux."
      );
    });

    it('should throw NotFoundException for invalid surah', async () => {
      await expect(service.getAyah(999, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException for invalid ayah', async () => {
      await expect(service.getAyah(1, 999)).rejects.toThrow(NotFoundException);
    });

    it('should cache ayah results', async () => {
      const result1 = await service.getAyah(1, 1);
      const result2 = await service.getAyah(1, 1);
      
      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Should be the same reference from cache
    });
  });

  describe('searchQuran', () => {
    it('should search using trigram index', async () => {
      const result = await service.searchQuran('الل', QuranLanguage.ARABIC);

      expect(result).toMatchObject({
        results: expect.arrayContaining([
          expect.objectContaining({
            surah: 1,
            ayah: 1,
            text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
            score: 1.0,
          }),
        ]),
        total: expect.any(Number),
        count: expect.any(Number),
        offset: 0,
        query: 'الل',
        language: 'ar',
        execution_time_ms: expect.any(Number),
      });

      expect(result.results.length).toBeGreaterThan(0);
    });

    it('should search in English', async () => {
      const result = await service.searchQuran('Allah', QuranLanguage.ENGLISH);

      expect(result).toMatchObject({
        language: 'en',
        query: 'allah', // Should be normalized
        results: expect.any(Array),
      });
    });

    it('should respect pagination', async () => {
      const result = await service.searchQuran('الل', QuranLanguage.ARABIC, 1, 1);

      expect(result.offset).toBe(1);
      expect(result.count).toBeLessThanOrEqual(1);
    });

    it('should include highlighting in results', async () => {
      const result = await service.searchQuran('الل', QuranLanguage.ARABIC);

      if (result.results.length > 0) {
        expect(result.results[0]).toHaveProperty('highlighted');
        expect(result.results[0].highlighted).toContain('<mark>');
      }
    });

    it('should fallback to full text search if no trigram matches', async () => {
      const result = await service.searchQuran('nonexistent', QuranLanguage.ARABIC);

      expect(result).toMatchObject({
        results: [],
        total: 0,
        count: 0,
        query: 'nonexistent',
        language: 'ar',
      });
    });

    it('should cache search results', async () => {
      const result1 = await service.searchQuran('الل', QuranLanguage.ARABIC);
      const result2 = await service.searchQuran('الل', QuranLanguage.ARABIC);
      
      // Execution time should be different (one from cache)
      expect(result1.results).toEqual(result2.results);
      expect(result2.execution_time_ms).toBeLessThan(result1.execution_time_ms);
    });
  });

  describe('getReciters', () => {
    it('should return list of reciters', async () => {
      const result = await service.getReciters();

      expect(result).toMatchObject({
        reciters: expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name_ar: expect.any(String),
            name_en: expect.any(String),
            style: expect.any(String),
            audio_url_template: expect.any(String),
            format: 'mp3',
            quality: expect.any(String),
          }),
        ]),
        total: expect.any(Number),
      });

      expect(result.reciters.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.reciters.length);
    });

    it('should include specific reciters', async () => {
      const result = await service.getReciters();
      
      const reciterIds = result.reciters.map(r => r.id);
      expect(reciterIds).toContain('abdul_basit_murattal');
      expect(reciterIds).toContain('mishary_rashid_alafasy');
    });

    it('should cache reciters list', async () => {
      const result1 = await service.getReciters();
      const result2 = await service.getReciters();
      
      expect(result1).toEqual(result2);
      expect(result1).toBe(result2); // Should be the same reference from cache
    });
  });

  describe('cache management', () => {
    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toMatchObject({
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRate: expect.any(Number),
        size: expect.any(Number),
        capacity: 100,
      });
    });

    it('should clear cache', async () => {
      // Add something to cache
      await service.getSurah(1);
      
      let stats = service.getCacheStats();
      expect(stats.size).toBeGreaterThan(0);
      
      // Clear cache
      service.clearCache();
      
      stats = service.getCacheStats();
      expect(stats.size).toBe(0);
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('error handling', () => {
    it('should throw error if service not initialized', async () => {
      const uninitializedService = new QuranService();
      
      await expect(uninitializedService.getSurah(1)).rejects.toThrow(
        'Quran service not initialized'
      );
    });

    it('should handle invalid language gracefully', async () => {
      await expect(
        service.getSurah(1, 'invalid' as QuranLanguage)
      ).rejects.toThrow(BadRequestException);
    });
  });
});