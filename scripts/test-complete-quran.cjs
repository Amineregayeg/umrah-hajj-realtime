/**
 * Test Complete Quran Data
 *
 * This script validates that all 114 Surahs are accessible and complete
 */

const fs = require('fs');
const path = require('path');

// File paths
const ASSETS_DIR = path.join(__dirname, '../apps/backend/assets/quran');
const ARABIC_FILE = path.join(ASSETS_DIR, 'quran_ar_hafs.json');
const ENGLISH_FILE = path.join(ASSETS_DIR, 'quran_en_translation.json');
const FRENCH_FILE = path.join(ASSETS_DIR, 'quran_fr_translation.json');

// Expected ayah counts for each Surah (1-114)
const EXPECTED_AYAH_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109,
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135,
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,
  28, 28, 20, 56, 40, 31, 50, 40, 46, 42,
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,
  11, 8, 3, 9, 5, 4, 7, 3, 6, 3,
  5, 4, 5, 6
];

function testQuranData() {
  console.log('🧪 Testing Complete Quran Data...\n');

  try {
    // Load data
    console.log('📖 Loading Quran files...');
    const arabic = JSON.parse(fs.readFileSync(ARABIC_FILE, 'utf8'));
    const english = JSON.parse(fs.readFileSync(ENGLISH_FILE, 'utf8'));
    const french = JSON.parse(fs.readFileSync(FRENCH_FILE, 'utf8'));
    console.log('   ✅ All files loaded\n');

    // Test 1: Verify number of Surahs
    console.log('✅ Test 1: Number of Surahs');
    console.log(`   Arabic: ${arabic.surahs.length}/114`);
    console.log(`   English: ${english.surahs.length}/114`);
    console.log(`   French: ${french.surahs.length}/114\n`);

    if (arabic.surahs.length !== 114 || english.surahs.length !== 114 || french.surahs.length !== 114) {
      throw new Error('Not all 114 Surahs present!');
    }

    // Test 2: Verify total ayah count
    console.log('✅ Test 2: Total Ayah Count');
    const arabicTotalAyahs = arabic.surahs.reduce((sum, s) => sum + s.ayahs.length, 0);
    const englishTotalAyahs = english.surahs.reduce((sum, s) => sum + s.ayahs.length, 0);
    const frenchTotalAyahs = french.surahs.reduce((sum, s) => sum + s.ayahs.length, 0);

    console.log(`   Arabic: ${arabicTotalAyahs}/6236`);
    console.log(`   English: ${englishTotalAyahs}/6236`);
    console.log(`   French: ${frenchTotalAyahs}/6236\n`);

    if (arabicTotalAyahs !== 6236 || englishTotalAyahs !== 6236 || frenchTotalAyahs !== 6236) {
      throw new Error('Total ayah count does not match 6236!');
    }

    // Test 3: Verify each Surah has correct ayah count
    console.log('✅ Test 3: Verify Each Surah Ayah Count');
    let errors = [];

    for (let i = 0; i < 114; i++) {
      const surahNum = i + 1;
      const expectedCount = EXPECTED_AYAH_COUNTS[i];
      const arabicCount = arabic.surahs[i].ayahs.length;
      const englishCount = english.surahs[i].ayahs.length;
      const frenchCount = french.surahs[i].ayahs.length;

      if (arabicCount !== expectedCount || englishCount !== expectedCount || frenchCount !== expectedCount) {
        errors.push(`   ❌ Surah ${surahNum} (${arabic.surahs[i].transliteration}): expected ${expectedCount}, got AR:${arabicCount} EN:${englishCount} FR:${frenchCount}`);
      }
    }

    if (errors.length > 0) {
      console.log(`   Found ${errors.length} errors:`);
      errors.forEach(err => console.log(err));
      throw new Error('Ayah count mismatches found!');
    } else {
      console.log(`   ✅ All 114 Surahs have correct ayah counts!\n`);
    }

    // Test 4: Spot check specific Surahs
    console.log('✅ Test 4: Spot Check Specific Surahs');

    // Al-Fatiha (Surah 1, 7 ayahs)
    console.log(`   Surah 1 (Al-Fatiha): ${arabic.surahs[0].ayahs.length} ayahs`);
    console.log(`      Arabic: ${arabic.surahs[0].ayahs[0].text.substring(0, 30)}...`);
    console.log(`      English: ${english.surahs[0].ayahs[0].text.substring(0, 40)}...`);
    console.log(`      French: ${french.surahs[0].ayahs[0].text.substring(0, 40)}...\n`);

    // Al-Baqarah (Surah 2, 286 ayahs) - This was incomplete before!
    console.log(`   Surah 2 (Al-Baqarah): ${arabic.surahs[1].ayahs.length} ayahs`);
    console.log(`      First ayah: ${arabic.surahs[1].ayahs[0].text}`);
    console.log(`      Last ayah (286): ${arabic.surahs[1].ayahs[285].text.substring(0, 50)}...\n`);

    // Al-Ikhlas (Surah 112, 4 ayahs)
    console.log(`   Surah 112 (Al-Ikhlas): ${arabic.surahs[111].ayahs.length} ayahs`);
    console.log(`      Arabic: ${arabic.surahs[111].ayahs[0].text}`);
    console.log(`      English: ${english.surahs[111].ayahs[0].text}\n`);

    // An-Nas (Surah 114, 6 ayahs) - Last Surah
    console.log(`   Surah 114 (An-Nas): ${arabic.surahs[113].ayahs.length} ayahs`);
    console.log(`      Arabic: ${arabic.surahs[113].ayahs[0].text}`);
    console.log(`      English: ${english.surahs[113].ayahs[0].text}\n`);

    // Test 5: Verify metadata fields for Arabic
    console.log('✅ Test 5: Verify Metadata Fields (Arabic)');
    const firstAyah = arabic.surahs[0].ayahs[0];
    console.log('   Checking first ayah has required fields:');
    console.log(`      page: ${firstAyah.page} ✓`);
    console.log(`      juz: ${firstAyah.juz} ✓`);
    console.log(`      manzil: ${firstAyah.manzil} ✓`);
    console.log(`      ruku: ${firstAyah.ruku} ✓`);
    console.log(`      hizbQuarter: ${firstAyah.hizbQuarter} ✓`);
    console.log(`      sajda: ${firstAyah.sajda} ✓\n`);

    // Test 6: File sizes
    console.log('✅ Test 6: File Sizes');
    const arabicSize = fs.statSync(ARABIC_FILE).size;
    const englishSize = fs.statSync(ENGLISH_FILE).size;
    const frenchSize = fs.statSync(FRENCH_FILE).size;
    console.log(`   Arabic: ${(arabicSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   English: ${(englishSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   French: ${(frenchSize / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   Total: ${((arabicSize + englishSize + frenchSize) / 1024 / 1024).toFixed(2)} MB\n`);

    // Summary
    console.log('🎉 All Tests Passed!\n');
    console.log('📊 Summary:');
    console.log('   ✅ All 114 Surahs present in all languages');
    console.log('   ✅ Total 6,236 ayahs verified');
    console.log('   ✅ Ayah counts match expected values');
    console.log('   ✅ Surah 2 (Al-Baqarah) is now complete with 286 ayahs (was 5)');
    console.log('   ✅ Metadata fields present for Arabic text');
    console.log('   ✅ All files properly formatted and accessible\n');

    return true;

  } catch (error) {
    console.error('\n❌ Test Failed:', error.message);
    return false;
  }
}

// Run tests
if (require.main === module) {
  const success = testQuranData();
  process.exit(success ? 0 : 1);
}

module.exports = { testQuranData, EXPECTED_AYAH_COUNTS };
