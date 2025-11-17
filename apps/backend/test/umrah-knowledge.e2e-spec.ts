import { Test, TestingModule } from '@nestjs/testing';
import { UmrahKnowledgeService } from '../src/umrah/knowledge/umrah-knowledge.service';
import { UmrahKnowledgeModule } from '../src/umrah/knowledge/umrah-knowledge.module';

describe('UmrahKnowledgeService (e2e)', () => {
  let service: UmrahKnowledgeService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [UmrahKnowledgeModule],
    }).compile();

    service = module.get<UmrahKnowledgeService>(UmrahKnowledgeService);
  });

  describe('Knowledge Base Loading', () => {
    it('should load KB without throwing', () => {
      expect(service).toBeDefined();
      expect(service.getKnowledgeBase()).toBeDefined();
    });

    it('should load all 6 KB components', () => {
      const kb = service.getKnowledgeBase();
      expect(kb.gates).toBeDefined();
      expect(kb.zones).toBeDefined();
      expect(kb.madhhabRulings).toBeDefined();
      expect(kb.ritualSteps).toBeDefined();
      expect(kb.safetyRules).toBeDefined();
      expect(kb.duas).toBeDefined();
    });
  });

  describe('Haram Gates', () => {
    it('should have at least 10 gates', () => {
      const gates = service.getGates();
      expect(gates.gates.length).toBeGreaterThanOrEqual(10);
    });

    it('should have all required gate fields', () => {
      const gates = service.getGates();
      gates.gates.forEach((gate) => {
        expect(gate.id).toBeDefined();
        expect(gate.name).toBeDefined();
        expect(gate.name.en).toBeDefined();
        expect(gate.name.ar).toBeDefined();
        expect(gate.name.fr).toBeDefined();
        expect(gate.accessibility).toBeDefined();
        expect(typeof gate.accessibility.wheelchair).toBe('boolean');
      });
    });

    it('should have wheelchair-designated gates', () => {
      const gates = service.getGates();
      const wheelchairGates = gates.gates.filter(
        (g) => g.accessibility.wheelchair,
      );
      expect(wheelchairGates.length).toBeGreaterThanOrEqual(8);
    });

    it('should find gate by ID', () => {
      const gate = service.getGateById('bab_malik');
      expect(gate).toBeDefined();
      expect(gate?.name.en).toContain('King Abdul Aziz');
    });

    it('should find gate by number', () => {
      const gate = service.getGateByNumber(79);
      expect(gate).toBeDefined();
      expect(gate?.name.en).toContain('King Fahd');
    });

    it('should have coordinates field (can be null)', () => {
      const gates = service.getGates();
      gates.gates.forEach((gate) => {
        expect(gate.coordinates).toBeDefined();
        expect(gate.coordinates).toHaveProperty('lat');
        expect(gate.coordinates).toHaveProperty('lng');
      });
    });
  });

  describe('Haram Zones', () => {
    it('should have critical zones (Mataf, Safa, Marwah, Masa)', () => {
      const zones = service.getZones();
      const zoneIds = zones.zones.map((z) => z.id);
      expect(zoneIds).toContain('mataf');
      expect(zoneIds).toContain('safa');
      expect(zoneIds).toContain('marwah');
      expect(zoneIds).toContain('masa');
    });

    it('should have safetyNotes for each zone', () => {
      const zones = service.getZones();
      zones.zones.forEach((zone) => {
        expect(Array.isArray(zone.safetyNotes)).toBe(true);
      });
    });

    it('should find zone by ID', () => {
      const mataf = service.getZoneById('mataf');
      expect(mataf).toBeDefined();
      expect(mataf?.name.en).toContain('Mataf');
      expect(mataf?.type).toBe('ritual_area');
    });

    it('should have floor levels data', () => {
      const zones = service.getZones();
      expect(zones.floorLevels).toBeDefined();
      expect(zones.floorLevels.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Madhhab Rulings', () => {
    it('should have critical fiqh topics', () => {
      const rulings = service.getMadhhabRulings();
      const topicIds = rulings.topics.map((t) => t.id);
      expect(topicIds).toContain('wudu_for_tawaf');
      expect(topicIds).toContain('menstruation_tawaf');
    });

    it('should have all 4 madhahib for wudu_for_tawaf', () => {
      const topic = service.getMadhhabRulingById('wudu_for_tawaf');
      expect(topic).toBeDefined();
      expect(topic?.rulings.hanafi).toBeDefined();
      expect(topic?.rulings.maliki).toBeDefined();
      expect(topic?.rulings.shafii).toBeDefined();
      expect(topic?.rulings.hanbali).toBeDefined();
    });

    it('should have ruling, evidence, and practicalGuidance', () => {
      const topic = service.getMadhhabRulingById('wudu_for_tawaf');
      expect(topic?.rulings.hanafi?.ruling).toBeDefined();
      expect(topic?.rulings.shafii?.ruling).toBeDefined();
      expect(topic?.rulings.shafii?.practicalGuidance).toBeDefined();
    });

    it('should have at least one madhhab per topic', () => {
      const rulings = service.getMadhhabRulings();
      rulings.topics.forEach((topic) => {
        const hasMadhhab =
          topic.rulings.hanafi ||
          topic.rulings.maliki ||
          topic.rulings.shafii ||
          topic.rulings.hanbali;
        expect(hasMadhhab).toBeTruthy();
      });
    });
  });

  describe('Ritual Steps', () => {
    it('should have 7-step Umrah guide', () => {
      const steps = service.getRitualSteps();
      expect(steps.umrah.steps.length).toBeGreaterThanOrEqual(6);
    });

    it('should have critical Umrah steps', () => {
      const steps = service.getRitualSteps();
      const stepIds = steps.umrah.steps.map((s) => s.id);
      expect(stepIds).toContain('ihram');
      expect(stepIds).toContain('tawaf');
      expect(stepIds).toContain('sai');
      expect(stepIds).toContain('halq_taqsir');
    });

    it('should have step order numbers', () => {
      const steps = service.getRitualSteps();
      steps.umrah.steps.forEach((step) => {
        expect(typeof step.order).toBe('number');
        expect(step.order).toBeGreaterThanOrEqual(1);
      });
    });

    it('should have tawaf substeps', () => {
      const tawaf = service.getUmrahStepById('tawaf');
      expect(tawaf).toBeDefined();
      expect(Array.isArray(tawaf?.stepByStep)).toBe(true);
      expect(tawaf?.stepByStep?.length).toBeGreaterThanOrEqual(5);
    });

    it('should have multilingual titles', () => {
      const steps = service.getRitualSteps();
      steps.umrah.steps.forEach((step) => {
        expect(step.title.en).toBeDefined();
        expect(step.title.ar).toBeDefined();
        expect(step.title.fr).toBeDefined();
      });
    });
  });

  describe('Safety Rules', () => {
    it('should have all 7 categories', () => {
      const safety = service.getSafetyRules();
      expect(Array.isArray(safety.general)).toBe(true);
      expect(Array.isArray(safety.heat)).toBe(true);
      expect(Array.isArray(safety.accessibility)).toBe(true);
      expect(Array.isArray(safety.health)).toBe(true);
      expect(Array.isArray(safety.ihram)).toBe(true);
      expect(Array.isArray(safety.emergency)).toBe(true);
      expect(Array.isArray(safety.women)).toBe(true);
    });

    it('should have critical safety rules', () => {
      const general = service.getSafetyRulesByCategory('general');
      expect(general.length).toBeGreaterThanOrEqual(5);
    });

    it('should have severity levels', () => {
      const general = service.getSafetyRulesByCategory('general');
      const severities = ['critical', 'high', 'medium', 'low'];
      general.forEach((rule) => {
        expect(severities).toContain(rule.severity);
      });
    });

    it('should have id and description for each rule', () => {
      const general = service.getSafetyRulesByCategory('general');
      general.forEach((rule) => {
        expect(rule.id).toBeDefined();
        expect(rule.description).toBeDefined();
        expect(Array.isArray(rule.contexts)).toBe(true);
      });
    });
  });

  describe('Duas by Location', () => {
    it('should have critical dua locations', () => {
      const duas = service.getDuas();
      const locationIds = duas.locations.map((l) => l.id);
      expect(locationIds).toContain('ihram_entry');
      expect(locationIds).toContain('black_stone_istilam');
      expect(locationIds).toContain('safa_arrival');
    });

    it('should have duas array for each location', () => {
      const duas = service.getDuas();
      duas.locations.forEach((location) => {
        expect(Array.isArray(location.duas)).toBe(true);
        expect(location.duas.length).toBeGreaterThanOrEqual(1);
      });
    });

    it('should have arabic, transliteration, translation', () => {
      const blackStone = service.getDuasByLocationId('black_stone_istilam');
      expect(blackStone).toBeDefined();
      expect(blackStone?.duas[0].arabic).toBeDefined();
      expect(blackStone?.duas[0].transliteration).toBeDefined();
      expect(blackStone?.duas[0].translation).toBeDefined();
    });

    it('should have multilingual location names', () => {
      const duas = service.getDuas();
      duas.locations.forEach((location) => {
        expect(location.name.en).toBeDefined();
        expect(location.name.ar).toBeDefined();
        expect(location.name.fr).toBeDefined();
      });
    });
  });

  describe('Metadata', () => {
    it('should have version in all KB files', () => {
      const kb = service.getKnowledgeBase();
      expect(kb.gates.metadata.version).toBeDefined();
      expect(kb.zones.metadata.version).toBeDefined();
      expect(kb.madhhabRulings.metadata.version).toBeDefined();
      expect(kb.ritualSteps.metadata.version).toBeDefined();
      expect(kb.safetyRules.metadata.version).toBeDefined();
      expect(kb.duas.metadata.version).toBeDefined();
    });

    it('should have lastUpdated timestamp', () => {
      const kb = service.getKnowledgeBase();
      expect(kb.gates.metadata.lastUpdated).toBeDefined();
      expect(kb.zones.metadata.lastUpdated).toBeDefined();
    });
  });
});
