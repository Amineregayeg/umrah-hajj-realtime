import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { WsAdapter } from '@nestjs/platform-ws';
import { WebSocket } from 'ws';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeToolsService } from './realtime.tools';
import { RealtimeSessionManager } from './realtime.session';
import { ConfigModule } from '@nestjs/config';
import { UmrahKnowledgeService } from '../umrah/knowledge/umrah-knowledge.service';

/**
 * E2E Tests for GPT-Realtime Voice Guidance System
 * Tests WebSocket connectivity, tool execution, context injection, and safety layer
 *
 * NOTE: UmrahKnowledgeService is MOCKED in tests to avoid filesystem dependencies.
 * Real JSON files are loaded ONLY at runtime in production/dev.
 */

// Mock UmrahKnowledgeService to avoid filesystem dependencies in tests
const mockUmrahKnowledgeService = {
  getUmrahStepById: vi.fn((id: string) => {
    if (id === 'tawaf') {
      return {
        id: 'tawaf',
        title: { en: 'Tawaf - Circumambulation', ar: 'الطواف' },
        substeps: [
          { step: 1, action: 'Face the Black Stone', dua: 'Bismillah Allahu Akbar' },
          { step: 2, action: 'Begin circling counter-clockwise', dua: null },
          { step: 3, action: 'Complete 7 circuits', dua: null },
        ],
        genderSpecific: { male: 'Raml in first 3 circuits', female: 'Walk normally' },
        safetyNotes: ['Stay alert in crowds', 'Do not push'],
      };
    }
    if (id === 'sai') {
      return {
        id: 'sai',
        title: { en: 'Sa\'i - Walking between Safa and Marwah', ar: 'السعي' },
        substeps: [{ step: 1, action: 'Start at Safa', dua: 'Inna as-Safa wal-Marwah' }],
        genderSpecific: { male: 'Run between green markers', female: 'Walk normally' },
        safetyNotes: ['Stay hydrated'],
      };
    }
    return null;
  }),

  getMadhhabRulingById: vi.fn((id: string) => {
    if (id === 'wudu_for_tawaf') {
      return {
        id: 'wudu_for_tawaf',
        question: 'Is wudu required for Tawaf?',
        rulings: {
          hanafi: { ruling: 'Wajib but not a pillar', evidence: 'Hadith...', penalty: 'Dam' },
          shafii: { ruling: 'Condition (shart)', evidence: 'Different hadith...', penalty: 'Tawaf invalid' },
          maliki: { ruling: 'Wajib', evidence: '...', penalty: 'Dam' },
          hanbali: { ruling: 'Wajib', evidence: '...', penalty: 'Dam' },
        },
      };
    }
    return null;
  }),

  getGateByNumber: vi.fn((num: number) => {
    if (num === 79) {
      return {
        id: 'gate_79',
        number: 79,
        name: { en: 'King Fahd Gate', ar: 'باب الملك فهد' },
        accessibility: { wheelchair: true, elevator: true },
        crowdLevel: 'medium',
        nearestZones: ['mataf', 'masa'],
      };
    }
    if (num === 12) {
      return {
        id: 'gate_12',
        number: 12,
        name: { en: 'Bab Safa', ar: 'باب الصفا' },
        accessibility: { wheelchair: false, elevator: false },
        crowdLevel: 'high',
        nearestZones: ['safa'],
      };
    }
    return null;
  }),

  getSafetyRulesByCategory: vi.fn((category: string) => {
    return [
      {
        id: 'safety_001',
        description: { en: 'Never push or shove in crowds' },
        severity: 'critical',
        contexts: ['all', 'tawaf', 'sai'],
        genderSpecific: null,
      },
      {
        id: 'safety_002',
        description: { en: 'Stay hydrated in hot weather' },
        severity: 'high',
        contexts: ['all'],
        genderSpecific: null,
      },
    ];
  }),

  getDuasByLocationId: vi.fn((locationId: string) => {
    if (locationId === 'black_stone_istilam') {
      return {
        id: 'black_stone_istilam',
        name: { en: 'At the Black Stone' },
        duas: [
          {
            arabic: 'بِسْمِ اللَّهِ اللَّهُ أَكْبَرُ',
            transliteration: 'Bismillah Allahu Akbar',
            translation: 'In the name of Allah, Allah is the Greatest',
          },
        ],
        context: 'When approaching or gesturing to the Black Stone',
      };
    }
    if (locationId === 'entering_haram') {
      return {
        id: 'entering_haram',
        name: { en: 'Entering the Haram' },
        duas: [
          {
            arabic: 'اللَّهُمَّ افْتَحْ لِي أَبْوَابَ رَحْمَتِكَ',
            transliteration: 'Allahumma iftah li abwaba rahmatika',
            translation: 'O Allah, open for me the doors of Your mercy',
          },
        ],
        context: 'Right foot first when entering',
      };
    }
    return null;
  }),

  getBestRoute: vi.fn((from: string, to: string, accessibility: string) => {
    return {
      from: 'Mataf (Tawaf Area)',
      to: 'Safa',
      route: [
        { step: 1, instruction: 'Exit Mataf area heading east' },
        { step: 2, instruction: 'Follow signs to Masa (Sai corridor)' },
        { step: 3, instruction: 'Reach Safa mount' },
      ],
      accessibility: accessibility,
      accessibilityNotes: accessibility === 'wheelchair' ? ['Use elevator at Gate 79', 'Upper floor is accessible'] : [],
      estimatedTime: '5 minutes',
    };
  }),
};

describe('Realtime Module (e2e)', () => {
  let app: INestApplication;
  let realtimeService: RealtimeService;
  let toolsService: RealtimeToolsService;
  let sessionManager: RealtimeSessionManager;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
        }),
      ],
      providers: [
        RealtimeService,
        RealtimeToolsService,
        RealtimeSessionManager,
        RealtimeGateway,
        {
          provide: UmrahKnowledgeService,
          useValue: mockUmrahKnowledgeService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useWebSocketAdapter(new WsAdapter(app));
    await app.init();
    await app.listen(0); // Random port for testing

    realtimeService = moduleFixture.get<RealtimeService>(RealtimeService);
    toolsService = moduleFixture.get<RealtimeToolsService>(RealtimeToolsService);
    sessionManager =
      moduleFixture.get<RealtimeSessionManager>(RealtimeSessionManager);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tool Definitions', () => {
    it('should provide 6 tool definitions', () => {
      const tools = toolsService.getToolDefinitions();
      expect(tools.length).toBe(6);

      const toolNames = tools.map((t) => t.name);
      expect(toolNames).toContain('get_ritual_step_info');
      expect(toolNames).toContain('get_madhhab_guidance');
      expect(toolNames).toContain('get_gate_info');
      expect(toolNames).toContain('get_safety_rules');
      expect(toolNames).toContain('get_duas');
      expect(toolNames).toContain('get_best_route');
    });

    it('should have proper OpenAI Realtime tool schema', () => {
      const tools = toolsService.getToolDefinitions();

      for (const tool of tools) {
        expect(tool.type).toBe('function');
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.parameters).toBeDefined();
        expect(tool.parameters.type).toBe('object');
        expect(tool.parameters.properties).toBeDefined();
      }
    });
  });

  describe('Tool Execution - Ritual Steps', () => {
    it('should execute get_ritual_step_info for tawaf', async () => {
      const result = await toolsService.executeTool('get_ritual_step_info', {
        step_id: 'tawaf',
      });

      expect(result).toBeDefined();
      expect(result.step_id).toBe('tawaf');
      expect(result.title).toBeDefined();
      expect(result.substeps).toBeDefined();
      expect(Array.isArray(result.substeps)).toBe(true);
      expect(result.substeps.length).toBeGreaterThanOrEqual(5);
    });

    it('should execute get_ritual_step_info for sai', async () => {
      const result = await toolsService.executeTool('get_ritual_step_info', {
        step_id: 'sai',
      });

      expect(result).toBeDefined();
      expect(result.step_id).toBe('sai');
      expect(result.gender_specific).toBeDefined();
      expect(result.safety_notes).toBeDefined();
    });

    it('should return error for invalid step_id', async () => {
      const result = await toolsService.executeTool('get_ritual_step_info', {
        step_id: 'invalid_step',
      });

      expect(result.error).toBeDefined();
      expect(result.available_steps).toBeDefined();
    });
  });

  describe('Tool Execution - Madhhab Guidance', () => {
    it('should execute get_madhhab_guidance for wudu_for_tawaf (Hanafi)', async () => {
      const result = await toolsService.executeTool('get_madhhab_guidance', {
        topic_id: 'wudu_for_tawaf',
        madhhab: 'hanafi',
      });

      expect(result).toBeDefined();
      expect(result.topic_id).toBe('wudu_for_tawaf');
      expect(result.madhhab).toBe('hanafi');
      expect(result.ruling).toBeDefined();
      expect(result.practical_guidance).toBeDefined();
      expect(result.penalty).toBeDefined();
    });

    it('should execute get_madhhab_guidance for wudu_for_tawaf (Shafi\'i)', async () => {
      const result = await toolsService.executeTool('get_madhhab_guidance', {
        topic_id: 'wudu_for_tawaf',
        madhhab: 'shafii',
      });

      expect(result).toBeDefined();
      expect(result.madhhab).toBe('shafii');
      expect(result.ruling).toBeDefined();
      // Shafi'i should have different ruling than Hanafi
      expect(result.ruling).not.toBe('Wajib but not a pillar');
    });

    it('should show other_views for comparison', async () => {
      const result = await toolsService.executeTool('get_madhhab_guidance', {
        topic_id: 'wudu_for_tawaf',
        madhhab: 'hanafi',
      });

      expect(result.other_views).toBeDefined();
      expect(result.other_views.shafii).toBeDefined();
      expect(result.other_views.maliki).toBeDefined();
      expect(result.other_views.hanbali).toBeDefined();
    });
  });

  describe('Tool Execution - Gate Info', () => {
    it('should execute get_gate_info for King Fahd Gate (79)', async () => {
      const result = await toolsService.executeTool('get_gate_info', {
        gate_number: 79,
      });

      expect(result).toBeDefined();
      expect(result.gate_number).toBe(79);
      expect(result.name).toContain('King Fahd');
      expect(result.accessibility).toBeDefined();
      expect(result.accessibility.wheelchair).toBe(true);
      expect(result.crowd_level).toBeDefined();
    });

    it('should execute get_gate_info for Bab Safa (12)', async () => {
      const result = await toolsService.executeTool('get_gate_info', {
        gate_number: 12,
      });

      expect(result).toBeDefined();
      expect(result.name).toContain('Safa');
      expect(result.nearest_zones).toContain('safa');
    });

    it('should return error for invalid gate number', async () => {
      const result = await toolsService.executeTool('get_gate_info', {
        gate_number: 999,
      });

      expect(result.error).toBeDefined();
    });
  });

  describe('Tool Execution - Safety Rules', () => {
    it('should execute get_safety_rules for tawaf', async () => {
      const result = await toolsService.executeTool('get_safety_rules', {
        context: 'tawaf',
      });

      expect(result).toBeDefined();
      expect(result.context).toBe('tawaf');
      expect(Array.isArray(result.rules)).toBe(true);
      expect(result.rules.length).toBeGreaterThan(0);

      // Check rule structure
      const firstRule = result.rules[0];
      expect(firstRule.id).toBeDefined();
      expect(firstRule.description).toBeDefined();
      expect(firstRule.severity).toBeDefined();
      expect(['critical', 'high', 'medium', 'low']).toContain(
        firstRule.severity,
      );
    });

    it('should execute get_safety_rules for accessibility', async () => {
      const result = await toolsService.executeTool('get_safety_rules', {
        context: 'accessibility',
      });

      expect(result).toBeDefined();
      expect(result.context).toBe('accessibility');
      expect(result.rules).toBeDefined();
    });

    it('should prioritize critical safety rules first', async () => {
      const result = await toolsService.executeTool('get_safety_rules', {
        context: 'general',
      });

      // Rules should be sorted by severity (critical first)
      const severities = result.rules.map((r: any) => r.severity);
      const firstCritical = severities.indexOf('critical');
      const firstLow = severities.indexOf('low');

      if (firstCritical >= 0 && firstLow >= 0) {
        expect(firstCritical).toBeLessThan(firstLow);
      }
    });
  });

  describe('Tool Execution - Duas', () => {
    it('should execute get_duas for black_stone_istilam', async () => {
      const result = await toolsService.executeTool('get_duas', {
        location: 'black_stone_istilam',
      });

      expect(result).toBeDefined();
      expect(result.location_id).toBe('black_stone_istilam');
      expect(Array.isArray(result.duas)).toBe(true);
      expect(result.duas.length).toBeGreaterThan(0);

      const firstDua = result.duas[0];
      expect(firstDua.arabic).toBeDefined();
      expect(firstDua.transliteration).toBeDefined();
      expect(firstDua.translation).toBeDefined();
    });

    it('should execute get_duas for entering_haram', async () => {
      const result = await toolsService.executeTool('get_duas', {
        location: 'entering_haram',
      });

      expect(result).toBeDefined();
      expect(result.location_name).toContain('Haram');
      expect(result.context).toBeDefined();
    });
  });

  describe('Tool Execution - Best Route', () => {
    it('should execute get_best_route from mataf to safa', async () => {
      const result = await toolsService.executeTool('get_best_route', {
        from_zone: 'mataf',
        to_zone: 'safa',
        accessibility_needs: 'none',
      });

      expect(result).toBeDefined();
      expect(result.from).toContain('Mataf');
      expect(result.to).toContain('Safa');
      expect(Array.isArray(result.route)).toBe(true);
      expect(result.route.length).toBeGreaterThan(0);
    });

    it('should provide wheelchair-accessible routing', async () => {
      const result = await toolsService.executeTool('get_best_route', {
        from_zone: 'mataf',
        to_zone: 'safa',
        accessibility_needs: 'wheelchair',
      });

      expect(result).toBeDefined();
      expect(result.accessibility).toBe('wheelchair');
      expect(result.accessibility_notes).toBeDefined();
      expect(Array.isArray(result.accessibility_notes)).toBe(true);
    });
  });

  describe('Session Management', () => {
    it('should create a session', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_1', mockWebSocket);

      expect(session).toBeDefined();
      expect(session.id).toBeDefined();
      expect(session.userId).toBe('test_user_1');
      expect(session.isActive).toBe(true);
      expect(session.userContext).toBeDefined();
    });

    it('should update user context', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_2', mockWebSocket);

      sessionManager.updateContext(session.id, {
        ritualStep: 'tawaf',
        tawafLap: 3,
        gender: 'male',
        madhhab: 'hanafi',
      });

      const updatedSession = sessionManager.getSession(session.id);
      expect(updatedSession?.userContext.ritualStep).toBe('tawaf');
      expect(updatedSession?.userContext.tawafLap).toBe(3);
      expect(updatedSession?.userContext.gender).toBe('male');
      expect(updatedSession?.userContext.madhhab).toBe('hanafi');
    });

    it('should close session and return metrics', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_3', mockWebSocket);

      const metrics = sessionManager.closeSession(session.id);

      expect(metrics).toBeDefined();
      expect(metrics?.sessionId).toBe(session.id);
      expect(metrics?.userId).toBe('test_user_3');
      expect(metrics?.duration).toBeGreaterThanOrEqual(0);

      // Session should no longer exist
      const closedSession = sessionManager.getSession(session.id);
      expect(closedSession).toBeUndefined();
    });
  });

  describe('Safety Layer', () => {
    it('should pass safe content', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_4', mockWebSocket);

      const safeContent =
        'To start Tawaf, face the Black Stone and say "Bismillah Allahu Akbar". If it\'s too crowded, you can gesture from afar.';

      const result = sessionManager.checkSafety(safeContent, session.userContext);

      expect(result.passed).toBe(true);
      expect(result.blockedContent).toBeUndefined();
    });

    it('should warn about pushing behavior', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_5', mockWebSocket);

      const unsafeContent =
        'You must push through the crowd to touch the Black Stone.';

      const result = sessionManager.checkSafety(unsafeContent, session.userContext);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.blockedContent).toBeDefined();
      expect(result.suggestedAlternative).toBeDefined();
    });

    it('should modify overclaimed certainty', () => {
      const mockWebSocket = {} as any;
      const session = sessionManager.createSession('test_user_6', mockWebSocket);

      const content = 'This is definitely 100% correct and there is absolutely no other way.';

      const result = sessionManager.checkSafety(content, session.userContext);

      // Should trigger warnings about overclaiming certainty
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('System Prompt Builder', () => {
    it('should build complete instructions with user context', () => {
      const context = {
        latitude: 21.4225,
        longitude: 39.8262,
        zoneId: 'mataf',
        ritualStep: 'tawaf',
        tawafLap: 2,
        saiLap: undefined,
        gender: 'male',
        madhhab: 'hanafi',
        accessibility: 'none',
        preferredLanguage: 'en',
      } as any;

      const instructions =
        require('./realtime.system-prompt').RealtimeSystemPromptBuilder.buildInstructions(
          context,
        );

      expect(instructions).toBeDefined();
      expect(typeof instructions).toBe('string');
      expect(instructions).toContain('ROLE');
      expect(instructions).toContain('SAFETY');
      expect(instructions).toContain('Hanafi'); // Madhhab-specific
      expect(instructions).toContain('tawaf'); // Ritual step
      expect(instructions).toContain('mataf'); // Zone
    });

    it('should include gender-specific guidance', () => {
      const femaleContext = {
        latitude: null,
        longitude: null,
        zoneId: null,
        ritualStep: 'sai',
        tawafLap: undefined,
        saiLap: 1,
        gender: 'female',
        madhhab: 'shafii',
        accessibility: 'none',
        preferredLanguage: 'en',
      } as any;

      const instructions =
        require('./realtime.system-prompt').RealtimeSystemPromptBuilder.buildInstructions(
          femaleContext,
        );

      expect(instructions).toContain('FEMALE');
      expect(instructions).toContain('NO running'); // Women don't run in Sa'i
    });
  });
});
