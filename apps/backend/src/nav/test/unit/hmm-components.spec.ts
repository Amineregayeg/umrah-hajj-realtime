/**
 * Comprehensive unit tests for HMM components
 * Tests emission/transition functions, Viterbi algorithm, teleport logic, etc.
 */

import { Test, TestingModule } from '@nestjs/testing';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph, Node, Edge, Connector } from '../../graph/interfaces/graph.interface';

describe('HMM Components Unit Tests', () => {
  let service: HMMTrackingService;
  let graphLoader: GraphLoaderService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    // Create mock graph
    mockGraph = {
      floors: [
        { id: 'ground', name: 'Ground Floor' },
        { id: 'first', name: 'First Floor' }
      ],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'n3', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
        { id: 'n4', floor: 'ground', lat: 21.4225, lon: 39.8270, kind: 'poi' },
        { id: 'elevator1', floor: 'ground', lat: 21.4240, lon: 39.8262, kind: 'poi' },
        { id: 'elevator2', floor: 'first', lat: 21.4240, lon: 39.8262, kind: 'poi' }
      ],
      edges: [
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' },
        { from: 'n2', to: 'n3', weight: 55, kind: 'corridor' },
        { from: 'n1', to: 'n4', weight: 70, kind: 'corridor' }
      ],
      connectors: [
        { from: 'elevator1', to: 'elevator2', type: 'elevator', penalty: 10 }
      ],
      zones: []
    };

    const mockGraphLoader = {
      getGraph: () => mockGraph
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HMMTrackingService,
        {
          provide: GraphLoaderService,
          useValue: mockGraphLoader
        }
      ]
    }).compile();

    service = module.get<HMMTrackingService>(HMMTrackingService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
  });

  afterEach(() => {
    // Clear all user states
    service.clearUserState('test-user');
  });

  describe('Emission Probability Function', () => {
    it('should calculate high emission probability for close candidates', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      // Process first update to initialize HMM state
      const result = await service.processNavigationUpdate(update);
      
      expect(result).toBeTruthy();
      expect(result!.confidence).toBeGreaterThan(0.5);
      expect(result!.position.lat).toBeCloseTo(21.4225, 4);
      expect(result!.position.lon).toBeCloseTo(39.8262, 4);
    });

    it('should calculate lower emission probability for distant candidates', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user',
        pos: { lat: 21.4250, lon: 39.8290, alt: 0, floor: 0, acc: 3.0 }, // Far from nodes
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
      
      // Should still get a result but with lower confidence
      expect(result).toBeTruthy();
      expect(result!.confidence).toBeLessThan(0.7);
    });

    it('should handle heading mismatch in emission probability', async () => {
      const update1: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { lat: 21.4227, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 180 // Opposite direction
      };

      await service.processNavigationUpdate(update1);
      const result = await service.processNavigationUpdate(update2);
      
      expect(result).toBeTruthy();
      // Confidence should be reduced due to heading mismatch
      expect(result!.confidence).toBeLessThan(0.8);
    });
  });

  describe('Transition Probability Function', () => {
    it('should favor realistic movement speeds', async () => {
      const baseTime = Date.now();
      
      const update1: NavUpdateDto = {
        ts: baseTime,
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
        device: 'android'
      };

      const update2: NavUpdateDto = {
        ...update1,
        ts: baseTime + 1000, // 1 second later
        seq: 2,
        pos: { lat: 21.4226, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // ~1m north (realistic)
        speed: 1.0
      };

      await service.processNavigationUpdate(update1);
      const result = await service.processNavigationUpdate(update2);
      
      expect(result).toBeTruthy();
      expect(result!.confidence).toBeGreaterThan(0.6);
    });

    it('should penalize unrealistic jumps', async () => {
      const baseTime = Date.now();
      
      const update1: NavUpdateDto = {
        ts: baseTime,
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
        device: 'android'
      };

      const update2: NavUpdateDto = {
        ...update1,
        ts: baseTime + 1000, // 1 second later
        seq: 2,
        pos: { lat: 21.4250, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // ~275m north (unrealistic)
        speed: 1.0
      };

      await service.processNavigationUpdate(update1);
      const result = await service.processNavigationUpdate(update2);
      
      expect(result).toBeTruthy();
      // Should have lower confidence due to unrealistic jump
      expect(result!.confidence).toBeLessThan(0.5);
    });

    it('should penalize u-turns', async () => {
      const baseTime = Date.now();
      
      const update1: NavUpdateDto = {
        ts: baseTime,
        seq: 1,
        userId: 'test-user',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0, // North
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
        ts: baseTime + 2000,
        seq: 2,
        pos: { lat: 21.4223, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // Moved south
        heading: 180, // South (u-turn)
        speed: 1.0
      };

      await service.processNavigationUpdate(update1);
      const result = await service.processNavigationUpdate(update2);
      
      expect(result).toBeTruthy();
      // Should have reduced confidence due to u-turn penalty
      expect(result!.confidence).toBeLessThan(0.7);
    });

    it('should bonus connected nodes', async () => {
      const baseTime = Date.now();
      
      // Start at n1
      const update1: NavUpdateDto = {
        ts: baseTime,
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
        device: 'android'
      };

      // Move to n2 (connected via edge)
      const update2: NavUpdateDto = {
        ...update1,
        ts: baseTime + 5000,
        seq: 2,
        pos: { lat: 21.4230, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        speed: 1.0
      };

      await service.processNavigationUpdate(update1);
      const result = await service.processNavigationUpdate(update2);
      
      expect(result).toBeTruthy();
      expect(result!.confidence).toBeGreaterThan(0.6);
      expect(result!.snapTo).toBe('node');
    });
  });

  describe('Viterbi Algorithm', () => {
    it('should initialize correctly on first observation', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      const result = await service.processNavigationUpdate(update);
      
      expect(result).toBeTruthy();
      expect(result!.position).toBeDefined();
      expect(result!.confidence).toBeGreaterThan(0);
    });

    it('should maintain path through multiple observations', async () => {
      const baseTime = Date.now();
      const results: any[] = [];
      
      // Simulate movement along n1 -> n2 -> n3
      for (let i = 0; i < 10; i++) {
        const lat = 21.4225 + (i * 0.0001); // Move north gradually
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId: 'test-user',
          pos: { lat, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
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

      // All results should be successful
      expect(results).toHaveLength(10);
      expect(results.every(r => r !== null)).toBe(true);
      
      // Path should be generally northward
      const firstLat = results[0]!.position.lat;
      const lastLat = results[9]!.position.lat;
      expect(lastLat).toBeGreaterThan(firstLat);
    });

    it('should handle edge projections correctly', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user',
        pos: { lat: 21.4227, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // Midway between n1 and n2
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
      
      expect(result).toBeTruthy();
      expect(result!.snapTo).toBe('path'); // Should snap to edge, not node
      expect(result!.edgeId).toBeDefined();
      expect(result!.position.lat).toBeCloseTo(21.4227, 3);
    });
  });

  describe('Teleport Detection and Reset', () => {
    it('should detect teleportation on large position jumps', async () => {
      const baseTime = Date.now();
      
      // Normal position
      const update1: NavUpdateDto = {
        ts: baseTime,
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
        device: 'android'
      };

      // Teleport jump
      const update2: NavUpdateDto = {
        ...update1,
        ts: baseTime + 1000,
        seq: 2,
        pos: { lat: 21.4300, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // ~833m jump
        speed: 1.0
      };

      const result1 = await service.processNavigationUpdate(update1);
      expect(result1).toBeTruthy();

      const result2 = await service.processNavigationUpdate(update2);
      
      // Should still process but may have different behavior
      expect(result2).toBeTruthy();
      
      // Test stats to verify teleport was detected
      const stats = service.getStats();
      expect(stats.teleportEvents).toBeGreaterThan(0);
    });

    it('should reset HMM state after consecutive teleports', async () => {
      const baseTime = Date.now();
      
      // Initial position
      await service.processNavigationUpdate({
        ts: baseTime,
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
        device: 'android'
      });

      // Create multiple consecutive teleports
      for (let i = 0; i < 4; i++) {
        await service.processNavigationUpdate({
          ts: baseTime + ((i + 1) * 1000),
          seq: i + 2,
          userId: 'test-user',
          pos: { lat: 21.4225 + ((i + 1) * 0.01), lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }, // Large jumps
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        });
      }

      // Verify teleport events were detected
      const stats = service.getStats();
      expect(stats.teleportEvents).toBeGreaterThan(0);
    });

    it('should recover correctly after teleport reset', async () => {
      const baseTime = Date.now();
      
      // Force teleport sequence
      await service.processNavigationUpdate({
        ts: baseTime,
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
        device: 'android'
      });

      // Create teleports to force reset
      for (let i = 0; i < 3; i++) {
        await service.processNavigationUpdate({
          ts: baseTime + ((i + 1) * 1000),
          seq: i + 2,
          userId: 'test-user',
          pos: { lat: 21.4300 + (i * 0.01), lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        });
      }

      // Now provide normal position - should recover
      const recoveryResult = await service.processNavigationUpdate({
        ts: baseTime + 5000,
        seq: 6,
        userId: 'test-user',
        pos: { lat: 21.4227, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      });

      expect(recoveryResult).toBeTruthy();
      expect(recoveryResult!.confidence).toBeGreaterThan(0.4);
    });
  });

  describe('Floor Connector Validation', () => {
    it('should allow floor transitions via valid connectors', async () => {
      // Start on ground floor at elevator
      const update1: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user',
        pos: { lat: 21.4240, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 0.5,
        source: 'gnss',
        stage: 'sai',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      };

      // Move to first floor via elevator
      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 5000,
        seq: 2,
        pos: { lat: 21.4240, lon: 39.8262, alt: 3, floor: 1, acc: 3.0 },
        confidence: 0.9 // High confidence
      };

      const result1 = await service.processNavigationUpdate(update1);
      expect(result1).toBeTruthy();

      const result2 = await service.processNavigationUpdate(update2);
      expect(result2).toBeTruthy();
      expect(result2!.position.floor).toBe('first');
    });

    it('should reject invalid floor transitions', async () => {
      // Start on ground floor away from elevators
      const update1: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      // Try to jump to first floor without using elevator
      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { lat: 21.4225, lon: 39.8262, alt: 3, floor: 1, acc: 3.0 },
        confidence: 0.9 // High confidence but invalid transition
      };

      const result1 = await service.processNavigationUpdate(update1);
      expect(result1).toBeTruthy();

      const result2 = await service.processNavigationUpdate(update2);
      // Should reject invalid floor transition
      expect(result2).toBeNull();
    });

    it('should allow floor transitions with low confidence', async () => {
      // Low confidence updates should be allowed even without connectors
      const update1: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { lat: 21.4225, lon: 39.8262, alt: 3, floor: 1, acc: 3.0 },
        confidence: 0.5 // Low confidence
      };

      const result1 = await service.processNavigationUpdate(update1);
      expect(result1).toBeTruthy();

      const result2 = await service.processNavigationUpdate(update2);
      // Should allow due to low confidence
      expect(result2).toBeTruthy();
    });
  });

  describe('Performance and Latency', () => {
    it('should process updates within 300ms latency requirement', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      const startTime = Date.now();
      const result = await service.processNavigationUpdate(update);
      const processingTime = Date.now() - startTime;

      expect(result).toBeTruthy();
      expect(processingTime).toBeLessThan(300); // Must be under 300ms
    });

    it('should handle burst of updates efficiently', async () => {
      const baseTime = Date.now();
      const processingTimes: number[] = [];

      for (let i = 0; i < 20; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 100), // 10Hz updates
          seq: i + 1,
          userId: 'test-user',
          pos: { lat: 21.4225 + (i * 0.00001), lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const startTime = Date.now();
        const result = await service.processNavigationUpdate(update);
        const processingTime = Date.now() - startTime;

        expect(result).toBeTruthy();
        processingTimes.push(processingTime);
      }

      // All updates should be processed within time limit
      expect(processingTimes.every(t => t < 300)).toBe(true);
      
      // Average processing time should be reasonable
      const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
      expect(avgTime).toBeLessThan(50); // Average should be much lower
    });
  });

  describe('Statistics and State Management', () => {
    it('should track user statistics correctly', async () => {
      const initialStats = service.getStats();
      expect(initialStats.activeUsers).toBe(0);

      await service.processNavigationUpdate({
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-1',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      });

      await service.processNavigationUpdate({
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-2',
        pos: { lat: 21.4230, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      });

      const stats = service.getStats();
      expect(stats.activeUsers).toBe(2);
      expect(stats.averageConfidence).toBeGreaterThan(0);
    });

    it('should clear user state correctly', async () => {
      await service.processNavigationUpdate({
        ts: Date.now(),
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
        device: 'android'
      });

      expect(service.getStats().activeUsers).toBe(1);

      service.clearUserState('test-user');
      expect(service.getStats().activeUsers).toBe(0);
    });

    it('should handle multiple users independently', async () => {
      const user1Updates = [
        { lat: 21.4225, lon: 39.8262 },
        { lat: 21.4227, lon: 39.8262 },
        { lat: 21.4229, lon: 39.8262 }
      ];

      const user2Updates = [
        { lat: 21.4235, lon: 39.8262 },
        { lat: 21.4233, lon: 39.8262 },
        { lat: 21.4231, lon: 39.8262 }
      ];

      // Process interleaved updates
      for (let i = 0; i < 3; i++) {
        await service.processNavigationUpdate({
          ts: Date.now() + (i * 1000),
          seq: i + 1,
          userId: 'user-1',
          pos: { ...user1Updates[i], alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        });

        await service.processNavigationUpdate({
          ts: Date.now() + (i * 1000),
          seq: i + 1,
          userId: 'user-2',
          pos: { ...user2Updates[i], alt: 0, floor: 0, acc: 3.0 },
          heading: 180,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        });
      }

      const stats = service.getStats();
      expect(stats.activeUsers).toBe(2);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty graph gracefully', async () => {
      // Mock empty graph
      jest.spyOn(graphLoader, 'getGraph').mockReturnValue({
        floors: [],
        nodes: [],
        edges: [],
        connectors: [],
        zones: []
      });

      const update: NavUpdateDto = {
        ts: Date.now(),
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
        device: 'android'
      };

      const result = await service.processNavigationUpdate(update);
      expect(result).toBeNull(); // Should return null for empty graph
    });

    it('should handle malformed coordinates', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user',
        pos: { lat: NaN, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
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
      expect(result).toBeNull(); // Should handle gracefully
    });

    it('should handle extreme values gracefully', async () => {
      const update: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1000, // Unrealistic speed
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(update);
      // Should process but with low confidence
      expect(result).toBeTruthy();
      expect(result!.confidence).toBeLessThan(0.7);
    });
  });
});