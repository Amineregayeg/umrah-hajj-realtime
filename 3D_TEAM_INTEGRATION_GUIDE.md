# 3D Team Integration Guide
**Umrah & Hajj Real-time Navigation System**

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [System Architecture](#system-architecture)
3. [Coordinate System & Transformations](#coordinate-system--transformations)
4. [Navigation Graph Integration](#navigation-graph-integration)
5. [Real-time Position Tracking](#real-time-position-tracking)
6. [WebSocket Integration](#websocket-integration)
7. [API Endpoints Reference](#api-endpoints-reference)
8. [Code Examples](#code-examples)
9. [Performance Optimization](#performance-optimization)
10. [Troubleshooting](#troubleshooting)

---

## Quick Start

### Prerequisites

- Node.js 20.x
- Modern browser with WebSocket support
- 3D framework (Three.js, Unity, Unreal Engine, etc.)
- Basic understanding of WGS84 coordinate system

### 1. Access Backend Services

**Local Development:**
```bash
# Backend API
http://localhost:3000

# WebSocket
ws://localhost:3000

# Swagger Documentation
http://localhost:3000/docs
```

**Production (Koyeb Deployment):**
```bash
# Backend API
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app

# WebSocket
wss://psychological-jilli-amineregayeg-1fe35444.koyeb.app

# API Docs
https://psychological-jilli-amineregayeg-1fe35444.koyeb.app/docs
```

### 2. Authentication

All protected endpoints require JWT authentication:

```javascript
// Get authentication token
const response = await fetch('http://localhost:3000/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken } = await response.json();

// Use token in subsequent requests
const headers = {
  'Authorization': `Bearer ${accessToken}`,
  'Content-Type': 'application/json'
};
```

### 3. Fetch Navigation Graph

```javascript
// Get complete navigation graph
const response = await fetch('http://localhost:3000/nav/graph/graph');
const graph = await response.json();

// Graph structure:
// {
//   floors: [...],    // Floor definitions
//   nodes: [...],     // Points of interest
//   edges: [...],     // Walkable paths
//   connectors: [...], // Floor transitions
//   zones: [...]      // Restricted areas
// }
```

---

## System Architecture

### Backend Stack

```
┌─────────────────────────────────────────────────────────────┐
│                    NestJS Backend (Port 3000)               │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ REST API     │  │ WebSocket    │  │ Database     │    │
│  │ (HTTP/HTTPS) │  │ (WS/WSS)     │  │ (PostgreSQL) │    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
│                                                             │
│  ┌────────────────────────────────────────────────────┐   │
│  │  Navigation Engine                                  │   │
│  │  • Graph-based pathfinding (A*/Dijkstra)          │   │
│  │  • HMM map-matching (Viterbi algorithm)           │   │
│  │  • GPS correction (~2m median accuracy)           │   │
│  │  • Real-time position updates (5Hz)               │   │
│  └────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                               │
                    Data Flow  │
                               ↓
┌─────────────────────────────────────────────────────────────┐
│                      Your 3D Application                     │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │
│  │ 3D Scene     │  │ Avatar       │  │ Path         │    │
│  │ Rendering    │  │ Controller   │  │ Visualization│    │
│  └──────────────┘  └──────────────┘  └──────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
GPS Device → Backend (HMM Correction) → WebSocket → 3D Client
   ↓                     ↓                   ↓           ↓
Raw Position      Corrected Position    Real-time    Avatar
(±5m accuracy)    (~2m accuracy)        Update      Movement
```

---

## Coordinate System & Transformations

### WGS84 (World Geodetic System 1984)

**Primary coordinate system** used by GPS and the backend:

- **Latitude**: -90° to 90° (decimal degrees)
- **Longitude**: -180° to 180° (decimal degrees)
- **Floor**: Integer (0=ground, 1=first, -1=basement)

**Example coordinates (Kaaba area in Mecca):**
```json
{
  "lat": 21.4225,  // ~21°25'21"N
  "lon": 39.8262,  // ~39°49'34"E
  "floor": 0
}
```

### Transformation to 3D Local Coordinates

For 3D rendering, convert WGS84 to local Cartesian coordinates:

#### Step 1: Calculate Graph Origin

```javascript
function calculateGraphBounds(graph) {
  const lats = graph.nodes.map(n => n.lat);
  const lons = graph.nodes.map(n => n.lon);

  return {
    minLat: Math.min(...lats),
    maxLat: Math.max(...lats),
    minLon: Math.min(...lons),
    maxLon: Math.max(...lons),
    centerLat: (Math.min(...lats) + Math.max(...lats)) / 2,
    centerLon: (Math.min(...lons) + Math.max(...lons)) / 2
  };
}

const bounds = calculateGraphBounds(graph);
const origin = {
  lat: bounds.centerLat,
  lon: bounds.centerLon
};
```

#### Step 2: WGS84 → Local XYZ

```javascript
const EARTH_RADIUS = 6371000; // meters
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

function wgs84ToLocal(lat, lon, floor, origin) {
  // X-axis (East-West in meters)
  const x = (lon - origin.lon) *
            EARTH_RADIUS *
            Math.cos(origin.lat * DEG_TO_RAD) *
            DEG_TO_RAD;

  // Z-axis (North-South in meters, negative for right-handed system)
  const z = -(lat - origin.lat) * EARTH_RADIUS * DEG_TO_RAD;

  // Y-axis (Elevation in meters)
  const FLOOR_HEIGHT = 4.0; // meters per floor
  const y = floor * FLOOR_HEIGHT;

  return { x, y, z };
}

// Example usage:
const nodePos = wgs84ToLocal(21.4230, 39.8267, 0, origin);
// Result: { x: 51.8, y: 0, z: -55.3 }
```

#### Step 3: Local XYZ → WGS84 (Reverse)

```javascript
function localToWgs84(x, y, z, origin) {
  const FLOOR_HEIGHT = 4.0;

  const lat = origin.lat - (z / (EARTH_RADIUS * DEG_TO_RAD));

  const lon = origin.lon +
              (x / (EARTH_RADIUS * Math.cos(origin.lat * DEG_TO_RAD) * DEG_TO_RAD));

  const floor = Math.round(y / FLOOR_HEIGHT);

  return { lat, lon, floor };
}
```

### Coordinate System Axes

**Recommended for 3D:**
- **X-axis**: East (+) / West (-)
- **Y-axis**: Up (+) / Down (-) [elevation]
- **Z-axis**: North (+) / South (-) [or reverse for right-handed]

**Floor Heights:**
- Use consistent `FLOOR_HEIGHT = 4.0` meters
- Ground floor: y = 0
- First floor: y = 4
- Basement: y = -4

---

## Navigation Graph Integration

### Graph Structure

```typescript
interface NavGraph {
  floors: Floor[];      // Floor definitions
  nodes: Node[];        // Points of interest
  edges: Edge[];        // Walkable paths
  connectors: Connector[]; // Floor transitions
  zones: Zone[];        // Restricted/logical areas
}

interface Node {
  id: string;           // "gate_a", "kaaba_corner_1"
  floor: string;        // "ground", "first", "basement"
  lat: number;          // WGS84 latitude
  lon: number;          // WGS84 longitude
  kind: 'gate' | 'poi'; // Node type
}

interface Edge {
  from: string;         // Source node ID
  to: string;           // Destination node ID
  weight: number;       // Distance in meters
  kind: 'corridor';     // Edge type
}

interface Connector {
  from: string;         // Node on floor 1
  to: string;           // Node on floor 2
  type: 'elevator' | 'stairs';
  penalty: number;      // Additional traversal cost
}

interface Zone {
  id: string;
  floor: string;
  polygon: Array<[lat, lon]>; // ≥3 vertices
}
```

### Loading the Graph

```javascript
// Fetch complete graph
async function loadNavigationGraph() {
  const response = await fetch('http://localhost:3000/nav/graph/graph');
  const graph = await response.json();

  console.log(`Loaded ${graph.nodes.length} nodes`);
  console.log(`Loaded ${graph.edges.length} edges`);
  console.log(`Loaded ${graph.floors.length} floors`);

  return graph;
}
```

### Building 3D Scene from Graph

```javascript
import * as THREE from 'three';

class NavigationScene {
  constructor(scene, origin) {
    this.scene = scene;
    this.origin = origin;
    this.nodeMeshes = new Map();
    this.edgeLines = new Map();
  }

  createNodes(nodes) {
    nodes.forEach(node => {
      const pos = wgs84ToLocal(
        node.lat,
        node.lon,
        this.getFloorNumber(node.floor),
        this.origin
      );

      // Create node sphere
      const geometry = new THREE.SphereGeometry(0.5);
      const material = new THREE.MeshStandardMaterial({
        color: node.kind === 'gate' ? 0x00ff00 : 0x0000ff
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(pos.x, pos.y, pos.z);
      mesh.userData = { nodeId: node.id, type: 'node' };

      this.scene.add(mesh);
      this.nodeMeshes.set(node.id, mesh);
    });
  }

  createEdges(edges, nodes) {
    edges.forEach(edge => {
      const fromNode = nodes.find(n => n.id === edge.from);
      const toNode = nodes.find(n => n.id === edge.to);

      if (!fromNode || !toNode) return;

      const fromPos = wgs84ToLocal(
        fromNode.lat, fromNode.lon,
        this.getFloorNumber(fromNode.floor),
        this.origin
      );

      const toPos = wgs84ToLocal(
        toNode.lat, toNode.lon,
        this.getFloorNumber(toNode.floor),
        this.origin
      );

      // Create edge line
      const points = [
        new THREE.Vector3(fromPos.x, fromPos.y, fromPos.z),
        new THREE.Vector3(toPos.x, toPos.y, toPos.z)
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        opacity: 0.6,
        transparent: true
      });

      const line = new THREE.Line(geometry, material);
      line.userData = { edgeId: `${edge.from}-${edge.to}`, type: 'edge' };

      this.scene.add(line);
      this.edgeLines.set(`${edge.from}-${edge.to}`, line);
    });
  }

  createZones(zones) {
    zones.forEach(zone => {
      const points = zone.polygon.map(([lat, lon]) => {
        const pos = wgs84ToLocal(
          lat, lon,
          this.getFloorNumber(zone.floor),
          this.origin
        );
        return new THREE.Vector2(pos.x, pos.z);
      });

      // Create zone polygon
      const shape = new THREE.Shape(points);
      const geometry = new THREE.ShapeGeometry(shape);
      const material = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        opacity: 0.2,
        transparent: true,
        side: THREE.DoubleSide
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.rotation.x = -Math.PI / 2; // Lay flat
      mesh.position.y = this.getFloorNumber(zone.floor) * 4.0 + 0.01;
      mesh.userData = { zoneId: zone.id, type: 'zone' };

      this.scene.add(mesh);
    });
  }

  getFloorNumber(floorId) {
    const floorMap = {
      'basement': -1,
      'ground': 0,
      'first': 1,
      'second': 2,
      'third': 3
    };
    return floorMap[floorId] || 0;
  }
}
```

---

## Real-time Position Tracking

### HMM Map-Matching System

The backend uses a **Hidden Markov Model (HMM)** with the Viterbi algorithm for GPS correction:

**Performance Characteristics:**
- **Median Accuracy**: ≤2.0m
- **P95 Accuracy**: ≤4.0m
- **Processing Time**: <10ms per update
- **Confidence**: 70-95% typical

### Position Update Flow

```
Raw GPS Position (±5m)
      ↓
Backend HMM Correction
      ↓
Corrected Position (~2m)
      ↓
WebSocket Broadcast (5Hz)
      ↓
3D Avatar Update
```

### Navigation Update DTO

```typescript
interface NavUpdateDto {
  ts: number;          // Unix timestamp (ms)
  seq: number;         // Sequence number
  userId: string;      // User identifier
  pos: {
    lat: number;       // Latitude
    lon: number;       // Longitude
    alt: number;       // Altitude (meters)
    floor: number;     // Floor level
    acc: number;       // GPS accuracy (meters)
  };
  heading: number;     // Direction (0-360 degrees)
  speed: number;       // Speed (m/s)
  source: string;      // 'gnss' | 'imu' | 'arcore' | 'ble'
  stage: string;       // 'tawaf' | 'sai' | 'ihram'
  lap?: number;        // Tawaf lap (1-7)
  sai_leg?: number;    // Sai leg (1-7)
  confidence: number;  // Position confidence (0.0-1.0)
  mode: string;        // 'guide' | 'respond' | 'mute'
  device: string;      // 'android' | 'ios'
}
```

---

## WebSocket Integration

### Connection Setup

```javascript
class RealtimeNavigationClient {
  constructor(apiUrl, wsUrl, token) {
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
    this.token = token;
    this.socket = null;
    this.connected = false;
  }

  async connect() {
    return new Promise((resolve, reject) => {
      // Connect with authentication
      this.socket = new WebSocket(this.wsUrl, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Origin': window.location.origin
        }
      });

      this.socket.onopen = () => {
        console.log('WebSocket connected');
        this.connected = true;
        resolve();
      };

      this.socket.onerror = (error) => {
        console.error('WebSocket error:', error);
        reject(error);
      };

      this.socket.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.socket.onclose = () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.reconnect();
      };
    });
  }

  handleMessage(data) {
    const message = JSON.parse(data);

    switch (message.event) {
      case 'connection_status':
        console.log('Connection status:', message.data);
        break;

      case 'nav.correction':
        this.onNavigationCorrection(message.data);
        break;

      case 'nav.update':
        this.onNavigationUpdate(message.data);
        break;

      case 'ai.prompt':
        this.onAIPrompt(message.data);
        break;

      case 'error':
        console.error('Server error:', message.data);
        break;
    }
  }

  sendNavigationUpdate(update) {
    if (!this.connected) {
      console.warn('WebSocket not connected');
      return;
    }

    this.socket.send(JSON.stringify({
      event: 'nav.update',
      data: update
    }));
  }

  reconnect() {
    setTimeout(() => {
      console.log('Attempting to reconnect...');
      this.connect().catch(err => {
        console.error('Reconnection failed:', err);
      });
    }, 5000); // 5 second delay
  }
}

// Usage:
const client = new RealtimeNavigationClient(
  'http://localhost:3000',
  'ws://localhost:3001',
  accessToken
);

await client.connect();

// Send position update
client.sendNavigationUpdate({
  ts: Date.now(),
  seq: 1,
  userId: userId,
  pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 5.0 },
  heading: 90,
  speed: 1.2,
  source: 'gnss',
  stage: 'tawaf',
  lap: 1,
  confidence: 0.85,
  mode: 'guide',
  device: 'browser'
});
```

### Handling Navigation Corrections

```javascript
onNavigationCorrection(correction) {
  // correction = {
  //   ts: 1697467200000,
  //   position: { lat: 21.4225, lon: 39.8262, floor: 0 },
  //   snapTo: 'path' | 'node' | 'zone',
  //   delta: { x: 0.5, y: -0.2 }, // meters
  //   confidence: 0.85
  // }

  const pos = wgs84ToLocal(
    correction.position.lat,
    correction.position.lon,
    correction.position.floor,
    this.origin
  );

  // Update 3D avatar with smooth interpolation
  this.updateAvatarPosition(pos, correction.confidence);

  // Visual feedback for confidence
  this.updateAvatarColor(correction.confidence);

  // Log accuracy metrics
  const snapError = Math.sqrt(
    correction.delta.x**2 + correction.delta.y**2
  );
  console.log(`Snap error: ${snapError.toFixed(2)}m, Confidence: ${(correction.confidence * 100).toFixed(1)}%`);
}
```

---

## API Endpoints Reference

### Navigation Endpoints

#### GET `/nav/graph/graph`
Retrieve complete navigation graph.

**Response:**
```json
{
  "floors": [...],
  "nodes": [...],
  "edges": [...],
  "connectors": [...],
  "zones": [...]
}
```

#### GET `/nav/graph/nodes/:nodeId`
Get detailed node information.

**Example:** `GET /nav/graph/nodes/gate_a`

**Response:**
```json
{
  "node": {
    "id": "gate_a",
    "floor": "ground",
    "lat": 21.4225,
    "lon": 39.8262,
    "kind": "gate"
  },
  "floor": { "id": "ground", "name": "Ground Floor" },
  "connections": { "edges": 2, "connectors": 1 },
  "neighbors": ["central_hall", "entrance_lobby"]
}
```

#### POST `/nav/graph/route`
Find route between two nodes.

**Request:**
```json
{
  "from": "gate_a",
  "to": "prayer_hall_1",
  "algorithm": "astar",
  "avoidFloorChanges": false
}
```

**Response:**
```json
{
  "path": ["gate_a", "central_hall", "elevator_1_ground",
           "elevator_1_first", "first_floor_corridor", "prayer_hall_1"],
  "totalCost": 235,
  "distance": 187.3,
  "floors": ["ground", "first"]
}
```

#### GET `/nav/graph/stats`
Get graph statistics.

**Response:**
```json
{
  "graph": {
    "nodes": 42,
    "edges": 58,
    "floors": 3,
    "connectors": 6,
    "zones": 8
  },
  "cache": {
    "size": 125,
    "hitRate": 0.78
  }
}
```

### Quran Content Endpoints

#### GET `/content/quran/surah/:id`
Get complete Surah with all Ayahs.

**Example:** `GET /content/quran/surah/1?lang=ar`

**Response:**
```json
{
  "id": 1,
  "name": "الفاتحة",
  "transliteration": "Al-Fatihah",
  "translation": "The Opening",
  "type": "makkiyyah",
  "ayah_count": 7,
  "ayahs": [...]
}
```

#### GET `/content/quran/search`
Search Quran text.

**Example:** `GET /content/quran/search?q=rahman&lang=ar&limit=10`

**Response:**
```json
{
  "results": [...],
  "total": 57,
  "count": 10,
  "offset": 0,
  "execution_time_ms": 45
}
```

---

## Code Examples

### Complete 3D Integration Example (Three.js)

```javascript
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

class UmrahNavigation3D {
  constructor(containerId, apiUrl, wsUrl, token) {
    this.container = document.getElementById(containerId);
    this.apiUrl = apiUrl;
    this.wsUrl = wsUrl;
    this.token = token;

    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.origin = null;
    this.avatar = null;
    this.pathLine = null;

    this.navClient = null;
    this.graph = null;

    this.init();
  }

  async init() {
    // Initialize Three.js scene
    this.initScene();
    this.initLights();
    this.initControls();

    // Load navigation graph
    await this.loadGraph();

    // Build 3D scene from graph
    this.buildScene();

    // Create avatar
    this.createAvatar();

    // Connect to WebSocket
    await this.connectWebSocket();

    // Start render loop
    this.animate();
  }

  initScene() {
    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);

    // Camera
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 100, 100);
    this.camera.lookAt(0, 0, 0);

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.container.appendChild(this.renderer.domElement);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    });
  }

  initLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambientLight);

    // Directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);
  }

  initControls() {
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
  }

  async loadGraph() {
    const response = await fetch(`${this.apiUrl}/nav/graph/graph`);
    this.graph = await response.json();

    // Calculate origin
    const bounds = this.calculateGraphBounds(this.graph);
    this.origin = {
      lat: bounds.centerLat,
      lon: bounds.centerLon
    };

    console.log(`Loaded graph with ${this.graph.nodes.length} nodes`);
  }

  calculateGraphBounds(graph) {
    const lats = graph.nodes.map(n => n.lat);
    const lons = graph.nodes.map(n => n.lon);

    return {
      minLat: Math.min(...lats),
      maxLat: Math.max(...lats),
      minLon: Math.min(...lons),
      maxLon: Math.max(...lons),
      centerLat: (Math.min(...lats) + Math.max(...lats)) / 2,
      centerLon: (Math.min(...lons) + Math.max(...lons)) / 2
    };
  }

  buildScene() {
    const navScene = new NavigationScene(this.scene, this.origin);
    navScene.createNodes(this.graph.nodes);
    navScene.createEdges(this.graph.edges, this.graph.nodes);
    navScene.createZones(this.graph.zones);

    // Add grid helper
    const gridHelper = new THREE.GridHelper(200, 50);
    this.scene.add(gridHelper);
  }

  createAvatar() {
    // Avatar sphere
    const geometry = new THREE.SphereGeometry(1.5);
    const material = new THREE.MeshStandardMaterial({
      color: 0x00ff00,
      emissive: 0x00ff00,
      emissiveIntensity: 0.5
    });

    this.avatar = new THREE.Mesh(geometry, material);
    this.avatar.position.set(0, 1.5, 0);
    this.scene.add(this.avatar);

    // Direction indicator
    const arrowGeometry = new THREE.ConeGeometry(0.5, 2, 8);
    const arrowMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
    arrow.rotation.x = Math.PI / 2;
    arrow.position.set(0, 0, 2);
    this.avatar.add(arrow);
  }

  async connectWebSocket() {
    this.navClient = new RealtimeNavigationClient(
      this.apiUrl,
      this.wsUrl,
      this.token
    );

    // Set callback for navigation corrections
    this.navClient.onNavigationCorrection = (correction) => {
      this.updateAvatarFromCorrection(correction);
    };

    await this.navClient.connect();
  }

  updateAvatarFromCorrection(correction) {
    const pos = this.wgs84ToLocal(
      correction.position.lat,
      correction.position.lon,
      correction.position.floor
    );

    // Smooth interpolation
    const lerpFactor = 0.1;
    this.avatar.position.lerp(
      new THREE.Vector3(pos.x, pos.y + 1.5, pos.z),
      lerpFactor
    );

    // Update color based on confidence
    const color = correction.confidence > 0.8 ? 0x00ff00 :
                  correction.confidence > 0.6 ? 0xffff00 : 0xff0000;
    this.avatar.material.color.setHex(color);

    // Update camera to follow avatar
    this.controls.target.copy(this.avatar.position);
  }

  wgs84ToLocal(lat, lon, floor) {
    const EARTH_RADIUS = 6371000;
    const DEG_TO_RAD = Math.PI / 180;

    const x = (lon - this.origin.lon) *
              EARTH_RADIUS *
              Math.cos(this.origin.lat * DEG_TO_RAD) *
              DEG_TO_RAD;

    const z = -(lat - this.origin.lat) * EARTH_RADIUS * DEG_TO_RAD;
    const y = floor * 4.0;

    return { x, y, z };
  }

  async visualizePath(fromNodeId, toNodeId) {
    // Request route from backend
    const response = await fetch(`${this.apiUrl}/nav/graph/route`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      },
      body: JSON.stringify({
        from: fromNodeId,
        to: toNodeId,
        algorithm: 'astar'
      })
    });

    const route = await response.json();

    // Remove old path
    if (this.pathLine) {
      this.scene.remove(this.pathLine);
    }

    // Create path visualization
    const pathPoints = route.path.map(nodeId => {
      const node = this.graph.nodes.find(n => n.id === nodeId);
      const pos = this.wgs84ToLocal(
        node.lat,
        node.lon,
        this.getFloorNumber(node.floor)
      );
      return new THREE.Vector3(pos.x, pos.y + 0.5, pos.z);
    });

    const geometry = new THREE.BufferGeometry().setFromPoints(pathPoints);
    const material = new THREE.LineBasicMaterial({
      color: 0xffff00,
      linewidth: 3
    });

    this.pathLine = new THREE.Line(geometry, material);
    this.scene.add(this.pathLine);

    console.log(`Path: ${route.distance.toFixed(1)}m, ${route.path.length} nodes`);
  }

  getFloorNumber(floorId) {
    const floorMap = {
      'basement': -1,
      'ground': 0,
      'first': 1,
      'second': 2,
      'third': 3
    };
    return floorMap[floorId] || 0;
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}

// Initialize application
const app = new UmrahNavigation3D(
  'canvas-container',
  'http://localhost:3000',
  'ws://localhost:3001',
  accessToken
);

// Visualize a route
app.visualizePath('gate_a', 'prayer_hall_1');
```

---

## Performance Optimization

### 1. Spatial Indexing

For large graphs, use spatial indexing to speed up queries:

```javascript
class SpatialGrid {
  constructor(cellSize = 50) {
    this.cellSize = cellSize; // meters
    this.grid = new Map();
  }

  add(lat, lon, data) {
    const key = this.getKey(lat, lon);
    if (!this.grid.has(key)) {
      this.grid.set(key, []);
    }
    this.grid.get(key).push({ lat, lon, data });
  }

  query(lat, lon, radius) {
    const results = [];
    const cellRadius = Math.ceil(radius / this.cellSize);
    const centerKey = this.getKey(lat, lon);
    const [cx, cy] = centerKey.split(',').map(Number);

    for (let x = cx - cellRadius; x <= cx + cellRadius; x++) {
      for (let y = cy - cellRadius; y <= cy + cellRadius; y++) {
        const key = `${x},${y}`;
        if (this.grid.has(key)) {
          this.grid.get(key).forEach(item => {
            const dist = this.haversineDistance(lat, lon, item.lat, item.lon);
            if (dist <= radius) {
              results.push({ ...item, distance: dist });
            }
          });
        }
      }
    }

    return results.sort((a, b) => a.distance - b.distance);
  }

  getKey(lat, lon) {
    const x = Math.floor(lat * 111000 / this.cellSize);
    const y = Math.floor(lon * 111000 * Math.cos(lat * Math.PI / 180) / this.cellSize);
    return `${x},${y}`;
  }

  haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}

// Usage:
const grid = new SpatialGrid(50); // 50m cells
graph.nodes.forEach(node => {
  grid.add(node.lat, node.lon, node);
});

// Fast query for nearby nodes
const nearbyNodes = grid.query(21.4225, 39.8262, 100); // 100m radius
```

### 2. Level of Detail (LOD)

Render only visible floors and reduce detail for distant objects:

```javascript
class FloorManager {
  constructor(scene, currentFloor = 0) {
    this.scene = scene;
    this.currentFloor = currentFloor;
    this.visibleFloors = new Set([currentFloor]);
  }

  setFloor(floor) {
    this.currentFloor = floor;
    this.visibleFloors = new Set([
      floor - 1,  // Floor below
      floor,      // Current floor
      floor + 1   // Floor above
    ]);

    this.updateVisibility();
  }

  updateVisibility() {
    this.scene.children.forEach(obj => {
      if (obj.userData.floor !== undefined) {
        obj.visible = this.visibleFloors.has(obj.userData.floor);

        // Fade non-current floors
        if (obj.material) {
          obj.material.opacity = obj.userData.floor === this.currentFloor ? 1.0 : 0.3;
          obj.material.transparent = true;
        }
      }
    });
  }
}
```

### 3. Instanced Rendering

For many similar objects (e.g., waypoint markers):

```javascript
function createInstancedNodes(nodes, origin) {
  const geometry = new THREE.SphereGeometry(0.5);
  const material = new THREE.MeshStandardMaterial({ color: 0x0000ff });

  const mesh = new THREE.InstancedMesh(geometry, material, nodes.length);

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();

  nodes.forEach((node, i) => {
    const pos = wgs84ToLocal(node.lat, node.lon, getFloorNumber(node.floor), origin);
    position.set(pos.x, pos.y, pos.z);
    matrix.setPosition(position);
    mesh.setMatrixAt(i, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}
```

---

## Troubleshooting

### WebSocket Connection Issues

**Problem:** `WebSocket connection failed`

**Solutions:**
1. Check backend is running: `curl http://localhost:3000/health`
2. Verify WebSocket port is correct (3001 by default)
3. Check CORS/Origin headers match `ALLOWED_ORIGINS`
4. Verify JWT token is valid and not expired

### Position Not Updating

**Problem:** Avatar not moving in 3D scene

**Solutions:**
1. Check WebSocket connection status
2. Verify `onNavigationCorrection` callback is set
3. Check console for JavaScript errors
4. Ensure coordinate transformation is correct
5. Verify floor numbers match between backend and 3D scene

### Path Visualization Issues

**Problem:** Path not rendering or incorrect

**Solutions:**
1. Verify node IDs exist in graph
2. Check route calculation response for errors
3. Ensure path points are in correct coordinate system
4. Verify floor transitions are properly handled

### Performance Issues

**Problem:** Low FPS or stuttering

**Solutions:**
1. Implement LOD (show only nearby floors)
2. Use instanced rendering for repeated geometry
3. Reduce polygon count in 3D models
4. Enable frustum culling
5. Use spatial indexing for queries

---

## Additional Resources

### Documentation
- **Backend API Docs**: http://localhost:3000/docs (Swagger)
- **Navigation Graph Spec**: See `NAVIGATION_GRAPH_TECHNICAL_SPEC.md`
- **Database Schema**: See `DATABASE_DOCUMENTATION.md`
- **Security Guide**: See `COMPREHENSIVE_SECURITY_AUDIT.md`

### Example Projects
- Three.js Navigation Example: `/examples/threejs-navigation/`
- Unity Integration Guide: `/examples/unity-integration/`
- React Integration: `/examples/react-3d-scene/`

### Support
- **GitHub Issues**: https://github.com/your-repo/issues
- **Technical Questions**: tech@umrah-hajj-app.com
- **3D Integration Help**: 3d-team@umrah-hajj-app.com

---

**Last Updated:** October 16, 2025
**Version:** 1.0.0
**Coordinate System:** WGS84 (EPSG:4326)
**HMM Accuracy:** Median ≤2.0m, P95 ≤4.0m
