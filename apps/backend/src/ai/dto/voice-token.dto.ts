import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum VoiceLanguage {
  ARABIC = 'ar',
  ENGLISH = 'en',
  URDU = 'ur',
  INDONESIAN = 'id',
  FRENCH = 'fr',
  TURKISH = 'tr',
  PERSIAN = 'fa',
  SPANISH = 'es',
  BENGALI = 'bn',
  MALAY = 'ms',
}

export enum VoiceGender {
  MALE = 'male',
  FEMALE = 'female',
  NEUTRAL = 'neutral',
}

export class CreateVoiceTokenDto {
  @ApiProperty({
    description: 'Preferred language for voice interactions',
    enum: VoiceLanguage,
    example: VoiceLanguage.ARABIC,
  })
  @IsEnum(VoiceLanguage)
  language: VoiceLanguage;

  @ApiProperty({
    description: 'Preferred voice gender',
    enum: VoiceGender,
    example: VoiceGender.MALE,
  })
  @IsEnum(VoiceGender)
  gender: VoiceGender;

  @ApiProperty({
    description: 'Optional session identifier for tracking',
    required: false,
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}

export class VoiceTokenResponseDto {
  @ApiProperty({
    description: 'JWT token for voice API access',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  token: string;

  @ApiProperty({
    description: 'Token expiration timestamp (Unix epoch seconds)',
    example: 1703080800,
  })
  expiresAt: number;

  @ApiProperty({
    description: 'Time to live in seconds',
    example: 60,
  })
  ttl: number;

  @ApiProperty({
    description: 'Scope claims granted to this token',
    example: ['realtime.voice'],
  })
  scope: string[];

  @ApiProperty({
    description: 'Language configured for this token',
    enum: VoiceLanguage,
    example: VoiceLanguage.ARABIC,
  })
  language: VoiceLanguage;

  @ApiProperty({
    description: 'Voice gender configured for this token',
    enum: VoiceGender,
    example: VoiceGender.MALE,
  })
  gender: VoiceGender;
}

export class VoiceTokenErrorDto {
  @ApiProperty({
    description: 'Error message',
    example: 'Rate limit exceeded',
  })
  error: string;

  @ApiProperty({
    description: 'Error code for client handling',
    example: 'RATE_LIMIT_EXCEEDED',
  })
  code: string;

  @ApiProperty({
    description: 'Retry after timestamp (Unix epoch seconds) for rate limit errors',
    required: false,
  })
  retryAfter?: number;
}