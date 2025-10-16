import { Injectable, Logger } from '@nestjs/common';
import { GraphLoaderService } from './graph-loader.service';
import { PathfindingService } from '../algorithms/pathfinding.service';
import { GraphCacheService } from './graph-cache.service';
import { PathFindingResult, RouteRequest, NavGraph } from '../interfaces/graph.interface';

@Injectable()
export class GraphService {
  private readonly logger = new Logger(GraphService.name);

  constructor(
    private readonly graphLoader: GraphLoaderService,
    private readonly pathfinding: PathfindingService,
    private readonly cache: GraphCacheService
  ) {
    // Setup cache invalidation on graph reload
    this.setupCacheInvalidation();
  }

  async findRoute(request: RouteRequest): Promise<PathFindingResult> {
    // Check cache first
    const cached = this.cache.get(request);
    if (cached) {
      this.logger.debug(`Returning cached route for ${request.from} -> ${request.to}`);
      return cached;
    }

    // Compute path
    const startTime = Date.now();
    const result = await this.pathfinding.findPath(request);
    const computeTime = Date.now() - startTime;

    this.logger.log(
      `Route computed in ${computeTime}ms: ${request.from} -> ${request.to} ` +
      `(${result.path.length} nodes, cost: ${result.totalCost.toFixed(2)}, ` +
      `distance: ${result.distance.toFixed(2)}m, floors: ${result.floors.join(', ')})`
    );

    // Cache the result
    this.cache.set(request, result);

    return result;
  }

  getGraph(): NavGraph {
    return this.graphLoader.getGraph();
  }

  getGraphStats(): {
    nodes: number;
    edges: number;
    floors: number;
    connectors: number;
    zones: number;
  } {
    const graph = this.graphLoader.getGraph();
    return {
      nodes: graph.nodes.length,
      edges: graph.edges.length,
      floors: graph.floors.length,
      connectors: graph.connectors.length,
      zones: graph.zones.length
    };
  }

  getCacheStats() {
    return this.cache.getStats();
  }

  invalidateCache(pattern?: string): void {
    this.cache.invalidate(pattern);
  }

  async validateRoute(request: RouteRequest): Promise<{ valid: boolean; error?: string }> {
    try {
      const fromNode = this.graphLoader.getNode(request.from);
      const toNode = this.graphLoader.getNode(request.to);

      if (!fromNode) {
        return { valid: false, error: `Source node '${request.from}' not found` };
      }

      if (!toNode) {
        return { valid: false, error: `Destination node '${request.to}' not found` };
      }

      // Try to find a path (this will throw if no path exists)
      await this.findRoute(request);
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  getNodeInfo(nodeId: string) {
    const node = this.graphLoader.getNode(nodeId);
    if (!node) {
      return null;
    }

    const edges = this.graphLoader.getEdgesFromNode(nodeId);
    const connectors = this.graphLoader.getConnectorsFromNode(nodeId);
    const floor = this.graphLoader.getFloor(node.floor);

    return {
      node,
      floor,
      connections: {
        edges: edges.length,
        connectors: connectors.length,
        total: edges.length + connectors.length
      },
      neighbors: [
        ...edges.map(e => e.to),
        ...connectors.map(c => c.to)
      ]
    };
  }

  getFloorInfo(floorId: string) {
    const floor = this.graphLoader.getFloor(floorId);
    if (!floor) {
      return null;
    }

    const nodes = this.graphLoader.getNodesOnFloor(floorId);
    const graph = this.graphLoader.getGraph();
    
    // Find edges within this floor
    const internalEdges = graph.edges.filter(edge => {
      const fromNode = this.graphLoader.getNode(edge.from);
      const toNode = this.graphLoader.getNode(edge.to);
      return fromNode?.floor === floorId && toNode?.floor === floorId;
    });

    // Find connectors from/to this floor
    const connectorsFrom = graph.connectors.filter(conn => {
      const fromNode = this.graphLoader.getNode(conn.from);
      return fromNode?.floor === floorId;
    });

    const connectorsTo = graph.connectors.filter(conn => {
      const toNode = this.graphLoader.getNode(conn.to);
      return toNode?.floor === floorId;
    });

    return {
      floor,
      nodes: nodes.length,
      internalEdges: internalEdges.length,
      connectorsFrom: connectorsFrom.length,
      connectorsTo: connectorsTo.length,
      nodesByKind: {
        gate: nodes.filter(n => n.kind === 'gate').length,
        poi: nodes.filter(n => n.kind === 'poi').length
      }
    };
  }

  private setupCacheInvalidation(): void {
    // Register for hot-reload notifications
    this.graphLoader.onReload(() => {
      this.onGraphReload();
    });
    this.logger.log('Cache invalidation setup completed');
  }

  // Method to be called by GraphLoaderService when graph reloads
  onGraphReload(): void {
    this.cache.onGraphReload();
    this.logger.log('Graph reloaded, cache invalidated');
  }
}