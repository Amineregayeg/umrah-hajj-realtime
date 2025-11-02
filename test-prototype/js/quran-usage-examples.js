/**
 * Quran Module Usage Examples
 *
 * This file demonstrates how to use the QuranTester class programmatically
 * for integration into other projects or automated testing.
 */

// ========================================
// Setup
// ========================================

// 1. Create API Client
const API_BASE_URL = 'https://psychological-jilli-amineregayeg-1fe35444.koyeb.app';

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async get(endpoint) {
    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      headers: { 'Accept': 'application/json' }
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }
}

// 2. Initialize QuranTester
const apiClient = new ApiClient(API_BASE_URL);
const quranTester = new QuranTester(apiClient);

// 3. Initialize the module (if using HTML interface)
// quranTester.init();

// ========================================
// Example 1: Load Famous Surahs
// ========================================

async function loadFamousSurahs() {
  console.log('=== Loading Famous Surahs ===\n');

  // Al-Fatihah (The Opening)
  console.log('1. Loading Al-Fatihah (Surah 1)...');
  await quranTester.getSurah(1, 'ar');

  // Ayat al-Kursi is in Al-Baqarah (Surah 2)
  console.log('2. Loading Al-Baqarah (Surah 2)...');
  await quranTester.getSurah(2, 'en');

  // Al-Mulk (The Sovereignty)
  console.log('3. Loading Al-Mulk (Surah 67)...');
  await quranTester.getSurah(67, 'ar');

  // Al-Ikhlas (The Sincerity)
  console.log('4. Loading Al-Ikhlas (Surah 112)...');
  await quranTester.getSurah(112, 'ar');
}

// ========================================
// Example 2: Search Operations
// ========================================

async function searchExamples() {
  console.log('=== Search Examples ===\n');

  // Search for Allah in Arabic
  console.log('1. Searching for "الله" in Arabic...');
  await quranTester.searchQuran('الله', 'ar', 5);

  // Search for prayer in English
  console.log('2. Searching for "prayer" in English...');
  await quranTester.searchQuran('prayer', 'en', 10);

  // Search for paradise
  console.log('3. Searching for "paradise" in English...');
  await quranTester.searchQuran('paradise', 'en', 10);

  // Search for specific prophets
  console.log('4. Searching for "Moses" in English...');
  await quranTester.searchQuran('Moses', 'en', 5);
}

// ========================================
// Example 3: Get Specific Famous Ayahs
// ========================================

async function getFamousAyahs() {
  console.log('=== Loading Famous Ayahs ===\n');

  // Ayat al-Kursi (2:255) - Verse of the Throne
  console.log('1. Loading Ayat al-Kursi (2:255)...');
  await quranTester.getAyah(2, 255, 'ar');

  // First revelation (96:1-5)
  console.log('2. Loading first revelation (96:1)...');
  await quranTester.getAyah(96, 1, 'ar');

  // Surah Al-Asr (103:1-3) - Complete short Surah
  console.log('3. Loading Al-Asr (103:1)...');
  await quranTester.getAyah(103, 1, 'ar');

  // Last verse revealed (5:3)
  console.log('4. Loading last verse revealed (5:3)...');
  await quranTester.getAyah(5, 3, 'en');
}

// ========================================
// Example 4: Batch Operations
// ========================================

async function batchLoadSurahs() {
  console.log('=== Batch Loading Surahs ===\n');

  // Load all short Surahs (Juz 30)
  const shortSurahs = [78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89, 90,
                       91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102,
                       103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114];

  for (const surahId of shortSurahs.slice(0, 5)) {
    console.log(`Loading Surah ${surahId}...`);
    await quranTester.getSurah(surahId, 'ar');
    // Add delay to avoid overwhelming the API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

// ========================================
// Example 5: Advanced Search Patterns
// ========================================

async function advancedSearches() {
  console.log('=== Advanced Search Examples ===\n');

  // Thematic searches
  const themes = [
    { query: 'mercy', lang: 'en', description: 'Mercy and compassion' },
    { query: 'patience', lang: 'en', description: 'Patience and perseverance' },
    { query: 'guidance', lang: 'en', description: 'Divine guidance' },
    { query: 'الجنة', lang: 'ar', description: 'Paradise in Arabic' },
    { query: 'الصلاة', lang: 'ar', description: 'Prayer in Arabic' }
  ];

  for (const theme of themes) {
    console.log(`Searching: ${theme.description}`);
    await quranTester.searchQuran(theme.query, theme.lang, 5);
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// ========================================
// Example 6: Error Handling
// ========================================

async function errorHandlingExamples() {
  console.log('=== Error Handling Examples ===\n');

  try {
    // Invalid Surah ID
    console.log('1. Testing invalid Surah ID (200)...');
    await quranTester.getSurah(200, 'ar');
  } catch (error) {
    console.error('Expected error:', error.message);
  }

  try {
    // Invalid Ayah reference
    console.log('2. Testing invalid Ayah (1:10000)...');
    await quranTester.getAyah(1, 10000, 'ar');
  } catch (error) {
    console.error('Expected error:', error.message);
  }

  try {
    // Empty search
    console.log('3. Testing empty search...');
    await quranTester.searchQuran('', 'ar', 10);
  } catch (error) {
    console.error('Expected error:', error.message);
  }
}

// ========================================
// Example 7: Programmatic Display Control
// ========================================

async function displayControlExample() {
  console.log('=== Display Control Example ===\n');

  // Load data without displaying
  const surahData = await apiClient.get('/content/quran/surah/1?lang=ar');
  console.log('Loaded Surah data:', surahData);

  // Process data
  const ayahCount = surahData.verses?.length || 0;
  console.log(`Surah has ${ayahCount} ayahs`);

  // Display when ready
  quranTester.displaySurah(surahData, 'ar');
}

// ========================================
// Example 8: Building Custom Features
// ========================================

async function customFeatures() {
  console.log('=== Custom Features ===\n');

  // 1. Daily Ayah feature
  async function getDailyAyah() {
    const today = new Date();
    const dayOfYear = Math.floor((today - new Date(today.getFullYear(), 0, 0)) / 86400000);
    const surahId = (dayOfYear % 114) + 1;
    const ayahNumber = (dayOfYear % 10) + 1;

    console.log(`Daily Ayah: Surah ${surahId}, Ayah ${ayahNumber}`);
    return await quranTester.getAyah(surahId, ayahNumber, 'ar');
  }

  // 2. Random Ayah generator
  async function getRandomAyah() {
    const randomSurah = Math.floor(Math.random() * 114) + 1;
    const randomAyah = Math.floor(Math.random() * 10) + 1;

    console.log(`Random Ayah: Surah ${randomSurah}, Ayah ${randomAyah}`);
    return await quranTester.getAyah(randomSurah, randomAyah, 'ar');
  }

  // 3. Search statistics
  async function getSearchStatistics(query, lang) {
    const results = await apiClient.get(
      `/content/quran/search?q=${encodeURIComponent(query)}&lang=${lang}&limit=100`
    );

    const stats = {
      query: query,
      totalResults: results.total || 0,
      surahs: new Set(results.results?.map(r => r.surah_id) || []).size,
      averageLength: results.results?.reduce((sum, r) => sum + r.text.length, 0) /
                     (results.results?.length || 1)
    };

    console.log('Search Statistics:', stats);
    return stats;
  }

  // Execute custom features
  await getDailyAyah();
  await getRandomAyah();
  await getSearchStatistics('الله', 'ar');
}

// ========================================
// Example 9: Performance Testing
// ========================================

async function performanceTest() {
  console.log('=== Performance Testing ===\n');

  // Measure Surah load time
  console.time('Load Surah');
  await quranTester.getSurah(2, 'ar'); // Al-Baqarah (longest Surah)
  console.timeEnd('Load Surah');

  // Measure search time
  console.time('Search Operation');
  await quranTester.searchQuran('الله', 'ar', 50);
  console.timeEnd('Search Operation');

  // Measure Ayah load time
  console.time('Load Ayah');
  await quranTester.getAyah(2, 255, 'ar');
  console.timeEnd('Load Ayah');
}

// ========================================
// Example 10: Integration Example
// ========================================

class QuranApp {
  constructor() {
    this.apiClient = new ApiClient(API_BASE_URL);
    this.quranTester = new QuranTester(this.apiClient);
    this.favorites = [];
    this.history = [];
  }

  async init() {
    this.quranTester.init();
    this.loadFavorites();
    this.loadHistory();
  }

  async addToFavorites(surahId, ayahNumber) {
    const ayah = await this.quranTester.getAyah(surahId, ayahNumber, 'ar');
    this.favorites.push({ surahId, ayahNumber, ayah });
    this.saveFavorites();
  }

  async addToHistory(type, reference) {
    this.history.push({
      type,
      reference,
      timestamp: new Date()
    });
    this.saveHistory();
  }

  loadFavorites() {
    const saved = localStorage.getItem('quran_favorites');
    this.favorites = saved ? JSON.parse(saved) : [];
  }

  saveFavorites() {
    localStorage.setItem('quran_favorites', JSON.stringify(this.favorites));
  }

  loadHistory() {
    const saved = localStorage.getItem('quran_history');
    this.history = saved ? JSON.parse(saved) : [];
  }

  saveHistory() {
    localStorage.setItem('quran_history', JSON.stringify(this.history));
  }
}

// ========================================
// Running Examples
// ========================================

// Uncomment to run examples:

// Run all examples sequentially
async function runAllExamples() {
  try {
    await loadFamousSurahs();
    await searchExamples();
    await getFamousAyahs();
    await batchLoadSurahs();
    await advancedSearches();
    await errorHandlingExamples();
    await displayControlExample();
    await customFeatures();
    await performanceTest();

    console.log('\n=== All examples completed successfully! ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to execute:
// runAllExamples();

// Or run individual examples:
// loadFamousSurahs();
// searchExamples();
// getFamousAyahs();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    loadFamousSurahs,
    searchExamples,
    getFamousAyahs,
    batchLoadSurahs,
    advancedSearches,
    errorHandlingExamples,
    displayControlExample,
    customFeatures,
    performanceTest,
    QuranApp
  };
}
