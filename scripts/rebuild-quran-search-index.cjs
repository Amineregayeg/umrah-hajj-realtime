/**
 * Rebuild Quran Search Index
 *
 * This script rebuilds the trigram-based search index for the complete Quran data.
 * It creates a fast lookup table for Arabic, English, and French text search.
 */

const fs = require('fs');
const path = require('path');

// File paths
const ASSETS_DIR = path.join(__dirname, '../apps/backend/assets/quran');
const ARABIC_FILE = path.join(ASSETS_DIR, 'quran_ar_hafs.json');
const ENGLISH_FILE = path.join(ASSETS_DIR, 'quran_en_translation.json');
const FRENCH_FILE = path.join(ASSETS_DIR, 'quran_fr_translation.json');
const INDEX_FILE = path.join(ASSETS_DIR, 'search_index.json');

/**
 * Extract trigrams from text
 * Trigrams are 3-character sequences used for fast text search
 */
function extractTrigrams(text) {
  // Normalize text: remove diacritics, lowercase for non-Arabic
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const trigrams = new Set();
  for (let i = 0; i <= normalized.length - 3; i++) {
    const trigram = normalized.substring(i, i + 3).trim();
    if (trigram.length === 3 && !/^\s+$/.test(trigram)) {
      trigrams.add(trigram);
    }
  }

  return Array.from(trigrams);
}

/**
 * Build search index for one language
 */
function buildLanguageIndex(quranData, language) {
  console.log(`   Building index for ${language}...`);

  const index = {};
  let ayahCount = 0;

  quranData.surahs.forEach((surah) => {
    surah.ayahs.forEach((ayah) => {
      ayahCount++;

      const trigrams = extractTrigrams(ayah.text);

      trigrams.forEach((trigram) => {
        if (!index[trigram]) {
          index[trigram] = [];
        }

        // Add entry if not already present for this ayah
        const existingEntry = index[trigram].find(
          entry => entry.surah === surah.id && entry.ayah === ayah.id
        );

        if (!existingEntry) {
          index[trigram].push({
            surah: surah.id,
            ayah: ayah.id,
            score: 1.0
          });
        }
      });
    });
  });

  console.log(`   ✅ Indexed ${ayahCount} ayahs with ${Object.keys(index).length} unique trigrams`);

  return index;
}

/**
 * Build complete search index
 */
function buildSearchIndex() {
  console.log('🔍 Building Quran Search Index...\n');

  try {
    // Load Quran data
    console.log('📖 Loading Quran data...');
    const arabicData = JSON.parse(fs.readFileSync(ARABIC_FILE, 'utf8'));
    const englishData = JSON.parse(fs.readFileSync(ENGLISH_FILE, 'utf8'));
    const frenchData = JSON.parse(fs.readFileSync(FRENCH_FILE, 'utf8'));
    console.log('   ✅ Loaded all three translations\n');

    // Build indexes
    console.log('🔨 Building trigram indexes...');
    const arabicIndex = buildLanguageIndex(arabicData, 'Arabic');
    const englishIndex = buildLanguageIndex(englishData, 'English');
    const frenchIndex = buildLanguageIndex(frenchData, 'French');
    console.log('');

    // Create final index structure
    const searchIndex = {
      metadata: {
        description: 'Trigram search index for Quran text search',
        languages: ['ar', 'en', 'fr'],
        generated: new Date().toISOString().split('T')[0],
        total_surahs: arabicData.metadata.total_surahs,
        total_ayahs: arabicData.metadata.total_ayahs,
        trigram_count: {
          ar: Object.keys(arabicIndex).length,
          en: Object.keys(englishIndex).length,
          fr: Object.keys(frenchIndex).length
        }
      },
      trigrams: {
        ar: arabicIndex,
        en: englishIndex,
        fr: frenchIndex
      }
    };

    // Save to file
    console.log('💾 Saving search index...');
    fs.writeFileSync(INDEX_FILE, JSON.stringify(searchIndex, null, 2), 'utf8');

    const fileSize = fs.statSync(INDEX_FILE).size;
    console.log(`   ✅ Saved to ${INDEX_FILE}`);
    console.log(`   📊 File size: ${(fileSize / 1024 / 1024).toFixed(2)} MB\n`);

    // Print summary
    console.log('✅ Search Index Built Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Total Surahs: ${searchIndex.metadata.total_surahs}`);
    console.log(`   - Total Ayahs: ${searchIndex.metadata.total_ayahs}`);
    console.log(`   - Arabic trigrams: ${searchIndex.metadata.trigram_count.ar}`);
    console.log(`   - English trigrams: ${searchIndex.metadata.trigram_count.en}`);
    console.log(`   - French trigrams: ${searchIndex.metadata.trigram_count.fr}`);
    console.log(`   - Total unique trigrams: ${
      searchIndex.metadata.trigram_count.ar +
      searchIndex.metadata.trigram_count.en +
      searchIndex.metadata.trigram_count.fr
    }`);

  } catch (error) {
    console.error('❌ Error building search index:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  buildSearchIndex();
  console.log('\n✨ Done!');
  process.exit(0);
}

module.exports = { buildSearchIndex, extractTrigrams };
