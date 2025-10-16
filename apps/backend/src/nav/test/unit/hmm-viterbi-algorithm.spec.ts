/**
 * Table-driven tests for HMM Viterbi algorithm implementation
 * Tests path finding, candidate pruning, and state tracking
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph } from '../../graph/interfaces/graph.interface';

describe('HMM Viterbi Algorithm Tests', () => {
  let service: HMMTrackingService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    // Create a more complex graph for Viterbi testing
    mockGraph = {
      floors: [{ id: 'ground', name: 'Ground Floor' }],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'n3', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
        { id: 'n4', floor: 'ground', lat: 21.4240, lon: 39.8262, kind: 'poi' },
        { id: 'n5', floor: 'ground', lat: 21.4225, lon: 39.8270, kind: 'poi' },
        { id: 'n6', floor: 'ground', lat: 21.4230, lon: 39.8270, kind: 'poi' },
        { id: 'n7', floor: 'ground', lat: 21.4235, lon: 39.8270, kind: 'poi' },
        { id: 'n8', floor: 'ground', lat: 21.4240, lon: 39.8270, kind: 'poi' }
      ],
      edges: [
        // Main north-south corridor
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' },
        { from: 'n2', to: 'n3', weight: 55, kind: 'corridor' },
        { from: 'n3', to: 'n4', weight: 55, kind: 'corridor' },
        
        // Parallel corridor
        { from: 'n5', to: 'n6', weight: 55, kind: 'corridor' },
        { from: 'n6', to: 'n7', weight: 55, kind: 'corridor' },
        { from: 'n7', to: 'n8', weight: 55, kind: 'corridor' },
        
        // Cross connections
        { from: 'n1', to: 'n5', weight: 70, kind: 'corridor' },
        { from: 'n2', to: 'n6', weight: 70, kind: 'corridor' },
        { from: 'n3', to: 'n7', weight: 70, kind: 'corridor' },
        { from: 'n4', to: 'n8', weight: 70, kind: 'corridor' },
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

  describe('Initial State Distribution', () => {
    const initializationCases = [
      // [position, expected_candidates, description]
      [
        { lat: 21.4225, lon: 39.8262 }, // Exactly on n1
        ['n1'], 'exact node match'
      ],
      [
        { lat: 21.4227, lon: 39.8262 }, // Between n1 and n2
        ['n1', 'n2'], 'between two nodes'
      ],
      [
        { lat: 21.4232, lon: 39.8266 }, // Center of graph
        ['n2', 'n3', 'n6', 'n7'], 'central position multiple candidates'
      ],
      [
        { lat: 21.4220, lon: 39.8260 }, // South-west of graph
        ['n1', 'n5'], 'edge of coverage area'
      ],
      [
        { lat: 21.4250, lon: 39.8280 }, // Far from any node
        [], 'outside coverage area'
      ]
    ] as const;

    initializationCases.forEach(([position, expectedCandidates, description], index) => {
      it(`should initialize correctly for ${description} (case ${index + 1})`, async () => {
        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `init-test-${index}`,
          pos: { ...position, alt: 0, floor: 0, acc: 5.0 },
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
        
        if (expectedCandidates.length > 0) {
          expect(result).toBeTruthy();
          expect(result!.position).toBeDefined();
          
          // Should snap to one of the expected candidates
          if (result!.snapTo === 'node') {
            expect(expectedCandidates).toContain(result!.nodeId);
          } else if (result!.snapTo === 'path') {
            expect(result!.edgeId).toBeDefined();
          }
        } else {
          // Far positions might return null or very low confidence
          if (result) {
            expect(result.confidence).toBeLessThan(0.3);
          }
        }
      });
    });
  });

  describe('State Transition and Path Selection', () => {
    const pathFollowingCases = [
      // [path_coordinates, expected_path_quality, description]
      [
        [
          { lat: 21.4225, lon: 39.8262 }, // n1
          { lat: 21.4227, lon: 39.8262 }, // edge n1-n2
          { lat: 21.4230, lon: 39.8262 }, // n2
          { lat: 21.4232, lon: 39.8262 }, // edge n2-n3
          { lat: 21.4235, lon: 39.8262 }  // n3
        ],
        [0.8, 1.0], 'straight path following'
      ],
      [
        [
          { lat: 21.4225, lon: 39.8262 }, // n1
          { lat: 21.4225, lon: 39.8266 }, // towards n5
          { lat: 21.4225, lon: 39.8270 }, // n5
          { lat: 21.4227, lon: 39.8270 }, // edge n5-n6
          { lat: 21.4230, lon: 39.8270 }  // n6
        ],
        [0.7, 0.9], 'corner turn path'
      ],
      [
        [
          { lat: 21.4225, lon: 39.8262 }, // n1
          { lat: 21.4235, lon: 39.8262 }, // jump to n3
          { lat: 21.4225, lon: 39.8262 }, // back to n1
          { lat: 21.4235, lon: 39.8262 }, // back to n3
        ],
        [0.2, 0.5], 'erratic jumping'
      ],
      [
        [
          { lat: 21.4227, lon: 39.8262 }, // edge n1-n2
          { lat: 21.4228, lon: 39.8262 }, // slightly forward
          { lat: 21.4229, lon: 39.8262 }, // more forward
          { lat: 21.4230, lon: 39.8262 }, // reach n2
        ],
        [0.8, 1.0], 'gradual edge progression'
      ]
    ] as const;

    pathFollowingCases.forEach(([pathCoords, [minQuality, maxQuality], description], index) => {
      it(`should handle ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        const results: any[] = [];
        
        for (let i = 0; i < pathCoords.length; i++) {
          const update: NavUpdateDto = {
            ts: baseTime + (i * 1000),
            seq: i + 1,
            userId: `path-test-${index}`,
            pos: { ...pathCoords[i], alt: 0, floor: 0, acc: 3.0 },
            heading: i > 0 ? Math.atan2(
              pathCoords[i].lon - pathCoords[i-1].lon,
              pathCoords[i].lat - pathCoords[i-1].lat
            ) * 180 / Math.PI : 0,
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

        // Analyze path quality
        const successfulResults = results.filter(r => r !== null);
        expect(successfulResults.length).toBeGreaterThan(pathCoords.length * 0.7); // At least 70% success
        
        if (successfulResults.length > 0) {
          const avgConfidence = successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length;
          expect(avgConfidence).toBeGreaterThanOrEqual(minQuality * 0.8);
          expect(avgConfidence).toBeLessThanOrEqual(maxQuality * 1.2);
        }
      });
    });
  });

  describe('Candidate Pruning and Efficiency', () => {
    it('should limit candidate set size for efficiency', async () => {
      // Position that could match many candidates
      const update: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'pruning-test',
        pos: { lat: 21.4232, lon: 39.8266, alt: 0, floor: 0, acc: 20.0 }, // Large uncertainty
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.5,
        mode: 'guide',
        device: 'android'
      };

      const startTime = Date.now();
      const result = await service.processNavigationUpdate(update);
      const processingTime = Date.now() - startTime;

      expect(result).toBeTruthy();
      expect(processingTime).toBeLessThan(100); // Should be fast despite large uncertainty
    });

    it('should maintain reasonable performance with many candidates', async () => {
      const baseTime = Date.now();
      const processingTimes: number[] = [];
      
      // Create a sequence that could generate many candidates
      for (let i = 0; i < 10; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'performance-test',
          pos: { 
            lat: 21.4225 + (i * 0.00025), // Move slowly north
            lon: 39.8262 + (i * 0.00025), // Move slowly east
            alt: 0, 
            floor: 0, 
            acc: 15.0 // Large uncertainty
          },
          heading: 45, // Northeast
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.6,
          mode: 'guide',
          device: 'android'
        };

        const startTime = Date.now();
        const result = await service.processNavigationUpdate(update);
        const processingTime = Date.now() - startTime;
        
        expect(result).toBeTruthy();
        processingTimes.push(processingTime);
      }

      // All processing times should be reasonable
      expect(processingTimes.every(t => t < 200)).toBe(true);
      
      // Average should be even better
      const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
      expect(avgTime).toBeLessThan(100);
    });
  });

  describe('Backtracking and Path Recovery', () => {
    it('should recover from temporary bad positions', async () => {
      const baseTime = Date.now();
      
      // Start with good position
      const goodUpdate: NavUpdateDto = {
        ts: baseTime,
        seq: 1,
        userId: 'recovery-test',
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

      const result1 = await service.processNavigationUpdate(goodUpdate);
      expect(result1).toBeTruthy();
      expect(result1!.confidence).toBeGreaterThan(0.7);

      // Introduce bad position (outlier)
      const badUpdate: NavUpdateDto = {
        ...goodUpdate,
        ts: baseTime + 1000,
        seq: 2,
        pos: { lat: 21.4250, lon: 39.8290, alt: 0, floor: 0, acc: 3.0 }, // Far away
      };

      const result2 = await service.processNavigationUpdate(badUpdate);
      // Might be rejected or have very low confidence
      
      // Return to good area
      const recoveryUpdate: NavUpdateDto = {
        ...goodUpdate,
        ts: baseTime + 2000,
        seq: 3,
        pos: { lat: 21.4227, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // Back to good area
      };

      const result3 = await service.processNavigationUpdate(recoveryUpdate);
      expect(result3).toBeTruthy();
      expect(result3!.confidence).toBeGreaterThan(0.5); // Should recover
    });

    it('should maintain path consistency through noise', async () => {
      const baseTime = Date.now();
      const results: any[] = [];
      
      // Create path with Gaussian noise
      const truePath = [
        { lat: 21.4225, lon: 39.8262 },
        { lat: 21.4227, lon: 39.8262 },
        { lat: 21.4230, lon: 39.8262 },
        { lat: 21.4232, lon: 39.8262 },
        { lat: 21.4235, lon: 39.8262 }
      ];
      
      for (let i = 0; i < truePath.length; i++) {
        // Add small random noise
        const noise = {
          lat: (Math.random() - 0.5) * 0.00002, // ~2m noise
          lon: (Math.random() - 0.5) * 0.00002
        };
        
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'noise-test',
          pos: { 
            lat: truePath[i].lat + noise.lat,
            lon: truePath[i].lon + noise.lon,
            alt: 0, 
            floor: 0, 
            acc: 4.0 
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
        results.push(result);
      }

      // Should handle all noisy positions
      expect(results.every(r => r !== null)).toBe(true);
      
      // Path should be generally smooth (filtered positions closer to true path)
      for (let i = 0; i < results.length; i++) {
        const result = results[i]!;
        const truePos = truePath[i];
        const distance = Math.sqrt(
          Math.pow((result.position.lat - truePos.lat) * 111000, 2) +
          Math.pow((result.position.lon - truePos.lon) * 111000, 2)
        );
        expect(distance).toBeLessThan(10); // Within 10 meters of true path
      }
    });
  });

  describe('Multi-User State Isolation', () => {
    it('should maintain independent Viterbi states for different users', async () => {
      const baseTime = Date.now();
      
      // User 1: North path
      const user1Update1: NavUpdateDto = {
        ts: baseTime,
        seq: 1,
        userId: 'user-1',
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

      // User 2: East path
      const user2Update1: NavUpdateDto = {
        ts: baseTime,
        seq: 1,
        userId: 'user-2',
        pos: { lat: 21.4225, lon: 39.8270, alt: 0, floor: 0, acc: 3.0 },
        heading: 90,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      };

      const result1_1 = await service.processNavigationUpdate(user1Update1);
      const result2_1 = await service.processNavigationUpdate(user2Update1);
      
      expect(result1_1).toBeTruthy();
      expect(result2_1).toBeTruthy();

      // Continue with different paths
      const user1Update2: NavUpdateDto = {
        ...user1Update1,
        ts: baseTime + 1000,
        seq: 2,
        pos: { lat: 21.4230, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // North
      };

      const user2Update2: NavUpdateDto = {
        ...user2Update1,
        ts: baseTime + 1000,
        seq: 2,
        pos: { lat: 21.4230, lon: 39.8270, alt: 0, floor: 0, acc: 3.0 }, // Stay east
      };

      const result1_2 = await service.processNavigationUpdate(user1Update2);
      const result2_2 = await service.processNavigationUpdate(user2Update2);

      expect(result1_2).toBeTruthy();
      expect(result2_2).toBeTruthy();

      // Users should be in different areas
      const distance = Math.sqrt(
        Math.pow((result1_2!.position.lat - result2_2!.position.lat) * 111000, 2) +
        Math.pow((result1_2!.position.lon - result2_2!.position.lon) * 111000, 2)
      );
      expect(distance).toBeGreaterThan(50); // Should be at least 50m apart
    });
  });

  describe('Forward-Backward Algorithm Elements', () => {
    it('should smooth paths with RTS-like behavior', async () => {
      const baseTime = Date.now();
      const rawPositions: any[] = [];
      const smoothedPositions: any[] = [];
      
      // Create a path with some noise
      const trajectory = [
        { lat: 21.4225, lon: 39.8262 },
        { lat: 21.4227, lon: 39.8262 },
        { lat: 21.4229, lon: 39.8262 }, // Slight overshoot
        { lat: 21.4228, lon: 39.8262 }, // Correction
        { lat: 21.4230, lon: 39.8262 }, // Back on track
        { lat: 21.4232, lon: 39.8262 },
        { lat: 21.4235, lon: 39.8262 }
      ];
      
      for (let i = 0; i < trajectory.length; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'smoothing-test',
          pos: { ...trajectory[i], alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        rawPositions.push(trajectory[i]);
        
        const result = await service.processNavigationUpdate(update);
        expect(result).toBeTruthy();
        smoothedPositions.push(result!.position);
      }

      // Smoothed path should be more consistent than raw
      if (smoothedPositions.length > 2) {
        // Check for smoothness by looking at acceleration changes
        let rawJerk = 0;
        let smoothedJerk = 0;
        
        for (let i = 2; i < trajectory.length; i++) {
          // Calculate jerk (rate of change of acceleration) as smoothness measure
          const rawAccel1 = rawPositions[i-1].lat - rawPositions[i-2].lat;
          const rawAccel2 = rawPositions[i].lat - rawPositions[i-1].lat;
          rawJerk += Math.abs(rawAccel2 - rawAccel1);
          
          const smoothAccel1 = smoothedPositions[i-1].lat - smoothedPositions[i-2].lat;
          const smoothAccel2 = smoothedPositions[i].lat - smoothedPositions[i-1].lat;
          smoothedJerk += Math.abs(smoothAccel2 - smoothAccel1);
        }
        
        // Smoothed path should have less jerk (more consistent)
        expect(smoothedJerk).toBeLessThanOrEqual(rawJerk * 1.2); // Allow some tolerance
      }
    });
  });

  afterEach(() => {
    // Clean up test users
    for (let i = 0; i < 10; i++) {
      service.clearUserState(`init-test-${i}`);
      service.clearUserState(`path-test-${i}`);
    }
    service.clearUserState('pruning-test');
    service.clearUserState('performance-test');
    service.clearUserState('recovery-test');
    service.clearUserState('noise-test');
    service.clearUserState('user-1');
    service.clearUserState('user-2');
    service.clearUserState('smoothing-test');
  });
});