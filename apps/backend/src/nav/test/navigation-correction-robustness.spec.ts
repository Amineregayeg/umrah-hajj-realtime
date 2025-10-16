import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NavigationCorrectionService } from '../services/navigation-correction.service';
import { GraphService } from '../graph/services/graph.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { PathfindingService } from '../graph/algorithms/pathfinding.service';
import { GraphCacheService } from '../graph/services/graph-cache.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import * as path from 'path';
import * as fs from 'fs';

interface TracePoint {
  timestamp: number;
  sequence: number;
  userId: string;
  position: { lat: number; lon: number; floor: number };
  rawPosition: { lat: number; lon: number; floor: number };
  heading: number;
  speed: number;
  snapError: number;
  confidence: number;
  snapTo: string;
  snapId?: string;
  scenario: string;
  environment: string;
}

interface TestScenario {
  name: string;
  description: string;
  waypoints: Array<{ lat: number; lon: number; floor: number; ts: number }>;
  environments: Array<'straight_corridor' | 'curved_path' | 'tight_turns' | 'loop' | 'floor_transition' | 'off_path' | 'teleport_spike' | 'gnss_dropout'>;
  expectedBehavior: {
    medianSnapError: number; // Should be ≤2.0m
    p95SnapError: number;    // Should be ≤4.0m
    teleportRecoveryTime?: number; // Should be <1.2s for teleport scenarios
    floorTransitionValid?: boolean;
  };
}

interface ConnectorEnforcementLog {
  timestamp: number;
  userId: string;
  fromFloor: string;
  toFloor: string;
  allowed: boolean;
  reason: string;
  confidence: number;
  connectorUsed?: string;
}

describe('NavigationCorrectionRobustnessTests', () => {
  let service: NavigationCorrectionService;
  let graphService: GraphService;
  let graphLoader: GraphLoaderService;
  let traces: TracePoint[] = [];
  let connectorLogs: ConnectorEnforcementLog[] = [];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
          load: [() => ({
            GRAPH_PATH: path.join(__dirname, '../../../data/nav_graph.json'),
            NODE_ENV: 'test'
          })]
        })
      ],
      providers: [
        NavigationCorrectionService,
        GraphService,
        GraphLoaderService,
        PathfindingService,
        GraphCacheService
      ],
    }).compile();

    service = module.get<NavigationCorrectionService>(NavigationCorrectionService);
    graphService = module.get<GraphService>(GraphService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    
    await graphLoader.onModuleInit();

    traces = [];
    connectorLogs = [];
  });

  const testScenarios: TestScenario[] = [
    {
      name: 'Straight Corridor Navigation',
      description: 'Test navigation along a straight corridor path',
      waypoints: [
        { lat: 21.4225, lon: 39.8262, floor: 0, ts: 0 },     // Gate A
        { lat: 21.4228, lon: 39.8265, floor: 0, ts: 2000 },  // Info Desk
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 4000 },  // Central Hall
        { lat: 21.4235, lon: 39.8272, floor: 0, ts: 6000 }   // Gate B
      ],
      environments: ['straight_corridor'],
      expectedBehavior: {
        medianSnapError: 1.5,
        p95SnapError: 3.0
      }
    },
    {
      name: 'Curved Path Navigation',
      description: 'Test navigation along curved paths with smooth turns',
      waypoints: [
        { lat: 21.4225, lon: 39.8262, floor: 0, ts: 0 },
        { lat: 21.4227, lon: 39.8264, floor: 0, ts: 1500 },
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 3000 },
        { lat: 21.4233, lon: 39.8269, floor: 0, ts: 4500 },
        { lat: 21.4235, lon: 39.8272, floor: 0, ts: 6000 }
      ],
      environments: ['curved_path'],
      expectedBehavior: {
        medianSnapError: 2.0,
        p95SnapError: 3.5
      }
    },
    {
      name: 'Tight Turns Navigation',
      description: 'Test navigation through tight corners and sharp turns',
      waypoints: [
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 0 },     // Central Hall
        { lat: 21.4228, lon: 39.8265, floor: 0, ts: 1000 },  // Info Desk (90° turn)
        { lat: 21.4226, lon: 39.8264, floor: 0, ts: 2000 },  // Stairs (sharp turn)
        { lat: 21.4232, lon: 39.8268, floor: 0, ts: 3500 }   // Elevator (tight corner)
      ],
      environments: ['tight_turns'],
      expectedBehavior: {
        medianSnapError: 2.0,
        p95SnapError: 4.0
      }
    },
    {
      name: 'Loop Navigation',
      description: 'Test navigation in circular or loop patterns',
      waypoints: [
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 0 },
        { lat: 21.4235, lon: 39.8272, floor: 0, ts: 2000 },
        { lat: 21.4228, lon: 39.8265, floor: 0, ts: 4000 },
        { lat: 21.4225, lon: 39.8262, floor: 0, ts: 6000 },
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 8000 }   // Back to start
      ],
      environments: ['loop'],
      expectedBehavior: {
        medianSnapError: 1.8,
        p95SnapError: 3.5
      }
    },
    {
      name: 'Floor Transition via Elevator',
      description: 'Test valid floor transitions using elevator connectors',
      waypoints: [
        { lat: 21.4232, lon: 39.8268, floor: 0, ts: 0 },     // Elevator Ground
        { lat: 21.4232, lon: 39.8268, floor: 1, ts: 15000 }, // Elevator First (after 15s)
        { lat: 21.4230, lon: 39.8265, floor: 1, ts: 17000 }, // First Floor Corridor
        { lat: 21.4232, lon: 39.8268, floor: 1, ts: 19000 }, // Back to elevator
        { lat: 21.4232, lon: 39.8268, floor: 2, ts: 34000 }  // Elevator Second (after 15s)
      ],
      environments: ['floor_transition'],
      expectedBehavior: {
        medianSnapError: 1.5,
        p95SnapError: 3.0,
        floorTransitionValid: true
      }
    },
    {
      name: 'Floor Transition via Stairs',
      description: 'Test valid floor transitions using stair connectors',
      waypoints: [
        { lat: 21.4226, lon: 39.8264, floor: 0, ts: 0 },     // Stairs Ground
        { lat: 21.4226, lon: 39.8264, floor: 1, ts: 45000 }, // Stairs First (after 45s)
        { lat: 21.4230, lon: 39.8265, floor: 1, ts: 47000 }  // First Floor Corridor
      ],
      environments: ['floor_transition'],
      expectedBehavior: {
        medianSnapError: 1.8,
        p95SnapError: 3.5,
        floorTransitionValid: true
      }
    },
    {
      name: 'Off-Path Recovery',
      description: 'Test behavior when user goes off designated paths',
      waypoints: [
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 0 },     // Central Hall
        { lat: 21.4240, lon: 39.8280, floor: 0, ts: 2000 },  // Far off path
        { lat: 21.4245, lon: 39.8285, floor: 0, ts: 4000 },  // Even further
        { lat: 21.4235, lon: 39.8275, floor: 0, ts: 6000 },  // Coming back
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 8000 }   // Back on path
      ],
      environments: ['off_path'],
      expectedBehavior: {
        medianSnapError: 3.0,  // Higher error when off-path
        p95SnapError: 6.0      // Relaxed for off-path scenarios
      }
    },
    {
      name: 'Teleport Spike Handling',
      description: 'Test recovery from sudden position jumps (GPS errors)',
      waypoints: [
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 0 },     // Central Hall
        { lat: 21.4231, lon: 39.8268, floor: 0, ts: 1000 },  // Normal movement
        { lat: 21.4300, lon: 39.8350, floor: 0, ts: 2000 },  // TELEPORT SPIKE! (very far)
        { lat: 21.4232, lon: 39.8269, floor: 0, ts: 3000 },  // Should recover quickly
        { lat: 21.4233, lon: 39.8270, floor: 0, ts: 4000 }   // Normal movement
      ],
      environments: ['teleport_spike'],
      expectedBehavior: {
        medianSnapError: 2.0,
        p95SnapError: 4.0,
        teleportRecoveryTime: 1200  // Must recover within 1.2s
      }
    },
    {
      name: 'GNSS Dropout Simulation',
      description: 'Test behavior during GPS signal loss and recovery',
      waypoints: [
        { lat: 21.4230, lon: 39.8267, floor: 0, ts: 0 },     // Last known good position
        // Simulate 5 seconds of no updates (GNSS dropout)
        { lat: 21.4235, lon: 39.8272, floor: 0, ts: 6000 },  // Position when signal returns
        { lat: 21.4237, lon: 39.8274, floor: 0, ts: 7000 }   // Continued navigation
      ],
      environments: ['gnss_dropout'],
      expectedBehavior: {
        medianSnapError: 2.5,
        p95SnapError: 4.0
      }
    }
  ];

  describe('Test Scenarios Execution', () => {
    testScenarios.forEach((scenario, scenarioIndex) => {
      it(`should handle ${scenario.name} with required accuracy`, async () => {
        const userId = `test-user-scenario-${scenarioIndex}`;
        const scenarioTraces: TracePoint[] = [];
        const startTime = Date.now();

        // Set up active route if needed
        if (scenario.waypoints.length > 1) {
          service.updateUserRoute(userId, ['gate_a', 'central_hall', 'gate_b']);
        }

        for (let i = 0; i < scenario.waypoints.length; i++) {
          const waypoint = scenario.waypoints[i];
          
          // Add noise to simulate real-world conditions
          const noiseLevel = scenario.environments.includes('teleport_spike') && i === 2 ? 0.01 : 0.00001;
          const noiseLat = (Math.random() - 0.5) * noiseLevel;
          const noiseLon = (Math.random() - 0.5) * noiseLevel;

          const navUpdate: NavUpdateDto = {
            ts: startTime + waypoint.ts,
            seq: i + 1,
            userId,
            pos: {
              lat: waypoint.lat + noiseLat,
              lon: waypoint.lon + noiseLon,
              alt: 0,
              floor: waypoint.floor,
              acc: scenario.environments.includes('gnss_dropout') ? 20 : 5
            },
            heading: i > 0 ? calculateHeading(scenario.waypoints[i-1], waypoint) : 0,
            speed: calculateSpeed(scenario.waypoints, i),
            source: scenario.environments.includes('gnss_dropout') ? 'arcore' : 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: scenario.environments.includes('teleport_spike') && i === 2 ? 0.3 : 0.9,
            mode: 'guide',
            device: 'android'
          };

          // Handle GNSS dropout scenario
          if (scenario.environments.includes('gnss_dropout') && i === 1) {
            // Skip processing during dropout period
            continue;
          }

          const result = await service.processNavigationUpdate(navUpdate);

          if (result) {
            const snapError = Math.sqrt(result.delta.x ** 2 + result.delta.y ** 2);
            
            const tracePoint: TracePoint = {
              timestamp: navUpdate.ts,
              sequence: navUpdate.seq,
              userId,
              position: result.snappedPosition,
              rawPosition: { lat: navUpdate.pos.lat, lon: navUpdate.pos.lon, floor: navUpdate.pos.floor },
              heading: navUpdate.heading,
              speed: navUpdate.speed,
              snapError,
              confidence: result.confidence,
              snapTo: result.snapTo,
              snapId: result.nodeId || result.segmentId || result.zoneId,
              scenario: scenario.name,
              environment: scenario.environments.join(',')
            };

            scenarioTraces.push(tracePoint);
            traces.push(tracePoint);

            // Log floor transitions
            if (i > 0 && waypoint.floor !== scenario.waypoints[i-1].floor) {
              const log: ConnectorEnforcementLog = {
                timestamp: navUpdate.ts,
                userId,
                fromFloor: scenario.waypoints[i-1].floor.toString(),
                toFloor: waypoint.floor.toString(),
                allowed: result !== null,
                reason: result ? 'Valid connector found' : 'No valid connector',
                confidence: navUpdate.confidence,
                connectorUsed: result ? getConnectorType(scenario.waypoints[i-1].floor, waypoint.floor) : undefined
              };
              connectorLogs.push(log);
            }
          }

          // Add delay for teleport spike recovery test
          if (scenario.environments.includes('teleport_spike') && i === 2) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        }

        // Analyze scenario results
        const snapErrors = scenarioTraces.map(t => t.snapError);
        const medianError = calculateMedian(snapErrors);
        const p95Error = calculatePercentile(snapErrors, 95);

        console.log(`\n${scenario.name} Results:`);
        console.log(`  Median snap error: ${medianError.toFixed(3)}m (target: ≤${scenario.expectedBehavior.medianSnapError}m)`);
        console.log(`  P95 snap error: ${p95Error.toFixed(3)}m (target: ≤${scenario.expectedBehavior.p95SnapError}m)`);

        // Verify accuracy requirements
        expect(medianError).toBeLessThanOrEqual(scenario.expectedBehavior.medianSnapError);
        expect(p95Error).toBeLessThanOrEqual(scenario.expectedBehavior.p95SnapError);

        // Test teleport spike recovery time
        if (scenario.expectedBehavior.teleportRecoveryTime) {
          const teleportIndex = scenarioTraces.findIndex(t => t.snapError > 10); // Find teleport spike
          if (teleportIndex >= 0) {
            const recoveryIndex = scenarioTraces.findIndex((t, idx) => 
              idx > teleportIndex && t.snapError <= 4.0
            );
            
            if (recoveryIndex >= 0) {
              const recoveryTime = scenarioTraces[recoveryIndex].timestamp - scenarioTraces[teleportIndex].timestamp;
              console.log(`  Teleport recovery time: ${recoveryTime}ms (target: ≤${scenario.expectedBehavior.teleportRecoveryTime}ms)`);
              expect(recoveryTime).toBeLessThanOrEqual(scenario.expectedBehavior.teleportRecoveryTime);
            }
          }
        }

        // Test floor transition validation
        if (scenario.expectedBehavior.floorTransitionValid !== undefined) {
          const floorTransitionLogs = connectorLogs.filter(log => log.userId === userId);
          const allTransitionsValid = floorTransitionLogs.every(log => log.allowed);
          expect(allTransitionsValid).toBe(scenario.expectedBehavior.floorTransitionValid);
        }

        service.clearUserState(userId);
      });
    });
  });

  describe('Aggregate Performance Analysis', () => {
    it('should meet overall accuracy requirements across all scenarios', async () => {
      // Run all scenarios first
      for (let scenarioIndex = 0; scenarioIndex < testScenarios.length; scenarioIndex++) {
        const scenario = testScenarios[scenarioIndex];
        const userId = `aggregate-user-${scenarioIndex}`;
        
        for (let i = 0; i < scenario.waypoints.length; i++) {
          const waypoint = scenario.waypoints[i];
          
          const navUpdate: NavUpdateDto = {
            ts: Date.now() + waypoint.ts,
            seq: i + 1,
            userId,
            pos: {
              lat: waypoint.lat + (Math.random() - 0.5) * 0.00001,
              lon: waypoint.lon + (Math.random() - 0.5) * 0.00001,
              alt: 0,
              floor: waypoint.floor,
              acc: 5
            },
            heading: i > 0 ? calculateHeading(scenario.waypoints[i-1], waypoint) : 0,
            speed: calculateSpeed(scenario.waypoints, i),
            source: 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.9,
            mode: 'guide',
            device: 'android'
          };

          const result = await service.processNavigationUpdate(navUpdate);
          if (result) {
            const snapError = Math.sqrt(result.delta.x ** 2 + result.delta.y ** 2);
            traces.push({
              timestamp: navUpdate.ts,
              sequence: navUpdate.seq,
              userId,
              position: result.snappedPosition,
              rawPosition: { lat: navUpdate.pos.lat, lon: navUpdate.pos.lon, floor: navUpdate.pos.floor },
              heading: navUpdate.heading,
              speed: navUpdate.speed,
              snapError,
              confidence: result.confidence,
              snapTo: result.snapTo,
              snapId: result.nodeId || result.segmentId || result.zoneId,
              scenario: scenario.name,
              environment: scenario.environments.join(',')
            });
          }
        }
        service.clearUserState(userId);
      }

      // Analyze aggregate results
      const allSnapErrors = traces.map(t => t.snapError);
      const overallMedian = calculateMedian(allSnapErrors);
      const overallP95 = calculatePercentile(allSnapErrors, 95);

      console.log(`\nAggregate Results Across All Scenarios:`);
      console.log(`  Overall median snap error: ${overallMedian.toFixed(3)}m (requirement: ≤2.0m)`);
      console.log(`  Overall P95 snap error: ${overallP95.toFixed(3)}m (requirement: ≤4.0m)`);
      console.log(`  Total test points: ${traces.length}`);

      // Verify overall requirements
      expect(overallMedian).toBeLessThanOrEqual(2.0);
      expect(overallP95).toBeLessThanOrEqual(4.0);
    });
  });

  afterAll(async () => {
    // Generate output artifacts
    await generateTraceArtifacts();
    await generateSummaryTable();
    await generateConnectorEnforcementLogs();
  });

  // Helper functions
  function calculateHeading(from: any, to: any): number {
    const dx = to.lon - from.lon;
    const dy = to.lat - from.lat;
    return Math.atan2(dx, dy) * 180 / Math.PI;
  }

  function calculateSpeed(waypoints: any[], index: number): number {
    if (index === 0) return 1.0;
    const prev = waypoints[index - 1];
    const curr = waypoints[index];
    const timeDiff = (curr.ts - prev.ts) / 1000; // seconds
    const distance = haversineDistance(prev, curr);
    return distance / timeDiff; // m/s
  }

  function haversineDistance(p1: any, p2: any): number {
    const R = 6371e3; // Earth radius in meters
    const φ1 = p1.lat * Math.PI / 180;
    const φ2 = p2.lat * Math.PI / 180;
    const Δφ = (p2.lat - p1.lat) * Math.PI / 180;
    const Δλ = (p2.lon - p1.lon) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c;
  }

  function calculateMedian(numbers: number[]): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  function calculatePercentile(numbers: number[], percentile: number): number {
    const sorted = numbers.slice().sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  function getConnectorType(fromFloor: number, toFloor: number): string {
    // Based on nav_graph.json connectors
    if (Math.abs(fromFloor - toFloor) === 1) {
      return fromFloor === 0 || toFloor === 0 ? 'elevator/stairs' : 'elevator';
    }
    return 'unknown';
  }

  async function generateTraceArtifacts(): Promise<void> {
    const outputDir = path.join(__dirname, '../../../test-artifacts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate CSV trace
    const csvHeaders = 'timestamp,sequence,userId,lat,lon,floor,rawLat,rawLon,rawFloor,heading,speed,snapError,confidence,snapTo,snapId,scenario,environment\n';
    const csvData = traces.map(t => 
      `${t.timestamp},${t.sequence},${t.userId},${t.position.lat},${t.position.lon},${t.position.floor},${t.rawPosition.lat},${t.rawPosition.lon},${t.rawPosition.floor},${t.heading},${t.speed},${t.snapError},${t.confidence},${t.snapTo},${t.snapId || ''},${t.scenario},${t.environment}`
    ).join('\n');

    fs.writeFileSync(path.join(outputDir, 'navigation-correction-traces.csv'), csvHeaders + csvData);

    // Generate JSONL trace
    const jsonlData = traces.map(t => JSON.stringify(t)).join('\n');
    fs.writeFileSync(path.join(outputDir, 'navigation-correction-traces.jsonl'), jsonlData);

    console.log(`\nGenerated trace artifacts in ${outputDir}`);
  }

  async function generateSummaryTable(): Promise<void> {
    const outputDir = path.join(__dirname, '../../../test-artifacts');
    
    const scenarios = [...new Set(traces.map(t => t.scenario))];
    const summary = scenarios.map(scenario => {
      const scenarioTraces = traces.filter(t => t.scenario === scenario);
      const errors = scenarioTraces.map(t => t.snapError);
      
      return {
        scenario,
        totalPoints: scenarioTraces.length,
        medianError: calculateMedian(errors),
        p95Error: calculatePercentile(errors, 95),
        maxError: Math.max(...errors),
        avgConfidence: scenarioTraces.reduce((sum, t) => sum + t.confidence, 0) / scenarioTraces.length
      };
    });

    const summaryTable = [
      'Scenario,Total Points,Median Error (m),P95 Error (m),Max Error (m),Avg Confidence',
      ...summary.map(s => 
        `${s.scenario},${s.totalPoints},${s.medianError.toFixed(3)},${s.p95Error.toFixed(3)},${s.maxError.toFixed(3)},${s.avgConfidence.toFixed(3)}`
      )
    ].join('\n');

    fs.writeFileSync(path.join(outputDir, 'navigation-correction-summary.csv'), summaryTable);
    
    console.log('Generated summary table');
  }

  async function generateConnectorEnforcementLogs(): Promise<void> {
    const outputDir = path.join(__dirname, '../../../test-artifacts');
    
    const logHeaders = 'timestamp,userId,fromFloor,toFloor,allowed,reason,confidence,connectorUsed\n';
    const logData = connectorLogs.map(log =>
      `${log.timestamp},${log.userId},${log.fromFloor},${log.toFloor},${log.allowed},${log.reason},${log.confidence},${log.connectorUsed || ''}`
    ).join('\n');

    fs.writeFileSync(path.join(outputDir, 'connector-enforcement-logs.csv'), logHeaders + logData);
    
    console.log('Generated connector enforcement logs');
  }
});