import { describe, it, expect } from 'vitest';
import {
  removeDiacritics,
  normalizeArabicForSearch,
  arabicToWesternDigits,
  persianToWesternDigits,
  normalizeDigits,
  generateTrigrams,
  calculateEditDistance,
  isSimilar,
  highlightSearchTerms,
} from '../utils/i18n.util';

describe('I18n Utilities', () => {
  describe('removeDiacritics', () => {
    it('should remove Arabic diacritics from text', () => {
      const textWithDiacritics = 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ';
      const textWithoutDiacritics = 'بسم الله الرحمن الرحيم';
      
      expect(removeDiacritics(textWithDiacritics)).toBe(textWithoutDiacritics);
    });

    it('should handle empty strings', () => {
      expect(removeDiacritics('')).toBe('');
      expect(removeDiacritics(null as any)).toBe('');
      expect(removeDiacritics(undefined as any)).toBe('');
    });

    it('should handle text without diacritics', () => {
      const text = 'بسم الله الرحمن الرحيم';
      expect(removeDiacritics(text)).toBe(text);
    });

    it('should remove various Arabic diacritics', () => {
      const testCases = [
        { input: 'كَتَبَ', expected: 'كتب' }, // Fatha
        { input: 'كُتُبٌ', expected: 'كتب' }, // Damma, Dammatan
        { input: 'كِتَابٍ', expected: 'كتاب' }, // Kasra, Kasratan
        { input: 'كَتَّبَ', expected: 'كتب' }, // Shadda
        { input: 'كَتْبٌ', expected: 'كتب' }, // Sukun
      ];

      testCases.forEach(({ input, expected }) => {
        expect(removeDiacritics(input)).toBe(expected);
      });
    });
  });

  describe('normalizeArabicForSearch', () => {
    it('should normalize Arabic text for search', () => {
      const input = 'بِسْمِ   اللَّهِ    الرَّحْمَٰنِ';
      const expected = 'بسم الله الرحمن';
      
      expect(normalizeArabicForSearch(input)).toBe(expected);
    });

    it('should handle multiple spaces', () => {
      const input = 'الحمد     لله      رب';
      const expected = 'الحمد لله رب';
      
      expect(normalizeArabicForSearch(input)).toBe(expected);
    });

    it('should convert to lowercase', () => {
      const input = 'ALLAH';
      const expected = 'allah';
      
      expect(normalizeArabicForSearch(input)).toBe(expected);
    });
  });

  describe('arabicToWesternDigits', () => {
    it('should convert Arabic digits to Western digits', () => {
      const testCases = [
        { input: '٠١٢٣٤٥٦٧٨٩', expected: '0123456789' },
        { input: 'سورة ٢', expected: 'سورة 2' },
        { input: 'آية ١٤٥', expected: 'آية 145' },
        { input: 'no arabic digits', expected: 'no arabic digits' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(arabicToWesternDigits(input)).toBe(expected);
      });
    });
  });

  describe('persianToWesternDigits', () => {
    it('should convert Persian digits to Western digits', () => {
      const testCases = [
        { input: '۰۱۲۳۴۵۶۷۸۹', expected: '0123456789' },
        { input: 'سورہ ۲', expected: 'سورہ 2' },
        { input: 'آیت ۱۴۵', expected: 'آیت 145' },
        { input: 'no persian digits', expected: 'no persian digits' },
      ];

      testCases.forEach(({ input, expected }) => {
        expect(persianToWesternDigits(input)).toBe(expected);
      });
    });
  });

  describe('normalizeDigits', () => {
    it('should convert both Arabic and Persian digits', () => {
      const input = 'سورة ٢ آیت ۱۴۵';
      const expected = 'سورة 2 آیت 145';
      
      expect(normalizeDigits(input)).toBe(expected);
    });

    it('should handle mixed digit types', () => {
      const input = '١۲345٦۷';
      const expected = '1234567';
      
      expect(normalizeDigits(input)).toBe(expected);
    });
  });

  describe('generateTrigrams', () => {
    it('should generate trigrams from text', () => {
      const input = 'الله';
      const expected = ['الل', 'لله'];
      
      expect(generateTrigrams(input)).toEqual(expected);
    });

    it('should handle short strings', () => {
      expect(generateTrigrams('ab')).toEqual(['ab']);
      expect(generateTrigrams('a')).toEqual(['a']);
      expect(generateTrigrams('')).toEqual([]);
    });

    it('should remove duplicates', () => {
      const input = 'aaaaaa';
      const result = generateTrigrams(input);
      
      expect(result).toEqual(['aaa']);
    });

    it('should normalize input before generating trigrams', () => {
      const input = 'بِسْمِ  اللَّهِ';
      const result = generateTrigrams(input);
      
      expect(result).toContain('بسم');
      expect(result).toContain('سم ');
      expect(result).toContain('م ا');
    });
  });

  describe('calculateEditDistance', () => {
    it('should calculate Levenshtein distance correctly', () => {
      const testCases = [
        { str1: 'kitten', str2: 'sitting', expected: 3 },
        { str1: 'hello', str2: 'hello', expected: 0 },
        { str1: 'abc', str2: '', expected: 3 },
        { str1: '', str2: 'xyz', expected: 3 },
        { str1: 'cat', str2: 'bat', expected: 1 },
        { str1: 'الله', str2: 'الله', expected: 0 },
        { str1: 'الله', str2: 'اللة', expected: 1 },
      ];

      testCases.forEach(({ str1, str2, expected }) => {
        expect(calculateEditDistance(str1, str2)).toBe(expected);
      });
    });

    it('should handle empty strings', () => {
      expect(calculateEditDistance('', '')).toBe(0);
      expect(calculateEditDistance(null as any, 'test')).toBe(4);
      expect(calculateEditDistance('test', undefined as any)).toBe(4);
    });
  });

  describe('isSimilar', () => {
    it('should detect similar strings with default max distance', () => {
      expect(isSimilar('cat', 'bat')).toBe(true); // Distance 1
      expect(isSimilar('cat', 'rat')).toBe(true); // Distance 1
      expect(isSimilar('cat', 'dog')).toBe(false); // Distance 3
      expect(isSimilar('hello', 'hello')).toBe(true); // Distance 0
    });

    it('should respect custom max distance', () => {
      expect(isSimilar('kitten', 'sitting', 3)).toBe(true);
      expect(isSimilar('kitten', 'sitting', 2)).toBe(false);
    });

    it('should handle Arabic text', () => {
      expect(isSimilar('الله', 'الله')).toBe(true);
      expect(isSimilar('الله', 'اللة')).toBe(true);
    });
  });

  describe('highlightSearchTerms', () => {
    it('should highlight search terms in text', () => {
      const text = 'In the name of Allah';
      const searchTerm = 'Allah';
      const result = highlightSearchTerms(text, searchTerm);
      
      expect(result).toBe('In the name of <mark>Allah</mark>');
    });

    it('should be case insensitive', () => {
      const text = 'In the name of Allah';
      const searchTerm = 'allah';
      const result = highlightSearchTerms(text, searchTerm);
      
      expect(result).toBe('In the name of <mark>Allah</mark>');
    });

    it('should handle multiple occurrences', () => {
      const text = 'Allah Allah Allah';
      const searchTerm = 'Allah';
      const result = highlightSearchTerms(text, searchTerm);
      
      expect(result).toBe('<mark>Allah</mark> <mark>Allah</mark> <mark>Allah</mark>');
    });

    it('should handle empty inputs', () => {
      expect(highlightSearchTerms('', 'test')).toBe('');
      expect(highlightSearchTerms('test', '')).toBe('test');
      expect(highlightSearchTerms('', '')).toBe('');
    });

    it('should escape regex special characters', () => {
      const text = 'Test [special] characters.';
      const searchTerm = '[special]';
      const result = highlightSearchTerms(text, searchTerm);
      
      expect(result).toBe('Test <mark>[special]</mark> characters.');
    });
  });
});