import { ConsentType } from './create-consent.dto';

export class ConsentResponseDto {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  purpose?: string;
  legalBasis?: string;
  grantedAt?: Date;
  revokedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class ConsentSummaryDto {
  userId: string;
  consents: ConsentResponseDto[];
  lastUpdated: Date;
}