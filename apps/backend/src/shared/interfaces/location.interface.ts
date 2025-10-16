export interface Location {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy?: number;
}

export interface Address {
  street?: string;
  city: string;
  state?: string;
  country: string;
  postalCode?: string;
  formattedAddress?: string;
}

export interface LocationWithAddress extends Location {
  address?: Address;
}

export interface SacredLocation extends LocationWithAddress {
  id: string;
  name: string;
  nameAr?: string;
  type: SacredLocationType;
  description?: string;
  descriptionAr?: string;
  capacity?: number;
  operatingHours?: OperatingHours;
  accessibility?: AccessibilityInfo;
}

export enum SacredLocationType {
  MASJID_AL_HARAM = 'MASJID_AL_HARAM',
  KAABA = 'KAABA',
  SAFA_MARWA = 'SAFA_MARWA',
  MINA = 'MINA',
  ARAFAT = 'ARAFAT',
  MUZDALIFAH = 'MUZDALIFAH',
  JAMARAT = 'JAMARAT',
  MASJID_AN_NABAWI = 'MASJID_AN_NABAWI',
  HOTEL = 'HOTEL',
  TRANSPORT_HUB = 'TRANSPORT_HUB',
}

export interface OperatingHours {
  open24Hours?: boolean;
  schedule?: DaySchedule[];
  specialDays?: SpecialDaySchedule[];
}

export interface DaySchedule {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  openTime: string; // HH:mm format
  closeTime: string; // HH:mm format
  closed?: boolean;
}

export interface SpecialDaySchedule {
  date: string; // YYYY-MM-DD format
  openTime?: string;
  closeTime?: string;
  closed?: boolean;
  reason?: string;
}

export interface AccessibilityInfo {
  wheelchairAccessible?: boolean;
  elevatorAccess?: boolean;
  audioAssistance?: boolean;
  visualAssistance?: boolean;
  notes?: string;
}