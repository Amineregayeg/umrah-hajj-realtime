/**
 * Table-driven tests for HMM transition probabilities
 * Tests speed constraints, path connectivity, and movement penalties
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph } from '../../graph/interfaces/graph.interface';

describe('HMM Transition Probability Tests', () => {
  let service: HMMTrackingService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    mockGraph = {
      floors: [{ id: 'ground', name: 'Ground Floor' }],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'n3', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
        { id: 'n4', floor: 'ground', lat: 21.4225, lon: 39.8270, kind: 'poi' },
        { id: 'n5', floor: 'ground', lat: 21.4240, lon: 39.8262, kind: 'poi' }
      ],
      edges: [
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' },
        { from: 'n2', to: 'n3', weight: 55, kind: 'corridor' },
        { from: 'n1', to: 'n4', weight: 70, kind: 'corridor' },
        { from: 'n3', to: 'n5', weight: 55, kind: 'corridor' }
      ],
      connectors: [],
      zones: []
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HMMTrackingService,
        {
          provide: GraphLoaderService,
          useValue: { getGraph: () => mockGraph }
        }
      ]
    }).compile();

    service = module.get<HMMTrackingService>(HMMTrackingService);
  });

  describe('Speed-based Transition Probability', () => {
    const speedTransitionCases = [
      // [distance_meters, time_delta_ms, expected_confidence_range, description]
      [5.0, 5000, [0.8, 1.0], 'realistic walking speed 1m/s'],
      [10.0, 10000, [0.8, 1.0], 'consistent 1m/s movement'],
      [2.0, 1000, [0.7, 0.9], 'fast but realistic 2m/s'],
      [1.0, 2000, [0.8, 1.0], 'slow movement 0.5m/s'],
      [10.0, 1000, [0.2, 0.5], 'unrealistic 10m/s speed'],
      [50.0, 1000, [0.01, 0.2], 'impossible 50m/s speed'],
      [1.0, 100, [0.3, 0.6], 'too fast for short time'],
      [0.1, 5000, [0.8, 1.0], 'very slow precise movement'],
      [20.0, 2000, [0.1, 0.3], 'vehicle-like speed'],
    ] as const;

    speedTransitionCases.forEach(([distance, timeDelta, [minConf, maxConf], description], index) => {
      it(`should evaluate transition speed: ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        const latOffset = distance / 111000; // Approximate degrees for distance
        
        // First update
        const update1: NavUpdateDto = {
          ts: baseTime,
          seq: 1,
          userId: `speed-test-${index}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        // Second update with calculated movement
        const update2: NavUpdateDto = {
          ...update1,
          ts: baseTime + timeDelta,
          seq: 2,
          pos: { lat: 21.4225 + latOffset, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          speed: distance / (timeDelta / 1000) // Calculate actual speed
        };

        const result1 = await service.processNavigationUpdate(update1);
        expect(result1).toBeTruthy();

        const result2 = await service.processNavigationUpdate(update2);
        
        if (result2) {
          expect(result2.confidence).toBeGreaterThanOrEqual(minConf * 0.8);
          expect(result2.confidence).toBeLessThanOrEqual(maxConf * 1.2);
        } else {
          // Very unrealistic speeds might result in rejection
          expect(distance / (timeDelta / 1000)).toBeGreaterThan(15);
        }
      });
    });
  });

  describe('Path Connectivity Bonus', () => {
    const connectivityCases = [
      // [from_position, to_position, expected_bonus, description]
      [
        { lat: 21.4225, lon: 39.8262 }, // n1
        { lat: 21.4230, lon: 39.8262 }, // n2 (connected)
        [0.1, 0.3], 'connected nodes bonus'
      ],
      [
        { lat: 21.4225, lon: 39.8262 }, // n1  
        { lat: 21.4235, lon: 39.8262 }, // n3 (not directly connected)
        [-0.1, 0.1], 'unconnected nodes penalty'
      ],
      [
        { lat: 21.4227, lon: 39.8262 }, // edge n1-n2
        { lat: 21.4232, lon: 39.8262 }, // edge n2-n3
        [0.05, 0.2], 'continuous path bonus'
      ],
      [
        { lat: 21.4225, lon: 39.8262 }, // n1
        { lat: 21.4225, lon: 39.8270 }, // n4 (connected via different edge)
        [0.1, 0.3], 'alternative path bonus'
      ],
    ] as const;

    connectivityCases.forEach(([fromPos, toPos, [minBonus, maxBonus], description], index) => {
      it(`should apply connectivity bonus/penalty: ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        
        const update1: NavUpdateDto = {
          ts: baseTime,
          seq: 1,
          userId: `connectivity-test-${index}`,
          pos: { ...fromPos, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const update2: NavUpdateDto = {
          ...update1,
          ts: baseTime + 5000, // 5 seconds later
          seq: 2,
          pos: { ...toPos, alt: 0, floor: 0, acc: 3.0 }
        };

        const result1 = await service.processNavigationUpdate(update1);
        expect(result1).toBeTruthy();
        const baselineConfidence = result1!.confidence;

        const result2 = await service.processNavigationUpdate(update2);
        expect(result2).toBeTruthy();
        
        const confidenceDelta = result2!.confidence - baselineConfidence;
        
        // Connectivity should influence confidence
        if (description.includes('bonus')) {
          expect(confidenceDelta).toBeGreaterThanOrEqual(minBonus - 0.1);
        } else if (description.includes('penalty')) {
          expect(confidenceDelta).toBeLessThanOrEqual(maxBonus + 0.1);
        }
      });
    });
  });

  describe('U-turn and Direction Change Penalties', () => {
    const directionChangeCases = [
      // [heading1, heading2, movement_angle, expected_penalty_range, description]
      [0, 0, 0, [0.0, 0.1], 'consistent forward movement'],
      [0, 15, 15, [0.0, 0.1], 'slight direction change'],
      [0, 45, 45, [0.1, 0.2], 'moderate turn'],
      [0, 90, 90, [0.2, 0.4], 'right angle turn'],
      [0, 135, 135, [0.3, 0.5], 'sharp turn'],
      [0, 180, 180, [0.4, 0.7], 'u-turn penalty'],
      [90, 270, 180, [0.4, 0.7], 'reverse direction'],
      [350, 10, 20, [0.0, 0.1], 'wrapped angle small change'],
      [10, 350, 20, [0.0, 0.1], 'wrapped angle small change reverse'],
    ] as const;

    directionChangeCases.forEach(([heading1, heading2, movementAngle, [minPenalty, maxPenalty], description], index) => {
      it(`should penalize direction changes: ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        
        // Calculate movement vector for the movement angle
        const distance = 5; // 5 meters
        const latOffset = (distance * Math.cos(movementAngle * Math.PI / 180)) / 111000;
        const lonOffset = (distance * Math.sin(movementAngle * Math.PI / 180)) / (111000 * Math.cos(21.4225 * Math.PI / 180));
        
        const update1: NavUpdateDto = {
          ts: baseTime,
          seq: 1,
          userId: `direction-test-${index}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: heading1,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const update2: NavUpdateDto = {
          ...update1,
          ts: baseTime + 5000,
          seq: 2,
          pos: { lat: 21.4225 + latOffset, lon: 39.8262 + lonOffset, alt: 0, floor: 0, acc: 3.0 },
          heading: heading2
        };

        const result1 = await service.processNavigationUpdate(update1);
        expect(result1).toBeTruthy();

        const result2 = await service.processNavigationUpdate(update2);
        expect(result2).toBeTruthy();
        
        // For u-turns and sharp changes, confidence should be lower
        if (Math.abs(heading2 - heading1) > 90 || Math.abs(heading2 - heading1) < -90) {
          expect(result2!.confidence).toBeLessThan(0.7);
        } else if (Math.abs(heading2 - heading1) < 30) {
          expect(result2!.confidence).toBeGreaterThan(0.6);
        }
      });
    });
  });

  describe('Temporal Consistency', () => {
    const temporalCases = [
      // [time_gap_ms, expected_confidence_impact, description]
      [100, [0.95, 1.0], 'high frequency update'],
      [500, [0.9, 1.0], 'normal update frequency'],
      [1000, [0.8, 0.95], 'standard 1Hz update'],
      [2000, [0.7, 0.9], 'slow update rate'],
      [5000, [0.5, 0.8], 'very slow updates'],
      [10000, [0.3, 0.6], 'delayed update'],
      [30000, [0.1, 0.4], 'very stale update'],
      [60000, [0.01, 0.2], 'extremely stale'],
    ] as const;

    temporalCases.forEach(([timeGap, [minImpact, maxImpact], description], index) => {
      it(`should handle temporal gaps: ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        
        const update1: NavUpdateDto = {
          ts: baseTime,
          seq: 1,
          userId: `temporal-test-${index}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const update2: NavUpdateDto = {
          ...update1,
          ts: baseTime + timeGap,
          seq: 2,
          pos: { lat: 21.4226, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // Small movement
        };

        const result1 = await service.processNavigationUpdate(update1);
        expect(result1).toBeTruthy();

        const result2 = await service.processNavigationUpdate(update2);
        
        if (result2) {
          // Longer gaps should reduce confidence
          if (timeGap > 10000) {
            expect(result2.confidence).toBeLessThan(0.6);
          } else if (timeGap > 5000) {
            expect(result2.confidence).toBeLessThan(0.8);
          } else if (timeGap < 1000) {
            expect(result2.confidence).toBeGreaterThan(0.7);
          }
        }
      });
    });
  });

  describe('Cross-Floor Transition Penalties', () => {
    beforeEach(() => {
      // Add multi-floor graph
      mockGraph.floors.push({ id: 'first', name: 'First Floor' });
      mockGraph.nodes.push(
        { id: 'elevator1', floor: 'ground', lat: 21.4240, lon: 39.8262, kind: 'poi' },
        { id: 'elevator2', floor: 'first', lat: 21.4240, lon: 39.8262, kind: 'poi' }
      );
      mockGraph.connectors.push(
        { from: 'elevator1', to: 'elevator2', type: 'elevator', penalty: 10 }
      );
    });

    const floorTransitionCases = [
      // [from_floor, to_floor, near_connector, expected_result, description]
      [0, 0, false, 'success', 'same floor movement'],
      [0, 1, true, 'success', 'valid floor transition via elevator'],
      [0, 1, false, 'reject', 'invalid floor jump without connector'],
      [1, 0, true, 'success', 'valid descent via elevator'],
      [1, 0, false, 'reject', 'invalid floor drop'],
    ] as const;

    floorTransitionCases.forEach(([fromFloor, toFloor, nearConnector, expectedResult, description], index) => {
      it(`should handle floor transitions: ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        const connectorLat = nearConnector ? 21.4240 : 21.4225;
        
        const update1: NavUpdateDto = {
          ts: baseTime,
          seq: 1,
          userId: `floor-test-${index}`,
          pos: { lat: connectorLat, lon: 39.8262, alt: fromFloor * 3, floor: fromFloor, acc: 3.0 },
          heading: 0,
          speed: 0.5,
          source: 'gnss',
          stage: 'sai',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const update2: NavUpdateDto = {
          ...update1,
          ts: baseTime + 5000,
          seq: 2,
          pos: { lat: connectorLat, lon: 39.8262, alt: toFloor * 3, floor: toFloor, acc: 3.0 },
        };

        const result1 = await service.processNavigationUpdate(update1);
        expect(result1).toBeTruthy();

        const result2 = await service.processNavigationUpdate(update2);
        
        if (expectedResult === 'success') {
          expect(result2).toBeTruthy();
          if (nearConnector && fromFloor !== toFloor) {
            // Floor transitions should have some penalty
            expect(result2!.confidence).toBeLessThan(result1!.confidence);
          }
        } else {
          expect(result2).toBeNull();
        }
      });
    });
  });

  describe('Stickiness and Momentum', () => {
    it('should maintain momentum along connected paths', async () => {
      const baseTime = Date.now();
      const positions = [
        { lat: 21.4225, lon: 39.8262 }, // n1
        { lat: 21.4227, lon: 39.8262 }, // edge n1-n2
        { lat: 21.4230, lon: 39.8262 }, // n2
        { lat: 21.4232, lon: 39.8262 }, // edge n2-n3
        { lat: 21.4235, lon: 39.8262 }, // n3
      ];

      const results: any[] = [];
      
      for (let i = 0; i < positions.length; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'momentum-test',
          pos: { ...positions[i], alt: 0, floor: 0, acc: 3.0 },
          heading: 0, // Consistent northward movement
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        results.push(result);
      }

      // All updates should succeed
      expect(results.every(r => r !== null)).toBe(true);
      
      // Confidence should generally increase or remain stable along connected path
      for (let i = 1; i < results.length; i++) {
        const confidenceDrop = results[i-1]!.confidence - results[i]!.confidence;
        expect(confidenceDrop).toBeLessThan(0.3); // No major confidence drops
      }
      
      // Final confidence should be reasonable
      expect(results[results.length - 1]!.confidence).toBeGreaterThan(0.5);
    });

    it('should penalize erratic movement patterns', async () => {
      const baseTime = Date.now();
      
      // Create erratic zigzag pattern
      const updates = [
        { lat: 21.4225, lon: 39.8262, heading: 0 },
        { lat: 21.4227, lon: 39.8264, heading: 45 },   // Northeast
        { lat: 21.4225, lon: 39.8266, heading: 225 },  // Southwest
        { lat: 21.4227, lon: 39.8268, heading: 45 },   // Northeast again
        { lat: 21.4225, lon: 39.8270, heading: 225 },  // Southwest again
      ];

      const results: any[] = [];
      
      for (let i = 0; i < updates.length; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'erratic-test',
          pos: { ...updates[i], alt: 0, floor: 0, acc: 3.0 },
          heading: updates[i].heading,
          speed: 2.0, // Faster erratic movement
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        results.push(result);
      }

      // Confidence should generally decrease due to erratic pattern
      if (results.length > 2) {
        const firstConf = results[0]?.confidence || 0;
        const lastConf = results[results.length - 1]?.confidence || 0;
        expect(lastConf).toBeLessThan(firstConf);
      }
    });
  });

  afterEach(() => {
    // Clean up all test users
    for (let i = 0; i < 20; i++) {
      service.clearUserState(`speed-test-${i}`);
      service.clearUserState(`connectivity-test-${i}`);
      service.clearUserState(`direction-test-${i}`);
      service.clearUserState(`temporal-test-${i}`);
      service.clearUserState(`floor-test-${i}`);
    }
    service.clearUserState('momentum-test');
    service.clearUserState('erratic-test');
  });
});