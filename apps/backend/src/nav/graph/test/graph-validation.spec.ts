import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { GraphLoaderService } from '../services/graph-loader.service';
import { NavGraphSchema } from '../schemas/graph.schema';
import * as fs from 'fs';
import * as path from 'path';

describe('Graph Validation', () => {
  let service: GraphLoaderService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
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

    service = module.get<GraphLoaderService>(GraphLoaderService);
    await service.onModuleInit();
  });

  describe('Schema Validation', () => {
    it('should validate the loaded graph against schema', () => {
      const graph = service.getGraph();
      
      // Should not throw
      expect(() => NavGraphSchema.parse(graph)).not.toThrow();
    });

    it('should validate floor requirements', () => {
      const graph = service.getGraph();
      
      // All floors should have unique IDs
      const floorIds = graph.floors.map(f => f.id);
      const uniqueFloorIds = new Set(floorIds);
      expect(uniqueFloorIds.size).toBe(floorIds.length);
      
      // All floors should have names
      for (const floor of graph.floors) {
        expect(floor.name).toBeTruthy();
        expect(floor.name.length).toBeGreaterThan(0);
      }
    });

    it('should validate node requirements', () => {
      const graph = service.getGraph();
      
      // All nodes should have unique IDs
      const nodeIds = graph.nodes.map(n => n.id);
      const uniqueNodeIds = new Set(nodeIds);
      expect(uniqueNodeIds.size).toBe(nodeIds.length);
      
      // All nodes should reference existing floors
      const floorIds = new Set(graph.floors.map(f => f.id));
      for (const node of graph.nodes) {
        expect(floorIds.has(node.floor)).toBe(true);
      }
      
      // Coordinates should be reasonable (Mecca area)
      for (const node of graph.nodes) {
        expect(node.lat).toBeGreaterThan(21.0);
        expect(node.lat).toBeLessThan(22.0);
        expect(node.lon).toBeGreaterThan(39.0);
        expect(node.lon).toBeLessThan(40.0);
      }
      
      // Should have valid node kinds
      for (const node of graph.nodes) {
        expect(['gate', 'poi']).toContain(node.kind);
      }
    });

    it('should validate edge requirements', () => {
      const graph = service.getGraph();
      const nodeIds = new Set(graph.nodes.map(n => n.id));
      
      // All edges should reference existing nodes
      for (const edge of graph.edges) {
        expect(nodeIds.has(edge.from)).toBe(true);
        expect(nodeIds.has(edge.to)).toBe(true);
      }
      
      // Edge weights should be positive
      for (const edge of graph.edges) {
        expect(edge.weight).toBeGreaterThan(0);
      }
      
      // Should have valid edge kinds
      for (const edge of graph.edges) {
        expect(['corridor']).toContain(edge.kind);
      }
    });

    it('should validate connector requirements', () => {
      const graph = service.getGraph();
      const nodeIds = new Set(graph.nodes.map(n => n.id));
      
      // All connectors should reference existing nodes
      for (const connector of graph.connectors) {
        expect(nodeIds.has(connector.from)).toBe(true);
        expect(nodeIds.has(connector.to)).toBe(true);
      }
      
      // Connector penalties should be non-negative
      for (const connector of graph.connectors) {
        expect(connector.penalty).toBeGreaterThanOrEqual(0);
      }
      
      // Should have valid connector types
      for (const connector of graph.connectors) {
        expect(['elevator', 'stairs']).toContain(connector.type);
      }
      
      // Connectors should connect different floors
      for (const connector of graph.connectors) {
        const fromNode = service.getNode(connector.from);
        const toNode = service.getNode(connector.to);
        expect(fromNode.floor).not.toBe(toNode.floor);
      }
    });

    it('should validate zone requirements', () => {
      const graph = service.getGraph();
      const floorIds = new Set(graph.floors.map(f => f.id));
      
      // All zones should reference existing floors
      for (const zone of graph.zones) {
        expect(floorIds.has(zone.floor)).toBe(true);
      }
      
      // Polygons should have at least 3 points
      for (const zone of graph.zones) {
        expect(zone.polygon.length).toBeGreaterThanOrEqual(3);
      }
      
      // Polygon coordinates should be valid
      for (const zone of graph.zones) {
        for (const [lat, lon] of zone.polygon) {
          expect(lat).toBeGreaterThan(-90);
          expect(lat).toBeLessThan(90);
          expect(lon).toBeGreaterThan(-180);
          expect(lon).toBeLessThan(180);
        }
      }
    });
  });

  describe('Graph Connectivity', () => {
    it('should have connected components within each floor', () => {
      const graph = service.getGraph();
      
      // For each floor, verify nodes are connected
      const floors = graph.floors.map(f => f.id);
      for (const floorId of floors) {
        const nodesOnFloor = graph.nodes.filter(n => n.floor === floorId);
        if (nodesOnFloor.length <= 1) continue; // Skip floors with 0-1 nodes
        
        // Build adjacency list for this floor
        const adjacencyList = new Map<string, string[]>();
        for (const node of nodesOnFloor) {
          adjacencyList.set(node.id, []);
        }
        
        // Add edges within the floor
        for (const edge of graph.edges) {
          const fromNode = service.getNode(edge.from);
          const toNode = service.getNode(edge.to);
          if (fromNode.floor === floorId && toNode.floor === floorId) {
            adjacencyList.get(edge.from)?.push(edge.to);
            adjacencyList.get(edge.to)?.push(edge.from); // Bidirectional
          }
        }
        
        // Check if all nodes are reachable from the first node
        const visited = new Set<string>();
        const queue = [nodesOnFloor[0].id];
        visited.add(nodesOnFloor[0].id);
        
        while (queue.length > 0) {
          const current = queue.shift()!;
          const neighbors = adjacencyList.get(current) || [];
          for (const neighbor of neighbors) {
            if (!visited.has(neighbor)) {
              visited.add(neighbor);
              queue.push(neighbor);
            }
          }
        }
        
        // All nodes on the floor should be reachable
        expect(visited.size).toBe(nodesOnFloor.length);
      }
    });

    it('should have cross-floor connectivity through connectors', () => {
      const graph = service.getGraph();
      
      // Build graph with connectors
      const adjacencyList = new Map<string, string[]>();
      for (const node of graph.nodes) {
        adjacencyList.set(node.id, []);
      }
      
      // Add edges (bidirectional)
      for (const edge of graph.edges) {
        adjacencyList.get(edge.from)?.push(edge.to);
        adjacencyList.get(edge.to)?.push(edge.from);
      }
      
      // Add connectors (bidirectional)
      for (const connector of graph.connectors) {
        adjacencyList.get(connector.from)?.push(connector.to);
        adjacencyList.get(connector.to)?.push(connector.from);
      }
      
      // Check if all nodes are reachable from the first node
      const visited = new Set<string>();
      const queue = [graph.nodes[0].id];
      visited.add(graph.nodes[0].id);
      
      while (queue.length > 0) {
        const current = queue.shift()!;
        const neighbors = adjacencyList.get(current) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            visited.add(neighbor);
            queue.push(neighbor);
          }
        }
      }
      
      // All nodes should be reachable
      expect(visited.size).toBe(graph.nodes.length);
    });

    it('should have gates accessible from all floors', () => {
      const graph = service.getGraph();
      const gates = graph.nodes.filter(n => n.kind === 'gate');
      
      expect(gates.length).toBeGreaterThan(0);
      
      // Each floor should be reachable from at least one gate
      const floors = graph.floors.map(f => f.id);
      for (const floorId of floors) {
        const nodesOnFloor = graph.nodes.filter(n => n.floor === floorId);
        if (nodesOnFloor.length === 0) continue;
        
        let foundAccessibleGate = false;
        for (const gate of gates) {
          // Try to find path from gate to any node on this floor
          const anyNodeOnFloor = nodesOnFloor[0];
          try {
            // This is a simple connectivity check - if we can reach any node on the floor,
            // the floor is accessible
            const adjacencyList = new Map<string, string[]>();
            for (const node of graph.nodes) {
              adjacencyList.set(node.id, []);
            }
            
            // Add edges and connectors
            for (const edge of graph.edges) {
              adjacencyList.get(edge.from)?.push(edge.to);
              adjacencyList.get(edge.to)?.push(edge.from);
            }
            for (const connector of graph.connectors) {
              adjacencyList.get(connector.from)?.push(connector.to);
              adjacencyList.get(connector.to)?.push(connector.from);
            }
            
            // BFS from gate to target node
            const visited = new Set<string>();
            const queue = [gate.id];
            visited.add(gate.id);
            
            while (queue.length > 0) {
              const current = queue.shift()!;
              if (current === anyNodeOnFloor.id) {
                foundAccessibleGate = true;
                break;
              }
              
              const neighbors = adjacencyList.get(current) || [];
              for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                  visited.add(neighbor);
                  queue.push(neighbor);
                }
              }
            }
            
            if (foundAccessibleGate) break;
          } catch (error) {
            // Continue to next gate
          }
        }
        
        expect(foundAccessibleGate).toBe(true);
      }
    });
  });

  describe('Performance Characteristics', () => {
    it('should have reasonable graph size for pathfinding performance', () => {
      const graph = service.getGraph();
      
      // Graph should not be too large for real-time pathfinding
      expect(graph.nodes.length).toBeLessThan(1000);
      expect(graph.edges.length).toBeLessThan(5000);
      expect(graph.connectors.length).toBeLessThan(100);
      
      // Should have enough nodes and edges for meaningful navigation
      expect(graph.nodes.length).toBeGreaterThan(5);
      expect(graph.edges.length).toBeGreaterThan(3);
    });

    it('should have reasonable edge weights for realistic navigation', () => {
      const graph = service.getGraph();
      
      // Edge weights should be reasonable for walking distances in meters
      for (const edge of graph.edges) {
        expect(edge.weight).toBeLessThan(1000); // Less than 1km
        expect(edge.weight).toBeGreaterThan(1); // More than 1 meter
      }
    });

    it('should have reasonable connector penalties', () => {
      const graph = service.getGraph();
      
      for (const connector of graph.connectors) {
        // Penalties should be reasonable compared to edge weights
        expect(connector.penalty).toBeLessThan(300); // Less than 5 minutes
        expect(connector.penalty).toBeGreaterThan(0); // Some cost for changing floors
        
        // Stairs should generally be more expensive than elevators
        if (connector.type === 'stairs') {
          expect(connector.penalty).toBeGreaterThan(10);
        }
      }
    });
  });

  describe('Data Quality', () => {
    it('should have descriptive names for floors and nodes', () => {
      const graph = service.getGraph();
      
      // Floor names should be descriptive
      for (const floor of graph.floors) {
        expect(floor.name.length).toBeGreaterThan(3);
        expect(floor.name).toMatch(/\w+/); // Contains word characters
      }
      
      // Node IDs should be descriptive
      for (const node of graph.nodes) {
        expect(node.id.length).toBeGreaterThan(3);
        expect(node.id).toMatch(/\w+/); // Contains word characters
      }
    });

    it('should have consistent coordinate precision', () => {
      const graph = service.getGraph();
      
      for (const node of graph.nodes) {
        // Coordinates should have reasonable precision (not too many decimal places)
        const latStr = node.lat.toString();
        const lonStr = node.lon.toString();
        
        const latDecimals = latStr.includes('.') ? latStr.split('.')[1].length : 0;
        const lonDecimals = lonStr.includes('.') ? lonStr.split('.')[1].length : 0;
        
        expect(latDecimals).toBeLessThanOrEqual(6); // Enough for meter precision
        expect(lonDecimals).toBeLessThanOrEqual(6);
      }
    });
  });
});