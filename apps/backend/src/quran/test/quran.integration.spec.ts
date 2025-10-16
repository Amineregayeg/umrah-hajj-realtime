import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { QuranController } from '../quran.controller';
import { QuranService } from '../quran.service';
import { QuranModule } from '../quran.module';
import { QuranLanguage } from '../dto';

describe('Quran Integration Tests', () => {
  let controller: QuranController;
  let service: QuranService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [QuranModule],
    }).compile();

    controller = module.get<QuranController>(QuranController);
    service = module.get<QuranService>(QuranService);
  });

  afterEach(async () => {
    await module.close();
  });

  describe('Module Integration', () => {
    it('should be defined', () => {
      expect(controller).toBeDefined();
      expect(service).toBeDefined();
    });

    it('should have properly configured dependency injection', () => {
      expect(controller).toBeInstanceOf(QuranController);
      expect(service).toBeInstanceOf(QuranService);
    });
  });

  describe('End-to-End API Tests', () => {
    it('should retrieve Al-Fatihah in Arabic', async () => {
      const result = await controller.getSurah(1, QuranLanguage.ARABIC);

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
            text: expect.stringContaining('بِسْمِ اللَّهِ'),
          }),
        ]),
      });

      expect(result.ayahs).toHaveLength(7);
    });

    it('should retrieve Al-Fatihah in English', async () => {
      const result = await controller.getSurah(1, QuranLanguage.ENGLISH);

      expect(result).toMatchObject({
        id: 1,
        name: 'Al-Fatihah',
        translation: 'The Opening',
        type: 'makkiyyah',
        ayah_count: 7,
        ayahs: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: expect.stringContaining('In the name of Allah'),
          }),
        ]),
      });
    });

    it('should retrieve Al-Ikhlas', async () => {
      const result = await controller.getSurah(112, QuranLanguage.ARABIC);

      expect(result).toMatchObject({
        id: 112,
        name: 'الإخلاص',
        transliteration: 'Al-Ikhlas',
        translation: 'The Sincerity',
        type: 'makkiyyah',
        ayah_count: 4,
        ayahs: expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            text: expect.stringContaining('قُلْ هُوَ اللَّهُ أَحَدٌ'),
          }),
        ]),
      });
    });

    it('should retrieve specific ayahs', async () => {
      const ayah = await controller.getAyah({
        surah: 1,
        ayah: 1,
        lang: QuranLanguage.ARABIC,
      });

      expect(ayah).toMatchObject({
        id: 1,
        text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
        page: 1,
        juz: 1,
        sajda: false,
      });
    });

    it('should search for Allah in Arabic', async () => {
      const result = await controller.searchQuran({
        q: 'الله',
        lang: QuranLanguage.ARABIC,
        limit: 10,
        offset: 0,
      });

      expect(result).toMatchObject({
        results: expect.any(Array),
        total: expect.any(Number),
        count: expect.any(Number),
        offset: 0,
        query: 'الله',
        language: 'ar',
        execution_time_ms: expect.any(Number),
      });

      expect(result.results.length).toBeGreaterThan(0);
      result.results.forEach(item => {
        expect(item).toMatchObject({
          surah: expect.any(Number),
          surah_name: expect.any(String),
          surah_translation: expect.any(String),
          ayah: expect.any(Number),
          text: expect.any(String),
          score: expect.any(Number),
          highlighted: expect.any(String),
        });
      });
    });

    it('should search in English', async () => {
      const result = await controller.searchQuran({
        q: 'Allah',
        lang: QuranLanguage.ENGLISH,
        limit: 5,
        offset: 0,
      });

      expect(result.language).toBe('en');
      expect(result.query).toBe('allah'); // Should be normalized
    });

    it('should return reciters list', async () => {
      const result = await controller.getReciters();

      expect(result).toMatchObject({
        reciters: expect.any(Array),
        total: expect.any(Number),
      });

      expect(result.reciters.length).toBeGreaterThan(0);
      expect(result.total).toBe(result.reciters.length);

      // Check that we have expected reciters
      const reciterIds = result.reciters.map(r => r.id);
      expect(reciterIds).toContain('abdul_basit_murattal');
      expect(reciterIds).toContain('mishary_rashid_alafasy');

      // Verify reciter structure
      result.reciters.forEach(reciter => {
        expect(reciter).toMatchObject({
          id: expect.any(String),
          name_ar: expect.any(String),
          name_en: expect.any(String),
          style: expect.any(String),
          audio_url_template: expect.stringContaining('https://'),
          format: 'mp3',
          quality: expect.any(String),
        });
      });
    });
  });

  describe('Caching Behavior', () => {
    it('should cache surah requests', async () => {
      // Clear cache first
      service.clearCache();

      // First request
      const start1 = Date.now();
      const result1 = await controller.getSurah(1);
      const time1 = Date.now() - start1;

      // Second request (should be cached)
      const start2 = Date.now();
      const result2 = await controller.getSurah(1);
      const time2 = Date.now() - start2;

      expect(result1).toEqual(result2);
      expect(time2).toBeLessThan(time1); // Cached request should be faster

      const stats = await controller.getCacheStats();
      expect(stats.hits).toBeGreaterThan(0);
    });

    it('should provide cache statistics', async () => {
      // Perform some operations to generate cache activity
      await controller.getSurah(1);
      await controller.getAyah({ surah: 1, ayah: 1, lang: QuranLanguage.ARABIC });
      await controller.getReciters();

      const stats = await controller.getCacheStats();

      expect(stats).toMatchObject({
        hits: expect.any(Number),
        misses: expect.any(Number),
        hitRate: expect.any(Number),
        size: expect.any(Number),
        capacity: 100,
      });

      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent requests', async () => {
      const promises = [
        controller.getSurah(1),
        controller.getSurah(2),
        controller.getSurah(112),
        controller.getAyah({ surah: 1, ayah: 1, lang: QuranLanguage.ARABIC }),
        controller.getAyah({ surah: 1, ayah: 2, lang: QuranLanguage.ENGLISH }),
        controller.searchQuran({ q: 'الله', lang: QuranLanguage.ARABIC, limit: 5, offset: 0 }),
        controller.getReciters(),
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(7);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('should complete search queries quickly', async () => {
      const start = Date.now();
      const result = await controller.searchQuran({
        q: 'الله',
        lang: QuranLanguage.ARABIC,
        limit: 20,
        offset: 0,
      });
      const time = Date.now() - start;

      expect(time).toBeLessThan(1000); // Should complete within 1 second
      expect(result.execution_time_ms).toBeLessThan(500); // Service execution should be fast
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid surah IDs gracefully', async () => {
      await expect(controller.getSurah(0)).rejects.toThrow();
      await expect(controller.getSurah(115)).rejects.toThrow();
      await expect(controller.getSurah(-1)).rejects.toThrow();
    });

    it('should handle invalid search queries gracefully', async () => {
      await expect(
        controller.searchQuran({
          q: '',
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow();

      await expect(
        controller.searchQuran({
          q: 'a',
          lang: QuranLanguage.ARABIC,
          limit: 20,
          offset: 0,
        })
      ).rejects.toThrow();
    });
  });

  describe('Multi-language Support', () => {
    it('should return different content for different languages', async () => {
      const arabic = await controller.getSurah(1, QuranLanguage.ARABIC);
      const english = await controller.getSurah(1, QuranLanguage.ENGLISH);
      const french = await controller.getSurah(1, QuranLanguage.FRENCH);

      expect(arabic.ayahs[0].text).toContain('بِسْمِ اللَّهِ');
      expect(english.ayahs[0].text).toContain('In the name of Allah');
      expect(french.ayahs[0].text).toContain("Au nom d'Allah");

      expect(arabic.ayahs[0].text).not.toBe(english.ayahs[0].text);
      expect(english.ayahs[0].text).not.toBe(french.ayahs[0].text);
    });

    it('should search in different languages', async () => {
      const arabicSearch = await controller.searchQuran({
        q: 'الله',
        lang: QuranLanguage.ARABIC,
        limit: 5,
        offset: 0,
      });

      const englishSearch = await controller.searchQuran({
        q: 'Allah',
        lang: QuranLanguage.ENGLISH,
        limit: 5,
        offset: 0,
      });

      expect(arabicSearch.language).toBe('ar');
      expect(englishSearch.language).toBe('en');
      expect(arabicSearch.results[0].text).not.toBe(englishSearch.results[0].text);
    });
  });
});