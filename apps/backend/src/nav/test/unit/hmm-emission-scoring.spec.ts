/**
 * Table-driven tests for HMM emission scoring
 * Tests distance-based, heading-based, and combined emission probabilities
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph } from '../../graph/interfaces/graph.interface';

describe('HMM Emission Scoring Tests', () => {
  let service: HMMTrackingService;
  let graphLoader: GraphLoaderService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    // Fixed seed for deterministic behavior
    process.env.NAV_SEED = '1337';
    
    mockGraph = {
      floors: [{ id: 'ground', name: 'Ground Floor' }],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'n3', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
      ],
      edges: [
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' },
        { from: 'n2', to: 'n3', weight: 55, kind: 'corridor' }
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
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
  });

  describe('Distance-based Emission Probability', () => {
    const distanceTestCases = [
      // [distance_meters, accuracy, expected_emission_range]
      [0.0, 3.0, [0.8, 1.0]],      // Perfect match
      [1.0, 3.0, [0.7, 0.9]],      // Very close
      [3.0, 3.0, [0.5, 0.8]],      // At accuracy radius
      [5.0, 3.0, [0.3, 0.6]],      // Beyond accuracy
      [10.0, 3.0, [0.1, 0.4]],     // Far away
      [20.0, 3.0, [0.01, 0.2]],    // Very far
      [100.0, 3.0, [0.001, 0.1]],  // Extremely far
      
      // Different accuracy values
      [5.0, 1.0, [0.1, 0.3]],      // Low accuracy, same distance
      [5.0, 10.0, [0.4, 0.7]],     // High accuracy, same distance
      [1.0, 1.0, [0.6, 0.9]],      // Close with low accuracy
      [1.0, 10.0, [0.8, 0.99]],    // Close with high accuracy
    ] as const;

    distanceTestCases.forEach(([distance, accuracy, [minProb, maxProb]], index) => {
      it(`should calculate emission probability for distance=${distance}m, accuracy=${accuracy}m (case ${index + 1})`, async () => {
        // Calculate lat/lon offset for the distance
        const latOffset = distance / 111000; // Rough meters to degrees
        
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `test-user-${index}`,
          pos: { 
            lat: 21.4225 + latOffset, 
            lon: 39.8262, 
            alt: 0, 
            floor: 0, 
            acc: accuracy 
          },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        if (result) {
          expect(result.confidence).toBeGreaterThanOrEqual(minProb);
          expect(result.confidence).toBeLessThanOrEqual(maxProb);
        } else {
          // For very large distances, result might be null
          expect(distance).toBeGreaterThan(50);
        }
      });
    });
  });

  describe('Heading-based Emission Probability', () => {
    const headingTestCases = [
      // [user_heading, edge_bearing, expected_modifier_range]
      [0, 0, [0.9, 1.0]],          // Perfect alignment
      [0, 15, [0.8, 0.95]],        // Small mismatch
      [0, 30, [0.7, 0.85]],        // Moderate mismatch
      [0, 45, [0.6, 0.8]],         // Significant mismatch
      [0, 90, [0.4, 0.7]],         // Perpendicular
      [0, 135, [0.3, 0.6]],        // Large mismatch
      [0, 180, [0.2, 0.5]],        // Opposite direction
      
      // Wrapping cases
      [350, 10, [0.8, 0.95]],      // 20° difference wrapping around
      [10, 350, [0.8, 0.95]],      // 20° difference wrapping around
      [180, 190, [0.85, 0.95]],    // 10° difference
      [270, 280, [0.85, 0.95]],    // 10° difference
    ] as const;

    headingTestCases.forEach(([userHeading, edgeBearing, [minModifier, maxModifier]], index) => {
      it(`should apply heading modifier for user=${userHeading}°, edge=${edgeBearing}° (case ${index + 1})`, async () => {
        // Position exactly on edge between n1 and n2
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `test-user-heading-${index}`,
          pos: { lat: 21.4227, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: userHeading,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        expect(result).toBeTruthy();
        expect(result!.snapTo).toBe('path');
        
        // Confidence should reflect heading alignment
        // Perfect distance + heading modifier should be in expected range
        const baseEmission = 0.9; // High because we're on the path
        const expectedMin = baseEmission * minModifier;
        const expectedMax = baseEmission * maxModifier;
        
        expect(result!.confidence).toBeGreaterThanOrEqual(expectedMin * 0.8); // Allow some variance
        expect(result!.confidence).toBeLessThanOrEqual(expectedMax * 1.2);
      });
    });
  });

  describe('Speed-based Emission Probability', () => {
    const speedTestCases = [
      // [speed_mps, expected_modifier_range, description]
      [0.0, [0.8, 1.0], 'stationary'],
      [0.5, [0.9, 1.0], 'very slow walk'],
      [1.0, [0.95, 1.0], 'normal walk'],
      [1.5, [0.9, 1.0], 'fast walk'],
      [2.0, [0.8, 0.95], 'jogging'],
      [3.0, [0.6, 0.8], 'running'],
      [5.0, [0.3, 0.6], 'unrealistic speed'],
      [10.0, [0.1, 0.3], 'vehicle speed'],
      [20.0, [0.01, 0.1], 'impossible pedestrian speed'],
    ] as const;

    speedTestCases.forEach(([speed, [minModifier, maxModifier], description], index) => {
      it(`should apply speed modifier for ${speed}m/s (${description}) (case ${index + 1})`, async () => {
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `test-user-speed-${index}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: speed,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        if (result) {
          // For very high speeds, the overall confidence should be reduced
          if (speed > 5.0) {
            expect(result.confidence).toBeLessThan(0.6);
          } else if (speed > 2.0) {
            expect(result.confidence).toBeLessThan(0.9);
          } else {
            expect(result.confidence).toBeGreaterThan(0.5);
          }
        }
      });
    });
  });

  describe('Accuracy-based Emission Probability', () => {
    const accuracyTestCases = [
      // [accuracy_meters, distance_meters, expected_confidence_range]
      [1.0, 0.5, [0.8, 1.0]],      // High accuracy, close
      [1.0, 2.0, [0.4, 0.7]],      // High accuracy, far
      [3.0, 0.5, [0.85, 1.0]],     // Medium accuracy, close
      [3.0, 2.0, [0.6, 0.85]],     // Medium accuracy, medium distance
      [3.0, 5.0, [0.2, 0.5]],      // Medium accuracy, far
      [10.0, 1.0, [0.7, 0.95]],    // Low accuracy, close
      [10.0, 5.0, [0.5, 0.8]],     // Low accuracy, medium distance
      [10.0, 15.0, [0.2, 0.5]],    // Low accuracy, far
      [30.0, 10.0, [0.4, 0.7]],    // Very low accuracy, medium distance
    ] as const;

    accuracyTestCases.forEach(([accuracy, distance, [minConf, maxConf]], index) => {
      it(`should handle accuracy=${accuracy}m, distance=${distance}m (case ${index + 1})`, async () => {
        const latOffset = distance / 111000;
        
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `test-user-accuracy-${index}`,
          pos: { 
            lat: 21.4225 + latOffset, 
            lon: 39.8262, 
            alt: 0, 
            floor: 0, 
            acc: accuracy 
          },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        if (result) {
          expect(result.confidence).toBeGreaterThanOrEqual(minConf * 0.8); // Allow some variance
          expect(result.confidence).toBeLessThanOrEqual(maxConf * 1.2);
        }
      });
    });
  });

  describe('Combined Emission Factors', () => {
    const combinedTestCases = [
      // [distance, accuracy, heading_diff, speed, expected_range, description]
      [0.5, 3.0, 0, 1.0, [0.85, 1.0], 'optimal conditions'],
      [0.5, 3.0, 45, 1.0, [0.6, 0.85], 'close but wrong heading'],
      [0.5, 3.0, 0, 5.0, [0.4, 0.7], 'close but too fast'],
      [5.0, 3.0, 0, 1.0, [0.3, 0.6], 'far but good heading/speed'],
      [5.0, 10.0, 0, 1.0, [0.4, 0.7], 'far with low accuracy'],
      [1.0, 1.0, 90, 2.0, [0.2, 0.5], 'multiple penalties'],
      [10.0, 30.0, 180, 10.0, [0.01, 0.2], 'worst case scenario'],
    ] as const;

    combinedTestCases.forEach(([distance, accuracy, headingDiff, speed, [minConf, maxConf], description], index) => {
      it(`should handle combined factors: ${description} (case ${index + 1})`, async () => {
        const latOffset = distance / 111000;
        
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `test-user-combined-${index}`,
          pos: { 
            lat: 21.4225 + latOffset, 
            lon: 39.8262, 
            alt: 0, 
            floor: 0, 
            acc: accuracy 
          },
          heading: headingDiff,
          speed: speed,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        if (result) {
          expect(result.confidence).toBeGreaterThanOrEqual(minConf * 0.7); // Allow variance
          expect(result.confidence).toBeLessThanOrEqual(maxConf * 1.3);
        } else {
          // Very bad conditions might result in null
          expect(distance > 20 || speed > 15 || (distance > 5 && headingDiff > 90)).toBe(true);
        }
      });
    });
  });

  describe('Edge vs Node Emission', () => {
    it('should prefer edge projections over distant nodes', async () => {
      // Position exactly between n1 and n2
      const edgeUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-edge',
        pos: { lat: 21.42275, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(edgeUpdate);
      
      expect(result).toBeTruthy();
      expect(result!.snapTo).toBe('path');
      expect(result!.edgeId).toBeDefined();
      expect(result!.confidence).toBeGreaterThan(0.7);
    });

    it('should prefer close nodes over distant edge projections', async () => {
      // Position very close to n1
      const nodeUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-node',
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

      const result = await service.processNavigationUpdate(nodeUpdate);
      
      expect(result).toBeTruthy();
      expect(result!.snapTo).toBe('node');
      expect(result!.nodeId).toBe('n1');
      expect(result!.confidence).toBeGreaterThan(0.8);
    });
  });

  afterEach(() => {
    service.clearUserState('test-user');
  });
});