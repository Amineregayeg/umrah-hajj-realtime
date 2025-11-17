import { Injectable, Logger } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import type {
  UmrahKnowledgeBase,
  HaramGatesData,
  HaramZonesData,
  MadhhabRulingsData,
  RitualStepsData,
  SafetyRulesData,
  DuasByLocationData,
} from './umrah-knowledge.types';

/**
 * Umrah Knowledge Base Service
 * Loads and validates all KB JSON files at startup
 * Provides typed access to Umrah/Haram knowledge
 */
@Injectable()
export class UmrahKnowledgeService {
  private readonly logger = new Logger(UmrahKnowledgeService.name);
  private kb: UmrahKnowledgeBase;
  private readonly kbPath = join(__dirname, '..', 'data', 'knowledge');

  constructor() {
    this.logger.log('Loading Umrah Knowledge Base...');
    this.kb = this.loadKnowledgeBase();
    this.validateKnowledgeBase();
    this.logger.log('✓ Knowledge Base loaded and validated successfully');
  }

  /**
   * Load all KB JSON files from disk
   */
  private loadKnowledgeBase(): UmrahKnowledgeBase {
    try {
      const gates = this.loadJSON<HaramGatesData>('haram_gates.json');
      const zones = this.loadJSON<HaramZonesData>('haram_zones.json');
      const madhhabRulings = this.loadJSON<MadhhabRulingsData>(
        'madhhab_rulings.json',
      );
      const ritualSteps = this.loadJSON<RitualStepsData>('ritual_steps.json');
      const safetyRules = this.loadJSON<SafetyRulesData>('safety_rules.json');
      const duas = this.loadJSON<DuasByLocationData>('duas_by_location.json');

      return {
        gates,
        zones,
        madhhabRulings,
        ritualSteps,
        safetyRules,
        duas,
      };
    } catch (error) {
      this.logger.error('Failed to load Knowledge Base', error);
      throw new Error(
        `Knowledge Base loading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Load and parse a single JSON file
   */
  private loadJSON<T>(filename: string): T {
    const filePath = join(this.kbPath, filename);
    try {
      const content = readFileSync(filePath, 'utf-8');
      return JSON.parse(content) as T;
    } catch (error) {
      this.logger.error(`Failed to load ${filename}`, error);
      throw new Error(
        `Failed to load ${filename}: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  /**
   * Validate KB structure and content
   * Throws if critical validation fails
   */
  private validateKnowledgeBase(): void {
    const errors: string[] = [];

    // Validate Gates
    if (!this.kb.gates.gates || this.kb.gates.gates.length === 0) {
      errors.push('Gates: No gates found');
    }
    if (!this.kb.gates.gates.every((g) => g.id && g.name?.en)) {
      errors.push('Gates: Missing id or name.en');
    }
    if (
      !this.kb.gates.gates.every((g) => g.accessibility !== undefined)
    ) {
      errors.push('Gates: Missing accessibility field');
    }

    // Validate Zones
    if (!this.kb.zones.zones || this.kb.zones.zones.length === 0) {
      errors.push('Zones: No zones found');
    }
    const requiredZones = ['mataf', 'safa', 'marwah', 'masa'];
    const zoneIds = this.kb.zones.zones.map((z) => z.id);
    const missingZones = requiredZones.filter((id) => !zoneIds.includes(id));
    if (missingZones.length > 0) {
      errors.push(`Zones: Missing critical zones: ${missingZones.join(', ')}`);
    }

    // Validate Madhhab Rulings
    if (
      !this.kb.madhhabRulings.topics ||
      this.kb.madhhabRulings.topics.length === 0
    ) {
      errors.push('Madhhab Rulings: No topics found');
    }
    const criticalTopics = ['wudu_for_tawaf', 'menstruation_tawaf'];
    const topicIds = this.kb.madhhabRulings.topics.map((t) => t.id);
    const missingTopics = criticalTopics.filter((id) => !topicIds.includes(id));
    if (missingTopics.length > 0) {
      errors.push(
        `Madhhab Rulings: Missing critical topics: ${missingTopics.join(', ')}`,
      );
    }
    if (
      !this.kb.madhhabRulings.topics.every(
        (t) => t.rulings && (t.rulings.hanafi || t.rulings.maliki || t.rulings.shafii || t.rulings.hanbali),
      )
    ) {
      errors.push('Madhhab Rulings: Some topics have no madhhab rulings');
    }

    // Validate Ritual Steps
    if (
      !this.kb.ritualSteps.umrah?.steps ||
      this.kb.ritualSteps.umrah.steps.length === 0
    ) {
      errors.push('Ritual Steps: No Umrah steps found');
    }
    const requiredSteps = ['ihram', 'tawaf', 'sai', 'halq_taqsir'];
    const stepIds = this.kb.ritualSteps.umrah.steps.map((s) => s.id);
    const missingSteps = requiredSteps.filter((id) => !stepIds.includes(id));
    if (missingSteps.length > 0) {
      errors.push(
        `Ritual Steps: Missing critical steps: ${missingSteps.join(', ')}`,
      );
    }

    // Validate Safety Rules
    const safetyCategories = [
      'general',
      'heat',
      'accessibility',
      'health',
      'ihram',
      'emergency',
      'women',
    ];
    for (const cat of safetyCategories) {
      if (!Array.isArray(this.kb.safetyRules[cat])) {
        errors.push(`Safety Rules: Missing category: ${cat}`);
      }
    }
    if (!this.kb.safetyRules.general?.every((r) => r.id && r.severity)) {
      errors.push('Safety Rules: Some rules missing id or severity');
    }

    // Validate Duas
    if (!this.kb.duas.locations || this.kb.duas.locations.length === 0) {
      errors.push('Duas: No locations found');
    }
    const requiredDuaLocations = [
      'ihram_entry',
      'black_stone_istilam',
      'safa_arrival',
    ];
    const duaLocationIds = this.kb.duas.locations.map((l) => l.id);
    const missingDuaLocations = requiredDuaLocations.filter(
      (id) => !duaLocationIds.includes(id),
    );
    if (missingDuaLocations.length > 0) {
      errors.push(
        `Duas: Missing critical locations: ${missingDuaLocations.join(', ')}`,
      );
    }

    // If any errors, throw
    if (errors.length > 0) {
      const errorMsg = 'Knowledge Base validation failed:\n' + errors.join('\n');
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Log success stats
    this.logger.log(`Validated ${this.kb.gates.gates.length} gates`);
    this.logger.log(`Validated ${this.kb.zones.zones.length} zones`);
    this.logger.log(
      `Validated ${this.kb.madhhabRulings.topics.length} madhhab topics`,
    );
    this.logger.log(
      `Validated ${this.kb.ritualSteps.umrah.steps.length} Umrah steps`,
    );
    this.logger.log(
      `Validated ${this.kb.safetyRules.general.length} general safety rules`,
    );
    this.logger.log(`Validated ${this.kb.duas.locations.length} dua locations`);
  }

  // ============================================================================
  // Public Getters
  // ============================================================================

  getGates(): HaramGatesData {
    return this.kb.gates;
  }

  getGateById(id: string) {
    return this.kb.gates.gates.find((g) => g.id === id);
  }

  getGateByNumber(num: number | string) {
    return this.kb.gates.gates.find((g) => g.number === num);
  }

  getZones(): HaramZonesData {
    return this.kb.zones;
  }

  getZoneById(id: string) {
    return this.kb.zones.zones.find((z) => z.id === id);
  }

  getMadhhabRulings(): MadhhabRulingsData {
    return this.kb.madhhabRulings;
  }

  getMadhhabRulingById(id: string) {
    return this.kb.madhhabRulings.topics.find((t) => t.id === id);
  }

  getRitualSteps(): RitualStepsData {
    return this.kb.ritualSteps;
  }

  getUmrahStepById(id: string) {
    return this.kb.ritualSteps.umrah.steps.find((s) => s.id === id);
  }

  getSafetyRules(): SafetyRulesData {
    return this.kb.safetyRules;
  }

  getSafetyRulesByCategory(category: keyof SafetyRulesData) {
    return this.kb.safetyRules[category];
  }

  getDuas(): DuasByLocationData {
    return this.kb.duas;
  }

  getDuasByLocationId(id: string) {
    return this.kb.duas.locations.find((l) => l.id === id);
  }

  /**
   * Get full KB for advanced queries
   */
  getKnowledgeBase(): UmrahKnowledgeBase {
    return this.kb;
  }
}
