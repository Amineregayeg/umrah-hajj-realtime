export interface Floor {
  id: string;
  name: string;
}

export interface Node {
  id: string;
  floor: string;
  lat: number;
  lon: number;
  kind: 'gate' | 'poi';
}

export interface Edge {
  from: string;
  to: string;
  weight: number;
  kind: 'corridor';
}

export interface Connector {
  from: string;
  to: string;
  type: 'elevator' | 'stairs';
  penalty: number;
}

export interface Zone {
  id: string;
  floor: string;
  polygon: Array<[number, number]>; // [lat, lon] coordinates
}

export interface NavGraph {
  floors: Floor[];
  nodes: Node[];
  edges: Edge[];
  connectors: Connector[];
  zones: Zone[];
}

export interface NavigationStep {
  type: 'walk' | 'stairs' | 'elevator' | 'escalator';
  instruction: string;
  from: string;
  to: string;
  distance_m: number;
  remaining_distance_m: number;
  floor?: string;
}

export interface PathFindingResult {
  path: string[]; // Array of node IDs
  totalCost: number;
  distance: number;
  floors: string[]; // Floors traversed
  // New P0 fields for turn-by-turn navigation
  steps?: NavigationStep[];
  distance_m?: number;
  duration_s?: number;
}

export interface RouteRequest {
  from: string; // Node ID
  to: string; // Node ID
  algorithm?: 'dijkstra' | 'astar';
  avoidFloorChanges?: boolean;
}