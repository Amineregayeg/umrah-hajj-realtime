/**
 * TypeScript type definitions for Umrah Knowledge Base
 * Generated for KB validation and type safety
 * @module umrah/knowledge
 */

// ============================================================================
// Common Types
// ============================================================================

export interface MultilingualText {
  en: string;
  ar: string;
  fr: string;
}

export interface Coordinates {
  lat: number | null;
  lng: number | null;
}

export interface Metadata {
  version: string;
  lastUpdated: string;
  source?: string;
  notes?: string;
  totalRules?: number;
  categories?: string[];
  severityLevels?: string[];
}

// ============================================================================
// Haram Gates
// ============================================================================

export interface GateAccessibility {
  wheelchair: boolean;
  elevator: boolean;
  ramp: boolean;
}

export interface HaramGate {
  id: string;
  name: MultilingualText;
  number: number | string;
  coordinates: Coordinates;
  type: 'main' | 'side' | 'wheelchair';
  side?: string;
  accessibility: GateAccessibility;
  crowdLevel: 'low' | 'medium' | 'high' | 'very_high';
  status: 'open' | 'closed' | 'restricted';
  nearestZones: string[];
  nearbyLandmarks?: string[];
  operatingHours?: string;
  description: MultilingualText;
}

export interface HaramGatesData {
  gates: HaramGate[];
  metadata: Metadata;
}

// ============================================================================
// Haram Zones
// ============================================================================

export interface ZoneLevel {
  level: string;
  description: string;
  accessibility: string;
  crowdLevel: string;
  notes?: string;
  wheelchairAccess?: boolean;
}

export interface Dua {
  context?: string;
  arabic: string;
  transliteration: string;
  translation: string | MultilingualText;
  source?: string;
}

export interface HaramZone {
  id: string;
  name: MultilingualText;
  description: MultilingualText;
  type: 'ritual_area' | 'ritual_point' | 'ritual_corridor' | 'sacred_landmark' | 'prayer_location';
  levels?: ZoneLevel[] | string[];
  coordinates?: Coordinates;
  nearestGates?: string[];
  capacity?: string;
  safetyNotes: string[];
  duas?: Dua[];
  distance?: string;
  totalDistance?: string;
  floors?: number;
  greenLights?: {
    description: string;
    distance: string;
    applicableTo: string;
  };
  location?: string;
  ritualAction?: string;
  madhhabGuidance?: Record<string, string>;
}

export interface FloorLevel {
  level: string;
  description: MultilingualText;
  accessibility: string;
  crowdLevel: string;
  notes?: string;
  wheelchairAccess?: boolean;
}

export interface HaramZonesData {
  zones: HaramZone[];
  floorLevels: FloorLevel[];
  metadata: Metadata;
}

// ============================================================================
// Madhhab Rulings
// ============================================================================

export interface MadhhabRulingEntry {
  ruling: string;
  evidence?: string;
  practicalGuidance?: string;
  penalty?: string;
}

export interface MadhhabRulingsTopic {
  id: string;
  question: string;
  category: 'tawaf' | 'sai' | 'ihram' | 'general';
  genderSpecific?: 'male' | 'female';
  rulings: {
    hanafi?: MadhhabRulingEntry;
    maliki?: MadhhabRulingEntry;
    shafii?: MadhhabRulingEntry;
    hanbali?: MadhhabRulingEntry;
  };
  ibn_taymiyah_view?: {
    ruling: string;
    notes?: string;
  };
  summary?: string;
  safetyNote?: string;
  madhhabDifferences?: Record<string, string>;
}

export interface MadhhabRulingsData {
  topics: MadhhabRulingsTopic[];
  glossary?: Record<string, MultilingualText>;
  metadata: Metadata;
}

// ============================================================================
// Ritual Steps
// ============================================================================

export interface RitualSubstep {
  step: number;
  action: string;
  details?: string;
  dua?: Dua;
}

export interface MiqatPoint {
  name: string;
  description: string;
  applicableTo: string;
}

export interface RitualStep {
  id: string;
  order: number;
  title: MultilingualText;
  description: MultilingualText;
  type?: 'pillar' | 'wajib' | 'sunnah';
  genderSpecific?: {
    male?: string;
    female?: string;
  };
  madhhabDifferences?: Record<string, string>;
  duas?: Dua[];
  safetyNotes?: string[];
  prohibitions?: string[];
  miqatPoints?: Record<string, MiqatPoint>;
  stepByStep?: RitualSubstep[];
  crowdManagement?: Record<string, string>;
  floorRecommendation?: string;
  distance?: string;
  duration?: string;
}

export interface RitualStepsData {
  umrah: {
    steps: RitualStep[];
  };
  hajj?: {
    steps: RitualStep[];
  };
  metadata: Metadata;
}

// ============================================================================
// Safety Rules
// ============================================================================

export interface SafetyRule {
  id: string;
  description: MultilingualText | string;
  contexts: string[];
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  genderSpecific?: {
    male?: string;
    female?: string;
  };
  madhhabDifferences?: Record<string, string>;
}

export interface SafetyRulesData {
  general: SafetyRule[];
  heat: SafetyRule[];
  accessibility: SafetyRule[];
  health: SafetyRule[];
  ihram: SafetyRule[];
  emergency: SafetyRule[];
  women: SafetyRule[];
  metadata: Metadata;
}

// ============================================================================
// Duas by Location
// ============================================================================

export interface DuaEntry {
  arabic: string;
  transliteration: string;
  translation: MultilingualText | string;
  type?: string;
  source?: string;
  notes?: string;
  location?: string;
}

export interface LocationDuas {
  id: string;
  name: MultilingualText;
  context: string;
  duas: DuaEntry[];
  recommended_surahs?: {
    first_rakah?: string;
    second_rakah?: string;
    notes?: string;
  };
}

export interface DuasByLocationData {
  locations: LocationDuas[];
  general_guidance?: Record<string, MultilingualText | string>;
  metadata: Metadata;
}

// ============================================================================
// Knowledge Base Container
// ============================================================================

export interface UmrahKnowledgeBase {
  gates: HaramGatesData;
  zones: HaramZonesData;
  madhhabRulings: MadhhabRulingsData;
  ritualSteps: RitualStepsData;
  safetyRules: SafetyRulesData;
  duas: DuasByLocationData;
}
