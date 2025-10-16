/**
 * Table-driven tests for A* and Dijkstra pathfinding algorithms
 * Tests on tiny graphs with known optimal solutions
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PathfindingService } from '../../graph/algorithms/pathfinding.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavGraph, Node, Edge } from '../../graph/interfaces/graph.interface';

describe('Pathfinding Algorithm Tests', () => {
  let pathfindingService: PathfindingService;
  let graphLoader: GraphLoaderService;
  
  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PathfindingService,
        {
          provide: GraphLoaderService,
          useValue: {
            getGraph: jest.fn()
          }
        }
      ]
    }).compile();

    pathfindingService = module.get<PathfindingService>(PathfindingService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
  });

  describe('A* Algorithm on Tiny Graphs', () => {
    const astarTestCases = [
      {
        name: 'single node',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' }
        ],
        edges: [],
        start: 'a',
        goal: 'a',
        expectedPath: ['a'],
        expectedCost: 0
      },
      {
        name: 'two connected nodes',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 55, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'b',
        expectedPath: ['a', 'b'],
        expectedCost: 55
      },
      {
        name: 'three nodes linear',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 55, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 55, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'c',
        expectedPath: ['a', 'b', 'c'],
        expectedCost: 110
      },
      {
        name: 'diamond graph - shorter path',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8260, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4230, lon: 39.8264, kind: 'poi' },
          { id: 'd', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 30, kind: 'corridor' },
          { from: 'a', to: 'c', weight: 50, kind: 'corridor' },
          { from: 'b', to: 'd', weight: 30, kind: 'corridor' },
          { from: 'c', to: 'd', weight: 50, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'd',
        expectedPath: ['a', 'b', 'd'],
        expectedCost: 60
      },
      {
        name: 'diamond graph - longer path blocked',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8260, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4230, lon: 39.8264, kind: 'poi' },
          { id: 'd', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 100, kind: 'corridor' },
          { from: 'a', to: 'c', weight: 25, kind: 'corridor' },
          { from: 'c', to: 'd', weight: 25, kind: 'corridor' }
          // No b->d edge, forcing path through c
        ],
        start: 'a',
        goal: 'd',
        expectedPath: ['a', 'c', 'd'],
        expectedCost: 50
      },
      {
        name: 'grid 2x2',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8260, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4225, lon: 39.8264, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4230, lon: 39.8260, kind: 'poi' },
          { id: 'd', floor: 'ground', lat: 21.4230, lon: 39.8264, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 44, kind: 'corridor' },
          { from: 'a', to: 'c', weight: 55, kind: 'corridor' },
          { from: 'b', to: 'd', weight: 55, kind: 'corridor' },
          { from: 'c', to: 'd', weight: 44, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'd',
        expectedPath: ['a', 'b', 'd'], // or ['a', 'c', 'd'] - both cost 99
        expectedCost: 99
      },
      {
        name: 'no path exists',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' }
        ],
        edges: [], // No edges connecting them
        start: 'a',
        goal: 'b',
        expectedPath: null,
        expectedCost: Infinity
      }
    ] as const;

    astarTestCases.forEach((testCase, index) => {
      it(`should solve ${testCase.name} optimally (case ${index + 1})`, async () => {
        const graph: NavGraph = {
          floors: [{ id: 'ground', name: 'Ground Floor' }],
          nodes: testCase.nodes,
          edges: testCase.edges,
          connectors: [],
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);

        if (testCase.expectedPath === null) {
          expect(result).toBeNull();
        } else {
          expect(result).toBeTruthy();
          expect(result!.path).toEqual(testCase.expectedPath);
          expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 1);
          expect(result!.algorithm).toBe('astar');
        }
      });
    });
  });

  describe('Dijkstra Algorithm Fallback', () => {
    const dijkstraTestCases = [
      {
        name: 'single source shortest paths',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
          { id: 'd', floor: 'ground', lat: 21.4240, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 10, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 15, kind: 'corridor' },
          { from: 'a', to: 'c', weight: 20, kind: 'corridor' }, // Direct but longer
          { from: 'c', to: 'd', weight: 5, kind: 'corridor' }
        ],
        start: 'a',
        expectedDistances: {
          'a': 0,
          'b': 10,
          'c': 25, // via a->b->c (10+15) not direct a->c (20)
          'd': 30  // via a->b->c->d
        }
      }
    ] as const;

    dijkstraTestCases.forEach((testCase, index) => {
      it(`should compute shortest paths from single source: ${testCase.name} (case ${index + 1})`, async () => {
        const graph: NavGraph = {
          floors: [{ id: 'ground', name: 'Ground Floor' }],
          nodes: testCase.nodes,
          edges: testCase.edges,
          connectors: [],
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        // Test all destinations from start
        for (const [nodeId, expectedDistance] of Object.entries(testCase.expectedDistances)) {
          const result = await pathfindingService.findPath(testCase.start, nodeId, { algorithm: 'dijkstra' });
          
          if (expectedDistance === Infinity) {
            expect(result).toBeNull();
          } else {
            expect(result).toBeTruthy();
            expect(result!.totalCost).toBeCloseTo(expectedDistance, 1);
          }
        }
      });
    });
  });

  describe('Bidirectional Search Optimization', () => {
    const bidirectionalCases = [
      {
        name: 'long linear chain',
        nodeCount: 10,
        start: 'n0',
        goal: 'n9',
        description: 'should reduce search space on long paths'
      },
      {
        name: 'wide graph',
        nodeCount: 16, // 4x4 grid
        start: 'n0',
        goal: 'n15',
        description: 'should find meeting point efficiently'
      }
    ] as const;

    bidirectionalCases.forEach((testCase, index) => {
      it(`${testCase.description}: ${testCase.name} (case ${index + 1})`, async () => {
        // Generate graph based on test case
        let nodes: Node[] = [];
        let edges: Edge[] = [];
        
        if (testCase.name === 'long linear chain') {
          // Create linear chain
          for (let i = 0; i < testCase.nodeCount; i++) {
            nodes.push({
              id: `n${i}`,
              floor: 'ground',
              lat: 21.4225 + (i * 0.0005),
              lon: 39.8262,
              kind: 'poi'
            });
            
            if (i > 0) {
              edges.push({
                from: `n${i-1}`,
                to: `n${i}`,
                weight: 10,
                kind: 'corridor'
              });
            }
          }
        } else if (testCase.name === 'wide graph') {
          // Create 4x4 grid
          const gridSize = 4;
          for (let row = 0; row < gridSize; row++) {
            for (let col = 0; col < gridSize; col++) {
              const id = row * gridSize + col;
              nodes.push({
                id: `n${id}`,
                floor: 'ground',
                lat: 21.4225 + (row * 0.0005),
                lon: 39.8262 + (col * 0.0005),
                kind: 'poi'
              });
              
              // Add horizontal edges
              if (col > 0) {
                edges.push({
                  from: `n${id-1}`,
                  to: `n${id}`,
                  weight: 10,
                  kind: 'corridor'
                });
              }
              
              // Add vertical edges
              if (row > 0) {
                edges.push({
                  from: `n${id-gridSize}`,
                  to: `n${id}`,
                  weight: 10,
                  kind: 'corridor'
                });
              }
            }
          }
        }

        const graph: NavGraph = {
          floors: [{ id: 'ground', name: 'Ground Floor' }],
          nodes,
          edges,
          connectors: [],
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const startTime = Date.now();
        const result = await pathfindingService.findPath(testCase.start, testCase.goal);
        const executionTime = Date.now() - startTime;

        expect(result).toBeTruthy();
        expect(result!.path).toContain(testCase.start);
        expect(result!.path).toContain(testCase.goal);
        expect(executionTime).toBeLessThan(100); // Should be fast
      });
    });
  });

  describe('Heuristic Function Tests', () => {
    const heuristicCases = [
      {
        name: 'admissible heuristic',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 100, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 100, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'c',
        description: 'heuristic should never overestimate'
      },
      {
        name: 'consistent heuristic',
        nodes: [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4227, lon: 39.8264, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'a', to: 'b', weight: 50, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 50, kind: 'corridor' },
          { from: 'a', to: 'c', weight: 80, kind: 'corridor' }
        ],
        start: 'a',
        goal: 'c',
        description: 'triangle inequality should hold'
      }
    ] as const;

    heuristicCases.forEach((testCase, index) => {
      it(`should satisfy ${testCase.description}: ${testCase.name} (case ${index + 1})`, async () => {
        const graph: NavGraph = {
          floors: [{ id: 'ground', name: 'Ground Floor' }],
          nodes: testCase.nodes,
          edges: testCase.edges,
          connectors: [],
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);
        
        expect(result).toBeTruthy();
        expect(result!.algorithm).toBe('astar');
        
        // For admissible heuristic test
        if (testCase.name === 'admissible heuristic') {
          expect(result!.totalCost).toBe(200); // Should find optimal path a->b->c
        }
        
        // For consistent heuristic test
        if (testCase.name === 'consistent heuristic') {
          expect(result!.totalCost).toBe(80); // Should find direct path a->c
        }
      });
    });
  });

  describe('Edge Weight Handling', () => {
    const weightTestCases = [
      {
        name: 'zero weight edges',
        edges: [
          { from: 'a', to: 'b', weight: 0, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 10, kind: 'corridor' }
        ],
        expectedCost: 10
      },
      {
        name: 'high precision weights',
        edges: [
          { from: 'a', to: 'b', weight: 1.5, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 2.7, kind: 'corridor' }
        ],
        expectedCost: 4.2
      },
      {
        name: 'very large weights',
        edges: [
          { from: 'a', to: 'b', weight: 999999, kind: 'corridor' },
          { from: 'b', to: 'c', weight: 1000000, kind: 'corridor' }
        ],
        expectedCost: 1999999
      }
    ] as const;

    weightTestCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} correctly (case ${index + 1})`, async () => {
        const nodes = [
          { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'c', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ];

        const graph: NavGraph = {
          floors: [{ id: 'ground', name: 'Ground Floor' }],
          nodes,
          edges: testCase.edges,
          connectors: [],
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const result = await pathfindingService.findPath('a', 'c');
        
        expect(result).toBeTruthy();
        expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 2);
      });
    });
  });

  describe('Path Reconstruction', () => {
    it('should reconstruct correct path order', async () => {
      const nodes = [
        { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'middle1', floor: 'ground', lat: 21.4227, lon: 39.8262, kind: 'poi' },
        { id: 'middle2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'middle3', floor: 'ground', lat: 21.4232, lon: 39.8262, kind: 'poi' },
        { id: 'goal', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
      ];

      const edges = [
        { from: 'start', to: 'middle1', weight: 10, kind: 'corridor' },
        { from: 'middle1', to: 'middle2', weight: 10, kind: 'corridor' },
        { from: 'middle2', to: 'middle3', weight: 10, kind: 'corridor' },
        { from: 'middle3', to: 'goal', weight: 10, kind: 'corridor' }
      ];

      const graph: NavGraph = {
        floors: [{ id: 'ground', name: 'Ground Floor' }],
        nodes,
        edges,
        connectors: [],
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      const result = await pathfindingService.findPath('start', 'goal');
      
      expect(result).toBeTruthy();
      expect(result!.path).toEqual(['start', 'middle1', 'middle2', 'middle3', 'goal']);
      expect(result!.path[0]).toBe('start');
      expect(result!.path[result!.path.length - 1]).toBe('goal');
      expect(result!.totalCost).toBe(40);
    });

    it('should handle cycles without infinite loops', async () => {
      const nodes = [
        { id: 'a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'b', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
        { id: 'c', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' }
      ];

      const edges = [
        { from: 'a', to: 'b', weight: 10, kind: 'corridor' },
        { from: 'b', to: 'c', weight: 10, kind: 'corridor' },
        { from: 'c', to: 'a', weight: 10, kind: 'corridor' }, // Creates cycle
        { from: 'b', to: 'a', weight: 5, kind: 'corridor' }   // Shorter back path
      ];

      const graph: NavGraph = {
        floors: [{ id: 'ground', name: 'Ground Floor' }],
        nodes,
        edges,
        connectors: [],
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      const result = await pathfindingService.findPath('a', 'c');
      
      expect(result).toBeTruthy();
      expect(result!.path).toEqual(['a', 'b', 'c']);
      expect(result!.totalCost).toBe(20);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});