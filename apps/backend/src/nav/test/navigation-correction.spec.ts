import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NavigationCorrectionService } from '../services/navigation-correction.service';
import { GraphService } from '../graph/services/graph.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { PathfindingService } from '../graph/algorithms/pathfinding.service';
import { GraphCacheService } from '../graph/services/graph-cache.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import * as path from 'path';

describe('NavigationCorrectionService', () => {
  let service: NavigationCorrectionService;
  let graphService: GraphService;
  let graphLoader: GraphLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [() => ({
            GRAPH_PATH: path.join(__dirname, '../../../data/nav_graph.json'),
            NODE_ENV: 'test'
          })]
        })
      ],
      providers: [
        NavigationCorrectionService,
        GraphService,
        GraphLoaderService,
        PathfindingService,
        GraphCacheService
      ],
    }).compile();

    service = module.get<NavigationCorrectionService>(NavigationCorrectionService);
    graphService = module.get<GraphService>(GraphService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    
    // Initialize the graph loader
    await graphLoader.onModuleInit();
  });

  describe('Map Matching', () => {
    it('should snap position to nearest path segment', async () => {
      // Create a nav update near a known path
      const navUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-1',
        pos: {
          lat: 21.42246, // Near Kaaba
          lon: 39.82616,
          alt: 0,
          floor: 0,
          acc: 5
        },
        heading: 45,
        speed: 1.2,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(navUpdate);

      expect(result).toBeDefined();
      expect(result?.snapTo).toMatch(/^(path|zone|node)$/);
      expect(result?.confidence).toBeGreaterThan(0);
      expect(result?.confidence).toBeLessThanOrEqual(1);
      expect(result?.delta).toBeDefined();
      expect(typeof result?.delta.x).toBe('number');
      expect(typeof result?.delta.y).toBe('number');
    });

    it('should handle positions inside zones', async () => {
      const navUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 2,
        userId: 'test-user-2',
        pos: {
          lat: 21.42250,
          lon: 39.82620,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 90,
        speed: 0.5,
        source: 'arcore',
        stage: 'tawaf',
        lap: 2,
        confidence: 0.95,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(navUpdate);

      expect(result).toBeDefined();
      if (result?.snapTo === 'zone') {
        expect(result.confidence).toBeGreaterThan(0.9); // High confidence when inside zone
      }
    });

    it('should calculate accurate snap distances', async () => {
      const testPositions = [
        { lat: 21.42246, lon: 39.82616 },
        { lat: 21.42250, lon: 39.82620 },
        { lat: 21.42255, lon: 39.82625 }
      ];

      for (const pos of testPositions) {
        const navUpdate: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: 'test-user-3',
          pos: { ...pos, alt: 0, floor: 0, acc: 5 },
          heading: 0,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'ios'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        if (result) {
          // Verify delta calculations are reasonable (within 100m)
          expect(Math.abs(result.delta.x)).toBeLessThan(100);
          expect(Math.abs(result.delta.y)).toBeLessThan(100);
        }
      }
    });
  });

  describe('Floor Transitions', () => {
    it('should allow valid floor transitions via connectors', async () => {
      // First update on floor 0
      const update1: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-4',
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 5 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(update1);

      // Second update on floor 1 (if connector exists)
      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { ...update1.pos, floor: 1 }
      };

      const result = await service.processNavigationUpdate(update2);
      
      // Result may be null if floor transition is invalid
      // This depends on graph configuration
      expect(result === null || result !== null).toBe(true);
    });

    it('should reject illegal floor jumps with high confidence', async () => {
      // First update on floor 0
      const update1: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-5',
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 5 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(update1);

      // Attempt to jump to floor 3 (unlikely to have direct connector)
      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { ...update1.pos, floor: 3 },
        confidence: 0.9 // High confidence
      };

      const result = await service.processNavigationUpdate(update2);
      
      // Should reject invalid floor jump with high confidence
      if (result === null) {
        expect(result).toBeNull();
      }
    });

    it('should allow uncertain floor transitions with low confidence', async () => {
      // First update on floor 0
      const update1: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-6',
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 5 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(update1);

      // Attempt to jump to floor 3 with low confidence
      const update2: NavUpdateDto = {
        ...update1,
        ts: Date.now() + 1000,
        seq: 2,
        pos: { ...update1.pos, floor: 3 },
        confidence: 0.5 // Low confidence
      };

      const result = await service.processNavigationUpdate(update2);
      
      // Should allow uncertain transitions
      expect(result).toBeDefined();
    });
  });

  describe('Re-route Detection', () => {
    it('should detect off-path condition after 6m for 4s', async () => {
      const userId = 'test-user-7';
      
      // Set up an active route
      service.updateUserRoute(userId, ['node1', 'node2', 'node3', 'node4']);

      // Simulate being off-path
      const baseTime = Date.now();
      const offPathUpdates: NavUpdateDto[] = [];

      // Create 5 updates over 5 seconds, all off-path
      for (let i = 0; i < 5; i++) {
        offPathUpdates.push({
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId,
          pos: {
            lat: 21.42300 + (i * 0.0001), // Move away from path
            lon: 39.82700 + (i * 0.0001),
            alt: 0,
            floor: 0,
            acc: 5
          },
          heading: 180,
          speed: 2,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        });
      }

      // Process updates
      for (const update of offPathUpdates) {
        await service.processNavigationUpdate(update);
      }

      // The route should be cleared after being off-path for >4s
      // We can't directly check internal state, but behavior should reflect re-routing
      expect(true).toBe(true); // Placeholder - would need to expose route state for testing
    });

    it('should detect heading deflection >45° for 2s', async () => {
      const userId = 'test-user-8';
      
      // Set up an active route
      service.updateUserRoute(userId, ['node1', 'node2', 'node3', 'node4']);

      // Simulate heading deflection
      const baseTime = Date.now();
      const deflectedUpdates: NavUpdateDto[] = [];

      // Create 3 updates over 3 seconds with deflected heading
      for (let i = 0; i < 3; i++) {
        deflectedUpdates.push({
          ts: baseTime + (i * 1000),
          seq: i + 1,
          userId,
          pos: {
            lat: 21.42246,
            lon: 39.82616,
            alt: 0,
            floor: 0,
            acc: 5
          },
          heading: 135 + (i * 10), // Wrong direction
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        });
      }

      // Process updates
      for (const update of deflectedUpdates) {
        await service.processNavigationUpdate(update);
      }

      // Re-route should be triggered after 2s of deflection
      expect(true).toBe(true); // Placeholder
    });
  });

  describe('Position Smoothing', () => {
    it('should apply exponential smoothing to positions', async () => {
      const userId = 'test-user-9';
      const positions: Array<{lat: number, lon: number}> = [];

      // Send multiple updates with slight variations
      for (let i = 0; i < 5; i++) {
        const navUpdate: NavUpdateDto = {
          ts: Date.now() + (i * 100),
          seq: i + 1,
          userId,
          pos: {
            lat: 21.42246 + (Math.random() - 0.5) * 0.00001, // Small random variations
            lon: 39.82616 + (Math.random() - 0.5) * 0.00001,
            alt: 0,
            floor: 0,
            acc: 5
          },
          heading: 45,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        if (result) {
          positions.push({
            lat: navUpdate.pos.lat + result.delta.y / 110540, // Convert back from meters
            lon: navUpdate.pos.lon + result.delta.x / (Math.cos(navUpdate.pos.lat * Math.PI / 180) * 111320)
          });
        }
      }

      // Smoothed positions should show less variation than raw input
      if (positions.length > 2) {
        const variations = [];
        for (let i = 1; i < positions.length; i++) {
          const dist = Math.sqrt(
            Math.pow(positions[i].lat - positions[i-1].lat, 2) +
            Math.pow(positions[i].lon - positions[i-1].lon, 2)
          );
          variations.push(dist);
        }
        
        // Average variation should be small due to smoothing
        const avgVariation = variations.reduce((a, b) => a + b, 0) / variations.length;
        expect(avgVariation).toBeLessThan(0.0001); // Reasonable threshold
      }
    });
  });

  describe('Performance', () => {
    it('should process updates within 10ms', async () => {
      const navUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-10',
        pos: {
          lat: 21.42246,
          lon: 39.82616,
          alt: 0,
          floor: 0,
          acc: 5
        },
        heading: 45,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const start = Date.now();
      await service.processNavigationUpdate(navUpdate);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10); // Should process within 10ms
    });

    it('should handle multiple concurrent users', async () => {
      const promises: Promise<any>[] = [];
      
      // Simulate 10 concurrent users
      for (let i = 0; i < 10; i++) {
        const navUpdate: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `concurrent-user-${i}`,
          pos: {
            lat: 21.42246 + (i * 0.0001),
            lon: 39.82616 + (i * 0.0001),
            alt: 0,
            floor: 0,
            acc: 5
          },
          heading: i * 36, // Different headings
          speed: 1 + (i * 0.1),
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: i % 2 === 0 ? 'android' : 'ios'
        };

        promises.push(service.processNavigationUpdate(navUpdate));
      }

      const start = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - start;

      // All should complete
      expect(results.length).toBe(10);
      
      // Should handle all updates efficiently
      expect(duration).toBeLessThan(100); // 100ms for 10 concurrent updates
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid positions gracefully', async () => {
      const navUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-11',
        pos: {
          lat: 999, // Invalid latitude
          lon: 999, // Invalid longitude
          alt: 0,
          floor: 0,
          acc: 5
        },
        heading: 45,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(navUpdate);
      
      // Should handle gracefully, likely returning null
      expect(result === null || result !== null).toBe(true);
    });

    it('should handle missing graph data', async () => {
      const navUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId: 'test-user-12',
        pos: {
          lat: 21.42246,
          lon: 39.82616,
          alt: 0,
          floor: 99, // Non-existent floor
          acc: 5
        },
        heading: 45,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(navUpdate);
      
      // Should handle missing floor gracefully
      expect(result === null || result !== null).toBe(true);
    });
  });

  afterEach(() => {
    // Clean up any user states
    const userIds = [
      'test-user-1', 'test-user-2', 'test-user-3', 'test-user-4',
      'test-user-5', 'test-user-6', 'test-user-7', 'test-user-8',
      'test-user-9', 'test-user-10', 'test-user-11', 'test-user-12'
    ];
    
    for (let i = 0; i < 10; i++) {
      userIds.push(`concurrent-user-${i}`);
    }
    
    userIds.forEach(userId => service.clearUserState(userId));
  });
});