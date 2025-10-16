import { IsEnum, IsNumber, IsOptional, IsString, Min, Max, IsNotEmpty } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum QuranLanguage {
  ARABIC = 'ar',
  ENGLISH = 'en',
  FRENCH = 'fr',
}

export class QuranSurahRequestDto {
  @ApiProperty({
    description: 'Surah ID (1-114)',
    minimum: 1,
    maximum: 114,
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(114)
  id: number;

  @ApiPropertyOptional({
    description: 'Language for the response',
    enum: QuranLanguage,
    default: QuranLanguage.ARABIC,
    example: 'ar',
  })
  @IsOptional()
  @IsEnum(QuranLanguage)
  lang?: QuranLanguage = QuranLanguage.ARABIC;
}

export class QuranAyahRequestDto {
  @ApiProperty({
    description: 'Surah number (1-114)',
    minimum: 1,
    maximum: 114,
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(114)
  surah: number;

  @ApiProperty({
    description: 'Ayah number within the surah',
    minimum: 1,
    example: 1,
  })
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  ayah: number;

  @ApiPropertyOptional({
    description: 'Language for the response',
    enum: QuranLanguage,
    default: QuranLanguage.ARABIC,
    example: 'ar',
  })
  @IsOptional()
  @IsEnum(QuranLanguage)
  lang?: QuranLanguage = QuranLanguage.ARABIC;
}

export class QuranSearchRequestDto {
  @ApiProperty({
    description: 'Search query term',
    minLength: 2,
    maxLength: 100,
    example: 'الله',
  })
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => value?.trim())
  q: string;

  @ApiPropertyOptional({
    description: 'Language to search in',
    enum: QuranLanguage,
    default: QuranLanguage.ARABIC,
    example: 'ar',
  })
  @IsOptional()
  @IsEnum(QuranLanguage)
  lang?: QuranLanguage = QuranLanguage.ARABIC;

  @ApiPropertyOptional({
    description: 'Maximum number of results to return',
    minimum: 1,
    maximum: 100,
    default: 20,
    example: 20,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @ApiPropertyOptional({
    description: 'Offset for pagination',
    minimum: 0,
    default: 0,
    example: 0,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  offset?: number = 0;
}