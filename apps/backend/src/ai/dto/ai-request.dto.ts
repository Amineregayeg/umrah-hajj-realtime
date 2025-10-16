import { IsString, IsEnum, IsOptional, IsArray, IsObject, IsNumber, Min, Max } from 'class-validator';

export enum AIServiceType {
  CHAT = 'CHAT',
  CONTENT_GENERATION = 'CONTENT_GENERATION',
  TRANSLATION = 'TRANSLATION',
  RECOMMENDATION = 'RECOMMENDATION',
  PRAYER_GUIDANCE = 'PRAYER_GUIDANCE',
  RITUAL_ASSISTANT = 'RITUAL_ASSISTANT',
}

export enum AIProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  AZURE = 'AZURE',
}

export class AIChatRequestDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;

  @IsOptional()
  @IsEnum(AIProvider)
  provider?: AIProvider;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsObject()
  context?: Record<string, any>;
}

export class AIContentGenerationRequestDto {
  @IsString()
  prompt: string;

  @IsEnum(AIServiceType)
  type: AIServiceType;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(4000)
  maxTokens?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;
}

export class AITranslationRequestDto {
  @IsString()
  text: string;

  @IsString()
  targetLanguage: string;

  @IsOptional()
  @IsString()
  sourceLanguage?: string;

  @IsOptional()
  @IsString()
  context?: string;
}

export class AIRecommendationRequestDto {
  @IsEnum(AIServiceType)
  type: AIServiceType;

  @IsOptional()
  @IsObject()
  userPreferences?: Record<string, any>;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number;
}