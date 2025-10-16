export interface User {
  id: string;
  supabaseId: string;
  email: string;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface UserSession {
  userId: string;
  sessionId: string;
  deviceInfo?: DeviceInfo;
  location?: Location;
  createdAt: Date;
  expiresAt: Date;
  isActive: boolean;
}

export interface DeviceInfo {
  type: DeviceType;
  platform: string;
  browser?: string;
  version?: string;
  userAgent?: string;
  ipAddress?: string;
}

export enum DeviceType {
  MOBILE = 'MOBILE',
  TABLET = 'TABLET',
  DESKTOP = 'DESKTOP',
  UNKNOWN = 'UNKNOWN',
}

export interface UserPreferences {
  userId: string;
  language: string;
  timezone: string;
  theme: 'light' | 'dark' | 'auto';
  notifications: NotificationPreferences;
  privacy: PrivacyPreferences;
  accessibility: AccessibilityPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  prayerReminders: boolean;
  contentUpdates: boolean;
  emergencyAlerts: boolean;
}

export interface PrivacyPreferences {
  shareLocation: boolean;
  shareProgress: boolean;
  allowAnalytics: boolean;
  allowPersonalization: boolean;
}

export interface AccessibilityPreferences {
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  highContrast: boolean;
  screenReader: boolean;
  reducedMotion: boolean;
  audioDescriptions: boolean;
}

import { Location } from './location.interface';