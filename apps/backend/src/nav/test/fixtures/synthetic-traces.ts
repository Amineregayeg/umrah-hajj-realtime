/**
 * Synthetic trace fixtures for comprehensive HMM testing
 * Each trace includes ground truth and simulated GPS measurements with various scenarios
 */

import { NavUpdateDto } from '../../dto/nav-update.dto';

export interface GroundTruthPoint {
  ts: number;
  lat: number;
  lon: number;
  heading: number;
  speed: number;
  floor: number;
  nodeId?: string;
  edgeId?: string;
}

export interface SyntheticTrace {
  name: string;
  description: string;
  scenario: 'straight' | 'turn' | 's-curve' | 'loop' | 'floor-change' | 'off-path' | 'teleport';
  groundTruth: GroundTruthPoint[];
  measurements: NavUpdateDto[];
  expectedAccuracy: {
    medianError: number; // meters
    p95Error: number; // meters
    recoveryTime?: number; // seconds for teleport scenarios
  };
}

/**
 * Add Gaussian noise to GPS coordinates
 */
function addGPSNoise(lat: number, lon: number, stdDev: number = 2.0, seed?: number): { lat: number; lon: number } {
  // Simple deterministic noise based on position for reproducibility
  const hash = Math.abs(Math.sin(lat * 12.9898 + lon * 78.233) * 43758.5453) % 1;
  const noise1 = Math.sqrt(-2 * Math.log(hash)) * Math.cos(2 * Math.PI * hash);
  const noise2 = Math.sqrt(-2 * Math.log(1 - hash)) * Math.sin(2 * Math.PI * hash);
  
  const meterToLat = 1 / 110540;
  const meterToLon = 1 / (111320 * Math.cos(lat * Math.PI / 180));
  
  return {
    lat: lat + (noise1 * stdDev * meterToLat),
    lon: lon + (noise2 * stdDev * meterToLon)
  };
}

/**
 * Generate synthetic traces for testing
 */
export function generateSyntheticTraces(): SyntheticTrace[] {
  const baseTime = 1696694400000; // Fixed timestamp for deterministic testing
  const traces: SyntheticTrace[] = [];

  // 1. Straight Corridor Trace
  const straightTrace: SyntheticTrace = {
    name: 'straight-corridor',
    description: 'Straight movement along a corridor for 50 meters',
    scenario: 'straight',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 1.5, p95Error: 3.5 }
  };

  // Generate straight movement from (21.4225, 39.8262) to (21.4229, 39.8262) - 50m north
  for (let i = 0; i <= 50; i++) {
    const t = i * 1000; // 1 second intervals
    const lat = 21.4225 + (i * 0.00009); // ~1m per step
    const lon = 39.8262;
    
    straightTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0, // North
      speed: 1.0,
      floor: 0,
      edgeId: 'straight-corridor-edge'
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    straightTrace.measurements.push({
      ts: baseTime + t,
      seq: i,
      userId: 'test-user-straight',
      pos: {
        lat: noisy.lat,
        lon: noisy.lon,
        alt: 0,
        floor: 0,
        acc: 3.0
      },
      heading: 0 + (Math.random() - 0.5) * 10, // ±5° heading noise
      speed: 1.0 + (Math.random() - 0.5) * 0.2,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(straightTrace);

  // 2. 90° Turn Trace
  const turnTrace: SyntheticTrace = {
    name: '90-degree-turn',
    description: '30m straight then 90° right turn then 30m straight',
    scenario: 'turn',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 1.8, p95Error: 4.0 }
  };

  let seq = 0;
  // First leg: 30m north
  for (let i = 0; i <= 30; i++) {
    const t = seq * 1000;
    const lat = 21.4225 + (i * 0.00009);
    const lon = 39.8262;
    
    turnTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    turnTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-turn',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0 + (Math.random() - 0.5) * 10,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }

  // Turn transition (5 points)
  const turnStartLat = 21.4225 + (30 * 0.00009);
  const turnStartLon = 39.8262;
  for (let i = 1; i <= 5; i++) {
    const t = seq * 1000;
    const heading = (i / 5) * 90; // Gradual turn to 90°
    
    turnTrace.groundTruth.push({
      ts: baseTime + t,
      lat: turnStartLat,
      lon: turnStartLon,
      heading,
      speed: 0.5, // Slower during turn
      floor: 0
    });

    const noisy = addGPSNoise(turnStartLat, turnStartLon, 2.5);
    turnTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-turn',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 4.0 },
      heading: heading + (Math.random() - 0.5) * 15,
      speed: 0.5,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.7,
      mode: 'guide',
      device: 'android'
    });
  }

  // Second leg: 30m east
  for (let i = 1; i <= 30; i++) {
    const t = seq * 1000;
    const lat = turnStartLat;
    const lon = turnStartLon + (i * 0.000127); // ~1m per step east
    
    turnTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 90,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    turnTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-turn',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 90 + (Math.random() - 0.5) * 10,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(turnTrace);

  // 3. S-Curve Trace
  const sCurveTrace: SyntheticTrace = {
    name: 's-curve',
    description: 'Sinusoidal S-curve path over 60 meters',
    scenario: 's-curve',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 2.0, p95Error: 4.5 }
  };

  for (let i = 0; i <= 60; i++) {
    const t = i * 1000;
    const progress = i / 60; // 0 to 1
    const lat = 21.4225 + (i * 0.00009); // North movement
    const lon = 39.8262 + Math.sin(progress * 4 * Math.PI) * 0.0001; // S-curve with ±10m amplitude
    
    // Calculate heading based on path derivative
    const deltaLon = Math.cos(progress * 4 * Math.PI) * 4 * Math.PI * 0.0001;
    const deltaLat = 0.00009;
    const heading = Math.atan2(deltaLon, deltaLat) * 180 / Math.PI;
    
    sCurveTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    sCurveTrace.measurements.push({
      ts: baseTime + t,
      seq: i,
      userId: 'test-user-scurve',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: heading + (Math.random() - 0.5) * 15,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(sCurveTrace);

  // 4. Loop Trace (Kaaba proxy)
  const loopTrace: SyntheticTrace = {
    name: 'kaaba-loop',
    description: 'Circular movement around Kaaba proxy (50m radius)',
    scenario: 'loop',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 2.2, p95Error: 5.0 }
  };

  const centerLat = 21.4225;
  const centerLon = 39.8262;
  const radius = 50; // meters
  const radiusLat = radius / 110540;
  const radiusLon = radius / (111320 * Math.cos(centerLat * Math.PI / 180));

  for (let i = 0; i <= 120; i++) { // 2 minutes for full circle
    const t = i * 1000;
    const angle = (i / 120) * 2 * Math.PI; // Full circle
    const lat = centerLat + radiusLat * Math.cos(angle);
    const lon = centerLon + radiusLon * Math.sin(angle);
    const heading = (angle * 180 / Math.PI + 90) % 360; // Tangent to circle
    
    loopTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading,
      speed: 1.3, // Slightly faster circular movement
      floor: 0,
      nodeId: 'kaaba-proxy'
    });

    const noisy = addGPSNoise(lat, lon, 2.5); // Higher noise for outdoor scenario
    loopTrace.measurements.push({
      ts: baseTime + t,
      seq: i,
      userId: 'test-user-loop',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 4.0 },
      heading: heading + (Math.random() - 0.5) * 20,
      speed: 1.3 + (Math.random() - 0.5) * 0.3,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.75,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(loopTrace);

  // 5. Floor Change via Elevator
  const floorChangeTrace: SyntheticTrace = {
    name: 'elevator-floor-change',
    description: 'Movement to elevator, ride up, then continue on new floor',
    scenario: 'floor-change',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 2.5, p95Error: 6.0 }
  };

  seq = 0;
  // Approach elevator (20m)
  for (let i = 0; i <= 20; i++) {
    const t = seq * 1000;
    const lat = 21.4225 + (i * 0.00009);
    const lon = 39.8262;
    
    floorChangeTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    floorChangeTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-elevator',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'sai',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }

  const elevatorLat = 21.4225 + (20 * 0.00009);
  const elevatorLon = 39.8262;

  // In elevator (10 seconds stationary, then floor change)
  for (let i = 1; i <= 15; i++) {
    const t = seq * 1000;
    const floor = i <= 10 ? 0 : 1; // Floor change after 10 seconds
    
    floorChangeTrace.groundTruth.push({
      ts: baseTime + t,
      lat: elevatorLat,
      lon: elevatorLon,
      heading: 0,
      speed: 0.0,
      floor,
      nodeId: 'elevator-1'
    });

    // Poor GPS signal in elevator
    const noisy = addGPSNoise(elevatorLat, elevatorLon, i <= 10 ? 8.0 : 5.0);
    floorChangeTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-elevator',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: floor * 3, floor, acc: i <= 10 ? 12.0 : 6.0 },
      heading: 0,
      speed: 0.0,
      source: i <= 10 ? 'imu' : 'gnss',
      stage: 'sai',
      lap: 1,
      confidence: i <= 10 ? 0.3 : 0.7,
      mode: 'guide',
      device: 'android'
    });
  }

  // Exit elevator and continue on floor 1 (20m)
  for (let i = 1; i <= 20; i++) {
    const t = seq * 1000;
    const lat = elevatorLat + (i * 0.00009);
    const lon = elevatorLon;
    
    floorChangeTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 1
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    floorChangeTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-elevator',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 3, floor: 1, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'sai',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(floorChangeTrace);

  // 6. Off-path Wander then Re-join
  const wanderTrace: SyntheticTrace = {
    name: 'off-path-rejoin',
    description: 'Follow path, wander off for 15s, then return to path',
    scenario: 'off-path',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 3.0, p95Error: 8.0 }
  };

  seq = 0;
  // On path (20m)
  for (let i = 0; i <= 20; i++) {
    const t = seq * 1000;
    const lat = 21.4225 + (i * 0.00009);
    const lon = 39.8262;
    
    wanderTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0,
      edgeId: 'main-corridor'
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    wanderTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-wander',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }

  const wanderStartLat = 21.4225 + (20 * 0.00009);
  const wanderStartLon = 39.8262;

  // Wander off path (15 seconds, move east)
  for (let i = 1; i <= 15; i++) {
    const t = seq * 1000;
    const lat = wanderStartLat;
    const lon = wanderStartLon + (i * 0.000127); // Move east away from path
    
    wanderTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 90,
      speed: 0.8,
      floor: 0
      // No edgeId - off path
    });

    const noisy = addGPSNoise(lat, lon, 3.0); // Higher noise off-path
    wanderTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-wander',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 5.0 },
      heading: 90 + (Math.random() - 0.5) * 20,
      speed: 0.8,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.6,
      mode: 'guide',
      device: 'android'
    });
  }

  // Return to path (10 seconds, move back west then north)
  const wanderEndLat = wanderStartLat;
  const wanderEndLon = wanderStartLon + (15 * 0.000127);

  // Move back west to path
  for (let i = 1; i <= 10; i++) {
    const t = seq * 1000;
    const lat = wanderEndLat;
    const lon = wanderEndLon - (i * 0.000127 * 1.5); // Move back west
    
    wanderTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 270,
      speed: 1.2, // Faster to rejoin
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.5);
    wanderTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-wander',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 4.0 },
      heading: 270 + (Math.random() - 0.5) * 15,
      speed: 1.2,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.7,
      mode: 'guide',
      device: 'android'
    });
  }

  // Back on path, continue north
  for (let i = 1; i <= 15; i++) {
    const t = seq * 1000;
    const lat = wanderStartLat + (i * 0.00009);
    const lon = wanderStartLon;
    
    wanderTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0,
      edgeId: 'main-corridor'
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    wanderTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-wander',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(wanderTrace);

  // 7. Teleport Spike + 2s GNSS Dropout
  const teleportTrace: SyntheticTrace = {
    name: 'teleport-dropout',
    description: 'Normal movement, sudden teleport spike, 2s GNSS dropout, then recovery',
    scenario: 'teleport',
    groundTruth: [],
    measurements: [],
    expectedAccuracy: { medianError: 2.5, p95Error: 6.0, recoveryTime: 1.2 }
  };

  seq = 0;
  // Normal movement (30m)
  for (let i = 0; i <= 30; i++) {
    const t = seq * 1000;
    const lat = 21.4225 + (i * 0.00009);
    const lon = 39.8262;
    
    teleportTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    teleportTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-teleport',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }

  const teleportStartLat = 21.4225 + (30 * 0.00009);
  const teleportStartLon = 39.8262;

  // Teleport spike (1 point 200m away)
  {
    const t = seq * 1000;
    teleportTrace.groundTruth.push({
      ts: baseTime + t,
      lat: teleportStartLat,
      lon: teleportStartLon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    // Simulate teleport to 200m south with high noise
    const teleportLat = teleportStartLat - (200 * 0.00009);
    const noisyTeleport = addGPSNoise(teleportLat, teleportStartLon, 15.0);
    teleportTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-teleport',
      pos: { lat: noisyTeleport.lat, lon: noisyTeleport.lon, alt: 0, floor: 0, acc: 25.0 },
      heading: 180, // Wrong heading
      speed: 50.0, // Impossible speed
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.2, // Low confidence
      mode: 'guide',
      device: 'android'
    });
  }

  // GNSS dropout (2 seconds, use IMU)
  for (let i = 1; i <= 2; i++) {
    const t = seq * 1000;
    teleportTrace.groundTruth.push({
      ts: baseTime + t,
      lat: teleportStartLat + (i * 0.00009),
      lon: teleportStartLon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    // IMU-based position (drifting)
    const driftLat = teleportStartLat + (i * 0.00009) + (i * 0.00002); // Some drift
    const noisyIMU = addGPSNoise(driftLat, teleportStartLon, 5.0);
    teleportTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-teleport',
      pos: { lat: noisyIMU.lat, lon: noisyIMU.lon, alt: 0, floor: 0, acc: 8.0 },
      heading: 0 + (i * 10), // Heading drift
      speed: 0.8,
      source: 'imu', // IMU source during dropout
      stage: 'tawaf',
      lap: 1,
      confidence: 0.4,
      mode: 'guide',
      device: 'android'
    });
  }

  // GNSS recovery and normal movement (20m)
  for (let i = 1; i <= 20; i++) {
    const t = seq * 1000;
    const lat = teleportStartLat + (2 + i) * 0.00009; // Continue from where we left off
    const lon = teleportStartLon;
    
    teleportTrace.groundTruth.push({
      ts: baseTime + t,
      lat,
      lon,
      heading: 0,
      speed: 1.0,
      floor: 0
    });

    const noisy = addGPSNoise(lat, lon, 2.0);
    teleportTrace.measurements.push({
      ts: baseTime + t,
      seq: seq++,
      userId: 'test-user-teleport',
      pos: { lat: noisy.lat, lon: noisy.lon, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss',
      stage: 'tawaf',
      lap: 1,
      confidence: 0.8,
      mode: 'guide',
      device: 'android'
    });
  }
  traces.push(teleportTrace);

  return traces;
}

/**
 * Save traces to JSONL files for analysis
 */
export function saveTracesToJSONL(traces: SyntheticTrace[], outputDir: string): void {
  const fs = require('fs');
  const path = require('path');

  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  for (const trace of traces) {
    // Save ground truth
    const groundTruthPath = path.join(outputDir, `${trace.name}-ground-truth.jsonl`);
    const groundTruthLines = trace.groundTruth.map(point => JSON.stringify(point)).join('\n');
    fs.writeFileSync(groundTruthPath, groundTruthLines);

    // Save measurements
    const measurementsPath = path.join(outputDir, `${trace.name}-measurements.jsonl`);
    const measurementLines = trace.measurements.map(measurement => JSON.stringify(measurement)).join('\n');
    fs.writeFileSync(measurementsPath, measurementLines);

    // Save metadata
    const metadataPath = path.join(outputDir, `${trace.name}-metadata.json`);
    const metadata = {
      name: trace.name,
      description: trace.description,
      scenario: trace.scenario,
      expectedAccuracy: trace.expectedAccuracy,
      groundTruthCount: trace.groundTruth.length,
      measurementCount: trace.measurements.length
    };
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
  }
}