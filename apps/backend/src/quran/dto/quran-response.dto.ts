import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuranAyahDto {
  @ApiProperty({
    description: 'Ayah number within the surah',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'The text content of the ayah',
    example: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  })
  text: string;

  @ApiPropertyOptional({
    description: 'Page number in the Mushaf',
    example: 1,
  })
  page?: number;

  @ApiPropertyOptional({
    description: 'Juz (Para) number',
    example: 1,
  })
  juz?: number;

  @ApiPropertyOptional({
    description: 'Manzil number',
    example: 1,
  })
  manzil?: number;

  @ApiPropertyOptional({
    description: 'Ruku number',
    example: 1,
  })
  ruku?: number;

  @ApiPropertyOptional({
    description: 'Hizb quarter number',
    example: 1,
  })
  hizbQuarter?: number;

  @ApiPropertyOptional({
    description: 'Whether this ayah contains a sajda (prostration)',
    example: false,
  })
  sajda?: boolean;
}

export class QuranSurahDto {
  @ApiProperty({
    description: 'Surah number',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Surah name in Arabic',
    example: 'الفاتحة',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Surah name transliteration',
    example: 'Al-Fatihah',
  })
  transliteration?: string;

  @ApiProperty({
    description: 'Surah name translation',
    example: 'The Opening',
  })
  translation: string;

  @ApiProperty({
    description: 'Revelation type (makkiyyah or madaniyyah)',
    example: 'makkiyyah',
  })
  type: string;

  @ApiProperty({
    description: 'Total number of ayahs in this surah',
    example: 7,
  })
  ayah_count: number;

  @ApiProperty({
    description: 'Array of ayahs in this surah',
    type: [QuranAyahDto],
  })
  ayahs: QuranAyahDto[];
}

export class QuranSearchResultDto {
  @ApiProperty({
    description: 'Surah number where the match was found',
    example: 1,
  })
  surah: number;

  @ApiProperty({
    description: 'Surah name',
    example: 'الفاتحة',
  })
  surah_name: string;

  @ApiProperty({
    description: 'Surah name translation',
    example: 'The Opening',
  })
  surah_translation: string;

  @ApiProperty({
    description: 'Ayah number where the match was found',
    example: 1,
  })
  ayah: number;

  @ApiProperty({
    description: 'The matching ayah text',
    example: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  })
  text: string;

  @ApiProperty({
    description: 'Search relevance score (0-1)',
    example: 0.95,
  })
  score: number;

  @ApiPropertyOptional({
    description: 'Highlighted text with search matches emphasized',
    example: 'بِسْمِ <mark>اللَّهِ</mark> الرَّحْمَٰنِ الرَّحِيمِ',
  })
  highlighted?: string;
}

export class QuranSearchResponseDto {
  @ApiProperty({
    description: 'Array of search results',
    type: [QuranSearchResultDto],
  })
  results: QuranSearchResultDto[];

  @ApiProperty({
    description: 'Total number of matches found',
    example: 42,
  })
  total: number;

  @ApiProperty({
    description: 'Number of results in this response',
    example: 20,
  })
  count: number;

  @ApiProperty({
    description: 'Current offset',
    example: 0,
  })
  offset: number;

  @ApiProperty({
    description: 'Query that was searched',
    example: 'الله',
  })
  query: string;

  @ApiProperty({
    description: 'Language that was searched',
    example: 'ar',
  })
  language: string;

  @ApiProperty({
    description: 'Search execution time in milliseconds',
    example: 15,
  })
  execution_time_ms: number;
}

export class QuranReciterDto {
  @ApiProperty({
    description: 'Unique identifier for the reciter',
    example: 'abdul_basit_murattal',
  })
  id: string;

  @ApiProperty({
    description: 'Reciter name in Arabic',
    example: 'عبد الباسط عبد الصمد',
  })
  name_ar: string;

  @ApiProperty({
    description: 'Reciter name in English',
    example: 'Abdul Basit Abdul Samad',
  })
  name_en: string;

  @ApiProperty({
    description: 'Recitation style',
    example: 'Murattal',
  })
  style: string;

  @ApiProperty({
    description: 'Base URL template for audio files',
    example: 'https://audio.quranapi.com/abdul_basit_murattal/{surah:03d}.mp3',
  })
  audio_url_template: string;

  @ApiProperty({
    description: 'Audio format',
    example: 'mp3',
  })
  format: string;

  @ApiProperty({
    description: 'Audio quality description',
    example: '128kbps',
  })
  quality: string;
}

export class QuranRecitersResponseDto {
  @ApiProperty({
    description: 'Array of available reciters',
    type: [QuranReciterDto],
  })
  reciters: QuranReciterDto[];

  @ApiProperty({
    description: 'Total number of reciters available',
    example: 15,
  })
  total: number;
}

export class QuranSurahMetadataDto {
  @ApiProperty({
    description: 'Surah number',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Surah name (in requested language)',
    example: 'الفاتحة',
  })
  name: string;

  @ApiPropertyOptional({
    description: 'Surah name transliteration (only for Arabic)',
    example: 'Al-Fatihah',
  })
  transliteration?: string;

  @ApiProperty({
    description: 'Surah name translation',
    example: 'The Opening',
  })
  translation: string;

  @ApiProperty({
    description: 'Revelation type (makkiyyah or madaniyyah)',
    example: 'makkiyyah',
  })
  type: string;

  @ApiProperty({
    description: 'Total number of ayahs in this surah',
    example: 7,
  })
  ayah_count: number;
}

export class QuranSurahsListResponseDto {
  @ApiProperty({
    description: 'Array of surahs with metadata only (no ayahs)',
    type: [QuranSurahMetadataDto],
  })
  surahs: QuranSurahMetadataDto[];

  @ApiProperty({
    description: 'Total number of surahs (always 114)',
    example: 114,
  })
  total: number;

  @ApiProperty({
    description: 'Language of the surah names',
    example: 'ar',
  })
  language: string;
}