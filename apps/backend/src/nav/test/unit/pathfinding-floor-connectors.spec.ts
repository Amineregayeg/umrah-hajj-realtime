/**
 * Table-driven tests for floor connector pathfinding
 * Tests multi-floor navigation with elevators, stairs, and penalties
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { PathfindingService } from '../../graph/algorithms/pathfinding.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavGraph, Node, Edge, Connector } from '../../graph/interfaces/graph.interface';

describe('Floor Connector Pathfinding Tests', () => {
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

  describe('Simple Floor Transitions', () => {
    const simpleFloorCases = [
      {
        name: 'single elevator direct transition',
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'g1', to: 'elevator_g', weight: 55, kind: 'corridor' },
          { from: 'elevator_f', to: 'f1', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 30 }
        ],
        start: 'g1',
        goal: 'f1',
        expectedPath: ['g1', 'elevator_g', 'elevator_f', 'f1'],
        expectedCost: 140 // 55 + 30 + 55
      },
      {
        name: 'stairs with higher penalty',
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'stairs_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'stairs_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'g1', to: 'stairs_g', weight: 55, kind: 'corridor' },
          { from: 'stairs_f', to: 'f1', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'stairs_g', to: 'stairs_f', type: 'stairs', penalty: 60 }
        ],
        start: 'g1',
        goal: 'f1',
        expectedPath: ['g1', 'stairs_g', 'stairs_f', 'f1'],
        expectedCost: 170 // 55 + 60 + 55
      },
      {
        name: 'escalator with medium penalty',
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'escalator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'escalator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'g1', to: 'escalator_g', weight: 55, kind: 'corridor' },
          { from: 'escalator_f', to: 'f1', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'escalator_g', to: 'escalator_f', type: 'escalator', penalty: 45 }
        ],
        start: 'g1',
        goal: 'f1',
        expectedPath: ['g1', 'escalator_g', 'escalator_f', 'f1'],
        expectedCost: 155 // 55 + 45 + 55
      }
    ] as const;

    simpleFloorCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const graph: NavGraph = {
          floors: testCase.floors,
          nodes: testCase.nodes,
          edges: testCase.edges,
          connectors: testCase.connectors,
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);

        expect(result).toBeTruthy();
        expect(result!.path).toEqual(testCase.expectedPath);
        expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 1);
        expect(result!.path.filter(node => node.includes('_g')).length).toBe(1);
        expect(result!.path.filter(node => node.includes('_f')).length).toBe(1);
      });
    });
  });

  describe('Multiple Connector Options', () => {
    const multiConnectorCases = [
      {
        name: 'choose cheaper elevator over expensive stairs',
        graph: {
          floors: [
            { id: 'ground', name: 'Ground Floor' },
            { id: 'first', name: 'First Floor' }
          ],
          nodes: [
            { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
            { id: 'elevator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
            { id: 'stairs_g', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
            { id: 'elevator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
            { id: 'stairs_f', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' },
            { id: 'goal', floor: 'first', lat: 21.4240, lon: 39.8262, kind: 'poi' }
          ],
          edges: [
            { from: 'start', to: 'elevator_g', weight: 55, kind: 'corridor' },
            { from: 'start', to: 'stairs_g', weight: 110, kind: 'corridor' },
            { from: 'elevator_f', to: 'goal', weight: 110, kind: 'corridor' },
            { from: 'stairs_f', to: 'goal', weight: 55, kind: 'corridor' }
          ],
          connectors: [
            { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 20 },
            { from: 'stairs_g', to: 'stairs_f', type: 'stairs', penalty: 100 }
          ]
        },
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'elevator_g', 'elevator_f', 'goal'],
        expectedCost: 185 // 55 + 20 + 110
      },
      {
        name: 'choose closer stairs despite higher penalty',
        graph: {
          floors: [
            { id: 'ground', name: 'Ground Floor' },
            { id: 'first', name: 'First Floor' }
          ],
          nodes: [
            { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
            { id: 'elevator_g', floor: 'ground', lat: 21.4250, lon: 39.8262, kind: 'poi' }, // Far
            { id: 'stairs_g', floor: 'ground', lat: 21.4227, lon: 39.8262, kind: 'poi' },   // Close
            { id: 'elevator_f', floor: 'first', lat: 21.4250, lon: 39.8262, kind: 'poi' },
            { id: 'stairs_f', floor: 'first', lat: 21.4227, lon: 39.8262, kind: 'poi' },
            { id: 'goal', floor: 'first', lat: 21.4225, lon: 39.8262, kind: 'poi' }
          ],
          edges: [
            { from: 'start', to: 'elevator_g', weight: 275, kind: 'corridor' }, // Far
            { from: 'start', to: 'stairs_g', weight: 22, kind: 'corridor' },    // Close
            { from: 'elevator_f', to: 'goal', weight: 275, kind: 'corridor' },
            { from: 'stairs_f', to: 'goal', weight: 22, kind: 'corridor' }
          ],
          connectors: [
            { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 20 },
            { from: 'stairs_g', to: 'stairs_f', type: 'stairs', penalty: 60 }
          ]
        },
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'stairs_g', 'stairs_f', 'goal'],
        expectedCost: 104 // 22 + 60 + 22
      }
    ] as const;

    multiConnectorCases.forEach((testCase, index) => {
      it(`should ${testCase.name} (case ${index + 1})`, async () => {
        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(testCase.graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);

        expect(result).toBeTruthy();
        expect(result!.path).toEqual(testCase.expectedPath);
        expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 1);
      });
    });
  });

  describe('Multi-Floor Paths', () => {
    const multiFloorCases = [
      {
        name: 'three floors with two transitions',
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' },
          { id: 'second', name: 'Second Floor' }
        ],
        nodes: [
          { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_s', floor: 'second', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'goal', floor: 'second', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'start', to: 'elevator_g', weight: 55, kind: 'corridor' },
          { from: 'elevator_s', to: 'goal', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 30 },
          { from: 'elevator_f', to: 'elevator_s', type: 'elevator', penalty: 30 }
        ],
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'elevator_g', 'elevator_f', 'elevator_s', 'goal'],
        expectedCost: 170 // 55 + 30 + 30 + 55
      },
      {
        name: 'mixed connector types across floors',
        floors: [
          { id: 'basement', name: 'Basement' },
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'start', floor: 'basement', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'stairs_b', floor: 'basement', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'stairs_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_g', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_f', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' },
          { id: 'goal', floor: 'first', lat: 21.4240, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'start', to: 'stairs_b', weight: 55, kind: 'corridor' },
          { from: 'stairs_g', to: 'elevator_g', weight: 55, kind: 'corridor' },
          { from: 'elevator_f', to: 'goal', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'stairs_b', to: 'stairs_g', type: 'stairs', penalty: 80 },
          { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 30 }
        ],
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'stairs_b', 'stairs_g', 'elevator_g', 'elevator_f', 'goal'],
        expectedCost: 275 // 55 + 80 + 55 + 30 + 55
      }
    ] as const;

    multiFloorCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const graph: NavGraph = {
          floors: testCase.floors,
          nodes: testCase.nodes,
          edges: testCase.edges,
          connectors: testCase.connectors,
          zones: []
        };

        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);

        expect(result).toBeTruthy();
        expect(result!.path).toEqual(testCase.expectedPath);
        expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 1);
        
        // Verify correct floor sequence
        const floors = result!.path.map(nodeId => {
          const node = testCase.nodes.find(n => n.id === nodeId);
          return node?.floor;
        });
        
        expect(floors[0]).toBe(testCase.floors[0].id); // Start floor
        expect(floors[floors.length - 1]).toBe(testCase.floors[testCase.floors.length - 1].id); // End floor
      });
    });
  });

  describe('Connector Penalty Optimization', () => {
    const penaltyCases = [
      {
        name: 'high penalty forces longer same-floor path',
        graph: {
          floors: [
            { id: 'ground', name: 'Ground Floor' },
            { id: 'first', name: 'First Floor' }
          ],
          nodes: [
            { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
            { id: 'connector_g', floor: 'ground', lat: 21.4227, lon: 39.8262, kind: 'poi' },
            { id: 'intermediate', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
            { id: 'connector_f', floor: 'first', lat: 21.4227, lon: 39.8262, kind: 'poi' },
            { id: 'goal', floor: 'first', lat: 21.4225, lon: 39.8262, kind: 'poi' }
          ],
          edges: [
            { from: 'start', to: 'connector_g', weight: 22, kind: 'corridor' },
            { from: 'start', to: 'intermediate', weight: 110, kind: 'corridor' },
            { from: 'intermediate', to: 'goal', weight: 110, kind: 'corridor' }, // Same floor but very long
            { from: 'connector_f', to: 'goal', weight: 22, kind: 'corridor' }
          ],
          connectors: [
            { from: 'connector_g', to: 'connector_f', type: 'stairs', penalty: 300 } // Very high penalty
          ]
        },
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'intermediate', 'goal'], // Should avoid floor change
        expectedCost: 220 // 110 + 110
      },
      {
        name: 'low penalty makes floor change attractive',
        graph: {
          floors: [
            { id: 'ground', name: 'Ground Floor' },
            { id: 'first', name: 'First Floor' }
          ],
          nodes: [
            { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
            { id: 'connector_g', floor: 'ground', lat: 21.4227, lon: 39.8262, kind: 'poi' },
            { id: 'intermediate', floor: 'ground', lat: 21.4235, lon: 39.8262, kind: 'poi' },
            { id: 'connector_f', floor: 'first', lat: 21.4227, lon: 39.8262, kind: 'poi' },
            { id: 'goal', floor: 'first', lat: 21.4225, lon: 39.8262, kind: 'poi' }
          ],
          edges: [
            { from: 'start', to: 'connector_g', weight: 22, kind: 'corridor' },
            { from: 'start', to: 'intermediate', weight: 110, kind: 'corridor' },
            { from: 'intermediate', to: 'goal', weight: 110, kind: 'corridor' },
            { from: 'connector_f', to: 'goal', weight: 22, kind: 'corridor' }
          ],
          connectors: [
            { from: 'connector_g', to: 'connector_f', type: 'elevator', penalty: 5 } // Very low penalty
          ]
        },
        start: 'start',
        goal: 'goal',
        expectedPath: ['start', 'connector_g', 'connector_f', 'goal'], // Should use floor change
        expectedCost: 49 // 22 + 5 + 22
      }
    ] as const;

    penaltyCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        jest.spyOn(graphLoader, 'getGraph').mockReturnValue(testCase.graph);

        const result = await pathfindingService.findPath(testCase.start, testCase.goal);

        expect(result).toBeTruthy();
        expect(result!.path).toEqual(testCase.expectedPath);
        expect(result!.totalCost).toBeCloseTo(testCase.expectedCost, 1);
      });
    });
  });

  describe('Bidirectional Connectors', () => {
    it('should handle bidirectional elevator connections', async () => {
      const graph: NavGraph = {
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'g1', to: 'elevator_g', weight: 55, kind: 'corridor' },
          { from: 'elevator_f', to: 'f1', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 30 },
          { from: 'elevator_f', to: 'elevator_g', type: 'elevator', penalty: 30 } // Bidirectional
        ],
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      // Test both directions
      const upResult = await pathfindingService.findPath('g1', 'f1');
      expect(upResult).toBeTruthy();
      expect(upResult!.path).toEqual(['g1', 'elevator_g', 'elevator_f', 'f1']);
      expect(upResult!.totalCost).toBe(140);

      const downResult = await pathfindingService.findPath('f1', 'g1');
      expect(downResult).toBeTruthy();
      expect(downResult!.path).toEqual(['f1', 'elevator_f', 'elevator_g', 'g1']);
      expect(downResult!.totalCost).toBe(140);
    });

    it('should handle asymmetric connector penalties', async () => {
      const graph: NavGraph = {
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'escalator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'escalator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'g1', to: 'escalator_g', weight: 55, kind: 'corridor' },
          { from: 'escalator_f', to: 'f1', weight: 55, kind: 'corridor' }
        ],
        connectors: [
          { from: 'escalator_g', to: 'escalator_f', type: 'escalator_up', penalty: 20 },   // Going up is easier
          { from: 'escalator_f', to: 'escalator_g', type: 'escalator_down', penalty: 40 } // Going down harder
        ],
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      const upResult = await pathfindingService.findPath('g1', 'f1');
      expect(upResult!.totalCost).toBe(130); // 55 + 20 + 55

      const downResult = await pathfindingService.findPath('f1', 'g1');
      expect(downResult!.totalCost).toBe(150); // 55 + 40 + 55
    });
  });

  describe('Error Cases and Edge Conditions', () => {
    it('should handle missing floor connections gracefully', async () => {
      const graph: NavGraph = {
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'g1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'f1', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [], // No connections at all
        connectors: [], // No floor connectors
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      const result = await pathfindingService.findPath('g1', 'f1');
      expect(result).toBeNull(); // Should fail gracefully
    });

    it('should handle broken connector chains', async () => {
      const graph: NavGraph = {
        floors: [
          { id: 'ground', name: 'Ground Floor' },
          { id: 'first', name: 'First Floor' }
        ],
        nodes: [
          { id: 'start', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_g', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'elevator_f', floor: 'first', lat: 21.4230, lon: 39.8262, kind: 'poi' },
          { id: 'goal', floor: 'first', lat: 21.4235, lon: 39.8262, kind: 'poi' }
        ],
        edges: [
          { from: 'start', to: 'elevator_g', weight: 55, kind: 'corridor' }
          // Missing edge from elevator_f to goal
        ],
        connectors: [
          { from: 'elevator_g', to: 'elevator_f', type: 'elevator', penalty: 30 }
        ],
        zones: []
      };

      jest.spyOn(graphLoader, 'getGraph').mockReturnValue(graph);

      const result = await pathfindingService.findPath('start', 'goal');
      expect(result).toBeNull(); // Should fail due to broken chain
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});