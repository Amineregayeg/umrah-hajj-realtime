import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { RouteRequest } from '../interfaces/graph.interface';

describe('Pathfinding Performance', () => {
  let service: PathfindingService;
  let graphLoader: GraphLoaderService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathfindingService,
        GraphLoaderService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                GRAPH_PATH: '/mnt/d/umrah-hajj-realtime/apps/backend/data/nav_graph.json',
                NODE_ENV: 'test'
              };
              return config[key];
            }
          }
        }
      ],
    }).compile();

    service = module.get<PathfindingService>(PathfindingService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);

    await graphLoader.onModuleInit();
  });

  describe('Algorithm Performance Comparison', () => {
    const testCases = [
      { 
        name: 'Same floor, direct',
        from: 'gate_a', 
        to: 'central_hall',
        expectedComplexity: 'low'
      },
      { 
        name: 'Same floor, indirect',
        from: 'gate_c', 
        to: 'gate_b',
        expectedComplexity: 'medium'
      },
      { 
        name: 'Cross floor, simple',
        from: 'gate_a', 
        to: 'prayer_hall_1',
        expectedComplexity: 'medium'
      },
      { 
        name: 'Cross floor, complex',
        from: 'gate_c', 
        to: 'admin_office',
        expectedComplexity: 'high'
      }
    ];

    testCases.forEach(({ name, from, to, expectedComplexity }) => {
      it(`should perform efficiently for ${name}`, async () => {
        const dijkstraRequest: RouteRequest = { from, to, algorithm: 'dijkstra' };
        const astarRequest: RouteRequest = { from, to, algorithm: 'astar' };

        // Measure Dijkstra performance
        const dijkstraStart = performance.now();
        const dijkstraResult = await service.findPath(dijkstraRequest);
        const dijkstraTime = performance.now() - dijkstraStart;

        // Measure A* performance
        const astarStart = performance.now();
        const astarResult = await service.findPath(astarRequest);
        const astarTime = performance.now() - astarStart;

        // Performance thresholds based on complexity
        const thresholds = {
          low: 50,     // 50ms
          medium: 100, // 100ms
          high: 200    // 200ms
        };

        const maxTime = thresholds[expectedComplexity];

        expect(dijkstraTime).toBeLessThan(maxTime);
        expect(astarTime).toBeLessThan(maxTime);

        // Verify results are valid
        expect(dijkstraResult.path.length).toBeGreaterThan(0);
        expect(astarResult.path.length).toBeGreaterThan(0);
        expect(dijkstraResult.path[0]).toBe(from);
        expect(dijkstraResult.path[dijkstraResult.path.length - 1]).toBe(to);
        expect(astarResult.path[0]).toBe(from);
        expect(astarResult.path[astarResult.path.length - 1]).toBe(to);

        console.log(`${name}: Dijkstra=${dijkstraTime.toFixed(2)}ms, A*=${astarTime.toFixed(2)}ms`);
      });
    });

    it('should show A* performance characteristics', async () => {
      const testRoutes = [
        { from: 'gate_a', to: 'central_hall' },
        { from: 'gate_a', to: 'prayer_hall_1' },
        { from: 'gate_a', to: 'admin_office' },
        { from: 'gate_c', to: 'observatory' }
      ];

      const dijkstraTimes: number[] = [];
      const astarTimes: number[] = [];

      for (const route of testRoutes) {
        // Test Dijkstra
        const dijkstraStart = performance.now();
        await service.findPath({ ...route, algorithm: 'dijkstra' });
        dijkstraTimes.push(performance.now() - dijkstraStart);

        // Test A*
        const astarStart = performance.now();
        await service.findPath({ ...route, algorithm: 'astar' });
        astarTimes.push(performance.now() - astarStart);
      }

      const avgDijkstra = dijkstraTimes.reduce((a, b) => a + b, 0) / dijkstraTimes.length;
      const avgAstar = astarTimes.reduce((a, b) => a + b, 0) / astarTimes.length;

      console.log(`Average times - Dijkstra: ${avgDijkstra.toFixed(2)}ms, A*: ${avgAstar.toFixed(2)}ms`);

      // Both algorithms should be reasonably fast
      expect(avgDijkstra).toBeLessThan(100);
      expect(avgAstar).toBeLessThan(100);
    });
  });

  describe('Concurrent Request Performance', () => {
    it('should handle multiple concurrent requests efficiently', async () => {
      const routes: RouteRequest[] = [
        { from: 'gate_a', to: 'central_hall', algorithm: 'dijkstra' },
        { from: 'gate_b', to: 'prayer_hall_1', algorithm: 'astar' },
        { from: 'gate_c', to: 'admin_office', algorithm: 'dijkstra' },
        { from: 'information_desk', to: 'observatory', algorithm: 'astar' },
        { from: 'central_hall', to: 'prayer_hall_2', algorithm: 'dijkstra' },
        { from: 'prayer_hall_1', to: 'gate_a', algorithm: 'astar' },
        { from: 'admin_office', to: 'gate_c', algorithm: 'dijkstra' },
        { from: 'observatory', to: 'information_desk', algorithm: 'astar' }
      ];

      const startTime = performance.now();
      const results = await Promise.all(routes.map(route => service.findPath(route)));
      const totalTime = performance.now() - startTime;

      expect(results.length).toBe(routes.length);
      expect(totalTime).toBeLessThan(1000); // All requests should complete within 1 second

      // Verify all results are valid
      results.forEach((result, index) => {
        expect(result.path.length).toBeGreaterThan(0);
        expect(result.path[0]).toBe(routes[index].from);
        expect(result.path[result.path.length - 1]).toBe(routes[index].to);
      });

      console.log(`Concurrent requests: ${routes.length} routes in ${totalTime.toFixed(2)}ms`);
    });

    it('should maintain performance under repeated requests', async () => {
      const route: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'astar'
      };

      const iterations = 50;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await service.findPath(route);
        times.push(performance.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      console.log(`Repeated requests: avg=${avgTime.toFixed(2)}ms, min=${minTime.toFixed(2)}ms, max=${maxTime.toFixed(2)}ms`);

      // Performance should be consistent
      expect(avgTime).toBeLessThan(50);
      expect(maxTime).toBeLessThan(100);
      
      // No significant performance degradation - allow for some variance in test environments
      const variance = times.reduce((acc, time) => acc + Math.pow(time - avgTime, 2), 0) / times.length;
      const stdDev = Math.sqrt(variance);
      expect(stdDev).toBeLessThan(Math.max(avgTime * 2, 10)); // Standard deviation should be reasonable
    });
  });

  describe('Memory Usage', () => {
    it('should not leak memory during pathfinding', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Perform many pathfinding operations
      const routes: RouteRequest[] = [];
      for (let i = 0; i < 100; i++) {
        routes.push({
          from: i % 2 === 0 ? 'gate_a' : 'gate_c',
          to: i % 3 === 0 ? 'prayer_hall_1' : 'admin_office',
          algorithm: i % 2 === 0 ? 'dijkstra' : 'astar'
        });
      }

      for (const route of routes) {
        await service.findPath(route);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      console.log(`Memory usage: initial=${(initialMemory / 1024 / 1024).toFixed(2)}MB, final=${(finalMemory / 1024 / 1024).toFixed(2)}MB, increase=${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 10MB for 100 operations)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Edge Cases Performance', () => {
    it('should handle same node routes efficiently', async () => {
      const route: RouteRequest = {
        from: 'gate_a',
        to: 'gate_a',
        algorithm: 'dijkstra'
      };

      const start = performance.now();
      const result = await service.findPath(route);
      const time = performance.now() - start;

      expect(time).toBeLessThan(10); // Should be very fast
      expect(result.path).toEqual(['gate_a']);
      expect(result.totalCost).toBe(0);
    });

    it('should handle routes with floor change penalties efficiently', async () => {
      const normalRoute: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'dijkstra',
        avoidFloorChanges: false
      };

      const penalizedRoute: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'dijkstra',
        avoidFloorChanges: true
      };

      const normalStart = performance.now();
      const normalResult = await service.findPath(normalRoute);
      const normalTime = performance.now() - normalStart;

      const penalizedStart = performance.now();
      const penalizedResult = await service.findPath(penalizedRoute);
      const penalizedTime = performance.now() - penalizedStart;

      // Both should complete efficiently
      expect(normalTime).toBeLessThan(100);
      expect(penalizedTime).toBeLessThan(100);

      // Penalized route should have higher cost
      expect(penalizedResult.totalCost).toBeGreaterThan(normalResult.totalCost);

      console.log(`Floor penalties: normal=${normalTime.toFixed(2)}ms (cost=${normalResult.totalCost}), penalized=${penalizedTime.toFixed(2)}ms (cost=${penalizedResult.totalCost})`);
    });
  });

  describe('Scalability', () => {
    it('should show reasonable time complexity', async () => {
      const graph = graphLoader.getGraph();
      const nodes = graph.nodes;
      
      // Test with different start/end node combinations to simulate varying graph traversal
      const shortRoutes = [
        { from: 'gate_a', to: 'central_hall' },
        { from: 'gate_b', to: 'information_desk' }
      ];
      
      const longRoutes = [
        { from: 'gate_a', to: 'admin_office' },
        { from: 'gate_c', to: 'observatory' }
      ];

      // Measure short routes
      const shortTimes: number[] = [];
      for (const route of shortRoutes) {
        const start = performance.now();
        await service.findPath({ ...route, algorithm: 'dijkstra' });
        shortTimes.push(performance.now() - start);
      }

      // Measure long routes
      const longTimes: number[] = [];
      for (const route of longRoutes) {
        const start = performance.now();
        await service.findPath({ ...route, algorithm: 'dijkstra' });
        longTimes.push(performance.now() - start);
      }

      const avgShortTime = shortTimes.reduce((a, b) => a + b, 0) / shortTimes.length;
      const avgLongTime = longTimes.reduce((a, b) => a + b, 0) / longTimes.length;

      console.log(`Route complexity: short=${avgShortTime.toFixed(2)}ms, long=${avgLongTime.toFixed(2)}ms`);

      // Time complexity should be reasonable
      expect(avgShortTime).toBeLessThan(50);
      expect(avgLongTime).toBeLessThan(100);
      
      // Longer routes shouldn't be exponentially slower
      expect(avgLongTime / avgShortTime).toBeLessThan(5);
    });
  });
});