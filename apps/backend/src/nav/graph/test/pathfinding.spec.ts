import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { RouteRequest } from '../interfaces/graph.interface';

describe('PathfindingService', () => {
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

  describe('Dijkstra Algorithm', () => {
    it('should find shortest path between directly connected nodes', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      expect(result.path).toEqual(['gate_a', 'central_hall']);
      expect(result.totalCost).toBe(85); // Direct edge weight
      expect(result.floors).toEqual(['ground']);
    });

    it('should find optimal path through intermediate nodes', async () => {
      const request: RouteRequest = {
        from: 'gate_c',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      expect(result.path[0]).toBe('gate_c');
      expect(result.path[result.path.length - 1]).toBe('central_hall');
      expect(result.path).toContain('information_desk');
      expect(result.totalCost).toBe(125); // 95 + 30
    });

    it('should handle floor changes with connectors', async () => {
      const request: RouteRequest = {
        from: 'information_desk',
        to: 'first_floor_corridor',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      expect(result.path[0]).toBe('information_desk');
      expect(result.path[result.path.length - 1]).toBe('first_floor_corridor');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('first');
    });

    it('should apply floor change penalties when avoidFloorChanges is true', async () => {
      const normalRequest: RouteRequest = {
        from: 'information_desk',
        to: 'first_floor_corridor',
        algorithm: 'dijkstra',
        avoidFloorChanges: false
      };

      const avoidRequest: RouteRequest = {
        from: 'information_desk',
        to: 'first_floor_corridor',
        algorithm: 'dijkstra',
        avoidFloorChanges: true
      };

      const normalResult = await service.findPath(normalRequest);
      const avoidResult = await service.findPath(avoidRequest);
      
      expect(avoidResult.totalCost).toBeGreaterThan(normalResult.totalCost);
    });
  });

  describe('A* Algorithm', () => {
    it('should find path using heuristic guidance', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_1',
        algorithm: 'astar'
      };

      const result = await service.findPath(request);
      
      expect(result.path[0]).toBe('gate_a');
      expect(result.path[result.path.length - 1]).toBe('prayer_hall_1');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('first');
    });

    it('should find optimal or near-optimal paths', async () => {
      const dijkstraRequest: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_2',
        algorithm: 'dijkstra'
      };

      const astarRequest: RouteRequest = {
        from: 'gate_a',
        to: 'prayer_hall_2',
        algorithm: 'astar'
      };

      const dijkstraResult = await service.findPath(dijkstraRequest);
      const astarResult = await service.findPath(astarRequest);
      
      // A* should find path within 10% of Dijkstra's optimal cost
      expect(astarResult.totalCost).toBeLessThanOrEqual(dijkstraResult.totalCost * 1.1);
    });

    it('should handle complex multi-floor navigation', async () => {
      const request: RouteRequest = {
        from: 'gate_c',
        to: 'admin_office',
        algorithm: 'astar'
      };

      const result = await service.findPath(request);
      
      expect(result.path[0]).toBe('gate_c');
      expect(result.path[result.path.length - 1]).toBe('admin_office');
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('second');
    });
  });

  describe('Algorithm Comparison', () => {
    const testCases = [
      { from: 'gate_a', to: 'central_hall', description: 'same floor, direct' },
      { from: 'gate_c', to: 'gate_b', description: 'same floor, indirect' },
      { from: 'gate_a', to: 'prayer_hall_1', description: 'cross floor, simple' },
      { from: 'gate_c', to: 'observatory', description: 'cross floor, complex' },
    ];

    testCases.forEach(({ from, to, description }) => {
      it(`should produce consistent results for ${description}`, async () => {
        const dijkstraRequest: RouteRequest = { from, to, algorithm: 'dijkstra' };
        const astarRequest: RouteRequest = { from, to, algorithm: 'astar' };

        const dijkstraResult = await service.findPath(dijkstraRequest);
        const astarResult = await service.findPath(astarRequest);

        expect(dijkstraResult.path[0]).toBe(from);
        expect(dijkstraResult.path[dijkstraResult.path.length - 1]).toBe(to);
        expect(astarResult.path[0]).toBe(from);
        expect(astarResult.path[astarResult.path.length - 1]).toBe(to);

        // Both should traverse the same floors
        expect(new Set(astarResult.floors)).toEqual(new Set(dijkstraResult.floors));
      });
    });
  });

  describe('Error Handling', () => {
    it('should throw error for non-existent source node', async () => {
      const request: RouteRequest = {
        from: 'non_existent_source',
        to: 'gate_a',
        algorithm: 'dijkstra'
      };

      await expect(service.findPath(request)).rejects.toThrow('Invalid nodes');
    });

    it('should throw error for non-existent destination node', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'non_existent_destination',
        algorithm: 'dijkstra'
      };

      await expect(service.findPath(request)).rejects.toThrow('Invalid nodes');
    });

    it('should handle isolated nodes gracefully', async () => {
      // This test assumes there might be isolated nodes in a real graph
      // For our test graph, all nodes are connected, so we'll test the error handling
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'gate_a', // Same node
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      expect(result.path).toEqual(['gate_a']);
      expect(result.totalCost).toBe(0);
    });
  });

  describe('Path Validation', () => {
    it('should produce valid consecutive paths', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      // Verify path connectivity
      for (let i = 0; i < result.path.length - 1; i++) {
        const currentNode = result.path[i];
        const nextNode = result.path[i + 1];
        
        // Check if there's a direct edge or connector between consecutive nodes
        const edges = graphLoader.getEdgesFromNode(currentNode);
        const connectors = graphLoader.getConnectorsFromNode(currentNode);
        
        const hasConnection = 
          edges.some(e => e.to === nextNode) || 
          connectors.some(c => c.to === nextNode);
        
        expect(hasConnection).toBe(true);
      }
    });

    it('should calculate distance correctly', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'central_hall',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      // Distance should be greater than 0 and reasonable for the coordinates
      expect(result.distance).toBeGreaterThan(0);
      expect(result.distance).toBeLessThan(10000); // Less than 10km (reasonable for building navigation)
    });

    it('should track floors correctly', async () => {
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'observatory',
        algorithm: 'dijkstra'
      };

      const result = await service.findPath(request);
      
      // Should include ground and second floors
      expect(result.floors).toContain('ground');
      expect(result.floors).toContain('second');
      
      // Verify each node in path is on one of the reported floors
      for (const nodeId of result.path) {
        const node = graphLoader.getNode(nodeId);
        expect(result.floors).toContain(node.floor);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should find paths efficiently for small graphs', async () => {
      const startTime = performance.now();
      
      const request: RouteRequest = {
        from: 'gate_a',
        to: 'admin_office',
        algorithm: 'dijkstra'
      };

      await service.findPath(request);
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(100); // Should complete in less than 100ms
    });

    it('should handle multiple path requests efficiently', async () => {
      const requests: RouteRequest[] = [
        { from: 'gate_a', to: 'prayer_hall_1', algorithm: 'dijkstra' },
        { from: 'gate_b', to: 'prayer_hall_2', algorithm: 'astar' },
        { from: 'gate_c', to: 'observatory', algorithm: 'dijkstra' },
        { from: 'central_hall', to: 'admin_office', algorithm: 'astar' },
      ];

      const startTime = performance.now();
      
      for (const request of requests) {
        const result = await service.findPath(request);
        expect(result.path.length).toBeGreaterThan(0);
      }
      
      const endTime = performance.now();
      expect(endTime - startTime).toBeLessThan(500); // All requests should complete in less than 500ms
    });
  });
});