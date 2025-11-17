import { Injectable, Logger } from '@nestjs/common';
import { UmrahKnowledgeService } from '../umrah/knowledge/umrah-knowledge.service';
import type {
  RealtimeTool,
  GetRitualStepInfoParams,
  GetMadhhabGuidanceParams,
  GetGateInfoParams,
  GetSafetyRulesParams,
  GetDuasParams,
  GetBestRouteParams,
} from './realtime.types';

/**
 * Realtime Tools - KB-powered function calling for GPT-Realtime
 * All tools integrate with UmrahKnowledgeService
 */

@Injectable()
export class RealtimeToolsService {
  private readonly logger = new Logger(RealtimeToolsService.name);

  constructor(private readonly knowledgeService: UmrahKnowledgeService) {}

  /**
   * Get all tool definitions for OpenAI Realtime API
   */
  getToolDefinitions(): RealtimeTool[] {
    return [
      this.getRitualStepInfoTool(),
      this.getMadhhabGuidanceTool(),
      this.getGateInfoTool(),
      this.getSafetyRulesTool(),
      this.getDuasTool(),
      this.getBestRouteTool(),
    ];
  }

  /**
   * Execute a tool function by name
   */
  async executeTool(name: string, args: any): Promise<any> {
    this.logger.debug(`Executing tool: ${name} with args:`, args);

    try {
      switch (name) {
        case 'get_ritual_step_info':
          return this.getRitualStepInfo(args as GetRitualStepInfoParams);
        case 'get_madhhab_guidance':
          return this.getMadhhabGuidance(args as GetMadhhabGuidanceParams);
        case 'get_gate_info':
          return this.getGateInfo(args as GetGateInfoParams);
        case 'get_safety_rules':
          return this.getSafetyRules(args as GetSafetyRulesParams);
        case 'get_duas':
          return this.getDuas(args as GetDuasParams);
        case 'get_best_route':
          return this.getBestRoute(args as GetBestRouteParams);
        default:
          throw new Error(`Unknown tool: ${name}`);
      }
    } catch (error) {
      this.logger.error(`Tool execution error for ${name}:`, error);
      throw error;
    }
  }

  // ============================================================================
  // Tool Definitions
  // ============================================================================

  private getRitualStepInfoTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_ritual_step_info',
      description:
        'Get detailed step-by-step guidance for a specific Umrah ritual step. Returns substeps, duas, gender-specific guidance, madhhab differences, and safety notes.',
      parameters: {
        type: 'object',
        properties: {
          step_id: {
            type: 'string',
            enum: [
              'ihram',
              'entering_haram',
              'tawaf',
              'tawaf_prayer',
              'zamzam',
              'sai',
              'halq_taqsir',
            ],
            description: 'The ritual step to get information about',
          },
        },
        required: ['step_id'],
      },
    };
  }

  private getMadhhabGuidanceTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_madhhab_guidance',
      description:
        'Get madhhab-specific fiqh ruling for a topic. Returns ruling, evidence, practical guidance, and penalty if applicable. Use when user asks about madhhab differences or specific school rulings.',
      parameters: {
        type: 'object',
        properties: {
          topic_id: {
            type: 'string',
            description:
              'Topic ID (e.g., "wudu_for_tawaf", "menstruation_tawaf", "raml_in_tawaf")',
          },
          madhhab: {
            type: 'string',
            enum: ['hanafi', 'maliki', 'shafii', 'hanbali'],
            description: 'The madhhab to get ruling for',
          },
        },
        required: ['topic_id', 'madhhab'],
      },
    };
  }

  private getGateInfoTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_gate_info',
      description:
        'Get information about a specific Haram gate. Returns accessibility info, crowd level, nearest zones, operating hours. Use for navigation and accessibility questions.',
      parameters: {
        type: 'object',
        properties: {
          gate_number: {
            type: ['number', 'string'],
            description: 'Gate number (e.g., 79 for King Fahd Gate, 100 for King Abdullah Gate)',
          },
        },
        required: ['gate_number'],
      },
    };
  }

  private getSafetyRulesTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_safety_rules',
      description:
        'Get safety rules for a specific context. Returns rules with severity levels, descriptions, and contexts. Use when user asks about safety, crowds, heat, accessibility, or emergency situations.',
      parameters: {
        type: 'object',
        properties: {
          context: {
            type: 'string',
            enum: [
              'general',
              'tawaf',
              'sai',
              'ihram',
              'accessibility',
              'heat',
              'emergency',
              'women',
            ],
            description: 'The context to get safety rules for',
          },
        },
        required: ['context'],
      },
    };
  }

  private getDuasTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_duas',
      description:
        'Get authentic duas for a specific location or moment. Returns Arabic, transliteration, and translation. Use when user asks "what should I say?" or "which dua?"',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description:
              'Location ID (e.g., "entering_haram", "black_stone_istilam", "safa_arrival", "during_tawaf", "zamzam_drinking")',
          },
        },
        required: ['location'],
      },
    };
  }

  private getBestRouteTool(): RealtimeTool {
    return {
      type: 'function',
      name: 'get_best_route',
      description:
        'Get routing guidance from one zone to another with accessibility considerations. Returns recommended gates, floor levels, and crowd avoidance strategies.',
      parameters: {
        type: 'object',
        properties: {
          from_zone: {
            type: 'string',
            description: 'Starting zone (e.g., "mataf", "safa", "marwah")',
          },
          to_zone: {
            type: 'string',
            description: 'Destination zone',
          },
          accessibility_needs: {
            type: 'string',
            enum: ['none', 'wheelchair', 'elderly'],
            description: 'Accessibility requirements',
          },
        },
        required: ['from_zone', 'to_zone'],
      },
    };
  }

  // ============================================================================
  // Tool Implementations
  // ============================================================================

  private getRitualStepInfo(params: GetRitualStepInfoParams): any {
    const step = this.knowledgeService.getUmrahStepById(params.step_id);

    if (!step) {
      return {
        error: `Step "${params.step_id}" not found`,
        available_steps: [
          'ihram',
          'entering_haram',
          'tawaf',
          'tawaf_prayer',
          'zamzam',
          'sai',
          'halq_taqsir',
        ],
      };
    }

    // Return concise, voice-friendly format
    return {
      step_id: step.id,
      title: step.title.en,
      description: step.description.en,
      type: step.type,
      substeps: step.stepByStep?.map((s) => ({
        step: s.step,
        action: s.action,
        details: s.details,
        dua: s.dua
          ? {
              arabic: s.dua.arabic,
              transliteration: s.dua.transliteration,
              translation: s.dua.translation,
            }
          : undefined,
      })),
      gender_specific: step.genderSpecific,
      madhhab_differences: step.madhhabDifferences,
      safety_notes: step.safetyNotes,
      duas: step.duas?.slice(0, 3).map((d) => ({
        // Limit to first 3 for voice
        context: d.context,
        arabic: d.arabic,
        transliteration: d.transliteration,
        translation:
          typeof d.translation === 'string'
            ? d.translation
            : d.translation.en,
      })),
    };
  }

  private getMadhhabGuidance(params: GetMadhhabGuidanceParams): any {
    const topic = this.knowledgeService.getMadhhabRulingById(params.topic_id);

    if (!topic) {
      return {
        error: `Topic "${params.topic_id}" not found`,
        suggestion: 'Try: wudu_for_tawaf, menstruation_tawaf, raml_in_tawaf',
      };
    }

    const madhhabRuling = topic.rulings[params.madhhab];
    if (!madhhabRuling) {
      return {
        error: `No ruling found for ${params.madhhab} madhhab on topic "${params.topic_id}"`,
        available_madhahib: Object.keys(topic.rulings),
      };
    }

    return {
      topic_id: topic.id,
      question: topic.question,
      madhhab: params.madhhab,
      ruling: madhhabRuling.ruling,
      evidence: madhhabRuling.evidence,
      practical_guidance: madhhabRuling.practicalGuidance,
      penalty: madhhabRuling.penalty,
      summary: topic.summary,
      safety_note: topic.safetyNote,
      other_views: {
        hanafi: topic.rulings.hanafi?.ruling,
        maliki: topic.rulings.maliki?.ruling,
        shafii: topic.rulings.shafii?.ruling,
        hanbali: topic.rulings.hanbali?.ruling,
      },
    };
  }

  private getGateInfo(params: GetGateInfoParams): any {
    const gate = this.knowledgeService.getGateByNumber(params.gate_number);

    if (!gate) {
      return {
        error: `Gate ${params.gate_number} not found`,
        suggestion: 'Try: 79 (King Fahd), 100 (King Abdullah), 12 (Bab Safa)',
      };
    }

    return {
      gate_number: gate.number,
      name: gate.name.en,
      arabic_name: gate.name.ar,
      type: gate.type,
      accessibility: {
        wheelchair: gate.accessibility.wheelchair,
        elevator: gate.accessibility.elevator,
        ramp: gate.accessibility.ramp,
      },
      crowd_level: gate.crowdLevel,
      status: gate.status,
      nearest_zones: gate.nearestZones,
      nearby_landmarks: gate.nearbyLandmarks,
      operating_hours: gate.operatingHours,
      description: gate.description.en,
    };
  }

  private getSafetyRules(params: GetSafetyRulesParams): any {
    const category = params.context === 'tawaf' || params.context === 'sai'
      ? 'general' // Map ritual contexts to general
      : params.context;

    const rules = this.knowledgeService.getSafetyRulesByCategory(
      category as any,
    );

    // Check if rules is an array (not metadata)
    if (!Array.isArray(rules) || rules.length === 0) {
      return {
        error: `No safety rules found for context "${params.context}"`,
      };
    }

    // Filter rules relevant to the specific ritual context
    let filteredRules = rules;
    if (params.context === 'tawaf' || params.context === 'sai') {
      filteredRules = rules.filter(
        (r) =>
          r.contexts?.includes(params.context) ||
          r.contexts?.includes('all'),
      );
    }

    // Return top 5 most critical rules for voice
    return {
      context: params.context,
      rules: filteredRules
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        })
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          description:
            typeof r.description === 'string'
              ? r.description
              : r.description.en,
          severity: r.severity,
          gender_specific: r.genderSpecific,
        })),
      total_rules: filteredRules.length,
    };
  }

  private getDuas(params: GetDuasParams): any {
    const location = this.knowledgeService.getDuasByLocationId(params.location);

    if (!location) {
      return {
        error: `No duas found for location "${params.location}"`,
        suggestion:
          'Try: entering_haram, black_stone_istilam, safa_arrival, during_tawaf',
      };
    }

    return {
      location_id: location.id,
      location_name: location.name.en,
      context: location.context,
      duas: location.duas.map((d) => ({
        arabic: d.arabic,
        transliteration: d.transliteration,
        translation:
          typeof d.translation === 'string'
            ? d.translation
            : d.translation.en,
        type: d.type,
        source: d.source,
        notes: d.notes,
      })),
    };
  }

  private getBestRoute(params: GetBestRouteParams): any {
    // TODO: Implement graph-based routing when navigation graph is available
    // For now, provide general guidance based on zones and accessibility

    const fromZone = this.knowledgeService.getZoneById(params.from_zone);
    const toZone = this.knowledgeService.getZoneById(params.to_zone);

    if (!fromZone) {
      return {
        error: `Zone "${params.from_zone}" not found`,
      };
    }

    if (!toZone) {
      return {
        error: `Zone "${params.to_zone}" not found`,
      };
    }

    // Provide basic routing guidance
    const guidance: any = {
      from: fromZone.name.en,
      to: toZone.name.en,
      accessibility: params.accessibility_needs || 'none',
    };

    // Special cases
    if (params.from_zone === 'mataf' && params.to_zone === 'safa') {
      guidance.route = [
        'Exit Mataf area',
        'Head toward Bab al-Safa (Gate 12) - northern side',
        'Safa hill is at the start of Masa\'a corridor',
      ];
      if (params.accessibility_needs === 'wheelchair') {
        guidance.route.push(
          'Use elevators at Gate 12 for accessible access',
        );
      }
    } else if (params.from_zone === 'marwah' && params.to_zone === 'mataf') {
      guidance.route = [
        'Exit Masa\'a at Marwah (northern end)',
        'Use Bab Marwah gate',
        'Follow corridor back to Mataf area',
      ];
    } else {
      // Generic guidance
      guidance.route = [
        `Navigate from ${fromZone.name.en} to ${toZone.name.en}`,
        'Follow Haram signage',
        'Ask staff for specific directions',
      ];
    }

    if (params.accessibility_needs === 'wheelchair') {
      guidance.accessibility_notes = [
        'Use wheelchair-designated gates (68, 74, 79, 84, 89, 90, 93, 94)',
        'Upper floors have elevators and less crowding',
        'Ask Haram staff for wheelchair assistance if needed',
      ];
    }

    guidance.safety_tip =
      'Follow Haram staff instructions. Avoid peak hours if possible.';

    return guidance;
  }
}
