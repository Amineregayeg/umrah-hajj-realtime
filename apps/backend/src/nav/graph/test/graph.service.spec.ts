import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GraphService } from '../services/graph.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphCacheService } from '../services/graph-cache.service';
import { RouteRequest } from '../interfaces/graph.interface';

describe('GraphService', () => {
  let service: GraphService;
  let graphLoader: GraphLoaderService;
  let pathfinding: PathfindingService;
  let cache: GraphCacheService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
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

    service = module.get<GraphService>(GraphService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    pathfinding = module.get<PathfindingService>(PathfindingService);
    cache = module.get<GraphCacheService>(GraphCacheService);

    // Initialize the graph loader
    await graphLoader.onModuleInit();
  });

  describe('Graph Loading and Validation', () => {
    it('should load graph successfully', () => {
      const graph = service.getGraph();
      expect(graph).toBeDefined();
      expect(graph.floors.length).toBeGreaterThan(0);
      expect(graph.nodes.length).toBeGreaterThan(0);
      expect(graph.edges.length).toBeGreaterThan(0);
    });

    it('should have valid graph structure', () => {
      const graph = service.getGraph();
      
      // Check that all floors exist
      const floorIds = new Set(graph.floors.map(f => f.id));
      expect(floorIds.size).toBe(graph.floors.length); // No duplicates
      
      // Check that all nodes reference valid floors
      for (const node of graph.nodes) {
        expect(floorIds.has(node.floor)).toBe(true);
      }
      
      // Check that all edges reference valid nodes
      const nodeIds = new Set(graph.nodes.map(n => n.id));
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      }
      
      // Check that all connectors reference valid nodes
      for (const connector of graph.connectors) {
        expect(nodeIds.has(connector.from)).toBe(true);
        expect(nodeIds.has(connector.to)).toBe(true);
      }
    });

    it('should get graph stats correctly', () => {
      const stats = service.getGraphStats();
      expect(stats.nodes).toBeGreaterThan(0);
      expect(stats.edges).toBeGreaterThan(0);
      expect(stats.floors).toBeGreaterThan(0);
      expect(typeof stats.connectors).toBe('number');
      expect(typeof stats.zones).toBe('number');
    });
  });

  describe('Pathfinding Accuracy', () => {
    it('should find path within same floor using Dijkstra', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await service.findRoute(request);
      
      expect(result).toBeDefined();
      expect(result.path).toContain('gate_a');
      expect(result.path).toContain('central_hall');
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('central_hall');
      expect(result.totalCost).toBeGreaterThan(0);
      expect(result.distance).toBeGreaterThan(0);
      expect(result.floors).toContain('ground');
    });

    it('should find path within same floor using A*', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'astar'
      };

      const result = await service.findRoute(request);
      
      expect(result).toBeDefined();
      expect(result.path).toContain('gate_a');
      expect(result.path).toContain('central_hall');
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('central_hall');
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it('should find cross-floor path using elevator', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'dijkstra'
      };

      const result = await service.findRoute(request);
      
      expect(result).toBeDefined();
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('prayer_hall_1');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('first');
      expect(result.floors.length).toBe(2);
      
      // Should use elevator connector
      expect(result.path).toContain('elevator_1_ground');
      expect(result.path).toContain('elevator_1_first');
    });

    it('should find path to second floor', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'observatory',
        algorithm: 'astar'
      };

      const result = await service.findRoute(request);
      
      expect(result).toBeDefined();
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('observatory');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('second');
      expect(result.floors.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle avoidFloorChanges preference', async () => {
      const requestNormal: RouteRequest = {
        from: 'gate_a',
        to: 'gate_b',
        algorithm: 'dijkstra'
      };

      const requestAvoidFloors: RouteRequest = {
        ...requestNormal,
        avoidFloorChanges: true
      };

      const normalResult = await service.findRoute(requestNormal);
      const avoidResult = await service.findRoute(requestAvoidFloors);
      
      // Both should find paths on ground floor
      expect(normalResult.floors).toEqual(['ground']);
      expect(avoidResult.floors).toEqual(['ground']);
      
      // Results should be similar since no floor change needed
      expect(normalResult.path).toEqual(avoidResult.path);
    });

    it('should compare Dijkstra vs A* results', async () => {
      const requestDijkstra: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'dijkstra'
      };

      const requestAstar: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'astar'
      };

      const dijkstraResult = await service.findRoute(requestDijkstra);
      const astarResult = await service.findRoute(requestAstar);
      
      // Both should find valid paths
      expect(dijkstraResult.path[0]).toBe('gate_a');
      expect(dijkstraResult.path[dijkstraResult.path.length - 1]).toBe('prayer_hall_1');
      expect(astarResult.path[0]).toBe('gate_a');
      expect(astarResult.path[astarResult.path.length - 1]).toBe('prayer_hall_1');
      
      // A* should not find a worse path than Dijkstra (within reasonable margin)
      expect(astarResult.totalCost).toBeLessThanOrEqual(dijkstraResult.totalCost * 1.1);
    });

    it('should handle complex multi-floor routing', async () => {
      const request: RouteRequest = {
        from: 'gate_c',
        to: 'admin_office',
        algorithm: 'dijkstra'
      };

      const result = await service.findRoute(request);
      
      expect(result).toBeDefined();
      expect(result.path[0]).toBe('gate_c');
      expect(result.path[result.path.length - 1]).toBe('admin_office');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('second');
      expect(result.totalCost).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle invalid source node', async () => {
      const request: RouteRequest = {
        from: 'invalid_node',
        to: 'gate_a',
        algorithm: 'dijkstra'
      };

      await expect(service.findRoute(request)).rejects.toThrow();
    });

    it('should handle invalid destination node', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'invalid_node',
        algorithm: 'dijkstra'
      };

      await expect(service.findRoute(request)).rejects.toThrow();
    });

    it('should validate routes correctly', async () => {
      const validRequest: RouteRequest = {
        from: 'gate_a',
        to: 'gate_b',
        algorithm: 'dijkstra'
      };

      const invalidRequest: RouteRequest = {
        from: 'invalid_node',
        to: 'gate_b',
        algorithm: 'dijkstra'
      };

      const validResult = await service.validateRoute(validRequest);
      const invalidResult = await service.validateRoute(invalidRequest);

      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.error).toBeDefined();
    });
  });

  describe('Caching Functionality', () => {
    it('should cache pathfinding results', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      // Clear cache first
      service.invalidateCache();

      // First call should compute path
      const result1 = await service.findRoute(request);
      
      // Second call should use cache
      const result2 = await service.findRoute(request);

      expect(result1).toEqual(result2);

      const cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);
    });

    it('should invalidate cache correctly', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      await service.findRoute(request);
      let cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBeGreaterThan(0);

      service.invalidateCache();
      cacheStats = service.getCacheStats();
      expect(cacheStats.size).toBe(0);
    });
  });

  describe('Node and Floor Information', () => {
    it('should get node information correctly', () => {
      const nodeInfo = service.getNodeInfo('gate_a');
      
      expect(nodeInfo).toBeDefined();
      expect(nodeInfo.node.id).toBe('gate_a');
      expect(nodeInfo.node.kind).toBe('gate');
      expect(nodeInfo.floor).toBeDefined();
      expect(nodeInfo.connections.total).toBeGreaterThan(0);
      expect(nodeInfo.neighbors).toBeDefined();
    });

    it('should get floor information correctly', () => {
      const floorInfo = service.getFloorInfo('ground');
      
      expect(floorInfo).toBeDefined();
      expect(floorInfo.floor.id).toBe('ground');
      expect(floorInfo.nodes).toBeGreaterThan(0);
      expect(floorInfo.nodesByKind.gate).toBeGreaterThan(0);
      expect(floorInfo.nodesByKind.poi).toBeGreaterThan(0);
    });

    it('should handle non-existent node', () => {
      const nodeInfo = service.getNodeInfo('non_existent');
      expect(nodeInfo).toBeNull();
    });

    it('should handle non-existent floor', () => {
      const floorInfo = service.getFloorInfo('non_existent');
      expect(floorInfo).toBeNull();
    });
  });

  describe('Performance Tests', () => {
    it('should find paths within reasonable time', async () => {
      const requests: RouteRequest[] = [
        { from: 'gate_a', to: 'prayer_hall_1', algorithm: 'dijkstra' },
        { from: 'gate_b', to: 'admin_office', algorithm: 'astar' },
        { from: 'gate_c', to: 'observatory', algorithm: 'dijkstra' },
      ];

      for (const request of requests) {
        const startTime = Date.now();
        await service.findRoute(request);
        const endTime = Date.now();
        
        expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      }
    });

    it('should handle multiple concurrent requests', async () => {
      const requests: RouteRequest[] = Array.from({ length: 10 }, (_, i) => ({
        from: 'gate_a',
        to: i % 2 === 0 ? 'prayer_hall_1' : 'admin_office',
        algorithm: i % 2 === 0 ? 'dijkstra' : 'astar'
      }));

      const startTime = Date.now();
      const results = await Promise.all(requests.map(req => service.findRoute(req)));
      const endTime = Date.now();

      expect(results.length).toBe(10);
      results.forEach(result => {
        expect(result).toBeDefined();
        expect(result.path.length).toBeGreaterThan(1);
      });

      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});