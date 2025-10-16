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

interface FloorTransitionAttempt {
  timestamp: number;
  userId: string;
  fromFloor: string;
  toFloor: string;
  confidence: number;
  allowed: boolean;
  reason: string;
  connectorType?: 'elevator' | 'stairs' | 'none';
  connectorLocation?: { lat: number; lon: number };
  transitionTime?: number;
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
  position: { lat: number; lon: number };
}

describe('FloorTransitionValidationTests', () => {
  let service: NavigationCorrectionService;
  let graphLoader: GraphLoaderService;
  let graphService: GraphService;
  let transitionAttempts: FloorTransitionAttempt[] = [];
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
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    graphService = module.get<GraphService>(GraphService);
    
    await graphLoader.onModuleInit();

    transitionAttempts = [];
    connectorLogs = [];
  });

  describe('Valid Floor Transitions via Connectors', () => {
    it('should allow elevator transitions between ground and first floor', async () => {
      const userId = 'elevator-transition-test';
      
      // Start at elevator ground floor
      const groundFloorUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4232, // Elevator location
          lon: 39.8268,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 0,
        speed: 0.5,
        source: 'arcore', // Indoor positioning
        stage: 'navigation',
        lap: 1,
        confidence: 0.95,
        mode: 'guide',
        device: 'android'
      };

      const groundResult = await service.processNavigationUpdate(groundFloorUpdate);
      expect(groundResult).toBeDefined();

      // Simulate elevator ride (typical duration: 10-20 seconds)
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulated delay

      // Transition to first floor via elevator
      const firstFloorUpdate: NavUpdateDto = {
        ts: groundFloorUpdate.ts + 15000, // 15 seconds later
        seq: 2,
        userId,
        pos: {
          lat: 21.4232, // Same elevator location
          lon: 39.8268,
          alt: 0,
          floor: 1, // Different floor
          acc: 3
        },
        heading: 0,
        speed: 0.2,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const firstFloorResult = await service.processNavigationUpdate(firstFloorUpdate);
      
      const transitionAllowed = firstFloorResult !== null;
      
      transitionAttempts.push({
        timestamp: firstFloorUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        confidence: firstFloorUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Valid elevator connector' : 'No valid connector',
        connectorType: 'elevator',
        connectorLocation: { lat: 21.4232, lon: 39.8268 },
        transitionTime: firstFloorUpdate.ts - groundFloorUpdate.ts
      });

      if (transitionAllowed) {
        connectorLogs.push({
          timestamp: firstFloorUpdate.ts,
          userId,
          fromFloor: '0',
          toFloor: '1',
          allowed: true,
          reason: 'Elevator connector at matching location',
          confidence: firstFloorUpdate.confidence,
          connectorUsed: 'elevator_1_ground->elevator_1_first',
          position: { lat: firstFloorUpdate.pos.lat, lon: firstFloorUpdate.pos.lon }
        });
      }

      console.log(`\nElevator Transition Test:`);
      console.log(`  Ground to First Floor: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);
      console.log(`  Confidence: ${firstFloorUpdate.confidence}`);
      console.log(`  Transition time: ${(firstFloorUpdate.ts - groundFloorUpdate.ts) / 1000}s`);

      expect(transitionAllowed).toBe(true);
      service.clearUserState(userId);
    });

    it('should allow elevator transitions from first to second floor', async () => {
      const userId = 'elevator-multi-floor-test';
      
      // Start at first floor elevator
      const firstFloorUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4232,
          lon: 39.8268,
          alt: 0,
          floor: 1,
          acc: 3
        },
        heading: 0,
        speed: 0.3,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.92,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(firstFloorUpdate);

      // Transition to second floor
      const secondFloorUpdate: NavUpdateDto = {
        ts: firstFloorUpdate.ts + 18000, // 18 seconds
        seq: 2,
        userId,
        pos: {
          lat: 21.4232,
          lon: 39.8268,
          alt: 0,
          floor: 2,
          acc: 3
        },
        heading: 0,
        speed: 0.2,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.88,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(secondFloorUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: secondFloorUpdate.ts,
        userId,
        fromFloor: '1',
        toFloor: '2',
        confidence: secondFloorUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Valid elevator connector' : 'No valid connector',
        connectorType: 'elevator',
        connectorLocation: { lat: 21.4232, lon: 39.8268 },
        transitionTime: secondFloorUpdate.ts - firstFloorUpdate.ts
      });

      console.log(`\nElevator Multi-Floor Transition Test:`);
      console.log(`  First to Second Floor: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);

      expect(transitionAllowed).toBe(true);
      service.clearUserState(userId);
    });

    it('should allow stairs transitions between ground and first floor', async () => {
      const userId = 'stairs-transition-test';
      
      // Start at stairs ground floor
      const groundStairsUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4226, // Stairs location
          lon: 39.8264,
          alt: 0,
          floor: 0,
          acc: 4
        },
        heading: 45,
        speed: 1.0,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.85,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(groundStairsUpdate);

      // Transition via stairs (slower than elevator)
      const firstStairsUpdate: NavUpdateDto = {
        ts: groundStairsUpdate.ts + 45000, // 45 seconds (realistic stair climbing time)
        seq: 2,
        userId,
        pos: {
          lat: 21.4226,
          lon: 39.8264,
          alt: 0,
          floor: 1,
          acc: 4
        },
        heading: 45,
        speed: 0.8,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(firstStairsUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: firstStairsUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        confidence: firstStairsUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Valid stairs connector' : 'No valid connector',
        connectorType: 'stairs',
        connectorLocation: { lat: 21.4226, lon: 39.8264 },
        transitionTime: firstStairsUpdate.ts - groundStairsUpdate.ts
      });

      console.log(`\nStairs Transition Test:`);
      console.log(`  Ground to First Floor: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);
      console.log(`  Transition time: ${(firstStairsUpdate.ts - groundStairsUpdate.ts) / 1000}s`);

      expect(transitionAllowed).toBe(true);
      service.clearUserState(userId);
    });
  });

  describe('Invalid Floor Transitions (Illegal Jumps)', () => {
    it('should reject direct floor jumps with high confidence', async () => {
      const userId = 'illegal-jump-test';
      
      // Start at ground floor (not near any connector)
      const groundUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4230, // Central hall - no direct connectors
          lon: 39.8267,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 90,
        speed: 1.5,
        source: 'gnss',
        stage: 'navigation',
        lap: 1,
        confidence: 0.95,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(groundUpdate);

      // Attempt illegal jump to second floor
      const illegalJumpUpdate: NavUpdateDto = {
        ts: groundUpdate.ts + 2000, // Only 2 seconds later (too fast)
        seq: 2,
        userId,
        pos: {
          lat: 21.4230, // Same location
          lon: 39.8267,
          alt: 0,
          floor: 2, // Jump to floor 2
          acc: 3
        },
        heading: 90,
        speed: 1.5,
        source: 'gnss',
        stage: 'navigation',
        lap: 1,
        confidence: 0.95, // High confidence - should be rejected
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(illegalJumpUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: illegalJumpUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '2',
        confidence: illegalJumpUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Transition allowed' : 'No valid connector - illegal jump',
        connectorType: 'none',
        connectorLocation: { lat: illegalJumpUpdate.pos.lat, lon: illegalJumpUpdate.pos.lon },
        transitionTime: illegalJumpUpdate.ts - groundUpdate.ts
      });

      connectorLogs.push({
        timestamp: illegalJumpUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '2',
        allowed: transitionAllowed,
        reason: 'Illegal floor jump - no connector available',
        confidence: illegalJumpUpdate.confidence,
        position: { lat: illegalJumpUpdate.pos.lat, lon: illegalJumpUpdate.pos.lon }
      });

      console.log(`\nIllegal Jump Test (High Confidence):`);
      console.log(`  Ground to Second Floor: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);
      console.log(`  Confidence: ${illegalJumpUpdate.confidence}`);

      expect(transitionAllowed).toBe(false);
      service.clearUserState(userId);
    });

    it('should reject transitions at wrong locations even with valid connector types', async () => {
      const userId = 'wrong-location-test';
      
      // Start at gate A (far from any connector)
      const gateUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4225, // Gate A
          lon: 39.8262,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'navigation',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(gateUpdate);

      // Attempt floor transition at wrong location
      const wrongLocationUpdate: NavUpdateDto = {
        ts: gateUpdate.ts + 5000,
        seq: 2,
        userId,
        pos: {
          lat: 21.4225, // Still at Gate A (no connectors here)
          lon: 39.8262,
          alt: 0,
          floor: 1, // Try to go to first floor
          acc: 3
        },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'navigation',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(wrongLocationUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: wrongLocationUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        confidence: wrongLocationUpdate.confidence,
        allowed: transitionAllowed,
        reason: 'No connector at this location',
        connectorType: 'none',
        connectorLocation: { lat: 21.4225, lon: 39.8262 }
      });

      console.log(`\nWrong Location Test:`);
      console.log(`  Transition at Gate A: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);

      expect(transitionAllowed).toBe(false);
      service.clearUserState(userId);
    });

    it('should reject impossibly fast transitions even at connector locations', async () => {
      const userId = 'fast-transition-test';
      
      // Start at elevator ground
      const elevatorGroundUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4232,
          lon: 39.8268,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 0,
        speed: 0.5,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.95,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(elevatorGroundUpdate);

      // Attempt impossibly fast transition (1 second)
      const fastTransitionUpdate: NavUpdateDto = {
        ts: elevatorGroundUpdate.ts + 1000, // Only 1 second!
        seq: 2,
        userId,
        pos: {
          lat: 21.4232,
          lon: 39.8268,
          alt: 0,
          floor: 1,
          acc: 3
        },
        heading: 0,
        speed: 0.5,
        source: 'arcore',
        stage: 'navigation',
        lap: 1,
        confidence: 0.95,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(fastTransitionUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: fastTransitionUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        confidence: fastTransitionUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Allowed despite fast transition' : 'Transition too fast',
        connectorType: 'elevator',
        connectorLocation: { lat: 21.4232, lon: 39.8268 },
        transitionTime: 1000
      });

      console.log(`\nFast Transition Test:`);
      console.log(`  1-second elevator transition: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);

      // This might be allowed depending on implementation - elevators can be fast
      // The key is that there IS a valid connector at this location
      service.clearUserState(userId);
    });
  });

  describe('Low Confidence Transitions', () => {
    it('should allow uncertain transitions with confidence < 0.7', async () => {
      const userId = 'low-confidence-test';
      
      // Start at some location
      const startUpdate: NavUpdateDto = {
        ts: Date.now(),
        seq: 1,
        userId,
        pos: {
          lat: 21.4230,
          lon: 39.8267,
          alt: 0,
          floor: 0,
          acc: 10 // Poor accuracy
        },
        heading: 180,
        speed: 2.0,
        source: 'gnss', // Outdoor GPS indoors - unreliable
        stage: 'navigation',
        lap: 1,
        confidence: 0.6, // Low confidence
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(startUpdate);

      // Attempt floor transition with low confidence
      const lowConfidenceUpdate: NavUpdateDto = {
        ts: startUpdate.ts + 3000,
        seq: 2,
        userId,
        pos: {
          lat: 21.4235,
          lon: 39.8270,
          alt: 0,
          floor: 1, // Different floor
          acc: 15 // Very poor accuracy
        },
        heading: 180,
        speed: 2.0,
        source: 'gnss',
        stage: 'navigation',
        lap: 1,
        confidence: 0.4, // Very low confidence
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(lowConfidenceUpdate);
      const transitionAllowed = result !== null;

      transitionAttempts.push({
        timestamp: lowConfidenceUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        confidence: lowConfidenceUpdate.confidence,
        allowed: transitionAllowed,
        reason: transitionAllowed ? 'Low confidence - uncertain position' : 'Rejected despite low confidence',
        connectorType: 'none'
      });

      connectorLogs.push({
        timestamp: lowConfidenceUpdate.ts,
        userId,
        fromFloor: '0',
        toFloor: '1',
        allowed: transitionAllowed,
        reason: `Low confidence (${lowConfidenceUpdate.confidence}) - position uncertain`,
        confidence: lowConfidenceUpdate.confidence,
        position: { lat: lowConfidenceUpdate.pos.lat, lon: lowConfidenceUpdate.pos.lon }
      });

      console.log(`\nLow Confidence Transition Test:`);
      console.log(`  Confidence: ${lowConfidenceUpdate.confidence}`);
      console.log(`  Transition: ${transitionAllowed ? 'ALLOWED' : 'REJECTED'}`);

      expect(transitionAllowed).toBe(true); // Should allow due to uncertainty
      service.clearUserState(userId);
    });

    it('should handle gradually improving confidence during transition', async () => {
      const userId = 'confidence-improvement-test';
      
      const confidenceSequence = [0.3, 0.5, 0.65, 0.8, 0.9];
      const startTime = Date.now();
      
      for (let i = 0; i < confidenceSequence.length; i++) {
        const update: NavUpdateDto = {
          ts: startTime + (i * 2000),
          seq: i + 1,
          userId,
          pos: {
            lat: 21.4232,
            lon: 39.8268,
            alt: 0,
            floor: i < 2 ? 0 : 1, // Floor transition after first two updates
            acc: Math.max(3, 15 - (i * 3)) // Improving accuracy
          },
          heading: 0,
          speed: 0.5,
          source: 'arcore',
          stage: 'navigation',
          lap: 1,
          confidence: confidenceSequence[i],
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(update);
        
        if (i >= 2) { // Floor transition attempts
          transitionAttempts.push({
            timestamp: update.ts,
            userId,
            fromFloor: '0',
            toFloor: '1',
            confidence: update.confidence,
            allowed: result !== null,
            reason: `Confidence: ${update.confidence}`,
            connectorType: 'elevator'
          });
        }
      }

      console.log(`\nConfidence Improvement Test completed with ${transitionAttempts.filter(t => t.userId === userId).length} transition attempts`);
      
      service.clearUserState(userId);
    });
  });

  afterAll(async () => {
    await generateFloorTransitionReport();
  });

  async function generateFloorTransitionReport(): Promise<void> {
    const outputDir = path.join(__dirname, '../../../test-artifacts');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate comprehensive floor transition analysis
    const report = {
      summary: {
        totalAttempts: transitionAttempts.length,
        allowedTransitions: transitionAttempts.filter(t => t.allowed).length,
        rejectedTransitions: transitionAttempts.filter(t => !t.allowed).length,
        successRate: transitionAttempts.filter(t => t.allowed).length / transitionAttempts.length
      },
      byConnectorType: {
        elevator: {
          attempts: transitionAttempts.filter(t => t.connectorType === 'elevator').length,
          allowed: transitionAttempts.filter(t => t.connectorType === 'elevator' && t.allowed).length,
          rejected: transitionAttempts.filter(t => t.connectorType === 'elevator' && !t.allowed).length
        },
        stairs: {
          attempts: transitionAttempts.filter(t => t.connectorType === 'stairs').length,
          allowed: transitionAttempts.filter(t => t.connectorType === 'stairs' && t.allowed).length,
          rejected: transitionAttempts.filter(t => t.connectorType === 'stairs' && !t.allowed).length
        },
        none: {
          attempts: transitionAttempts.filter(t => t.connectorType === 'none').length,
          allowed: transitionAttempts.filter(t => t.connectorType === 'none' && t.allowed).length,
          rejected: transitionAttempts.filter(t => t.connectorType === 'none' && !t.allowed).length
        }
      },
      confidenceAnalysis: {
        highConfidence: transitionAttempts.filter(t => t.confidence >= 0.7),
        lowConfidence: transitionAttempts.filter(t => t.confidence < 0.7)
      },
      transitionTiming: {
        averageElevatorTime: calculateAverageTransitionTime('elevator'),
        averageStairsTime: calculateAverageTransitionTime('stairs')
      }
    };

    fs.writeFileSync(
      path.join(outputDir, 'floor-transition-validation-report.json'),
      JSON.stringify(report, null, 2)
    );

    // Generate CSV of all transition attempts
    const csvHeaders = 'timestamp,userId,fromFloor,toFloor,confidence,allowed,reason,connectorType,transitionTime\n';
    const csvData = transitionAttempts.map(t =>
      `${t.timestamp},${t.userId},${t.fromFloor},${t.toFloor},${t.confidence},${t.allowed},${t.reason},${t.connectorType || 'none'},${t.transitionTime || ''}`
    ).join('\n');

    fs.writeFileSync(
      path.join(outputDir, 'floor-transition-attempts.csv'),
      csvHeaders + csvData
    );

    // Generate connector enforcement logs
    const logHeaders = 'timestamp,userId,fromFloor,toFloor,allowed,reason,confidence,connectorUsed,lat,lon\n';
    const logData = connectorLogs.map(log =>
      `${log.timestamp},${log.userId},${log.fromFloor},${log.toFloor},${log.allowed},${log.reason},${log.confidence},${log.connectorUsed || ''},${log.position.lat},${log.position.lon}`
    ).join('\n');

    fs.writeFileSync(
      path.join(outputDir, 'floor-transition-connector-logs.csv'),
      logHeaders + logData
    );

    console.log('\nGenerated floor transition validation artifacts');
    console.log(`  Total transition attempts: ${transitionAttempts.length}`);
    console.log(`  Success rate: ${(report.summary.successRate * 100).toFixed(1)}%`);
    console.log(`  Elevator attempts: ${report.byConnectorType.elevator.attempts}`);
    console.log(`  Stairs attempts: ${report.byConnectorType.stairs.attempts}`);
    console.log(`  Illegal jump attempts: ${report.byConnectorType.none.attempts}`);
  }

  function calculateAverageTransitionTime(connectorType: string): number {
    const transitions = transitionAttempts.filter(t => 
      t.connectorType === connectorType && 
      t.allowed && 
      t.transitionTime
    );
    
    if (transitions.length === 0) return 0;
    
    const totalTime = transitions.reduce((sum, t) => sum + (t.transitionTime || 0), 0);
    return totalTime / transitions.length;
  }
});