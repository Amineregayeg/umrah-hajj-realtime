import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { HMMTrackingService } from '../services/hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import { fastDistance } from '../utils/spatial-helpers';
import * as path from 'path';
import * as fs from 'fs';

interface AccuracyResult {
  userId: string;
  errors: number[];
  medianError: number;
  p95Error: number;
  maxError: number;
  averageConfidence: number;
  processingTimes: number[];
  averageProcessingTime: number;
}

interface GroundTruthPath {
  lat: number;
  lon: number;
  floor: number;
  heading: number;
  speed: number;
  timestamp: number;
}

describe('HMM Tracking Accuracy Analysis', () => {
  let service: HMMTrackingService;
  let graphLoader: GraphLoaderService;
  let testStartTime: number;

  beforeAll(async () => {
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

  describe('Accuracy Benchmarks', () => {
    it('should achieve accuracy targets across multiple scenarios', async () => {
      const scenarios = [
        {
          name: 'Linear Path - Low Noise',
          groundTruth: generateLinearPath(21.42246, 39.82616, 0.00005, 20),
          noiseLevel: 2.0, // 2m standard deviation
          expectedMedian: 1.5,
          expectedP95: 3.0
        },
        {
          name: 'Linear Path - Medium Noise',
          groundTruth: generateLinearPath(21.42250, 39.82620, 0.00005, 20),
          noiseLevel: 4.0, // 4m standard deviation
          expectedMedian: 2.0,
          expectedP95: 4.0
        },
        {
          name: 'Curved Path - Low Noise',
          groundTruth: generateCurvedPath(21.42246, 39.82616, 0.0001, 25),
          noiseLevel: 2.0,
          expectedMedian: 2.0,
          expectedP95: 4.0
        },
        {
          name: 'Stop-and-Go Pattern',
          groundTruth: generateStopGoPath(21.42240, 39.82610, 30),
          noiseLevel: 3.0,
          expectedMedian: 2.0,
          expectedP95: 4.5
        },
        {
          name: 'High Frequency Updates',
          groundTruth: generateHighFrequencyPath(21.42250, 39.82615, 50),
          noiseLevel: 3.0,
          expectedMedian: 1.8,
          expectedP95: 3.5
        }
      ];

      const results: AccuracyResult[] = [];
      const detailedResults: any[] = [];

      for (let i = 0; i < scenarios.length; i++) {
        const scenario = scenarios[i];
        console.log(`\nTesting scenario: ${scenario.name}`);
        
        const result = await testScenario(
          scenario.name,
          scenario.groundTruth,
          scenario.noiseLevel,
          i
        );

        results.push(result);
        detailedResults.push({
          scenario: scenario.name,
          ...result,
          targetMedian: scenario.expectedMedian,
          targetP95: scenario.expectedP95
        });

        console.log(`  Median error: ${result.medianError.toFixed(2)}m (target: ≤${scenario.expectedMedian}m)`);
        console.log(`  P95 error: ${result.p95Error.toFixed(2)}m (target: ≤${scenario.expectedP95}m)`);
        console.log(`  Avg confidence: ${result.averageConfidence.toFixed(3)}`);
        console.log(`  Avg processing: ${result.averageProcessingTime.toFixed(2)}ms`);

        // Verify accuracy targets
        expect(result.medianError).toBeLessThanOrEqual(scenario.expectedMedian);
        expect(result.p95Error).toBeLessThanOrEqual(scenario.expectedP95);
        expect(result.averageProcessingTime).toBeLessThan(10); // 10ms target
      }

      // Generate comprehensive report
      await generateAccuracyReport(detailedResults);

      // Overall statistics
      const overallMedian = calculateOverallMedian(results);
      const overallP95 = calculateOverallP95(results);
      
      console.log('\n=== OVERALL RESULTS ===');
      console.log(`Overall median error: ${overallMedian.toFixed(2)}m`);
      console.log(`Overall P95 error: ${overallP95.toFixed(2)}m`);
      
      // Primary accuracy requirements
      expect(overallMedian).toBeLessThanOrEqual(2.0); // Primary requirement
      expect(overallP95).toBeLessThanOrEqual(4.0); // Primary requirement
    });

    it('should handle outliers and maintain stability', async () => {
      const groundTruth = generateLinearPath(21.42246, 39.82616, 0.00005, 30);
      const outlierIndices = [5, 12, 20, 25]; // Inject outliers at these positions
      const errors: number[] = [];
      const confidences: number[] = [];
      const userId = 'outlier-test-user';

      for (let i = 0; i < groundTruth.length; i++) {
        const truth = groundTruth[i];
        let noiseLat = 0, noiseLon = 0;

        if (outlierIndices.includes(i)) {
          // Inject large outlier (20m error)
          noiseLat = (Math.random() - 0.5) * 40 / 110540; // ±20m
          noiseLon = (Math.random() - 0.5) * 40 / (Math.cos(truth.lat * Math.PI / 180) * 111320);
        } else {
          // Normal noise (3m std dev)
          noiseLat = (Math.random() - 0.5) * 6 / 110540;
          noiseLon = (Math.random() - 0.5) * 6 / (Math.cos(truth.lat * Math.PI / 180) * 111320);
        }

        const navUpdate: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: {
            lat: truth.lat + noiseLat,
            lon: truth.lon + noiseLon,
            alt: 0,
            floor: truth.floor,
            acc: outlierIndices.includes(i) ? 15 : 3
          },
          heading: truth.heading + (Math.random() - 0.5) * 30,
          speed: truth.speed + (Math.random() - 0.5) * 0.3,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: outlierIndices.includes(i) ? 0.5 : 0.9,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        if (result) {
          const error = fastDistance(
            { lat: result.position.lat, lon: result.position.lon },
            { lat: truth.lat, lon: truth.lon }
          );
          errors.push(error);
          confidences.push(result.confidence);
        }
      }

      // Calculate statistics
      errors.sort((a, b) => a - b);
      const medianError = errors[Math.floor(errors.length / 2)];
      const p95Error = errors[Math.floor(errors.length * 0.95)];
      const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;

      console.log(`\nOutlier handling test:`);
      console.log(`  Median error: ${medianError.toFixed(2)}m`);
      console.log(`  P95 error: ${p95Error.toFixed(2)}m`);
      console.log(`  Avg confidence: ${avgConfidence.toFixed(3)}`);

      // HMM should maintain reasonable accuracy despite outliers
      expect(medianError).toBeLessThan(3.0);
      expect(p95Error).toBeLessThan(6.0);
      expect(avgConfidence).toBeGreaterThan(0.6);
    });

    it('should demonstrate convergence properties', async () => {
      // Test that HMM converges to better accuracy over time
      const groundTruth = generateLinearPath(21.42246, 39.82616, 0.00005, 50);
      const userId = 'convergence-test-user';
      const errors: number[] = [];
      const confidences: number[] = [];

      for (let i = 0; i < groundTruth.length; i++) {
        const truth = groundTruth[i];
        
        // Add consistent noise
        const noiseLat = (Math.random() - 0.5) * 8 / 110540; // ±4m
        const noiseLon = (Math.random() - 0.5) * 8 / (Math.cos(truth.lat * Math.PI / 180) * 111320);

        const navUpdate: NavUpdateDto = {
          ts: testStartTime + i * 1000,
          seq: i + 1,
          userId,
          pos: {
            lat: truth.lat + noiseLat,
            lon: truth.lon + noiseLon,
            alt: 0,
            floor: truth.floor,
            acc: 4,
          },
          heading: truth.heading + (Math.random() - 0.5) * 40,
          speed: truth.speed,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await service.processNavigationUpdate(navUpdate);
        
        if (result) {
          const error = fastDistance(
            { lat: result.position.lat, lon: result.position.lon },
            { lat: truth.lat, lon: truth.lon }
          );
          errors.push(error);
          confidences.push(result.confidence);
        }
      }

      // Check convergence: later errors should be generally lower
      const earlyErrors = errors.slice(0, 10);
      const lateErrors = errors.slice(-10);
      
      const earlyMedian = earlyErrors.sort((a, b) => a - b)[Math.floor(earlyErrors.length / 2)];
      const lateMedian = lateErrors.sort((a, b) => a - b)[Math.floor(lateErrors.length / 2)];
      
      const earlyConfidence = earlyErrors.slice(0, 10).reduce((a, b, i) => a + confidences[i], 0) / 10;
      const lateConfidence = confidences.slice(-10).reduce((a, b) => a + b, 0) / 10;

      console.log(`\nConvergence test:`);
      console.log(`  Early median error: ${earlyMedian.toFixed(2)}m`);
      console.log(`  Late median error: ${lateMedian.toFixed(2)}m`);
      console.log(`  Early confidence: ${earlyConfidence.toFixed(3)}`);
      console.log(`  Late confidence: ${lateConfidence.toFixed(3)}`);

      // HMM should converge to better performance
      expect(lateMedian).toBeLessThanOrEqual(earlyMedian * 1.2); // Allow 20% tolerance
      expect(lateConfidence).toBeGreaterThanOrEqual(earlyConfidence * 0.9);
    });
  });

  // Helper function to test a scenario
  async function testScenario(
    scenarioName: string,
    groundTruth: GroundTruthPath[],
    noiseStdDev: number,
    scenarioIndex: number
  ): Promise<AccuracyResult> {
    const userId = `accuracy-user-${scenarioIndex}`;
    const errors: number[] = [];
    const confidences: number[] = [];
    const processingTimes: number[] = [];

    for (let i = 0; i < groundTruth.length; i++) {
      const truth = groundTruth[i];
      
      // Add Gaussian noise
      const noiseLat = gaussianNoise(0, noiseStdDev) / 110540;
      const noiseLon = gaussianNoise(0, noiseStdDev) / (Math.cos(truth.lat * Math.PI / 180) * 111320);

      const navUpdate: NavUpdateDto = {
        ts: truth.timestamp,
        seq: i + 1,
        userId,
        pos: {
          lat: truth.lat + noiseLat,
          lon: truth.lon + noiseLon,
          alt: 0,
          floor: truth.floor,
          acc: noiseStdDev,
        },
        heading: truth.heading + gaussianNoise(0, 25), // 25° heading noise
        speed: Math.max(0.1, truth.speed + gaussianNoise(0, 0.2)),
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8 + Math.random() * 0.15,
        mode: 'guide',
        device: 'android'
      };

      const startTime = Date.now();
      const result = await service.processNavigationUpdate(navUpdate);
      const processingTime = Date.now() - startTime;
      
      processingTimes.push(processingTime);

      if (result) {
        const error = fastDistance(
          { lat: result.position.lat, lon: result.position.lon },
          { lat: truth.lat, lon: truth.lon }
        );
        errors.push(error);
        confidences.push(result.confidence);
      }
    }

    // Calculate statistics
    errors.sort((a, b) => a - b);
    const medianError = errors[Math.floor(errors.length / 2)];
    const p95Error = errors[Math.floor(errors.length * 0.95)];
    const maxError = Math.max(...errors);
    const averageConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    const averageProcessingTime = processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length;

    return {
      userId,
      errors,
      medianError,
      p95Error,
      maxError,
      averageConfidence,
      processingTimes,
      averageProcessingTime
    };
  }

  // Generate various test paths
  function generateLinearPath(startLat: number, startLon: number, step: number, length: number): GroundTruthPath[] {
    const path: GroundTruthPath[] = [];
    for (let i = 0; i < length; i++) {
      path.push({
        lat: startLat + i * step,
        lon: startLon + i * step,
        floor: 0,
        heading: 45, // Northeast
        speed: 1.2,
        timestamp: testStartTime + i * 1000
      });
    }
    return path;
  }

  function generateCurvedPath(startLat: number, startLon: number, radius: number, length: number): GroundTruthPath[] {
    const path: GroundTruthPath[] = [];
    for (let i = 0; i < length; i++) {
      const angle = (i / length) * Math.PI; // Half circle
      const lat = startLat + radius * Math.sin(angle);
      const lon = startLon + radius * Math.cos(angle);
      const heading = (angle * 180 / Math.PI + 90) % 360;
      
      path.push({
        lat,
        lon,
        floor: 0,
        heading,
        speed: 1.0,
        timestamp: testStartTime + i * 1000
      });
    }
    return path;
  }

  function generateStopGoPath(startLat: number, startLon: number, length: number): GroundTruthPath[] {
    const path: GroundTruthPath[] = [];
    let lat = startLat;
    let lon = startLon;
    
    for (let i = 0; i < length; i++) {
      // Stop-and-go pattern: move for 3 steps, stop for 2 steps
      const speed = (i % 5 < 3) ? 1.5 : 0.1;
      const step = speed > 1 ? 0.00003 : 0;
      
      lat += step;
      lon += step;
      
      path.push({
        lat,
        lon,
        floor: 0,
        heading: 45,
        speed,
        timestamp: testStartTime + i * 1000
      });
    }
    return path;
  }

  function generateHighFrequencyPath(startLat: number, startLon: number, length: number): GroundTruthPath[] {
    const path: GroundTruthPath[] = [];
    for (let i = 0; i < length; i++) {
      path.push({
        lat: startLat + i * 0.00002,
        lon: startLon + i * 0.00002,
        floor: 0,
        heading: 45,
        speed: 1.0,
        timestamp: testStartTime + i * 200 // 5Hz updates
      });
    }
    return path;
  }

  // Gaussian noise generator
  function gaussianNoise(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  function calculateOverallMedian(results: AccuracyResult[]): number {
    const allErrors = results.flatMap(r => r.errors);
    allErrors.sort((a, b) => a - b);
    return allErrors[Math.floor(allErrors.length / 2)];
  }

  function calculateOverallP95(results: AccuracyResult[]): number {
    const allErrors = results.flatMap(r => r.errors);
    allErrors.sort((a, b) => a - b);
    return allErrors[Math.floor(allErrors.length * 0.95)];
  }

  async function generateAccuracyReport(results: any[]): Promise<void> {
    const reportPath = path.join(__dirname, '../../../test-artifacts/hmm-accuracy-report.json');
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScenarios: results.length,
        overallMedian: calculateOverallMedian(results),
        overallP95: calculateOverallP95(results),
        requirementsMet: {
          medianUnder2m: calculateOverallMedian(results) <= 2.0,
          p95Under4m: calculateOverallP95(results) <= 4.0
        }
      },
      scenarios: results,
      hmmParameters: {
        K_CANDIDATES: 5,
        R_SEARCH_RADIUS: 20,
        SIGMA_DISTANCE: 3.0,
        SIGMA_HEADING: 25.0,
        TELEPORT_THRESHOLD: 12,
        EMA_ALPHA: 0.45
      }
    };

    try {
      await fs.promises.writeFile(reportPath, JSON.stringify(report, null, 2));
      console.log(`\nAccuracy report saved to: ${reportPath}`);
    } catch (error) {
      console.log(`Could not save report: ${error.message}`);
    }
  }

  afterAll(() => {
    // Clean up all test users
    const userIds = Array.from({ length: 10 }, (_, i) => `accuracy-user-${i}`);
    userIds.push('outlier-test-user', 'convergence-test-user');
    
    userIds.forEach(userId => {
      try {
        service.clearUserState(userId);
      } catch (error) {
        // Ignore cleanup errors
      }
    });
  });
});