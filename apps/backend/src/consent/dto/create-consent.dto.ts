import { IsString, IsBoolean, IsEnum, IsOptional } from 'class-validator';

export enum ConsentType {
  DATA_PROCESSING = 'DATA_PROCESSING',
  MARKETING_COMMUNICATIONS = 'MARKETING_COMMUNICATIONS', 
  LOCATION_TRACKING = 'LOCATION_TRACKING',
  ANALYTICS = 'ANALYTICS',
  THIRD_PARTY_SHARING = 'THIRD_PARTY_SHARING',
}

export class CreateConsentDto {
  @IsEnum(ConsentType)
  consentType: ConsentType;

  @IsBoolean()
  granted: boolean;

  @IsOptional()
  @IsString()
  purpose?: string;

  @IsOptional()
  @IsString()
  legalBasis?: string;
}