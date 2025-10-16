/**
 * Internationalization utilities for Quran text processing
 * Handles Arabic diacritic normalization and digit conversion
 */

// Arabic diacritics (tashkeel) that should be removed for search
const ARABIC_DIACRITICS = [
  '\u064B', // Fathatan
  '\u064C', // Dammatan
  '\u064D', // Kasratan
  '\u064E', // Fatha
  '\u064F', // Damma
  '\u0650', // Kasra
  '\u0651', // Shadda
  '\u0652', // Sukun
  '\u0653', // Maddah Above
  '\u0654', // Hamza Above
  '\u0655', // Hamza Below
  '\u0656', // Subscript Alef
  '\u0657', // Inverted Damma
  '\u0658', // Mark Noon Ghunna
  '\u0659', // Zwarakay
  '\u065A', // Vowel Sign Small V Above
  '\u065B', // Vowel Sign Inverted Small V Above
  '\u065C', // Vowel Sign Dot Below
  '\u065D', // Reversed Damma
  '\u065E', // Fatha With Two Dots
  '\u065F', // Wavy Hamza Below
  '\u0670', // Superscript Alef
];

// Arabic digits to western digits mapping
const ARABIC_TO_WESTERN_DIGITS: Record<string, string> = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

// Persian/Urdu digits to western digits mapping
const PERSIAN_TO_WESTERN_DIGITS: Record<string, string> = {
  '۰': '0',
  '۱': '1',
  '۲': '2',
  '۳': '3',
  '۴': '4',
  '۵': '5',
  '۶': '6',
  '۷': '7',
  '۸': '8',
  '۹': '9',
};

/**
 * Remove Arabic diacritics (tashkeel) from text
 * This is useful for search functionality where diacritics should be ignored
 */
export function removeDiacritics(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;
  for (const diacritic of ARABIC_DIACRITICS) {
    result = result.replace(new RegExp(diacritic, 'g'), '');
  }
  
  return result.trim();
}

/**
 * Normalize Arabic text for search by removing diacritics and extra whitespace
 */
export function normalizeArabicForSearch(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return removeDiacritics(text)
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim()
    .toLowerCase();
}

/**
 * Convert Arabic digits to Western digits
 */
export function arabicToWesternDigits(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;
  for (const [arabic, western] of Object.entries(ARABIC_TO_WESTERN_DIGITS)) {
    result = result.replace(new RegExp(arabic, 'g'), western);
  }
  
  return result;
}

/**
 * Convert Persian/Urdu digits to Western digits
 */
export function persianToWesternDigits(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  let result = text;
  for (const [persian, western] of Object.entries(PERSIAN_TO_WESTERN_DIGITS)) {
    result = result.replace(new RegExp(persian, 'g'), western);
  }
  
  return result;
}

/**
 * Convert any non-Western digits to Western digits
 */
export function normalizeDigits(text: string): string {
  if (!text || typeof text !== 'string') {
    return '';
  }

  return persianToWesternDigits(arabicToWesternDigits(text));
}

/**
 * Generate trigrams from normalized text for search indexing
 */
export function generateTrigrams(text: string): string[] {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const normalized = normalizeArabicForSearch(text);
  if (normalized.length < 3) {
    return [normalized];
  }

  const trigrams: string[] = [];
  for (let i = 0; i <= normalized.length - 3; i++) {
    trigrams.push(normalized.substring(i, i + 3));
  }

  return Array.from(new Set(trigrams)); // Remove duplicates
}

/**
 * Calculate edit distance between two strings (Levenshtein distance)
 * Used for fuzzy search with edit distance <= 1
 */
export function calculateEditDistance(str1: string, str2: string): number {
  if (!str1 || !str2) {
    return Math.max(str1?.length || 0, str2?.length || 0);
  }

  const matrix: number[][] = [];
  const len1 = str1.length;
  const len2 = str2.length;

  // Initialize matrix
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  // Fill matrix
  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return matrix[len1][len2];
}

/**
 * Check if two strings are similar with edit distance <= maxDistance
 */
export function isSimilar(str1: string, str2: string, maxDistance: number = 1): boolean {
  return calculateEditDistance(str1, str2) <= maxDistance;
}

/**
 * Highlight search terms in text for display
 */
export function highlightSearchTerms(text: string, searchTerm: string): string {
  if (!text || !searchTerm) {
    return text;
  }

  const normalized = normalizeArabicForSearch(searchTerm);
  if (!normalized) {
    return text;
  }

  // Simple highlighting - in a real implementation, you might want more sophisticated matching
  const regex = new RegExp(`(${escapeRegExp(searchTerm)})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
}

/**
 * Escape special regex characters
 */
function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}