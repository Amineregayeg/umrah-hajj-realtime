/**
 * Fetch Complete Quran Data from AlQuran.cloud API
 *
 * This script downloads the complete Quran (114 Surahs, 6,236 ayahs) in:
 * - Arabic (Hafs from Asim - Uthmani script)
 * - English (Sahih International)
 * - French (Hamidullah translation)
 *
 * And converts it to the project's JSON format.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

// API endpoints
const API_BASE = 'http://api.alquran.cloud/v1/quran';
const EDITIONS = {
  arabic: 'quran-uthmani',      // Hafs from Asim (Uthmani script)
  english: 'en.sahih',          // Sahih International
  french: 'fr.hamidullah'       // Hamidullah translation
};

// Output paths
const OUTPUT_DIR = path.join(__dirname, '../apps/backend/assets/quran');
const OUTPUT_FILES = {
  arabic: path.join(OUTPUT_DIR, 'quran_ar_hafs.json'),
  english: path.join(OUTPUT_DIR, 'quran_en_translation.json'),
  french: path.join(OUTPUT_DIR, 'quran_fr_translation.json')
};

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Fetch data from URL using HTTP/HTTPS
 */
function fetchData(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https') ? https : require('http');

    protocol.get(url, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (error) {
          reject(new Error(`Failed to parse JSON: ${error.message}`));
        }
      });
    }).on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Convert API format to project format
 */
function convertToProjectFormat(apiData, language, translatorName) {
  if (!apiData.data || !apiData.data.surahs) {
    throw new Error('Invalid API response structure');
  }

  const surahs = apiData.data.surahs;

  // Build metadata
  const metadata = {
    name: language === 'arabic'
      ? 'القرآن الكريم - رواية حفص عن عاصم'
      : language === 'english'
        ? 'The Noble Quran - English Translation'
        : 'Le Noble Coran - Traduction Française',
    language: language === 'arabic' ? 'ar' : language === 'english' ? 'en' : 'fr',
    total_surahs: surahs.length,
    total_ayahs: surahs.reduce((total, surah) => total + surah.ayahs.length, 0)
  };

  if (translatorName) {
    metadata.translator = translatorName;
  }

  if (language === 'arabic') {
    metadata.translation = 'The Noble Quran - Hafs from Asim';
  }

  // Convert surahs
  const convertedSurahs = surahs.map(surah => {
    const converted = {
      id: surah.number,
      name: language === 'arabic' ? surah.name : surah.englishName,
      transliteration: surah.englishName,
      translation: surah.englishNameTranslation,
      type: surah.revelationType === 'Meccan' ? 'makkiyyah' : 'madaniyyah',
      ayah_count: surah.ayahs.length,
      ayahs: surah.ayahs.map(ayah => {
        const convertedAyah = {
          id: ayah.numberInSurah,
          text: ayah.text
        };

        // Add metadata fields (only for Arabic to save space in translations)
        if (language === 'arabic') {
          convertedAyah.page = ayah.page;
          convertedAyah.juz = ayah.juz;
          convertedAyah.manzil = ayah.manzil;
          convertedAyah.ruku = ayah.ruku;
          convertedAyah.hizbQuarter = ayah.hizbQuarter;
          convertedAyah.sajda = ayah.sajda;
        }

        return convertedAyah;
      })
    };

    return converted;
  });

  return {
    metadata,
    surahs: convertedSurahs
  };
}

/**
 * Main execution
 */
async function main() {
  console.log('🕋 Fetching Complete Quran Data...\n');

  try {
    // Fetch Arabic (Hafs from Asim)
    console.log('📖 Fetching Arabic Quran (Hafs from Asim - Uthmani script)...');
    const arabicUrl = `${API_BASE}/${EDITIONS.arabic}`;
    const arabicData = await fetchData(arabicUrl);
    console.log(`   ✅ Fetched ${arabicData.data.surahs.length} Surahs`);

    const arabicConverted = convertToProjectFormat(arabicData, 'arabic', null);
    fs.writeFileSync(OUTPUT_FILES.arabic, JSON.stringify(arabicConverted, null, 2), 'utf8');
    console.log(`   ✅ Saved to ${OUTPUT_FILES.arabic}`);
    console.log(`   📊 Total ayahs: ${arabicConverted.metadata.total_ayahs}\n`);

    // Fetch English (Sahih International)
    console.log('📖 Fetching English Translation (Sahih International)...');
    const englishUrl = `${API_BASE}/${EDITIONS.english}`;
    const englishData = await fetchData(englishUrl);
    console.log(`   ✅ Fetched ${englishData.data.surahs.length} Surahs`);

    const englishConverted = convertToProjectFormat(englishData, 'english', 'Sahih International');
    fs.writeFileSync(OUTPUT_FILES.english, JSON.stringify(englishConverted, null, 2), 'utf8');
    console.log(`   ✅ Saved to ${OUTPUT_FILES.english}`);
    console.log(`   📊 Total ayahs: ${englishConverted.metadata.total_ayahs}\n`);

    // Fetch French (Hamidullah)
    console.log('📖 Fetching French Translation (Hamidullah)...');
    const frenchUrl = `${API_BASE}/${EDITIONS.french}`;
    const frenchData = await fetchData(frenchUrl);
    console.log(`   ✅ Fetched ${frenchData.data.surahs.length} Surahs`);

    const frenchConverted = convertToProjectFormat(frenchData, 'french', 'Muhammad Hamidullah');
    fs.writeFileSync(OUTPUT_FILES.french, JSON.stringify(frenchConverted, null, 2), 'utf8');
    console.log(`   ✅ Saved to ${OUTPUT_FILES.french}`);
    console.log(`   📊 Total ayahs: ${frenchConverted.metadata.total_ayahs}\n`);

    // Print summary
    console.log('✅ Complete Quran Data Downloaded and Converted Successfully!\n');
    console.log('📊 Summary:');
    console.log(`   - Total Surahs: ${arabicConverted.metadata.total_surahs}`);
    console.log(`   - Total Ayahs: ${arabicConverted.metadata.total_ayahs}`);
    console.log(`   - Languages: Arabic (Hafs), English (Sahih International), French (Hamidullah)`);
    console.log('\n🎉 All files saved to:', OUTPUT_DIR);

    // Print file sizes
    console.log('\n📁 File Sizes:');
    const arabicSize = fs.statSync(OUTPUT_FILES.arabic).size;
    const englishSize = fs.statSync(OUTPUT_FILES.english).size;
    const frenchSize = fs.statSync(OUTPUT_FILES.french).size;
    console.log(`   - ${path.basename(OUTPUT_FILES.arabic)}: ${(arabicSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - ${path.basename(OUTPUT_FILES.english)}: ${(englishSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - ${path.basename(OUTPUT_FILES.french)}: ${(frenchSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   - Total: ${((arabicSize + englishSize + frenchSize) / 1024 / 1024).toFixed(2)} MB\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  main().then(() => {
    console.log('✨ Done!');
    process.exit(0);
  }).catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { fetchData, convertToProjectFormat };
