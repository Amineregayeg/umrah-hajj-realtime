import { Injectable, Logger } from '@nestjs/common';
import { GraphLoaderService } from '../services/graph-loader.service';
import { PathFindingResult, RouteRequest, Node } from '../interfaces/graph.interface';

interface PathNode {
  id: string;
  gCost: number; // Cost from start
  hCost: number; // Heuristic cost to goal
  fCost: number; // Total cost (g + h)
  parent: string | null;
  floor: string;
}

@Injectable()
export class PathfindingService {
  private readonly logger = new Logger(PathfindingService.name);

  constructor(private readonly graphLoader: GraphLoaderService) {}

  async findPath(request: RouteRequest): Promise<PathFindingResult> {
    const graph = this.graphLoader.getGraph();
    const fromNode = this.graphLoader.getNode(request.from);
    const toNode = this.graphLoader.getNode(request.to);

    if (!fromNode || !toNode) {
      throw new Error(`Invalid nodes: from=${request.from}, to=${request.to}`);
    }

    this.logger.log(`Finding path from ${request.from} to ${request.to} using ${request.algorithm || 'dijkstra'}`);

    const algorithm = request.algorithm || 'dijkstra';
    
    if (algorithm === 'astar') {
      return this.astar(fromNode, toNode, request.avoidFloorChanges || false);
    } else {
      return this.dijkstra(fromNode, toNode, request.avoidFloorChanges || false);
    }
  }

  private dijkstra(fromNode: Node, toNode: Node, avoidFloorChanges: boolean): PathFindingResult {
    const graph = this.graphLoader.getGraph();
    const distances = new Map<string, number>();
    const previous = new Map<string, string | null>();
    const visited = new Set<string>();
    const queue = new Set<string>();

    // Initialize distances
    for (const node of graph.nodes) {
      distances.set(node.id, node.id === fromNode.id ? 0 : Infinity);
      previous.set(node.id, null);
      queue.add(node.id);
    }

    while (queue.size > 0) {
      // Find node with minimum distance
      let current: string | null = null;
      let minDistance = Infinity;
      for (const nodeId of queue) {
        const dist = distances.get(nodeId)!;
        if (dist < minDistance) {
          minDistance = dist;
          current = nodeId;
        }
      }

      if (!current || minDistance === Infinity) {
        break;
      }

      queue.delete(current);
      visited.add(current);

      if (current === toNode.id) {
        break;
      }

      // Check edges (both directions)
      const allEdges = [
        ...this.graphLoader.getEdgesFromNode(current),
        // Add reverse edges for bidirectional navigation
        ...graph.edges.filter(e => e.to === current).map(e => ({ ...e, from: e.to, to: e.from }))
      ];

      for (const edge of allEdges) {
        if (visited.has(edge.to)) continue;

        const currentNode = this.graphLoader.getNode(current)!;
        const targetNode = this.graphLoader.getNode(edge.to)!;
        
        let edgeCost = edge.weight;
        
        // Add floor change penalty if avoiding floor changes
        if (avoidFloorChanges && currentNode.floor !== targetNode.floor) {
          edgeCost += 1000; // High penalty for floor changes
        }

        const alt = distances.get(current)! + edgeCost;
        if (alt < distances.get(edge.to)!) {
          distances.set(edge.to, alt);
          previous.set(edge.to, current);
        }
      }

      // Check connectors (both directions)
      const allConnectors = [
        ...this.graphLoader.getConnectorsFromNode(current),
        // Add reverse connectors
        ...graph.connectors.filter(c => c.to === current).map(c => ({ ...c, from: c.to, to: c.from }))
      ];

      for (const connector of allConnectors) {
        if (visited.has(connector.to)) continue;

        let connectorCost = connector.penalty;
        
        // Add extra penalty if avoiding floor changes
        if (avoidFloorChanges) {
          connectorCost += 500; // Moderate penalty for connectors when avoiding floor changes
        }

        const alt = distances.get(current)! + connectorCost;
        if (alt < distances.get(connector.to)!) {
          distances.set(connector.to, alt);
          previous.set(connector.to, current);
        }
      }
    }

    const finalDistance = distances.get(toNode.id)!;
    if (finalDistance === Infinity) {
      throw new Error(`No path found from ${fromNode.id} to ${toNode.id}`);
    }

    return this.reconstructPath(previous, fromNode.id, toNode.id, finalDistance);
  }

  private astar(fromNode: Node, toNode: Node, avoidFloorChanges: boolean): PathFindingResult {
    const graph = this.graphLoader.getGraph();
    const openSet = new Set<string>([fromNode.id]);
    const closedSet = new Set<string>();
    const gScore = new Map<string, number>();
    const fScore = new Map<string, number>();
    const previous = new Map<string, string | null>();

    // Initialize scores for all nodes
    for (const node of graph.nodes) {
      gScore.set(node.id, node.id === fromNode.id ? 0 : Infinity);
      fScore.set(node.id, node.id === fromNode.id ? this.heuristic(fromNode, toNode) : Infinity);
      previous.set(node.id, null);
    }

    while (openSet.size > 0) {
      // Find node with lowest fScore
      let current: string | null = null;
      let minFScore = Infinity;
      for (const nodeId of openSet) {
        const score = fScore.get(nodeId) ?? Infinity;
        if (score < minFScore) {
          minFScore = score;
          current = nodeId;
        }
      }

      if (!current) break;

      if (current === toNode.id) {
        return this.reconstructPath(previous, fromNode.id, toNode.id, gScore.get(toNode.id)!);
      }

      openSet.delete(current);
      closedSet.add(current);

      // Check edges (both directions)
      const allEdges = [
        ...this.graphLoader.getEdgesFromNode(current),
        // Add reverse edges for bidirectional navigation
        ...graph.edges.filter(e => e.to === current).map(e => ({ ...e, from: e.to, to: e.from }))
      ];

      for (const edge of allEdges) {
        if (closedSet.has(edge.to)) continue;

        const currentNode = this.graphLoader.getNode(current)!;
        const targetNode = this.graphLoader.getNode(edge.to)!;
        
        let edgeCost = edge.weight;
        
        // Add floor change penalty if avoiding floor changes
        if (avoidFloorChanges && currentNode.floor !== targetNode.floor) {
          edgeCost += 1000;
        }

        const tentativeGScore = (gScore.get(current) ?? Infinity) + edgeCost;

        if (tentativeGScore >= (gScore.get(edge.to) ?? Infinity)) {
          continue;
        }

        previous.set(edge.to, current);
        gScore.set(edge.to, tentativeGScore);
        fScore.set(edge.to, tentativeGScore + this.heuristic(targetNode, toNode));
        
        if (!openSet.has(edge.to)) {
          openSet.add(edge.to);
        }
      }

      // Check connectors (both directions)
      const allConnectors = [
        ...this.graphLoader.getConnectorsFromNode(current),
        // Add reverse connectors
        ...graph.connectors.filter(c => c.to === current).map(c => ({ ...c, from: c.to, to: c.from }))
      ];

      for (const connector of allConnectors) {
        if (closedSet.has(connector.to)) continue;

        let connectorCost = connector.penalty;
        
        if (avoidFloorChanges) {
          connectorCost += 500;
        }

        const tentativeGScore = (gScore.get(current) ?? Infinity) + connectorCost;

        if (tentativeGScore >= (gScore.get(connector.to) ?? Infinity)) {
          continue;
        }

        const targetNode = this.graphLoader.getNode(connector.to)!;
        previous.set(connector.to, current);
        gScore.set(connector.to, tentativeGScore);
        fScore.set(connector.to, tentativeGScore + this.heuristic(targetNode, toNode));
        
        if (!openSet.has(connector.to)) {
          openSet.add(connector.to);
        }
      }
    }

    throw new Error(`No path found from ${fromNode.id} to ${toNode.id}`);
  }

  private heuristic(nodeA: Node, nodeB: Node): number {
    // Haversine distance approximation for small distances
    const dLat = (nodeB.lat - nodeA.lat) * Math.PI / 180;
    const dLon = (nodeB.lon - nodeA.lon) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(nodeA.lat * Math.PI / 180) * Math.cos(nodeB.lat * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const earthRadius = 6371000; // meters
    return earthRadius * c;
  }

  private reconstructPath(
    previous: Map<string, string | null>,
    start: string,
    end: string,
    totalCost: number
  ): PathFindingResult {
    const path: string[] = [];
    const floors = new Set<string>();
    let current: string | null = end;

    while (current !== null) {
      path.unshift(current);
      const node = this.graphLoader.getNode(current);
      if (node) {
        floors.add(node.floor);
      }
      current = previous.get(current) || null;
    }

    if (path[0] !== start) {
      throw new Error('Path reconstruction failed');
    }

    // Calculate actual distance using coordinates
    let distance = 0;
    for (let i = 0; i < path.length - 1; i++) {
      const nodeA = this.graphLoader.getNode(path[i])!;
      const nodeB = this.graphLoader.getNode(path[i + 1])!;
      distance += this.heuristic(nodeA, nodeB);
    }

    return {
      path,
      totalCost,
      distance,
      floors: Array.from(floors)
    };
  }
}