import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { watch } from 'chokidar';
import { NavGraphSchema } from '../schemas/graph.schema';
import { NavGraph } from '../interfaces/graph.interface';

@Injectable()
export class GraphLoaderService implements OnModuleInit {
  private readonly logger = new Logger(GraphLoaderService.name);
  private graph: NavGraph | null = null;
  private graphPath: string;
  private isDevMode: boolean;
  private reloadCallbacks: (() => void)[] = [];

  constructor(private readonly configService: ConfigService) {
    this.graphPath = this.configService.get<string>('GRAPH_PATH') || 
      path.join(process.cwd(), 'data', 'nav_graph.json');
    this.isDevMode = this.configService.get<string>('NODE_ENV') !== 'production';
  }

  async onModuleInit() {
    await this.loadGraph();
    
    if (this.isDevMode) {
      this.setupHotReload();
    }
  }

  private async loadGraph(): Promise<void> {
    try {
      if (!fs.existsSync(this.graphPath)) {
        this.logger.warn(`Graph file not found at ${this.graphPath}. Creating default graph.`);
        await this.createDefaultGraph();
        return;
      }

      const graphData = JSON.parse(fs.readFileSync(this.graphPath, 'utf8'));
      const validatedGraph = NavGraphSchema.parse(graphData);
      
      this.graph = validatedGraph;
      this.logger.log(`Graph loaded successfully from ${this.graphPath}`);
      this.logger.log(`Loaded: ${this.graph.nodes.length} nodes, ${this.graph.edges.length} edges, ${this.graph.floors.length} floors`);
      
      // Validate references
      this.validateReferences();
      
    } catch (error) {
      this.logger.error(`Failed to load graph: ${error.message}`);
      throw new Error(`Graph loading failed: ${error.message}`);
    }
  }

  private validateReferences(): void {
    if (!this.graph) {
      throw new Error('Graph not loaded');
    }
    
    const nodeIds = new Set(this.graph.nodes.map(n => n.id));
    const floorIds = new Set(this.graph.floors.map(f => f.id));

    // Validate node floor references
    for (const node of this.graph.nodes) {
      if (!floorIds.has(node.floor)) {
        throw new Error(`Node ${node.id} references non-existent floor ${node.floor}`);
      }
    }

    // Validate edge node references
    for (const edge of this.graph.edges) {
      if (!nodeIds.has(edge.from)) {
        throw new Error(`Edge references non-existent node ${edge.from}`);
      }
      if (!nodeIds.has(edge.to)) {
        throw new Error(`Edge references non-existent node ${edge.to}`);
      }
    }

    // Validate connector node references
    for (const connector of this.graph.connectors) {
      if (!nodeIds.has(connector.from)) {
        throw new Error(`Connector references non-existent node ${connector.from}`);
      }
      if (!nodeIds.has(connector.to)) {
        throw new Error(`Connector references non-existent node ${connector.to}`);
      }
    }

    // Validate zone floor references
    for (const zone of this.graph.zones) {
      if (!floorIds.has(zone.floor)) {
        throw new Error(`Zone ${zone.id} references non-existent floor ${zone.floor}`);
      }
    }

    this.logger.log('Graph reference validation passed');
  }

  private setupHotReload(): void {
    const watcher = watch(this.graphPath, { persistent: true });
    
    watcher.on('change', async () => {
      this.logger.log('Graph file changed, reloading...');
      try {
        await this.loadGraph();
        this.notifyReloadCallbacks();
        this.logger.log('Graph hot-reloaded successfully');
      } catch (error) {
        this.logger.error(`Hot-reload failed: ${error.message}`);
      }
    });

    this.logger.log('Hot-reload enabled for graph file');
  }

  private async createDefaultGraph(): Promise<void> {
    const defaultGraph: NavGraph = {
      floors: [
        { id: 'ground', name: 'Ground Floor' },
        { id: 'first', name: 'First Floor' }
      ],
      nodes: [
        { id: 'gate_a', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'gate' },
        { id: 'gate_b', floor: 'ground', lat: 21.4235, lon: 39.8272, kind: 'gate' },
        { id: 'poi_1', floor: 'ground', lat: 21.4230, lon: 39.8267, kind: 'poi' },
        { id: 'elevator_ground', floor: 'ground', lat: 21.4228, lon: 39.8265, kind: 'poi' },
        { id: 'elevator_first', floor: 'first', lat: 21.4228, lon: 39.8265, kind: 'poi' },
        { id: 'poi_2', floor: 'first', lat: 21.4232, lon: 39.8268, kind: 'poi' }
      ],
      edges: [
        { from: 'gate_a', to: 'poi_1', weight: 50, kind: 'corridor' },
        { from: 'poi_1', to: 'gate_b', weight: 75, kind: 'corridor' },
        { from: 'poi_1', to: 'elevator_ground', weight: 30, kind: 'corridor' },
        { from: 'elevator_first', to: 'poi_2', weight: 40, kind: 'corridor' }
      ],
      connectors: [
        { from: 'elevator_ground', to: 'elevator_first', type: 'elevator', penalty: 20 }
      ],
      zones: [
        {
          id: 'main_hall',
          floor: 'ground',
          polygon: [
            [21.4220, 39.8260],
            [21.4240, 39.8260],
            [21.4240, 39.8275],
            [21.4220, 39.8275]
          ]
        }
      ]
    };

    // Ensure directory exists
    const dir = path.dirname(this.graphPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(this.graphPath, JSON.stringify(defaultGraph, null, 2));
    this.graph = defaultGraph;
    this.logger.log(`Default graph created at ${this.graphPath}`);
  }

  getGraph(): NavGraph {
    if (!this.graph) {
      throw new Error('Graph not loaded');
    }
    return this.graph;
  }

  getNode(nodeId: string) {
    return this.graph?.nodes.find(n => n.id === nodeId);
  }

  getFloor(floorId: string) {
    return this.graph?.floors.find(f => f.id === floorId);
  }

  getNodesOnFloor(floorId: string) {
    return this.graph?.nodes.filter(n => n.floor === floorId) || [];
  }

  getEdgesFromNode(nodeId: string) {
    return this.graph?.edges.filter(e => e.from === nodeId) || [];
  }

  getConnectorsFromNode(nodeId: string) {
    return this.graph?.connectors.filter(c => c.from === nodeId) || [];
  }

  onReload(callback: () => void): void {
    this.reloadCallbacks.push(callback);
  }

  private notifyReloadCallbacks(): void {
    for (const callback of this.reloadCallbacks) {
      try {
        callback();
      } catch (error) {
        this.logger.error(`Error in reload callback: ${error.message}`);
      }
    }
  }
}