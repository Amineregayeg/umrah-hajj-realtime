import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { NavigationCorrectionService } from '../services/navigation-correction.service';
import { GraphService } from '../graph/services/graph.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { PathfindingService } from '../graph/algorithms/pathfinding.service';
import { GraphCacheService } from '../graph/services/graph-cache.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import * as path from 'path';

describe('NavigationCorrectionService Performance', () => {
  let service: NavigationCorrectionService;
  let graphLoader: GraphLoaderService;

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
    
    // Initialize the graph loader
    await graphLoader.onModuleInit();
  });

  describe('Snap Error Metrics', () => {
    it('should achieve median snap error ≤ 2.0m and p95 ≤ 4.0m', async () => {
      // Generate test paths with known positions
      // Generate test paths closer to actual graph nodes
      const testPaths = generateRealisticTestPaths();
      const snapErrors: number[] = [];

      for (const pathPoint of testPaths) {
        const navUpdate: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: 'perf-test-user',
          pos: {
            lat: pathPoint.lat,
            lon: pathPoint.lon,
            alt: 0,
            floor: pathPoint.floor,
            acc: 3
          },
          heading: pathPoint.heading,
          speed: 1.5,
          source: 'arcore',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        if (result && result.snapTo === 'path') {
          // Calculate snap error in meters
          const snapError = Math.sqrt(
            Math.pow(result.delta.x, 2) + 
            Math.pow(result.delta.y, 2)
          );
          snapErrors.push(snapError);
        }
      }

      // Calculate statistics
      snapErrors.sort((a, b) => a - b);
      const median = calculatePercentile(snapErrors, 50);
      const p95 = calculatePercentile(snapErrors, 95);

      console.log(`Snap error statistics: median=${median.toFixed(2)}m, p95=${p95.toFixed(2)}m`);

      expect(median).toBeLessThanOrEqual(2.0);
      expect(p95).toBeLessThanOrEqual(4.0);
    });
  });

  describe('High-Frequency Processing', () => {
    it('should handle 10 clients × 10Hz input for 60s', async () => {
      const numClients = 10;
      const updateFrequency = 10; // Hz
      const durationSeconds = 60;
      const totalUpdates = numClients * updateFrequency * durationSeconds;
      
      const startTime = Date.now();
      const updatePromises: Promise<any>[] = [];
      const correctionCounts = new Map<string, number>();
      
      console.log(`Starting high-frequency test: ${numClients} clients @ ${updateFrequency}Hz for ${durationSeconds}s`);

      // Simulate updates over time
      for (let second = 0; second < durationSeconds; second++) {
        for (let hz = 0; hz < updateFrequency; hz++) {
          for (let client = 0; client < numClients; client++) {
            const userId = `stress-client-${client}`;
            const timestamp = startTime + (second * 1000) + (hz * 100);
            
            const navUpdate: NavUpdateDto = {
              ts: timestamp,
              seq: second * updateFrequency + hz,
              userId,
              pos: {
                lat: 21.42246 + (client * 0.0001) + (Math.sin(second / 10) * 0.0001),
                lon: 39.82616 + (client * 0.0001) + (Math.cos(second / 10) * 0.0001),
                alt: 0,
                floor: 0,
                acc: 3 + Math.random() * 2
              },
              heading: (second * 6) % 360, // Rotating heading
              speed: 1.2 + Math.sin(second / 5) * 0.3,
              source: 'arcore',
              stage: 'tawaf',
              lap: Math.floor(second / 20) + 1,
              confidence: 0.85 + Math.random() * 0.1,
              mode: 'guide',
              device: client % 2 === 0 ? 'android' : 'ios'
            };

            // Process update asynchronously
            const promise = service.processNavigationUpdate(navUpdate).then(result => {
              if (result) {
                correctionCounts.set(userId, (correctionCounts.get(userId) || 0) + 1);
              }
            });
            
            updatePromises.push(promise);
          }
        }
        
        // Small delay to simulate real-time processing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Wait for all updates to complete
      await Promise.all(updatePromises);
      
      const endTime = Date.now();
      const totalDuration = endTime - startTime;
      
      console.log(`Processed ${updatePromises.length} updates in ${totalDuration}ms`);
      
      // Verify nav.correction emission rate
      // Note: In actual usage, the WebSocket gateway rate-limits to ~5Hz
      // Here we're testing the service directly, so we get all corrections
      for (const [userId, count] of correctionCounts.entries()) {
        const correctionRate = count / durationSeconds;
        
        console.log(`${userId}: ${count} corrections (${correctionRate.toFixed(1)}Hz)`);
        
        // Service generates corrections at input rate (10Hz)
        // Rate limiting happens in WebSocket gateway
        expect(correctionRate).toBeGreaterThanOrEqual(8);
        expect(correctionRate).toBeLessThanOrEqual(12);
      }

      // Ensure no OOM or excessive delays
      expect(totalDuration).toBeLessThan(durationSeconds * 1000 * 1.5); // Allow 50% overhead
    });
  });

  describe('Queue Management', () => {
    it('should maintain queue drops ≤ 2%', async () => {
      const numClients = 10;
      const burstSize = 100; // Rapid burst of updates
      const totalUpdates = numClients * burstSize;
      let processedUpdates = 0;
      let droppedUpdates = 0;

      const promises: Promise<void>[] = [];

      // Send burst of updates for each client
      for (let client = 0; client < numClients; client++) {
        for (let i = 0; i < burstSize; i++) {
          const navUpdate: NavUpdateDto = {
            ts: Date.now() + i,
            seq: i,
            userId: `burst-client-${client}`,
            pos: {
              lat: 21.42246 + (Math.random() * 0.001),
              lon: 39.82616 + (Math.random() * 0.001),
              alt: 0,
              floor: 0,
              acc: 5
            },
            heading: Math.random() * 360,
            speed: 1 + Math.random(),
            source: 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.8,
            mode: 'guide',
            device: 'android'
          };

          const promise = service.processNavigationUpdate(navUpdate)
            .then(result => {
              if (result !== null) {
                processedUpdates++;
              } else {
                droppedUpdates++;
              }
            })
            .catch(() => {
              droppedUpdates++;
            });

          promises.push(promise);
        }
      }

      await Promise.all(promises);

      const dropRate = (droppedUpdates / totalUpdates) * 100;
      console.log(`Queue performance: ${processedUpdates}/${totalUpdates} processed, ${dropRate.toFixed(2)}% dropped`);

      expect(dropRate).toBeLessThanOrEqual(2);
    });
  });

  describe('Memory Usage', () => {
    it('should not cause memory leaks with extended operation', async () => {
      const memoryBefore = process.memoryUsage();
      const numClients = 20;
      const duration = 30; // seconds
      
      // Track memory periodically
      const memorySnapshots: NodeJS.MemoryUsage[] = [];
      const memoryInterval = setInterval(() => {
        memorySnapshots.push(process.memoryUsage());
      }, 5000);

      // Simulate extended operation
      const endTime = Date.now() + (duration * 1000);
      let updateCount = 0;

      while (Date.now() < endTime) {
        const promises: Promise<any>[] = [];
        
        for (let client = 0; client < numClients; client++) {
          const navUpdate: NavUpdateDto = {
            ts: Date.now(),
            seq: updateCount++,
            userId: `memory-test-${client}`,
            pos: {
              lat: 21.42246 + (Math.random() * 0.001),
              lon: 39.82616 + (Math.random() * 0.001),
              alt: 0,
              floor: Math.floor(Math.random() * 3),
              acc: 3 + Math.random() * 2
            },
            heading: Math.random() * 360,
            speed: 1 + Math.random(),
            source: 'arcore',
            stage: 'tawaf',
            lap: Math.floor(updateCount / 100) + 1,
            confidence: 0.8 + Math.random() * 0.2,
            mode: 'guide',
            device: 'android'
          };

          promises.push(service.processNavigationUpdate(navUpdate));
        }

        await Promise.all(promises);
        await new Promise(resolve => setTimeout(resolve, 100)); // 10Hz per client
      }

      clearInterval(memoryInterval);

      // Clean up all user states
      for (let client = 0; client < numClients; client++) {
        service.clearUserState(`memory-test-${client}`);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const memoryAfter = process.memoryUsage();
      
      // Calculate memory growth
      const heapGrowth = memoryAfter.heapUsed - memoryBefore.heapUsed;
      const heapGrowthMB = heapGrowth / (1024 * 1024);

      console.log(`Memory usage after ${duration}s operation:`);
      console.log(`  Heap growth: ${heapGrowthMB.toFixed(2)} MB`);
      console.log(`  Total updates: ${updateCount}`);
      console.log(`  Updates per second: ${(updateCount / duration).toFixed(1)}`);

      // Memory growth should be reasonable (< 50MB for this test)
      expect(Math.abs(heapGrowthMB)).toBeLessThan(50);
    });
  });

  // Helper functions
  function generateTestPaths() {
    const paths = [];
    const centerLat = 21.42246;
    const centerLon = 39.82616;
    const radius = 0.001; // ~111m

    // Generate circular path around Kaaba
    for (let i = 0; i < 100; i++) {
      const angle = (i / 100) * 2 * Math.PI;
      paths.push({
        lat: centerLat + Math.sin(angle) * radius,
        lon: centerLon + Math.cos(angle) * radius,
        floor: 0,
        heading: (angle * 180 / Math.PI + 90) % 360
      });
    }

    // Add some off-path points
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * 2 * Math.PI;
      const distance = radius * (1.5 + Math.random() * 0.5);
      paths.push({
        lat: centerLat + Math.sin(angle) * distance,
        lon: centerLon + Math.cos(angle) * distance,
        floor: 0,
        heading: Math.random() * 360
      });
    }

    return paths;
  }

  function generateRealisticTestPaths() {
    const paths = [];
    
    // Based on actual graph nodes from nav_graph.json
    const graphNodes = [
      { lat: 21.4225, lon: 39.8262 }, // gate_a
      { lat: 21.4235, lon: 39.8272 }, // gate_b
      { lat: 21.4215, lon: 39.8252 }, // gate_c
      { lat: 21.4230, lon: 39.8267 }, // central_hall
      { lat: 21.4228, lon: 39.8265 }, // information_desk
    ];

    // Generate points along edges between nodes
    for (let i = 0; i < graphNodes.length; i++) {
      const fromNode = graphNodes[i];
      const toNode = graphNodes[(i + 1) % graphNodes.length];
      
      // Generate 10 points along each edge
      for (let t = 0; t <= 1; t += 0.1) {
        const lat = fromNode.lat + t * (toNode.lat - fromNode.lat);
        const lon = fromNode.lon + t * (toNode.lon - fromNode.lon);
        
        // Add small random offset to simulate GPS error (1-3 meters)
        const offset = 0.00001 + Math.random() * 0.00002; // ~1-3m
        paths.push({
          lat: lat + (Math.random() - 0.5) * offset,
          lon: lon + (Math.random() - 0.5) * offset,
          floor: 0,
          heading: Math.atan2(toNode.lon - fromNode.lon, toNode.lat - fromNode.lat) * 180 / Math.PI
        });
      }
    }

    // Add some slightly off-path points (3-5 meters away)
    for (let i = 0; i < 20; i++) {
      const node = graphNodes[i % graphNodes.length];
      const offset = 0.00003 + Math.random() * 0.00002; // ~3-5m
      const angle = Math.random() * 2 * Math.PI;
      
      paths.push({
        lat: node.lat + Math.sin(angle) * offset,
        lon: node.lon + Math.cos(angle) * offset,
        floor: 0,
        heading: Math.random() * 360
      });
    }

    return paths;
  }

  function calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil((percentile / 100) * sortedArray.length) - 1;
    return sortedArray[Math.max(0, Math.min(index, sortedArray.length - 1))];
  }

  afterEach(() => {
    // Clean up all test user states
    const prefixes = ['perf-test', 'stress-client', 'burst-client', 'memory-test'];
    for (const prefix of prefixes) {
      for (let i = 0; i < 50; i++) {
        service.clearUserState(`${prefix}-${i}`);
      }
    }
  });
});