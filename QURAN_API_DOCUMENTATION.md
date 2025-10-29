# Quran API Documentation

**For Developers & QA Teams**

**API Base URL:** `https://api.umrah.app` (Production) | `http://localhost:3000` (Development)

**Last Updated:** October 29, 2025

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [API Endpoints](#api-endpoints)
4. [Complete Examples](#complete-examples)
5. [Response Formats](#response-formats)
6. [Error Handling](#error-handling)
7. [Testing Guide](#testing-guide)

---

## Overview

The Quran API provides access to the complete Quran in multiple languages with search capabilities, audio recitation references, and caching for optimal performance.

### Available Data

- **114 Surahs** (Complete Quran)
- **6,236 Ayahs** (All verses)
- **3 Languages:**
  - `ar` - Arabic (Hafs recitation)
  - `en` - English (Sahih International translation)
  - `fr` - French (Hamidullah translation)

### Key Features

- Fast trigram-based search
- Multi-language support
- Audio recitation references
- 24-hour caching for better performance
- Metadata (Juz, Manzil, Ruku, Hizb, Sajda positions)

---

## Authentication

**No authentication required** for Quran API endpoints. These are public read-only endpoints.

---

## API Endpoints

### 1. Get Complete Surah

Retrieve a complete Surah with all its Ayahs.

**Endpoint:** `GET /content/quran/surah/:id`

**Parameters:**
- `id` (path parameter) - Surah number (1-114)
- `lang` (query parameter, optional) - Language: `ar` (default), `en`, or `fr`

**Example Request:**
```bash
# Get Surah Al-Fatihah in Arabic
curl "https://api.umrah.app/content/quran/surah/1?lang=ar"

# Get Surah Al-Baqarah in English
curl "https://api.umrah.app/content/quran/surah/2?lang=en"

# Get Surah Yusuf in French
curl "https://api.umrah.app/content/quran/surah/12?lang=fr"
```

**Response Example (Arabic):**
```json
{
  "id": 1,
  "name": "الفاتحة",
  "transliteration": "Al-Fatihah",
  "translation": "The Opening",
  "type": "makkiyyah",
  "ayah_count": 7,
  "ayahs": [
    {
      "id": 1,
      "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "page": 1,
      "juz": 1,
      "manzil": 1,
      "ruku": 1,
      "hizbQuarter": 1,
      "sajda": false
    },
    {
      "id": 2,
      "text": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      "page": 1,
      "juz": 1,
      "manzil": 1,
      "ruku": 1,
      "hizbQuarter": 1,
      "sajda": false
    }
    // ... remaining ayahs
  ]
}
```

**Response Example (English):**
```json
{
  "id": 1,
  "name": "Al-Fatihah",
  "translation": "The Opening",
  "type": "makkiyyah",
  "ayah_count": 7,
  "ayahs": [
    {
      "id": 1,
      "text": "In the name of Allah, the Entirely Merciful, the Especially Merciful."
    },
    {
      "id": 2,
      "text": "[All] praise is [due] to Allah, Lord of the worlds -"
    }
    // ... remaining ayahs
  ]
}
```

---

### 2. Get Specific Ayah

Retrieve a single Ayah by Surah and Ayah number.

**Endpoint:** `GET /content/quran/ayah`

**Query Parameters:**
- `surah` (required) - Surah number (1-114)
- `ayah` (required) - Ayah number within the Surah
- `lang` (optional) - Language: `ar` (default), `en`, or `fr`

**Example Request:**
```bash
# Get first ayah of Al-Fatihah in Arabic
curl "https://api.umrah.app/content/quran/ayah?surah=1&ayah=1&lang=ar"

# Get Ayat al-Kursi (Al-Baqarah:255) in English
curl "https://api.umrah.app/content/quran/ayah?surah=2&ayah=255&lang=en"
```

**Response Example:**
```json
{
  "id": 1,
  "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
  "page": 1,
  "juz": 1,
  "manzil": 1,
  "ruku": 1,
  "hizbQuarter": 1,
  "sajda": false
}
```

---

### 3. Search Quran

Search for specific terms in the Quran using advanced trigram matching and fuzzy search.

**Endpoint:** `GET /content/quran/search`

**Query Parameters:**
- `q` (required) - Search query (2-100 characters)
- `lang` (optional) - Language to search: `ar` (default), `en`, or `fr`
- `limit` (optional) - Maximum results to return (default: 20, max: 100)
- `offset` (optional) - Offset for pagination (default: 0)

**Search Features:**
- Trigram-based matching (fast)
- Fuzzy search with edit distance ≤ 1
- Highlighted results
- Relevance scoring

**Example Request:**
```bash
# Search for "الله" in Arabic
curl "https://api.umrah.app/content/quran/search?q=الله&lang=ar&limit=5"

# Search for "mercy" in English
curl "https://api.umrah.app/content/quran/search?q=mercy&lang=en&limit=10"

# Search with pagination
curl "https://api.umrah.app/content/quran/search?q=prayer&lang=en&limit=20&offset=20"
```

**Response Example:**
```json
{
  "results": [
    {
      "surah": 1,
      "surah_name": "الفاتحة",
      "surah_translation": "The Opening",
      "ayah": 1,
      "text": "بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ",
      "score": 1.0,
      "highlighted": "بِسْمِ <mark>اللَّهِ</mark> الرَّحْمَٰنِ الرَّحِيمِ"
    },
    {
      "surah": 1,
      "surah_name": "الفاتحة",
      "surah_translation": "The Opening",
      "ayah": 2,
      "text": "الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ",
      "score": 0.95,
      "highlighted": "الْحَمْدُ <mark>لِلَّهِ</mark> رَبِّ الْعَالَمِينَ"
    }
  ],
  "total": 2699,
  "count": 2,
  "offset": 0,
  "query": "الله",
  "language": "ar",
  "execution_time_ms": 15
}
```

---

### 4. Get Audio Reciters

Get a list of available Quran reciters with audio URL templates.

**Endpoint:** `GET /content/quran/audio/reciters`

**No Parameters Required**

**Example Request:**
```bash
curl "https://api.umrah.app/content/quran/audio/reciters"
```

**Response Example:**
```json
{
  "reciters": [
    {
      "id": "abdul_basit_murattal",
      "name_ar": "عبد الباسط عبد الصمد",
      "name_en": "Abdul Basit Abdul Samad",
      "style": "Murattal",
      "audio_url_template": "https://audio.quranapi.com/abdul_basit_murattal/{surah:03d}.mp3",
      "format": "mp3",
      "quality": "128kbps"
    },
    {
      "id": "mishary_rashid",
      "name_ar": "مشاري راشد العفاسي",
      "name_en": "Mishary Rashid Alafasy",
      "style": "Murattal",
      "audio_url_template": "https://audio.quranapi.com/mishary_rashid/{surah:03d}.mp3",
      "format": "mp3",
      "quality": "128kbps"
    }
  ],
  "total": 5
}
```

**Using the Audio URL Template:**
```javascript
// Get audio URL for Surah 1 (Al-Fatihah)
const reciter = reciters[0];
const surahNumber = 1;
const audioUrl = reciter.audio_url_template.replace('{surah:03d}', surahNumber.toString().padStart(3, '0'));
// Result: https://audio.quranapi.com/abdul_basit_murattal/001.mp3
```

---

### 5. Cache Statistics (Monitoring)

Get cache performance statistics.

**Endpoint:** `GET /content/quran/cache/stats`

**Example Request:**
```bash
curl "https://api.umrah.app/content/quran/cache/stats"
```

**Response Example:**
```json
{
  "hits": 1523,
  "misses": 87,
  "hitRate": 94.60,
  "size": 42,
  "capacity": 100
}
```

---

## Complete Examples

### JavaScript/TypeScript (Frontend)

```typescript
// Get Surah Al-Fatihah in user's preferred language
async function getSurah(surahId: number, language: 'ar' | 'en' | 'fr') {
  const response = await fetch(
    `https://api.umrah.app/content/quran/surah/${surahId}?lang=${language}`
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch Surah: ${response.statusText}`);
  }

  return await response.json();
}

// Search Quran
async function searchQuran(query: string, language: 'ar' | 'en' | 'fr', limit: number = 20) {
  const params = new URLSearchParams({
    q: query,
    lang: language,
    limit: limit.toString(),
  });

  const response = await fetch(
    `https://api.umrah.app/content/quran/search?${params}`
  );

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  return await response.json();
}

// Usage
const surah = await getSurah(1, 'en');
console.log(`${surah.name}: ${surah.ayah_count} ayahs`);

const results = await searchQuran('mercy', 'en', 10);
console.log(`Found ${results.total} matches in ${results.execution_time_ms}ms`);
```

---

### Unity/C#

```csharp
using UnityEngine;
using System.Collections;
using System.Collections.Generic;

public class QuranAPI : MonoBehaviour
{
    private const string API_BASE = "https://api.umrah.app";

    [System.Serializable]
    public class Ayah
    {
        public int id;
        public string text;
        public int page;
        public int juz;
        public bool sajda;
    }

    [System.Serializable]
    public class Surah
    {
        public int id;
        public string name;
        public string translation;
        public string type;
        public int ayah_count;
        public List<Ayah> ayahs;
    }

    public IEnumerator GetSurah(int surahId, string language, System.Action<Surah> callback)
    {
        string url = $"{API_BASE}/content/quran/surah/{surahId}?lang={language}";

        using (UnityWebRequest request = UnityWebRequest.Get(url))
        {
            yield return request.SendWebRequest();

            if (request.result == UnityWebRequest.Result.Success)
            {
                Surah surah = JsonUtility.FromJson<Surah>(request.downloadHandler.text);
                callback?.Invoke(surah);
            }
            else
            {
                Debug.LogError($"Failed to fetch Surah: {request.error}");
            }
        }
    }

    // Usage
    void Start()
    {
        StartCoroutine(GetSurah(1, "ar", (surah) => {
            Debug.Log($"Retrieved {surah.name} with {surah.ayah_count} ayahs");
        }));
    }
}
```

---

### cURL (Testing)

```bash
# Get Surah Al-Fatihah (Arabic)
curl -X GET "https://api.umrah.app/content/quran/surah/1?lang=ar" \
  -H "Accept: application/json"

# Get specific ayah with pretty print
curl -X GET "https://api.umrah.app/content/quran/ayah?surah=2&ayah=255&lang=en" \
  -H "Accept: application/json" | jq .

# Search with pagination
curl -X GET "https://api.umrah.app/content/quran/search?q=mercy&lang=en&limit=20&offset=0" \
  -H "Accept: application/json" | jq '.results[] | {surah, ayah, text}'

# Get reciters list
curl -X GET "https://api.umrah.app/content/quran/audio/reciters" \
  -H "Accept: application/json" | jq '.reciters[] | {name_en, style}'
```

---

## Response Formats

### Surah Response (Arabic)

```typescript
interface SurahResponseArabic {
  id: number;                    // Surah number (1-114)
  name: string;                  // Arabic name
  transliteration: string;       // English transliteration
  translation: string;           // English translation of name
  type: 'makkiyyah' | 'madaniyyah';  // Revelation type
  ayah_count: number;            // Number of ayahs
  ayahs: Array<{
    id: number;                  // Ayah number within Surah
    text: string;                // Arabic text
    page: number;                // Mushaf page number
    juz: number;                 // Juz number (1-30)
    manzil: number;              // Manzil number (1-7)
    ruku: number;                // Ruku number
    hizbQuarter: number;         // Hizb quarter number
    sajda: boolean;              // Has prostration
  }>;
}
```

### Surah Response (English/French)

```typescript
interface SurahResponseTranslation {
  id: number;
  name: string;                  // Transliterated name
  translation: string;           // Name translation
  type: 'makkiyyah' | 'madaniyyah';
  ayah_count: number;
  ayahs: Array<{
    id: number;
    text: string;                // Translation text (no metadata)
  }>;
}
```

### Search Response

```typescript
interface SearchResponse {
  results: Array<{
    surah: number;               // Surah number
    surah_name: string;          // Surah name (in searched language)
    surah_translation: string;   // Surah name translation
    ayah: number;                // Ayah number
    text: string;                // Original text
    score: number;               // Relevance score (0-1)
    highlighted: string;         // Text with <mark> tags
  }>;
  total: number;                 // Total matches found
  count: number;                 // Number in this response
  offset: number;                // Pagination offset
  query: string;                 // Original search query
  language: string;              // Language searched
  execution_time_ms: number;     // Search time in milliseconds
}
```

---

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `400 Bad Request` - Invalid parameters
- `404 Not Found` - Surah/Ayah not found
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "statusCode": 400,
  "message": "Invalid surah ID. Must be between 1 and 114.",
  "error": "Bad Request"
}
```

### Common Errors

**Invalid Surah ID:**
```json
{
  "statusCode": 400,
  "message": "Invalid surah ID. Must be between 1 and 114.",
  "error": "Bad Request"
}
```

**Invalid Ayah Number:**
```json
{
  "statusCode": 400,
  "message": "Invalid ayah number. Must be positive.",
  "error": "Bad Request"
}
```

**Search Query Too Short:**
```json
{
  "statusCode": 400,
  "message": "Search query must be at least 2 characters long.",
  "error": "Bad Request"
}
```

**Search Query Too Long:**
```json
{
  "statusCode": 400,
  "message": "Search query must not exceed 100 characters.",
  "error": "Bad Request"
}
```

---

## Testing Guide

### Manual Testing Checklist

#### 1. Test Get Surah

- [ ] Get Surah 1 (Al-Fatihah) in Arabic
- [ ] Get Surah 114 (An-Nas) in Arabic (last Surah)
- [ ] Get Surah 2 (Al-Baqarah) in English (longest Surah)
- [ ] Get Surah 12 (Yusuf) in French
- [ ] Try invalid Surah ID 0 (should fail)
- [ ] Try invalid Surah ID 115 (should fail)
- [ ] Try invalid language 'es' (should default to 'ar')

#### 2. Test Get Ayah

- [ ] Get Surah 1, Ayah 1 (Bismillah)
- [ ] Get Surah 2, Ayah 255 (Ayat al-Kursi)
- [ ] Try invalid Ayah number 0 (should fail)
- [ ] Try Ayah number exceeding Surah length (should fail)

#### 3. Test Search

- [ ] Search "الله" in Arabic (should find many results)
- [ ] Search "mercy" in English
- [ ] Search "miséricorde" in French
- [ ] Test pagination (offset 0, 20, 40)
- [ ] Try 1-character query (should fail)
- [ ] Try 101-character query (should fail)
- [ ] Search for non-existent term (should return 0 results)

#### 4. Test Audio Reciters

- [ ] Get reciters list
- [ ] Verify 5 reciters returned
- [ ] Check audio URL template format
- [ ] Generate audio URL for Surah 1

#### 5. Test Cache

- [ ] Get cache stats
- [ ] Request same Surah twice, verify hit rate increases
- [ ] Monitor performance improvement

### Automated Test Examples

```typescript
// Jest test suite
describe('Quran API', () => {
  const API_BASE = 'https://api.umrah.app';

  test('should get Surah Al-Fatihah in Arabic', async () => {
    const response = await fetch(`${API_BASE}/content/quran/surah/1?lang=ar`);
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.id).toBe(1);
    expect(data.name).toBe('الفاتحة');
    expect(data.ayah_count).toBe(7);
    expect(data.ayahs).toHaveLength(7);
  });

  test('should reject invalid Surah ID', async () => {
    const response = await fetch(`${API_BASE}/content/quran/surah/115`);
    expect(response.status).toBe(400);

    const error = await response.json();
    expect(error.message).toContain('Invalid surah ID');
  });

  test('should search Quran in English', async () => {
    const response = await fetch(
      `${API_BASE}/content/quran/search?q=mercy&lang=en&limit=5`
    );
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.results.length).toBeGreaterThan(0);
    expect(data.results.length).toBeLessThanOrEqual(5);
    expect(data.total).toBeGreaterThan(0);
  });
});
```

---

## Performance & Caching

### Cache Strategy

- **Surah Endpoints:** 24-hour cache (`Cache-Control: public, max-age=86400`)
- **Search Endpoint:** 1-hour cache (`Cache-Control: public, max-age=3600`)
- **Audio Reciters:** 24-hour cache
- **Cache Stats:** No cache

### Performance Benchmarks

- **Get Surah (cached):** < 5ms
- **Get Surah (uncached):** 10-30ms
- **Get Ayah:** < 5ms
- **Search (typical query):** 10-50ms
- **Search (complex query):** 50-200ms

---

## Data Attribution

All Quran data is properly licensed and attributed:

- **Arabic Text:** AlQuran.cloud API (Hafs recitation)
- **English Translation:** Sahih International (Public Domain)
- **French Translation:** Muhammad Hamidullah

For full attribution, see: `apps/backend/assets/quran/NOTICE`

---

## Support

### Documentation

- **Main Docs:** `/docs/README.md`
- **API Reference:** `/docs/umrah_tech_pack_v1/07_api_reference.yaml`
- **Technical Spec:** `/docs/umrah_tech_pack_v1/03_technical_spec.md`

### Issues & Questions

- Report bugs in the project issue tracker
- Contact backend team for technical questions
- Check deployment logs for production issues

---

## Changelog

### October 29, 2025
- ✅ Complete Quran data (114 Surahs, 6,236 Ayahs)
- ✅ Multi-language support (Arabic, English, French)
- ✅ Advanced trigram search with fuzzy matching
- ✅ Audio reciter references
- ✅ 24-hour caching for optimal performance

---

**Questions?** See `/docs/README.md` or contact the development team.

**Live API:** https://api.umrah.app/content/quran/

**Swagger Docs:** https://api.umrah.app/docs (when deployed with Swagger UI)
