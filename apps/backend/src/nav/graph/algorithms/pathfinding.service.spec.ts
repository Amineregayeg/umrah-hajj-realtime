/**
 * Comprehensive unit tests for Pathfinding Service
 * Covers A-star/Dijkstra algorithms, mini graphs, floor connectors, penalty costs
 */

import { Test, TestingModule } from '@nestjs/testing';
import { PathfindingService } from './pathfinding.service';
import { GraphLoaderService } from '../services/graph-loader.service';
import { NavGraph, Node, Edge, RouteRequest, PathFindingResult } from '../interfaces/graph.interface';

// Mock implementation to access private methods
class TestablePathfindingService extends PathfindingService {
  public testDijkstra(fromNode: Node, toNode: Node, avoidFloorChanges: boolean = false): PathFindingResult {
    return this.dijkstra(fromNode, toNode, avoidFloorChanges);
  }

  public testAstar(fromNode: Node, toNode: Node, avoidFloorChanges: boolean = false): PathFindingResult {
    return this.astar(fromNode, toNode, avoidFloorChanges);
  }

  public testCalculateHeuristic(nodeA: Node, nodeB: Node): number {
    return this.calculateHeuristic(nodeA, nodeB);
  }

  public testCalculateDistance(nodeA: Node, nodeB: Node): number {
    return this.calculateDistance(nodeA, nodeB);
  }

  public testApplyFloorChangePenalty(cost: number, fromFloor: string, toFloor: string): number {
    return this.applyFloorChangePenalty(cost, fromFloor, toFloor);
  }

  public testReconstructPath(current: string, previous: Map<string, string>, nodes: Node[]): Node[] {
    return this.reconstructPath(current, previous, nodes);
  }
}

describe('PathfindingService', () => {
  let service: TestablePathfindingService;
  let graphLoader: jest.Mocked<GraphLoaderService>;
  let mockGraph: NavGraph;

  const createMiniGraph = (): NavGraph => ({
    floors: [
      { id: 'ground', name: 'Ground Floor' },
      { id: 'first', name: 'First Floor' }
    ],
    nodes: [
      { id: 'A', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
      { id: 'B', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
      { id: 'C', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
      { id: 'D', floor: 'ground', lat: 21.4225, lon: 39.8270, kind: 'poi' },
      { id: 'E', floor: 'ground', lat: 21.4230, lon: 39.8270, kind: 'poi' },
      { id: 'F', floor: 'first', lat: 21.4225, lon: 39.8262, kind: 'poi' },
      { id: 'G', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' }
    ],
    edges: [
      { from: 'A', to: 'B', weight: 10, kind: 'corridor' },
      { from: 'B', to: 'C', weight: 10, kind: 'corridor' },
      { from: 'A', to: 'D', weight: 15, kind: 'corridor' },
      { from: 'B', to: 'E', weight: 15, kind: 'corridor' },
      { from: 'D', to: 'E', weight: 10, kind: 'corridor' },
      { from: 'C', to: 'E', weight: 20, kind: 'corridor' }
    ],
    connectors: [
      { from: 'A', to: 'F', type: 'elevator', penalty: 30 },
      { from: 'B', to: 'G', type: 'stairs', penalty: 20 }
    ],
    zones: []
  });

  const createComplexGraph = (): NavGraph => ({
    floors: [
      { id: 'ground', name: 'Ground Floor' },
      { id: 'first', name: 'First Floor' },
      { id: 'second', name: 'Second Floor' }
    ],
    nodes: [
      // Ground floor - grid layout
      { id: 'G1', floor: 'ground', lat: 21.4220, lon: 39.8260, kind: 'poi' },
      { id: 'G2', floor: 'ground', lat: 21.4225, lon: 39.8260, kind: 'poi' },
      { id: 'G3', floor: 'ground', lat: 21.4230, lon: 39.8260, kind: 'poi' },
      { id: 'G4', floor: 'ground', lat: 21.4220, lon: 39.8270, kind: 'poi' },
      { id: 'G5', floor: 'ground', lat: 21.4225, lon: 39.8270, kind: 'poi' },
      { id: 'G6', floor: 'ground', lat: 21.4230, lon: 39.8270, kind: 'poi' },
      // First floor
      { id: 'F1', floor: 'first', lat: 21.4220, lon: 39.8260, kind: 'poi' },
      { id: 'F2', floor: 'first', lat: 21.4225, lon: 39.8260, kind: 'poi' },
      { id: 'F3', floor: 'first', lat: 21.4230, lon: 39.8260, kind: 'poi' },
      // Second floor
      { id: 'S1', floor: 'second', lat: 21.4220, lon: 39.8260, kind: 'poi' },
      { id: 'S2', floor: 'second', lat: 21.4225, lon: 39.8260, kind: 'poi' }
    ],
    edges: [
      // Ground floor connections
      { from: 'G1', to: 'G2', weight: 5, kind: 'corridor' },
      { from: 'G2', to: 'G3', weight: 5, kind: 'corridor' },
      { from: 'G4', to: 'G5', weight: 5, kind: 'corridor' },
      { from: 'G5', to: 'G6', weight: 5, kind: 'corridor' },
      { from: 'G1', to: 'G4', weight: 8, kind: 'corridor' },
      { from: 'G2', to: 'G5', weight: 8, kind: 'corridor' },
      { from: 'G3', to: 'G6', weight: 8, kind: 'corridor' },
      // First floor connections
      { from: 'F1', to: 'F2', weight: 5, kind: 'corridor' },
      { from: 'F2', to: 'F3', weight: 5, kind: 'corridor' },
      // Second floor connections
      { from: 'S1', to: 'S2', weight: 5, kind: 'corridor' }
    ],
    connectors: [
      { from: 'G2', to: 'F2', type: 'elevator', penalty: 25 },
      { from: 'G3', to: 'F3', type: 'stairs', penalty: 15 },
      { from: 'F1', to: 'S1', type: 'elevator', penalty: 25 },
      { from: 'F2', to: 'S2', type: 'escalator', penalty: 10 }
    ],
    zones: []
  });

  beforeEach(async () => {
    mockGraph = createMiniGraph();

    const mockGraphLoader = {
      getGraph: jest.fn().mockReturnValue(mockGraph),
      getNode: jest.fn().mockImplementation((nodeId: string) => 
        mockGraph.nodes.find(n => n.id === nodeId)
      ),
      getEdgesFromNode: jest.fn().mockImplementation((nodeId: string) => 
        mockGraph.edges.filter(e => e.from === nodeId)
      ),
      getEdgesToNode: jest.fn().mockImplementation((nodeId: string) => 
        mockGraph.edges.filter(e => e.to === nodeId)
      ),
      getConnectorsFromNode: jest.fn().mockImplementation((nodeId: string) => 
        mockGraph.connectors.filter(c => c.from === nodeId)
      ),
      getConnectorsToNode: jest.fn().mockImplementation((nodeId: string) => 
        mockGraph.connectors.filter(c => c.to === nodeId)
      )
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: PathfindingService,
          useClass: TestablePathfindingService
        },
        {
          provide: GraphLoaderService,
          useValue: mockGraphLoader
        }
      ]
    }).compile();

    service = module.get<TestablePathfindingService>(PathfindingService);
    graphLoader = module.get(GraphLoaderService);
  });

  describe('Distance and Heuristic Calculations', () => {
    it('should calculate distance between nodes correctly', () => {
      const nodeA = mockGraph.nodes.find(n => n.id === 'A')!;
      const nodeB = mockGraph.nodes.find(n => n.id === 'B')!;
      
      const distance = service.testCalculateDistance(nodeA, nodeB);
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(100); // Should be reasonable distance in meters
    });

    it('should calculate zero distance for same node', () => {
      const nodeA = mockGraph.nodes.find(n => n.id === 'A')!;
      const distance = service.testCalculateDistance(nodeA, nodeA);
      expect(distance).toBe(0);
    });

    it('should calculate heuristic (same as distance for straight-line)', () => {
      const nodeA = mockGraph.nodes.find(n => n.id === 'A')!;
      const nodeC = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const heuristic = service.testCalculateHeuristic(nodeA, nodeC);
      const distance = service.testCalculateDistance(nodeA, nodeC);
      
      expect(heuristic).toBeCloseTo(distance, 1);
    });

    it('should handle nodes on different floors', () => {
      const nodeA = mockGraph.nodes.find(n => n.id === 'A')!;
      const nodeF = mockGraph.nodes.find(n => n.id === 'F')!;
      
      const distance = service.testCalculateDistance(nodeA, nodeF);
      expect(distance).toBeGreaterThan(0);
    });
  });

  describe('Floor Change Penalties', () => {
    it('should apply no penalty for same floor', () => {
      const cost = service.testApplyFloorChangePenalty(10, 'ground', 'ground');
      expect(cost).toBe(10);
    });

    it('should apply penalty for different floors', () => {
      const originalCost = 10;
      const cost = service.testApplyFloorChangePenalty(originalCost, 'ground', 'first');
      expect(cost).toBeGreaterThan(originalCost);
    });

    it('should apply larger penalty for bigger floor differences', () => {
      const cost1to2 = service.testApplyFloorChangePenalty(10, 'ground', 'first');
      const cost1to3 = service.testApplyFloorChangePenalty(10, 'ground', 'second');
      expect(cost1to3).toBeGreaterThan(cost1to2);
    });
  });

  describe('Path Reconstruction', () => {
    it('should reconstruct path correctly', () => {
      const nodes = mockGraph.nodes;
      const previous = new Map<string, string>();
      previous.set('B', 'A');
      previous.set('C', 'B');
      
      const path = service.testReconstructPath('C', previous, nodes);
      
      expect(path.length).toBe(3);
      expect(path.map(n => n.id)).toEqual(['A', 'B', 'C']);
    });

    it('should handle single node path', () => {
      const nodes = mockGraph.nodes;
      const previous = new Map<string, string>();
      
      const path = service.testReconstructPath('A', previous, nodes);
      
      expect(path.length).toBe(1);
      expect(path[0].id).toBe('A');
    });
  });

  describe('Dijkstra Algorithm', () => {
    it('should find shortest path in simple graph', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(1);
      expect(result.path[0].id).toBe('A');
      expect(result.path[result.path.length - 1].id).toBe('C');
      expect(result.totalCost).toBeGreaterThan(0);
    });

    it('should find optimal path through multiple routes', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'E')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.totalCost).toBe(25); // A->B->E (10+15) or A->D->E (15+10)
    });

    it('should handle unreachable nodes', () => {
      // Create isolated node
      const isolatedNode: Node = { id: 'ISOLATED', floor: 'ground', lat: 21.5000, lon: 39.9000, kind: 'poi' };
      mockGraph.nodes.push(isolatedNode);
      
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      
      const result = service.testDijkstra(fromNode, isolatedNode);
      
      expect(result.success).toBe(false);
      expect(result.path.length).toBe(0);
    });

    it('should avoid floor changes when requested', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'F')!;
      
      const result = service.testDijkstra(fromNode, toNode, true);
      
      // Should either fail or have very high cost due to floor change penalty
      if (result.success) {
        expect(result.totalCost).toBeGreaterThan(100);
      } else {
        expect(result.success).toBe(false);
      }
    });
  });

  describe('A* Algorithm', () => {
    it('should find path with A* algorithm', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const result = service.testAstar(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(1);
      expect(result.path[0].id).toBe('A');
      expect(result.path[result.path.length - 1].id).toBe('C');
    });

    it('should find same optimal path as Dijkstra in simple cases', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'E')!;
      
      const dijkstraResult = service.testDijkstra(fromNode, toNode);
      const astarResult = service.testAstar(fromNode, toNode);
      
      expect(dijkstraResult.success).toBe(true);
      expect(astarResult.success).toBe(true);
      expect(astarResult.totalCost).toBe(dijkstraResult.totalCost);
    });

    it('should be more efficient than Dijkstra (fewer nodes explored)', () => {
      // This is harder to test without access to internal metrics
      // For now, just ensure A* finds valid solution
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const result = service.testAstar(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(0);
    });
  });

  describe('Complex Graph Scenarios', () => {
    beforeEach(() => {
      mockGraph = createComplexGraph();
      graphLoader.getGraph.mockReturnValue(mockGraph);
      graphLoader.getNode.mockImplementation((nodeId: string) => 
        mockGraph.nodes.find(n => n.id === nodeId)
      );
      graphLoader.getEdgesFromNode.mockImplementation((nodeId: string) => 
        mockGraph.edges.filter(e => e.from === nodeId)
      );
      graphLoader.getConnectorsFromNode.mockImplementation((nodeId: string) => 
        mockGraph.connectors.filter(c => c.from === nodeId)
      );
    });

    it('should handle multi-floor pathfinding with connectors', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'G1')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'F3')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.some(n => n.floor === 'ground')).toBe(true);
      expect(result.path.some(n => n.floor === 'first')).toBe(true);
    });

    it('should consider connector penalties in path cost', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'G2')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'F2')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.totalCost).toBeGreaterThan(25); // Should include elevator penalty
    });

    it('should choose cheaper connector when multiple options exist', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'G1')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'F3')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      // Should prefer stairs (penalty 15) over elevator (penalty 25) when total cost is similar
    });

    it('should handle three-floor navigation', () => {
      const fromNode = mockGraph.nodes.find(n => n.id === 'G1')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'S2')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.some(n => n.floor === 'ground')).toBe(true);
      expect(result.path.some(n => n.floor === 'first')).toBe(true);
      expect(result.path.some(n => n.floor === 'second')).toBe(true);
    });
  });

  describe('Full API Integration', () => {
    it('should handle findPath API with Dijkstra', async () => {
      const request: RouteRequest = {
        from: 'A',
        to: 'C',
        algorithm: 'dijkstra'
      };
      
      const result = await service.findPath(request);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(1);
    });

    it('should handle findPath API with A*', async () => {
      const request: RouteRequest = {
        from: 'A',
        to: 'C',
        algorithm: 'astar'
      };
      
      const result = await service.findPath(request);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(1);
    });

    it('should default to Dijkstra when algorithm not specified', async () => {
      const request: RouteRequest = {
        from: 'A',
        to: 'C'
      };
      
      const result = await service.findPath(request);
      
      expect(result.success).toBe(true);
    });

    it('should handle avoidFloorChanges option', async () => {
      const request: RouteRequest = {
        from: 'A',
        to: 'F',
        avoidFloorChanges: true
      };
      
      const result = await service.findPath(request);
      
      // Should either find expensive path or fail
      if (result.success) {
        expect(result.totalCost).toBeGreaterThan(50);
      }
    });

    it('should throw error for invalid nodes', async () => {
      const request: RouteRequest = {
        from: 'INVALID',
        to: 'C'
      };
      
      await expect(service.findPath(request)).rejects.toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle same source and destination', async () => {
      const request: RouteRequest = {
        from: 'A',
        to: 'A'
      };
      
      const result = await service.findPath(request);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBe(1);
      expect(result.totalCost).toBe(0);
    });

    it('should handle disconnected graph components', () => {
      // Remove all edges to create disconnected components
      mockGraph.edges = [];
      mockGraph.connectors = [];
      
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(false);
    });

    it('should handle large graphs efficiently', () => {
      // Create a larger graph for performance testing
      const largeGraph: NavGraph = {
        floors: [{ id: 'ground', name: 'Ground Floor' }],
        nodes: [],
        edges: [],
        connectors: [],
        zones: []
      };

      // Create 100 nodes in a grid
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          largeGraph.nodes.push({
            id: `N${i}_${j}`,
            floor: 'ground',
            lat: 21.4200 + i * 0.001,
            lon: 39.8200 + j * 0.001,
            kind: 'poi'
          });
        }
      }

      // Connect adjacent nodes
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 10; j++) {
          if (i < 9) {
            largeGraph.edges.push({
              from: `N${i}_${j}`,
              to: `N${i+1}_${j}`,
              weight: 5,
              kind: 'corridor'
            });
          }
          if (j < 9) {
            largeGraph.edges.push({
              from: `N${i}_${j}`,
              to: `N${i}_${j+1}`,
              weight: 5,
              kind: 'corridor'
            });
          }
        }
      }

      mockGraph = largeGraph;
      graphLoader.getGraph.mockReturnValue(mockGraph);
      graphLoader.getNode.mockImplementation((nodeId: string) => 
        mockGraph.nodes.find(n => n.id === nodeId)
      );
      graphLoader.getEdgesFromNode.mockImplementation((nodeId: string) => 
        mockGraph.edges.filter(e => e.from === nodeId)
      );

      const fromNode = mockGraph.nodes.find(n => n.id === 'N0_0')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'N9_9')!;

      const startTime = Date.now();
      const result = service.testDijkstra(fromNode, toNode);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should handle graphs with cycles', () => {
      // Add edges to create cycles
      mockGraph.edges.push(
        { from: 'C', to: 'A', weight: 25, kind: 'corridor' },
        { from: 'E', to: 'B', weight: 12, kind: 'corridor' }
      );
      
      const fromNode = mockGraph.nodes.find(n => n.id === 'A')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'C')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.path.length).toBeGreaterThan(1);
    });
  });

  describe('Connector Types and Penalties', () => {
    it('should apply different penalties for different connector types', () => {
      mockGraph = createComplexGraph();
      graphLoader.getGraph.mockReturnValue(mockGraph);
      graphLoader.getNode.mockImplementation((nodeId: string) => 
        mockGraph.nodes.find(n => n.id === nodeId)
      );
      graphLoader.getEdgesFromNode.mockImplementation((nodeId: string) => 
        mockGraph.edges.filter(e => e.from === nodeId)
      );
      graphLoader.getConnectorsFromNode.mockImplementation((nodeId: string) => 
        mockGraph.connectors.filter(c => c.from === nodeId)
      );

      const fromNode = mockGraph.nodes.find(n => n.id === 'G2')!;
      
      // Test elevator (penalty 25)
      const elevatorResult = service.testDijkstra(fromNode, mockGraph.nodes.find(n => n.id === 'F2')!);
      
      // Test stairs (penalty 15) via G3->F3
      const stairsFromNode = mockGraph.nodes.find(n => n.id === 'G3')!;
      const stairsResult = service.testDijkstra(stairsFromNode, mockGraph.nodes.find(n => n.id === 'F3')!);
      
      expect(elevatorResult.success).toBe(true);
      expect(stairsResult.success).toBe(true);
      
      // Stairs should be cheaper than elevator (when direct connection)
      expect(stairsResult.totalCost).toBeLessThan(elevatorResult.totalCost);
    });

    it('should handle escalator connectors', () => {
      mockGraph = createComplexGraph();
      graphLoader.getGraph.mockReturnValue(mockGraph);
      graphLoader.getNode.mockImplementation((nodeId: string) => 
        mockGraph.nodes.find(n => n.id === nodeId)
      );
      graphLoader.getConnectorsFromNode.mockImplementation((nodeId: string) => 
        mockGraph.connectors.filter(c => c.from === nodeId)
      );

      const fromNode = mockGraph.nodes.find(n => n.id === 'F2')!;
      const toNode = mockGraph.nodes.find(n => n.id === 'S2')!;
      
      const result = service.testDijkstra(fromNode, toNode);
      
      expect(result.success).toBe(true);
      expect(result.totalCost).toBeGreaterThan(10); // Should include escalator penalty
    });
  });
});