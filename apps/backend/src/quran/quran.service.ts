import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { join } from 'path';
import { readFile } from 'fs/promises';
import {
  QuranLanguage,
  QuranSurahDto,
  QuranAyahDto,
  QuranSearchResultDto,
  QuranSearchResponseDto,
  QuranReciterDto,
  QuranRecitersResponseDto,
} from './dto';
import { LRUCache } from './utils/lru-cache.util';
import {
  normalizeArabicForSearch,
  generateTrigrams,
  calculateEditDistance,
  highlightSearchTerms,
  normalizeDigits,
} from './utils/i18n.util';

interface QuranData {
  metadata: {
    name: string;
    language: string;
    total_surahs: number;
    total_ayahs: number;
    translator?: string;
  };
  surahs: Array<{
    id: number;
    name: string;
    transliteration?: string;
    translation: string;
    type: string;
    ayah_count: number;
    ayahs: Array<{
      id: number;
      text: string;
      page?: number;
      juz?: number;
      manzil?: number;
      ruku?: number;
      hizbQuarter?: number;
      sajda?: boolean;
    }>;
  }>;
}

interface SearchIndex {
  metadata: {
    description: string;
    languages: string[];
    generated: string;
  };
  trigrams: Record<string, Record<string, Array<{ surah: number; ayah: number; score: number }>>>;
  word_index: Record<string, Record<string, Array<{ surah: number; ayah: number; position: number }>>>;
}

@Injectable()
export class QuranService {
  private readonly logger = new Logger(QuranService.name);
  private readonly cache = new LRUCache<any>(100); // 100 items cache
  private readonly assetsPath = join(process.cwd(), 'assets', 'quran');
  
  private quranData: Record<QuranLanguage, QuranData> = {} as Record<QuranLanguage, QuranData>;
  private searchIndex: SearchIndex | null = null;
  private initialized = false;

  async onModuleInit() {
    await this.loadQuranData();
    this.initialized = true;
    this.logger.log('Quran service initialized successfully');
  }

  /**
   * Load all Quran data and search index from assets
   */
  private async loadQuranData(): Promise<void> {
    try {
      // Load Arabic text
      const arabicPath = join(this.assetsPath, 'quran_ar_hafs.json');
      const arabicData = await readFile(arabicPath, 'utf-8');
      this.quranData[QuranLanguage.ARABIC] = JSON.parse(arabicData);

      // Load English translation
      const englishPath = join(this.assetsPath, 'quran_en_translation.json');
      const englishData = await readFile(englishPath, 'utf-8');
      this.quranData[QuranLanguage.ENGLISH] = JSON.parse(englishData);

      // Load French translation
      const frenchPath = join(this.assetsPath, 'quran_fr_translation.json');
      const frenchData = await readFile(frenchPath, 'utf-8');
      this.quranData[QuranLanguage.FRENCH] = JSON.parse(frenchData);

      // Load search index
      const searchIndexPath = join(this.assetsPath, 'search_index.json');
      const searchIndexData = await readFile(searchIndexPath, 'utf-8');
      this.searchIndex = JSON.parse(searchIndexData);

      this.logger.log('All Quran data loaded successfully');
    } catch (error) {
      this.logger.error('Failed to load Quran data', error);
      throw new Error('Failed to initialize Quran service');
    }
  }

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Quran service not initialized');
    }
  }

  /**
   * Get a complete surah by ID
   */
  async getSurah(id: number, lang: QuranLanguage = QuranLanguage.ARABIC): Promise<QuranSurahDto> {
    this.ensureInitialized();

    const cacheKey = `surah:${id}:${lang}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const data = this.quranData[lang];
    if (!data) {
      throw new BadRequestException(`Language ${lang} not supported`);
    }

    const surah = data.surahs.find(s => s.id === id);
    if (!surah) {
      throw new NotFoundException(`Surah ${id} not found`);
    }

    const result: QuranSurahDto = {
      id: surah.id,
      name: surah.name,
      transliteration: surah.transliteration,
      translation: surah.translation,
      type: surah.type,
      ayah_count: surah.ayah_count,
      ayahs: surah.ayahs.map(ayah => ({
        id: ayah.id,
        text: ayah.text,
        page: ayah.page,
        juz: ayah.juz,
        manzil: ayah.manzil,
        ruku: ayah.ruku,
        hizbQuarter: ayah.hizbQuarter,
        sajda: ayah.sajda,
      })),
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Get a specific ayah
   */
  async getAyah(surahNumber: number, ayahNumber: number, lang: QuranLanguage = QuranLanguage.ARABIC): Promise<QuranAyahDto> {
    this.ensureInitialized();

    const cacheKey = `ayah:${surahNumber}:${ayahNumber}:${lang}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const data = this.quranData[lang];
    if (!data) {
      throw new BadRequestException(`Language ${lang} not supported`);
    }

    const surah = data.surahs.find(s => s.id === surahNumber);
    if (!surah) {
      throw new NotFoundException(`Surah ${surahNumber} not found`);
    }

    const ayah = surah.ayahs.find(a => a.id === ayahNumber);
    if (!ayah) {
      throw new NotFoundException(`Ayah ${ayahNumber} not found in Surah ${surahNumber}`);
    }

    const result: QuranAyahDto = {
      id: ayah.id,
      text: ayah.text,
      page: ayah.page,
      juz: ayah.juz,
      manzil: ayah.manzil,
      ruku: ayah.ruku,
      hizbQuarter: ayah.hizbQuarter,
      sajda: ayah.sajda,
    };

    this.cache.set(cacheKey, result);
    return result;
  }

  /**
   * Search Quran text with trigram matching and fuzzy search
   */
  async searchQuran(
    query: string,
    lang: QuranLanguage = QuranLanguage.ARABIC,
    limit: number = 20,
    offset: number = 0,
  ): Promise<QuranSearchResponseDto> {
    this.ensureInitialized();

    const startTime = Date.now();
    const normalizedQuery = normalizeDigits(query.trim().toLowerCase());
    
    const cacheKey = `search:${normalizedQuery}:${lang}:${limit}:${offset}`;
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return {
        ...cached,
        execution_time_ms: Date.now() - startTime,
      };
    }

    const data = this.quranData[lang];
    if (!data) {
      throw new BadRequestException(`Language ${lang} not supported`);
    }

    // Perform search
    const searchResults = await this.performSearch(normalizedQuery, lang, data);
    
    // Sort by relevance score (descending)
    searchResults.sort((a, b) => b.score - a.score);

    // Apply pagination
    const total = searchResults.length;
    const paginatedResults = searchResults.slice(offset, offset + limit);

    // Add highlighting
    const resultsWithHighlighting = paginatedResults.map(result => ({
      ...result,
      highlighted: highlightSearchTerms(result.text, query),
    }));

    const response: QuranSearchResponseDto = {
      results: resultsWithHighlighting,
      total,
      count: resultsWithHighlighting.length,
      offset,
      query: normalizedQuery,
      language: lang,
      execution_time_ms: Date.now() - startTime,
    };

    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * Get list of available reciters with audio URLs
   */
  async getReciters(): Promise<QuranRecitersResponseDto> {
    this.ensureInitialized();

    const cacheKey = 'reciters:all';
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Static list of reciters with their audio URL templates
    const reciters: QuranReciterDto[] = [
      {
        id: 'abdul_basit_murattal',
        name_ar: 'عبد الباسط عبد الصمد',
        name_en: 'Abdul Basit Abdul Samad',
        style: 'Murattal',
        audio_url_template: 'https://audio.quranapi.com/abdul_basit_murattal/{surah:03d}.mp3',
        format: 'mp3',
        quality: '128kbps',
      },
      {
        id: 'abdul_basit_mujawwad',
        name_ar: 'عبد الباسط عبد الصمد',
        name_en: 'Abdul Basit Abdul Samad',
        style: 'Mujawwad',
        audio_url_template: 'https://audio.quranapi.com/abdul_basit_mujawwad/{surah:03d}.mp3',
        format: 'mp3',
        quality: '128kbps',
      },
      {
        id: 'mishary_rashid_alafasy',
        name_ar: 'مشاري بن راشد العفاسي',
        name_en: 'Mishary Rashid Alafasy',
        style: 'Murattal',
        audio_url_template: 'https://audio.quranapi.com/mishary_rashid_alafasy/{surah:03d}.mp3',
        format: 'mp3',
        quality: '128kbps',
      },
      {
        id: 'muhammad_siddiq_al_minshawi',
        name_ar: 'محمد صديق المنشاوي',
        name_en: 'Muhammad Siddiq Al-Minshawi',
        style: 'Murattal',
        audio_url_template: 'https://audio.quranapi.com/muhammad_siddiq_al_minshawi/{surah:03d}.mp3',
        format: 'mp3',
        quality: '128kbps',
      },
      {
        id: 'saad_al_ghamidi',
        name_ar: 'سعد الغامدي',
        name_en: 'Saad Al-Ghamidi',
        style: 'Murattal',
        audio_url_template: 'https://audio.quranapi.com/saad_al_ghamidi/{surah:03d}.mp3',
        format: 'mp3',
        quality: '128kbps',
      },
    ];

    const response: QuranRecitersResponseDto = {
      reciters,
      total: reciters.length,
    };

    this.cache.set(cacheKey, response);
    return response;
  }

  /**
   * Perform the actual search using trigrams and fuzzy matching
   */
  private async performSearch(query: string, lang: QuranLanguage, data: QuranData): Promise<QuranSearchResultDto[]> {
    const results: QuranSearchResultDto[] = [];
    const processedResults = new Set<string>(); // Prevent duplicates

    // First, try trigram search using the search index
    if (this.searchIndex && this.searchIndex.trigrams[lang]) {
      const queryTrigrams = generateTrigrams(query);
      
      for (const trigram of queryTrigrams) {
        const matches = this.searchIndex.trigrams[lang][trigram];
        if (matches) {
          for (const match of matches) {
            const key = `${match.surah}:${match.ayah}`;
            if (!processedResults.has(key)) {
              const surah = data.surahs.find(s => s.id === match.surah);
              if (surah) {
                const ayah = surah.ayahs.find(a => a.id === match.ayah);
                if (ayah) {
                  results.push({
                    surah: match.surah,
                    surah_name: surah.name,
                    surah_translation: surah.translation,
                    ayah: match.ayah,
                    text: ayah.text,
                    score: match.score,
                  });
                  processedResults.add(key);
                }
              }
            }
          }
        }
      }
    }

    // If no trigram matches found, do a full text search with fuzzy matching
    if (results.length === 0) {
      for (const surah of data.surahs) {
        for (const ayah of surah.ayahs) {
          const normalizedText = normalizeArabicForSearch(ayah.text);
          const normalizedQuery = normalizeArabicForSearch(query);
          
          // Exact match gets highest score
          if (normalizedText.includes(normalizedQuery)) {
            const key = `${surah.id}:${ayah.id}`;
            if (!processedResults.has(key)) {
              results.push({
                surah: surah.id,
                surah_name: surah.name,
                surah_translation: surah.translation,
                ayah: ayah.id,
                text: ayah.text,
                score: 1.0,
              });
              processedResults.add(key);
            }
          }
          // Fuzzy match with edit distance <= 1
          else {
            const words = normalizedText.split(' ');
            const queryWords = normalizedQuery.split(' ');
            
            let hasMatch = false;
            for (const word of words) {
              for (const queryWord of queryWords) {
                if (calculateEditDistance(word, queryWord) <= 1) {
                  hasMatch = true;
                  break;
                }
              }
              if (hasMatch) break;
            }
            
            if (hasMatch) {
              const key = `${surah.id}:${ayah.id}`;
              if (!processedResults.has(key)) {
                results.push({
                  surah: surah.id,
                  surah_name: surah.name,
                  surah_translation: surah.translation,
                  ayah: ayah.id,
                  text: ayah.text,
                  score: 0.7, // Lower score for fuzzy matches
                });
                processedResults.add(key);
              }
            }
          }
        }
      }
    }

    return results;
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return this.cache.getStats();
  }

  /**
   * Clear the cache (useful for testing or maintenance)
   */
  clearCache(): void {
    this.cache.clear();
    this.logger.log('Cache cleared');
  }
}