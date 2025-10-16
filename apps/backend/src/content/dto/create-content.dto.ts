import { IsString, IsEnum, IsOptional, IsArray, IsUrl, IsBoolean } from 'class-validator';

export enum ContentType {
  GUIDE = 'GUIDE',
  AUDIO = 'AUDIO', 
  VIDEO = 'VIDEO',
  ARTICLE = 'ARTICLE',
  CHECKLIST = 'CHECKLIST',
  PRAYER_TIME = 'PRAYER_TIME',
  LOCATION_INFO = 'LOCATION_INFO',
}

export enum ContentCategory {
  UMRAH = 'UMRAH',
  HAJJ = 'HAJJ',
  PRAYER = 'PRAYER',
  GENERAL = 'GENERAL',
  SAFETY = 'SAFETY',
  HEALTH = 'HEALTH',
  CULTURAL = 'CULTURAL',
}

export class CreateContentDto {
  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsEnum(ContentType)
  type: ContentType;

  @IsEnum(ContentCategory)
  category: ContentCategory;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsUrl()
  mediaUrl?: string;

  @IsOptional()
  @IsString()
  language?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @IsString()
  authorId?: string;
}