import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GraphController } from '../graph.controller';
import { GraphService } from '../services/graph.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphCacheService } from '../services/graph-cache.service';
import { RouteRequest } from '../interfaces/graph.interface';

describe('GraphController', () => {
  let controller: GraphController;
  let graphService: GraphService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GraphController],
      providers: [
        GraphService,
        GraphLoaderService,
        PathfindingService,
        GraphCacheService,
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              const config = {
                GRAPH_PATH: '/mnt/d/umrah-hajj-realtime/apps/backend/data/nav_graph.json',
                NODE_ENV: 'test',
                GRAPH_CACHE_SIZE: 100,
                GRAPH_CACHE_TTL: 60000
              };
              return config[key];
            }
          }
        }
      ],
    }).compile();

    controller = module.get<GraphController>(GraphController);
    graphService = module.get<GraphService>(GraphService);

    // Initialize the graph loader
    const graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    await graphLoader.onModuleInit();
  });

  describe('Route Finding', () => {
    it('should find route using POST /nav/graph/route', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await controller.findRoute(request);

      expect(result).toBeDefined();
      expect(result.path).toContain('gate_a');
      expect(result.path).toContain('central_hall');
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.floors).toEqual(['ground']);
    });

    it('should find route using A* algorithm', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'astar'
      };

      const result = await controller.findRoute(request);

      expect(result).toBeDefined();
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('prayer_hall_1');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('first');
    });

    it('should handle complex multi-floor routes', async () => {
      const request: RouteRequest = {
        from: 'gate_c',
        to: 'admin_office',
        algorithm: 'dijkstra'
      };

      const result = await controller.findRoute(request);

      expect(result).toBeDefined();
      expect(result.path[0]).toBe('gate_c');
      expect(result.path[result.path.length - 1]).toBe('admin_office');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('second');
    });

    it('should handle avoidFloorChanges preference', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'gate_b',
        algorithm: 'dijkstra',
        avoidFloorChanges: true
      };

      const result = await controller.findRoute(request);

      expect(result).toBeDefined();
      expect(result.floors).toEqual(['ground']); // Should stay on same floor
    });
  });

  describe('Route Validation', () => {
    it('should validate valid routes', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await controller.validateRoute(request);

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should detect invalid source nodes', async () => {
      const request: RouteRequest = {
        from: 'invalid_node',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await controller.validateRoute(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid_node');
    });

    it('should detect invalid destination nodes', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'invalid_node',
        algorithm: 'dijkstra'
      };

      const result = await controller.validateRoute(request);

      expect(result.valid).toBe(false);
      expect(result.error).toContain('invalid_node');
    });
  });

  describe('Graph Information', () => {
    it('should get graph statistics', () => {
      const stats = controller.getGraphStats();

      expect(stats).toBeDefined();
      expect(stats.graph).toBeDefined();
      expect(stats.cache).toBeDefined();

      expect(stats.graph.nodes).toBeGreaterThan(0);
      expect(stats.graph.edges).toBeGreaterThan(0);
      expect(stats.graph.floors).toBeGreaterThan(0);
      expect(typeof stats.graph.connectors).toBe('number');
      expect(typeof stats.graph.zones).toBe('number');

      expect(typeof stats.cache.size).toBe('number');
      expect(typeof stats.cache.maxSize).toBe('number');
      expect(typeof stats.cache.hitRate).toBe('number');
      expect(Array.isArray(stats.cache.entries)).toBe(true);
    });

    it('should get complete graph structure', () => {
      const graph = controller.getGraph();

      expect(graph).toBeDefined();
      expect(Array.isArray(graph.floors)).toBe(true);
      expect(Array.isArray(graph.nodes)).toBe(true);
      expect(Array.isArray(graph.edges)).toBe(true);
      expect(Array.isArray(graph.connectors)).toBe(true);
      expect(Array.isArray(graph.zones)).toBe(true);

      expect(graph.floors.length).toBeGreaterThan(0);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('should get node information', () => {
      const nodeInfo = controller.getNodeInfo('gate_a');

      expect(nodeInfo).toBeDefined();
      expect(nodeInfo.node).toBeDefined();
      expect(nodeInfo.floor).toBeDefined();
      expect(nodeInfo.connections).toBeDefined();
      expect(nodeInfo.neighbors).toBeDefined();

      expect(nodeInfo.node.id).toBe('gate_a');
      expect(nodeInfo.node.kind).toBe('gate');
      expect(nodeInfo.connections.total).toBeGreaterThan(0);
      expect(Array.isArray(nodeInfo.neighbors)).toBe(true);
    });

    it('should throw error for non-existent node', () => {
      expect(() => {
        controller.getNodeInfo('non_existent_node');
      }).toThrow('Node not found');
    });

    it('should get floor information', () => {
      const floorInfo = controller.getFloorInfo('ground');

      expect(floorInfo).toBeDefined();
      expect(floorInfo.floor).toBeDefined();
      expect(floorInfo.nodes).toBeGreaterThan(0);
      expect(floorInfo.nodesByKind).toBeDefined();

      expect(floorInfo.floor.id).toBe('ground');
      expect(floorInfo.nodesByKind.gate).toBeGreaterThan(0);
      expect(floorInfo.nodesByKind.poi).toBeGreaterThan(0);
    });

    it('should throw error for non-existent floor', () => {
      expect(() => {
        controller.getFloorInfo('non_existent_floor');
      }).toThrow('Floor not found');
    });
  });

  describe('Cache Management', () => {
    it('should invalidate cache', () => {
      const result = controller.invalidateCache();

      expect(result).toBeDefined();
      expect(result.message).toBe('Cache invalidated');
      expect(result.pattern).toBeUndefined();
    });

    it('should invalidate cache with pattern', () => {
      const pattern = 'gate_a';
      const result = controller.invalidateCache(pattern);

      expect(result).toBeDefined();
      expect(result.message).toBe('Cache invalidated');
      expect(result.pattern).toBe(pattern);
    });

    it('should track cache usage', async () => {
      // Make a request to populate cache
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      await controller.findRoute(request);

      const stats = controller.getGraphStats();
      expect(stats.cache.size).toBeGreaterThan(0);
    });
  });

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const health = await controller.healthCheck();

      expect(health).toBeDefined();
      expect(health.status).toBe('healthy');
      expect(health.timestamp).toBeDefined();
      expect(health.stats).toBeDefined();

      // Timestamp should be recent
      const timestamp = new Date(health.timestamp);
      const now = new Date();
      const timeDiff = now.getTime() - timestamp.getTime();
      expect(timeDiff).toBeLessThan(5000); // Less than 5 seconds old
    });

    it('should include graph statistics in health check', async () => {
      const health = await controller.healthCheck();

      expect(health.stats).toBeDefined();
      expect(health.stats.nodes).toBeGreaterThan(0);
      expect(health.stats.edges).toBeGreaterThan(0);
      expect(health.stats.floors).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid route requests gracefully', async () => {
      const request: RouteRequest = {
        from: 'invalid_source',
        to: 'invalid_destination',
        algorithm: 'dijkstra'
      };

      await expect(controller.findRoute(request)).rejects.toThrow();
    });

    it('should handle validation errors gracefully', async () => {
      const request: RouteRequest = {
        from: 'invalid_source',
        to: 'invalid_destination',
        algorithm: 'dijkstra'
      };

      const result = await controller.validateRoute(request);
      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Algorithm Comparison', () => {
    it('should produce similar results for Dijkstra and A*', async () => {
      const dijkstraRequest: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'dijkstra'
      };

      const astarRequest: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'astar'
      };

      const dijkstraResult = await controller.findRoute(dijkstraRequest);
      const astarResult = await controller.findRoute(astarRequest);

      // Both should find valid paths
      expect(dijkstraResult.path[0]).toBe('gate_a');
      expect(dijkstraResult.path[dijkstraResult.path.length - 1]).toBe('prayer_hall_1');
      expect(astarResult.path[0]).toBe('gate_a');
      expect(astarResult.path[astarResult.path.length - 1]).toBe('prayer_hall_1');

      // A* should not find significantly worse path than Dijkstra
      expect(astarResult.totalCost).toBeLessThanOrEqual(dijkstraResult.totalCost * 1.1);

      // Both should traverse similar floors
      expect(new Set(astarResult.floors)).toEqual(new Set(dijkstraResult.floors));
    });
  });

  describe('Performance', () => {
    it('should handle route finding within reasonable time', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'dijkstra'
      };

      const startTime = Date.now();
      await controller.findRoute(request);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle multiple concurrent requests', async () => {
      const requests: RouteRequest[] = Array.from({ length: 5 }, (_, i) => ({
        from: 'gate_a',
        to: i % 2 === 0 ? 'prayer_hall_1' : 'admin_office',
        algorithm: i % 2 === 0 ? 'dijkstra' : 'astar'
      }));

      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => controller.findRoute(req)));
      const endTime = Date.now();

      expect(results.length).toBe(5);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.path.length).toBeGreaterThan(1);
      });

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});