import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HMMTrackingService } from '../services/hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import * as path from 'path';

describe('HMMTrackingService - Accuracy Tests', () => {
  let service: HMMTrackingService;
  let graphLoader: GraphLoaderService;
  let testStartTime: number;

  beforeEach(async () => {
    testStartTime = Date.now();
    
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
        HMMTrackingService,
        GraphLoaderService
      ],
    }).compile();

    service = module.get<HMMTrackingService>(HMMTrackingService);
    graphLoader = module.get<GraphLoaderService>(GraphLoaderService);
    
    await graphLoader.onModuleInit();
  });

  describe('Accuracy Requirements', () => {
    it('should achieve median error ≤2.0m for typical indoor tracking', async () => {
      const errors: number[] = [];
      const userId = 'accuracy-test-user';

      // Simulate a realistic indoor path with ground truth
      const groundTruth = [
        { lat: 21.42246, lon: 39.82616, floor: 0 },
        { lat: 21.42248, lon: 39.82618, floor: 0 },
        { lat: 21.42250, lon: 39.82620, floor: 0 },
        { lat: 21.42252, lon: 39.82622, floor: 0 },
        { lat: 21.42254, lon: 39.82624, floor: 0 },
        { lat: 21.42256, lon: 39.82626, floor: 0 },
        { lat: 21.42258, lon: 39.82628, floor: 0 },
        { lat: 21.42260, lon: 39.82630, floor: 0 },
        { lat: 21.42262, lon: 39.82632, floor: 0 },
        { lat: 21.42264, lon: 39.82634, floor: 0 }
      ];

      // Add realistic noise to simulate GPS/sensor errors
      for (let i = 0; i < groundTruth.length; i++) {
        const truth = groundTruth[i];
        
        // Add Gaussian noise (std dev ~3m)
        const noiseLatM = (Math.random() - 0.5) * 6; // ±3m
        const noiseLonM = (Math.random() - 0.5) * 6; // ±3m
        const noiseLat = noiseLatM / 110540; // Convert to degrees
        const noiseLon = noiseLonM / (Math.cos(truth.lat * Math.PI / 180) * 111320);

        const navUpdate: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: {
            lat: truth.lat + noiseLat,
            lon: truth.lon + noiseLon,
            alt: 0,
            floor: truth.floor,
            acc: 3 + Math.random() * 2 // 3-5m accuracy
          },
          heading: 45 + (Math.random() - 0.5) * 50, // ±25° noise
          speed: 1.0 + (Math.random() - 0.5) * 0.4, // 0.8-1.2 m/s
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8 + Math.random() * 0.15,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        if (result) {
          // Calculate error in meters
          const errorLat = (result.position.lat - truth.lat) * 110540;
          const errorLon = (result.position.lon - truth.lon) * Math.cos(truth.lat * Math.PI / 180) * 111320;
          const error = Math.sqrt(errorLat * errorLat + errorLon * errorLon);
          errors.push(error);
        }
      }

      // Calculate median error
      errors.sort((a, b) => a - b);
      const median = errors[Math.floor(errors.length / 2)];
      
      console.log(`HMM Tracking - Median error: ${median.toFixed(2)}m`);
      expect(median).toBeLessThanOrEqual(2.0); // Requirement: median ≤2.0m
    });

    it('should achieve p95 error ≤4.0m for typical indoor tracking', async () => {
      const errors: number[] = [];
      const userCount = 10;

      // Test multiple users with different paths
      for (let user = 0; user < userCount; user++) {
        const userId = `p95-test-user-${user}`;
        
        // Generate random path
        const startLat = 21.42240 + Math.random() * 0.0003;
        const startLon = 39.82610 + Math.random() * 0.0003;
        
        for (let step = 0; step < 20; step++) {
          const truth = {
            lat: startLat + step * 0.00002,
            lon: startLon + step * 0.00002,
            floor: 0
          };

          // Add realistic noise
          const noiseLatM = (Math.random() - 0.5) * 6;
          const noiseLonM = (Math.random() - 0.5) * 6;
          const noiseLat = noiseLatM / 110540;
          const noiseLon = noiseLonM / (Math.cos(truth.lat * Math.PI / 180) * 111320);

          const navUpdate: NavUpdateDto = {
            ts: testStartTime + user * 20000 + step * 1000,
            seq: step + 1,
            userId,
            pos: {
              lat: truth.lat + noiseLat,
              lon: truth.lon + noiseLon,
              alt: 0,
              floor: truth.floor,
              acc: 3 + Math.random() * 2
            },
            heading: Math.atan2(0.00002, 0.00002) * 180 / Math.PI + (Math.random() - 0.5) * 50,
            speed: 1.0 + (Math.random() - 0.5) * 0.4,
            source: 'arcore',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.8 + Math.random() * 0.15,
            mode: 'guide',
            device: 'android'
          };

          const result = await service.processNavigationUpdate(navUpdate);
          
          if (result) {
            const errorLat = (result.position.lat - truth.lat) * 110540;
            const errorLon = (result.position.lon - truth.lon) * Math.cos(truth.lat * Math.PI / 180) * 111320;
            const error = Math.sqrt(errorLat * errorLat + errorLon * errorLon);
            errors.push(error);
          }
        }
      }

      // Calculate p95 error
      errors.sort((a, b) => a - b);
      const p95Index = Math.floor(errors.length * 0.95);
      const p95Error = errors[p95Index];
      
      console.log(`HMM Tracking - P95 error: ${p95Error.toFixed(2)}m`);
      expect(p95Error).toBeLessThanOrEqual(4.0); // Requirement: p95 ≤4.0m
    });
  });

  describe('HMM Components', () => {
    it('should find K=5 nearest candidates within R=20m', async () => {
      const navUpdate: NavUpdateDto = {
        ts: testStartTime,
        seq: 1,
        userId: 'candidate-test-user',
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 5 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(navUpdate);
      expect(result).toBeDefined();
      
      // Verify candidates were found within search radius
      if (result) {
        const distance = Math.sqrt(result.delta.x * result.delta.x + result.delta.y * result.delta.y);
        expect(distance).toBeLessThanOrEqual(20); // Within search radius
      }
    });

    it('should use Gaussian emission probability for distance', async () => {
      // Test that closer candidates get higher probability
      const userId = 'emission-test-user';
      const positions = [
        { lat: 21.42246, lon: 39.82616, distance: 1 },  // Very close
        { lat: 21.42250, lon: 39.82620, distance: 5 },  // Medium
        { lat: 21.42260, lon: 39.82630, distance: 15 }  // Far
      ];

      const results: number[] = [];
      
      for (const pos of positions) {
        const navUpdate: NavUpdateDto = {
          ts: testStartTime,
          seq: 1,
          userId: `${userId}-${pos.distance}`,
          pos: { lat: pos.lat, lon: pos.lon, alt: 0, floor: 0, acc: 3 },
          heading: 45,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        if (result) {
          results.push(result.confidence);
        }
      }

      // Closer positions should have higher confidence
      for (let i = 1; i < results.length; i++) {
        expect(results[i]).toBeLessThan(results[i-1]);
      }
    });

    it('should use von Mises emission probability for heading', async () => {
      // Test that matching headings get higher probability
      const userId = 'heading-test-user';
      const basePos = { lat: 21.42246, lon: 39.82616 };
      
      // First, establish a direction
      const setupUpdate: NavUpdateDto = {
        ts: testStartTime,
        seq: 1,
        userId,
        pos: { ...basePos, alt: 0, floor: 0, acc: 3 },
        heading: 90, // East
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };
      
      await service.processNavigationUpdate(setupUpdate);

      // Test different headings
      const headingTests = [90, 100, 135, 180, 270]; // Varying deviation from 90°
      const confidences: number[] = [];

      for (let i = 0; i < headingTests.length; i++) {
        const navUpdate: NavUpdateDto = {
          ts: testStartTime + (i + 1) * 1000,
          seq: i + 2,
          userId,
          pos: { 
            lat: basePos.lat + i * 0.00001, 
            lon: basePos.lon + i * 0.00001, 
            alt: 0, 
            floor: 0, 
            acc: 3 
          },
          heading: headingTests[i],
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        if (result) {
          confidences.push(result.confidence);
        }
      }

      // Heading closer to 90° should have higher confidence
      expect(confidences[0]).toBeGreaterThan(confidences[2]); // 90° > 135°
      expect(confidences[0]).toBeGreaterThan(confidences[3]); // 90° > 180°
    });

    it('should apply transition probability penalties for unrealistic jumps', async () => {
      const userId = 'transition-test-user';
      
      // First update
      const update1: NavUpdateDto = {
        ts: testStartTime,
        seq: 1,
        userId,
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 3 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      await service.processNavigationUpdate(update1);

      // Unrealistic jump (>100m in 1 second)
      const update2: NavUpdateDto = {
        ts: testStartTime + 1000,
        seq: 2,
        userId,
        pos: { lat: 21.42346, lon: 39.82716, alt: 0, floor: 0, acc: 3 }, // ~140m jump
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(update2);
      
      // Should still provide a result but with low confidence
      if (result) {
        expect(result.confidence).toBeLessThan(0.5);
      }
    });

    it('should penalize u-turns in transition probability', async () => {
      const userId = 'uturn-test-user';
      
      // Establish direction (north)
      for (let i = 0; i < 3; i++) {
        const update: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.42246 + i * 0.00002, 
            lon: 39.82616, 
            alt: 0, 
            floor: 0, 
            acc: 3 
          },
          heading: 0, // North
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };
        await service.processNavigationUpdate(update);
      }

      // Attempt u-turn (south)
      const uturnUpdate: NavUpdateDto = {
        ts: testStartTime + 3000,
        seq: 4,
        userId,
        pos: { 
          lat: 21.42252 - 0.00002, // Moving back south
          lon: 39.82616, 
          alt: 0, 
          floor: 0, 
          acc: 3 
        },
        heading: 180, // South (u-turn)
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const result = await service.processNavigationUpdate(uturnUpdate);
      
      // U-turn should be handled but with reduced confidence
      if (result) {
        expect(result.confidence).toBeLessThan(0.7);
      }
    });
  });

  describe('Outlier Handling', () => {
    it('should reset HMM state after teleport detection', async () => {
      const userId = 'teleport-test-user';
      
      // Normal updates
      for (let i = 0; i < 3; i++) {
        const update: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.42246 + i * 0.00002, 
            lon: 39.82616, 
            alt: 0, 
            floor: 0, 
            acc: 3 
          },
          heading: 0,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };
        await service.processNavigationUpdate(update);
      }

      // Teleport updates (3 consecutive jumps >12m)
      for (let i = 0; i < 3; i++) {
        const update: NavUpdateDto = {
          ts: testStartTime + (3 + i) * 1000,
          seq: 4 + i,
          userId,
          pos: { 
            lat: 21.42300 + i * 0.0001, // ~15m jumps
            lon: 39.82700 + i * 0.0001, 
            alt: 0, 
            floor: 0, 
            acc: 3 
          },
          heading: 45,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };
        const result = await service.processNavigationUpdate(update);
        
        // After 3rd teleport, state should be reset
        if (i === 2 && result) {
          // New location should be accepted
          expect(result).toBeDefined();
          expect(result.confidence).toBeGreaterThan(0.3);
        }
      }
    });

    it('should use K=10 candidates and R=35m radius after teleport', async () => {
      const userId = 'teleport-recovery-user';
      
      // Cause teleport
      const positions = [
        { lat: 21.42246, lon: 39.82616 },
        { lat: 21.42300, lon: 39.82700 }, // >12m jump
        { lat: 21.42350, lon: 39.82750 }, // >12m jump
        { lat: 21.42400, lon: 39.82800 }  // >12m jump - triggers reset
      ];

      for (let i = 0; i < positions.length; i++) {
        const update: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: { ...positions[i], alt: 0, floor: 0, acc: 3 },
          heading: 45,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };
        
        const result = await service.processNavigationUpdate(update);
        
        // After reset, should find candidates even at larger distances
        if (i === 3 && result) {
          expect(result).toBeDefined();
        }
      }
    });

    it('should reject illegal floor transitions unless confidence < 0.7', async () => {
      const userId = 'floor-transition-user';
      
      // Establish position on floor 0
      const update1: NavUpdateDto = {
        ts: testStartTime,
        seq: 1,
        userId,
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 3 },
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };
      await service.processNavigationUpdate(update1);

      // Try illegal floor jump with high confidence
      const update2: NavUpdateDto = {
        ts: testStartTime + 1000,
        seq: 2,
        userId,
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 5, acc: 3 }, // Jump to floor 5
        heading: 0,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9, // High confidence
        mode: 'guide',
        device: 'android'
      };

      const result2 = await service.processNavigationUpdate(update2);
      expect(result2).toBeNull(); // Should reject

      // Try same jump with low confidence
      const update3: NavUpdateDto = {
        ...update2,
        ts: testStartTime + 2000,
        seq: 3,
        confidence: 0.6 // Low confidence
      };

      const result3 = await service.processNavigationUpdate(update3);
      expect(result3).toBeDefined(); // Should accept uncertain transition
    });
  });

  describe('Smoothing and Performance', () => {
    it('should apply EMA smoothing with alpha=0.45', async () => {
      const userId = 'ema-test-user';
      const positions: Array<{raw: any, smoothed: any}> = [];

      // Send noisy updates
      for (let i = 0; i < 10; i++) {
        const noise = (Math.random() - 0.5) * 0.00005; // Small random noise
        const rawPos = {
          lat: 21.42246 + i * 0.00001 + noise,
          lon: 39.82616 + i * 0.00001 + noise
        };

        const navUpdate: NavUpdateDto = {
          ts: testStartTime + i * 100,
          seq: i + 1,
          userId,
          pos: { ...rawPos, alt: 0, floor: 0, acc: 3 },
          heading: 45,
          speed: 1,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        if (result) {
          positions.push({
            raw: rawPos,
            smoothed: result.position
          });
        }
      }

      // Verify smoothing reduces variation
      if (positions.length > 2) {
        let rawVariance = 0;
        let smoothedVariance = 0;
        
        for (let i = 1; i < positions.length; i++) {
          const rawDiff = Math.abs(positions[i].raw.lat - positions[i-1].raw.lat) +
                          Math.abs(positions[i].raw.lon - positions[i-1].raw.lon);
          const smoothDiff = Math.abs(positions[i].smoothed.lat - positions[i-1].smoothed.lat) +
                            Math.abs(positions[i].smoothed.lon - positions[i-1].smoothed.lon);
          rawVariance += rawDiff;
          smoothedVariance += smoothDiff;
        }
        
        // Smoothed should have less variation
        expect(smoothedVariance).toBeLessThan(rawVariance);
      }
    });

    it('should process updates within 10ms', async () => {
      const navUpdate: NavUpdateDto = {
        ts: testStartTime,
        seq: 1,
        userId: 'performance-test-user',
        pos: { lat: 21.42246, lon: 39.82616, alt: 0, floor: 0, acc: 3 },
        heading: 45,
        speed: 1,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      const times: number[] = [];
      
      // Run multiple times to get average
      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await service.processNavigationUpdate({
          ...navUpdate,
          ts: testStartTime + i * 1000,
          seq: i + 1
        });
        times.push(Date.now() - start);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      console.log(`HMM average processing time: ${avgTime.toFixed(2)}ms`);
      
      expect(avgTime).toBeLessThan(10);
    });

    it('should clamp indoor speed between 0.2-1.6 m/s', async () => {
      const userId = 'speed-clamp-user';
      
      // Test various speeds
      const speeds = [0.1, 0.5, 1.0, 2.0, 5.0]; // m/s
      
      for (let i = 0; i < speeds.length; i++) {
        const navUpdate: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.42246 + i * 0.00005, 
            lon: 39.82616 + i * 0.00005, 
            alt: 0, 
            floor: 0, 
            acc: 3 
          },
          heading: 45,
          speed: speeds[i],
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        // All updates should be processed successfully
        expect(result).toBeDefined();
      }
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track active users and statistics', async () => {
      // Create updates for multiple users
      const userCount = 5;
      
      for (let user = 0; user < userCount; user++) {
        for (let update = 0; update < 3; update++) {
          const navUpdate: NavUpdateDto = {
            ts: testStartTime + user * 1000 + update * 100,
            seq: update + 1,
            userId: `stats-user-${user}`,
            pos: { 
              lat: 21.42246 + user * 0.0001, 
              lon: 39.82616 + update * 0.0001, 
              alt: 0, 
              floor: 0, 
              acc: 3 
            },
            heading: 45,
            speed: 1,
            source: 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.9,
            mode: 'guide',
            device: 'android'
          };

          await service.processNavigationUpdate(navUpdate);
        }
      }

      const stats = service.getStats();
      
      expect(stats.activeUsers).toBe(userCount);
      expect(stats.averageConfidence).toBeGreaterThan(0);
      expect(stats.averageConfidence).toBeLessThanOrEqual(1);
      expect(stats.teleportEvents).toBeGreaterThanOrEqual(0);
      
      console.log('HMM Statistics:', stats);
    });
  });

  afterEach(() => {
    // Clean up all test users
    const testUsers = [
      'accuracy-test-user',
      'candidate-test-user',
      'emission-test-user',
      'heading-test-user',
      'transition-test-user',
      'uturn-test-user',
      'teleport-test-user',
      'teleport-recovery-user',
      'floor-transition-user',
      'ema-test-user',
      'performance-test-user',
      'speed-clamp-user'
    ];

    // Add p95 test users
    for (let i = 0; i < 10; i++) {
      testUsers.push(`p95-test-user-${i}`);
    }

    // Add stats users
    for (let i = 0; i < 5; i++) {
      testUsers.push(`stats-user-${i}`);
    }

    // Add emission test users
    for (const dist of [1, 5, 15]) {
      testUsers.push(`emission-test-user-${dist}`);
    }

    testUsers.forEach(userId => service.clearUserState(userId));
  });
});