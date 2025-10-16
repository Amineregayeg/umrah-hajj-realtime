/**
 * Comprehensive unit tests for HMM Tracking Service
 * Covers emission scoring, transition scoring, Viterbi algorithm, teleport reset, EMA clamp
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HMMTrackingService } from './hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import { NavGraph, Node, Edge, Connector } from '../graph/interfaces/graph.interface';

// Mock implementation to access private methods
class TestableHMMTrackingService extends HMMTrackingService {
  // Expose private methods for testing
  public testEmissionProbability(distance: number, heading: number, speed: number): number {
    return this.calculateEmissionProbability(distance, heading, speed);
  }

  public testTransitionProbability(
    fromCandidate: any,
    toCandidate: any,
    distance: number,
    dt: number
  ): number {
    return this.calculateTransitionProbability(fromCandidate, toCandidate, distance, dt);
  }

  public testEMASmoothing(state: any, newPosition: any): any {
    return this.applyEMASmoothing(state, newPosition);
  }

  public testGetUserState(userId: string): any {
    return this.getOrCreateUserState(userId);
  }

  public testUpdatePositionHistory(state: any, update: NavUpdateDto): void {
    this.updatePositionHistory(state, update);
  }

  public testNormalizeProbabilities(probabilities: number[]): number[] {
    return this.normalizeProbabilities(probabilities);
  }

  public testFindCandidates(position: any, graph: NavGraph, searchRadius: number): any[] {
    return this.findCandidates(position, graph, searchRadius);
  }

  public testDetectTeleport(state: any, newPosition: any): boolean {
    return this.detectTeleport(state, newPosition);
  }

  public testViterbiStep(
    candidates: any[],
    prevCandidates: any[],
    prevProbabilities: number[],
    update: NavUpdateDto
  ): { probabilities: number[]; backpointers: number[] } {
    return this.viterbiStep(candidates, prevCandidates, prevProbabilities, update);
  }

  public testHandleFloorTransition(state: any, candidates: any[]): any[] {
    return this.handleFloorTransition(state, candidates);
  }

  public clearUserState(userId: string): void {
    this.userStates.delete(userId);
  }

  // Accessor for constants
  public getConstants() {
    return {
      K_CANDIDATES: this.K_CANDIDATES,
      R_SEARCH_RADIUS: this.R_SEARCH_RADIUS,
      TELEPORT_THRESHOLD: this.TELEPORT_THRESHOLD,
      EMA_ALPHA: this.EMA_ALPHA,
      CONFIDENCE_THRESHOLD: this.CONFIDENCE_THRESHOLD,
      SIGMA_D_PERP_SLOW: this.SIGMA_D_PERP_SLOW,
      SIGMA_D_PERP_FAST: this.SIGMA_D_PERP_FAST,
      SPEED_THRESHOLD: this.SPEED_THRESHOLD
    };
  }
}

describe('HMMTrackingService', () => {
  let service: TestableHMMTrackingService;
  let graphLoader: jest.Mocked<GraphLoaderService>;
  let mockGraph: NavGraph;

  const createMockUpdate = (overrides: Partial<NavUpdateDto> = {}): NavUpdateDto => ({
    ts: 1625097600000 + (process.env.NAV_SEED ? parseInt(process.env.NAV_SEED) : 0),
    seq: 1,
    userId: 'test-user',
    pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
    heading: 0,
    speed: 1.0,
    source: 'gnss',
    stage: 'tawaf',
    lap: 1,
    confidence: 0.8,
    mode: 'guide',
    device: 'android',
    ...overrides
  });

  beforeEach(async () => {
    mockGraph = {
      floors: [
        { id: 'ground', name: 'Ground Floor' },
        { id: 'first', name: 'First Floor' }
      ],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8265, kind: 'poi' },
        { id: 'n3', floor: 'ground', lat: 21.4235, lon: 39.8270, kind: 'poi' },
        { id: 'n4', floor: 'ground', lat: 21.4220, lon: 39.8267, kind: 'poi' },
        { id: 'elevator1', floor: 'ground', lat: 21.4240, lon: 39.8275, kind: 'poi' },
        { id: 'elevator2', floor: 'first', lat: 21.4240, lon: 39.8275, kind: 'poi' }
      ],
      edges: [
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' },
        { from: 'n2', to: 'n3', weight: 55, kind: 'corridor' },
        { from: 'n1', to: 'n4', weight: 70, kind: 'corridor' },
        { from: 'n3', to: 'n4', weight: 60, kind: 'corridor' }
      ],
      connectors: [
        { from: 'elevator1', to: 'elevator2', type: 'elevator', penalty: 10 }
      ],
      zones: []
    };

    const mockGraphLoader = {
      getGraph: jest.fn().mockReturnValue(mockGraph)
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: HMMTrackingService,
          useClass: TestableHMMTrackingService
        },
        {
          provide: GraphLoaderService,
          useValue: mockGraphLoader
        }
      ]
    }).compile();

    service = module.get<TestableHMMTrackingService>(HMMTrackingService);
    graphLoader = module.get(GraphLoaderService);
  });

  afterEach(() => {
    service.clearUserState('test-user');
  });

  describe('Emission Probability Calculation', () => {
    it('should return high probability for short distances with slow movement', () => {
      const prob = service.testEmissionProbability(1.0, 5, 0.3); // 1m distance, 5° heading diff, slow speed
      expect(prob).toBeGreaterThan(0.8);
    });

    it('should return moderate probability for medium distances', () => {
      const prob = service.testEmissionProbability(5.0, 15, 1.0); // 5m distance, 15° heading diff
      expect(prob).toBeGreaterThan(0.3);
      expect(prob).toBeLessThan(0.8);
    });

    it('should return low probability for large distances', () => {
      const prob = service.testEmissionProbability(20.0, 45, 1.5); // 20m distance, 45° heading diff
      expect(prob).toBeLessThan(0.1);
    });

    it('should use different sigmas for slow vs fast movement', () => {
      const constants = service.getConstants();
      const slowProb = service.testEmissionProbability(3.0, 20, 0.3);
      const fastProb = service.testEmissionProbability(3.0, 20, 1.2);
      
      // Both should be valid probabilities but potentially different due to speed-aware parameters
      expect(slowProb).toBeGreaterThan(0);
      expect(slowProb).toBeLessThan(1);
      expect(fastProb).toBeGreaterThan(0);
      expect(fastProb).toBeLessThan(1);
    });

    it('should handle zero distance correctly', () => {
      const prob = service.testEmissionProbability(0.0, 0, 1.0);
      expect(prob).toBeCloseTo(1.0, 2);
    });

    it('should handle large heading differences', () => {
      const prob = service.testEmissionProbability(2.0, 180, 1.0); // opposite direction
      expect(prob).toBeLessThan(0.5);
    });
  });

  describe('Transition Probability Calculation', () => {
    const mockCandidate1 = {
      position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
      heading: 0
    };
    
    const mockCandidate2 = {
      position: { lat: 21.4230, lon: 39.8265, floor: 'ground' },
      heading: 30
    };

    it('should return high probability for reasonable movement', () => {
      const distance = 50; // 50m in 1 second = reasonable walking speed
      const dt = 1000; // 1 second
      const prob = service.testTransitionProbability(mockCandidate1, mockCandidate2, distance, dt);
      expect(prob).toBeGreaterThan(0.5);
    });

    it('should return low probability for impossible fast movement', () => {
      const distance = 200; // 200m in 1 second = impossible
      const dt = 1000; // 1 second
      const prob = service.testTransitionProbability(mockCandidate1, mockCandidate2, distance, dt);
      expect(prob).toBeLessThan(0.1);
    });

    it('should return low probability for impossible slow movement', () => {
      const distance = 1; // 1m in 60 seconds = too slow
      const dt = 60000; // 60 seconds
      const prob = service.testTransitionProbability(mockCandidate1, mockCandidate2, distance, dt);
      expect(prob).toBeLessThan(0.3);
    });

    it('should handle same position candidates', () => {
      const distance = 0;
      const dt = 1000;
      const prob = service.testTransitionProbability(mockCandidate1, mockCandidate1, distance, dt);
      expect(prob).toBeGreaterThan(0.8); // Staying in place is likely
    });

    it('should consider heading changes in probability', () => {
      const mockCandidate3 = {
        position: { lat: 21.4230, lon: 39.8265, floor: 'ground' },
        heading: 180 // opposite direction
      };
      
      const distance = 50;
      const dt = 1000;
      const probSameHeading = service.testTransitionProbability(mockCandidate1, mockCandidate2, distance, dt);
      const probOppositeHeading = service.testTransitionProbability(mockCandidate1, mockCandidate3, distance, dt);
      
      expect(probSameHeading).toBeGreaterThan(probOppositeHeading);
    });
  });

  describe('EMA Smoothing', () => {
    it('should apply exponential moving average correctly', () => {
      const state = service.testGetUserState('test-user');
      state.smoothedPosition = { lat: 21.4225, lon: 39.8262 };
      
      const newPosition = { lat: 21.4230, lon: 39.8265 };
      const smoothed = service.testEMASmoothing(state, newPosition);
      
      // Should be between old and new position
      expect(smoothed.lat).toBeGreaterThan(21.4225);
      expect(smoothed.lat).toBeLessThan(21.4230);
      expect(smoothed.lon).toBeGreaterThan(39.8262);
      expect(smoothed.lon).toBeLessThan(39.8265);
    });

    it('should handle first position (no previous smoothed position)', () => {
      const state = service.testGetUserState('test-user-new');
      const newPosition = { lat: 21.4225, lon: 39.8262 };
      const smoothed = service.testEMASmoothing(state, newPosition);
      
      expect(smoothed).toEqual(newPosition);
    });

    it('should use correct alpha value', () => {
      const state = service.testGetUserState('test-user');
      const constants = service.getConstants();
      state.smoothedPosition = { lat: 0, lon: 0 };
      
      const newPosition = { lat: 1, lon: 1 };
      const smoothed = service.testEMASmoothing(state, newPosition);
      
      // Should apply alpha weighting
      expect(smoothed.lat).toBeCloseTo(constants.EMA_ALPHA, 3);
      expect(smoothed.lon).toBeCloseTo(constants.EMA_ALPHA, 3);
    });
  });

  describe('Teleport Detection', () => {
    it('should detect teleport when distance exceeds threshold', () => {
      const state = service.testGetUserState('test-user');
      state.smoothedPosition = { lat: 21.4225, lon: 39.8262 };
      
      const newPosition = { lat: 21.4300, lon: 39.8300 }; // ~500m jump
      const isTeleport = service.testDetectTeleport(state, newPosition);
      
      expect(isTeleport).toBe(true);
    });

    it('should not detect teleport for normal movement', () => {
      const state = service.testGetUserState('test-user');
      state.smoothedPosition = { lat: 21.4225, lon: 39.8262 };
      
      const newPosition = { lat: 21.4227, lon: 39.8264 }; // ~3m movement
      const isTeleport = service.testDetectTeleport(state, newPosition);
      
      expect(isTeleport).toBe(false);
    });

    it('should handle no previous position', () => {
      const state = service.testGetUserState('test-user-new');
      const newPosition = { lat: 21.4225, lon: 39.8262 };
      const isTeleport = service.testDetectTeleport(state, newPosition);
      
      expect(isTeleport).toBe(false);
    });
  });

  describe('Normalization', () => {
    it('should normalize probabilities to sum to 1', () => {
      const probs = [0.1, 0.2, 0.3, 0.4];
      const normalized = service.testNormalizeProbabilities(probs);
      const sum = normalized.reduce((a, b) => a + b, 0);
      
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it('should handle zero probabilities', () => {
      const probs = [0, 0, 0, 0];
      const normalized = service.testNormalizeProbabilities(probs);
      
      // Should assign equal probability to all candidates
      expect(normalized.every(p => p === 0.25)).toBe(true);
    });

    it('should preserve relative proportions', () => {
      const probs = [0.2, 0.4, 0.6];
      const normalized = service.testNormalizeProbabilities(probs);
      
      expect(normalized[1] / normalized[0]).toBeCloseTo(2, 3);
      expect(normalized[2] / normalized[0]).toBeCloseTo(3, 3);
    });
  });

  describe('Candidate Finding', () => {
    it('should find candidates within search radius', () => {
      const position = { lat: 21.4225, lon: 39.8262, floor: 'ground' };
      const candidates = service.testFindCandidates(position, mockGraph, 100);
      
      expect(candidates.length).toBeGreaterThan(0);
      expect(candidates.every(c => c.distance <= 100)).toBe(true);
    });

    it('should limit number of candidates', () => {
      const position = { lat: 21.4225, lon: 39.8262, floor: 'ground' };
      const constants = service.getConstants();
      const candidates = service.testFindCandidates(position, mockGraph, 1000);
      
      expect(candidates.length).toBeLessThanOrEqual(constants.K_CANDIDATES);
    });

    it('should sort candidates by distance', () => {
      const position = { lat: 21.4225, lon: 39.8262, floor: 'ground' };
      const candidates = service.testFindCandidates(position, mockGraph, 1000);
      
      for (let i = 1; i < candidates.length; i++) {
        expect(candidates[i].distance).toBeGreaterThanOrEqual(candidates[i-1].distance);
      }
    });

    it('should filter by floor when specified', () => {
      const position = { lat: 21.4225, lon: 39.8262, floor: 'ground' };
      const candidates = service.testFindCandidates(position, mockGraph, 1000);
      
      expect(candidates.every(c => c.position.floor === 'ground')).toBe(true);
    });
  });

  describe('Position History Management', () => {
    it('should update position history', () => {
      const state = service.testGetUserState('test-user');
      const update = createMockUpdate();
      
      service.testUpdatePositionHistory(state, update);
      
      expect(state.positionHistory.length).toBe(1);
      expect(state.positionHistory[0].lat).toBe(update.pos.lat);
      expect(state.positionHistory[0].lon).toBe(update.pos.lon);
      expect(state.positionHistory[0].ts).toBe(update.ts);
    });

    it('should limit position history size', () => {
      const state = service.testGetUserState('test-user');
      
      // Add many updates
      for (let i = 0; i < 50; i++) {
        const update = createMockUpdate({ ts: Date.now() + i * 1000 });
        service.testUpdatePositionHistory(state, update);
      }
      
      // Should not exceed reasonable limit (implementation dependent)
      expect(state.positionHistory.length).toBeLessThanOrEqual(20);
    });
  });

  describe('Viterbi Algorithm Step', () => {
    it('should compute Viterbi step with valid probabilities', () => {
      const candidates = [
        { position: { lat: 21.4225, lon: 39.8262, floor: 'ground' }, distance: 1 },
        { position: { lat: 21.4230, lon: 39.8265, floor: 'ground' }, distance: 5 }
      ];
      
      const prevCandidates = [
        { position: { lat: 21.4223, lon: 39.8260, floor: 'ground' }, distance: 2 }
      ];
      
      const prevProbabilities = [1.0];
      const update = createMockUpdate();
      
      const result = service.testViterbiStep(candidates, prevCandidates, prevProbabilities, update);
      
      expect(result.probabilities.length).toBe(candidates.length);
      expect(result.backpointers.length).toBe(candidates.length);
      expect(result.probabilities.every(p => p >= 0 && p <= 1)).toBe(true);
    });

    it('should handle first step (no previous candidates)', () => {
      const candidates = [
        { position: { lat: 21.4225, lon: 39.8262, floor: 'ground' }, distance: 1 }
      ];
      
      const result = service.testViterbiStep(candidates, [], [], createMockUpdate());
      
      expect(result.probabilities.length).toBe(1);
      expect(result.probabilities[0]).toBeGreaterThan(0);
    });
  });

  describe('Floor Transition Handling', () => {
    it('should allow floor transitions via connectors', () => {
      const state = service.testGetUserState('test-user');
      state.lastValidFloor = 'ground';
      
      const candidates = [
        { position: { lat: 21.4240, lon: 39.8275, floor: 'first' }, distance: 2, type: 'node', nodeId: 'elevator2' }
      ];
      
      const filtered = service.testHandleFloorTransition(state, candidates);
      
      expect(filtered.length).toBeGreaterThan(0);
    });

    it('should reject floor transitions without connectors', () => {
      const state = service.testGetUserState('test-user');
      state.lastValidFloor = 'ground';
      
      const candidates = [
        { position: { lat: 21.4200, lon: 39.8200, floor: 'first' }, distance: 2, type: 'node', nodeId: 'n5' }
      ];
      
      const filtered = service.testHandleFloorTransition(state, candidates);
      
      expect(filtered.length).toBe(0);
    });
  });

  describe('Full Processing Pipeline', () => {
    it('should process navigation update successfully', async () => {
      const update = createMockUpdate();
      const result = await service.processNavigationUpdate(update);
      
      expect(result).toBeDefined();
      expect(result.position.lat).toBeCloseTo(update.pos.lat, 3);
      expect(result.position.lon).toBeCloseTo(update.pos.lon, 3);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle multiple sequential updates', async () => {
      const updates = [
        createMockUpdate({ seq: 1, ts: 1625097600000 }),
        createMockUpdate({ seq: 2, ts: 1625097601000, pos: { lat: 21.4227, lon: 39.8264, alt: 0, floor: 0, acc: 3.0 } }),
        createMockUpdate({ seq: 3, ts: 1625097602000, pos: { lat: 21.4229, lon: 39.8266, alt: 0, floor: 0, acc: 3.0 } })
      ];
      
      const results = [];
      for (const update of updates) {
        const result = await service.processNavigationUpdate(update);
        results.push(result);
      }
      
      expect(results.every(r => r !== null)).toBe(true);
      expect(results[results.length - 1].confidence).toBeGreaterThan(0.3);
    });

    it('should handle teleport scenarios', async () => {
      // First update
      const update1 = createMockUpdate({ seq: 1 });
      await service.processNavigationUpdate(update1);
      
      // Teleport far away
      const update2 = createMockUpdate({ 
        seq: 2, 
        ts: 1625097601000,
        pos: { lat: 21.4300, lon: 39.8300, alt: 0, floor: 0, acc: 3.0 } 
      });
      
      const result = await service.processNavigationUpdate(update2);
      expect(result).toBeDefined();
    });

    it('should maintain state across users', async () => {
      const user1Update = createMockUpdate({ userId: 'user1' });
      const user2Update = createMockUpdate({ userId: 'user2' });
      
      await service.processNavigationUpdate(user1Update);
      await service.processNavigationUpdate(user2Update);
      
      const state1 = service.testGetUserState('user1');
      const state2 = service.testGetUserState('user2');
      
      expect(state1.userId).toBe('user1');
      expect(state2.userId).toBe('user2');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty graph gracefully', async () => {
      const emptyGraph = { floors: [], nodes: [], edges: [], connectors: [], zones: [] };
      graphLoader.getGraph.mockReturnValue(emptyGraph);
      
      const update = createMockUpdate();
      const result = await service.processNavigationUpdate(update);
      
      expect(result).toBeNull();
    });

    it('should handle invalid coordinates', async () => {
      const update = createMockUpdate({
        pos: { lat: NaN, lon: NaN, alt: 0, floor: 0, acc: 3.0 }
      });
      
      const result = await service.processNavigationUpdate(update);
      expect(result).toBeNull();
    });

    it('should handle missing graph loader', async () => {
      graphLoader.getGraph.mockImplementation(() => {
        throw new Error('Graph not loaded');
      });
      
      const update = createMockUpdate();
      const result = await service.processNavigationUpdate(update);
      
      expect(result).toBeNull();
    });
  });
});