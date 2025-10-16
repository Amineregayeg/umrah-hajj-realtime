import { IsString, IsOptional, ValidateNested, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AccessibilityDto {
  @IsOptional()
  @IsString()
  mobility?: string;
}

export class StateSetDto {
  @IsString()
  @IsIn(['guide', 'respond', 'mute'])
  mode: 'guide' | 'respond' | 'mute';

  @IsString()
  @IsIn(['hanafi', 'maliki', 'shafii', 'hanbali'])
  madhhab: 'hanafi' | 'maliki' | 'shafii' | 'hanbali';

  @IsString()
  lang: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => AccessibilityDto)
  accessibility?: AccessibilityDto;
}