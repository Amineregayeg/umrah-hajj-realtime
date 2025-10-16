/**
 * HMM Accuracy Validation Script
 * Validates the HMM implementation against accuracy targets using real graph data
 */

import { HMMTrackingService } from '../services/hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavUpdateDto } from '../dto/nav-update.dto';
import { fastDistance } from '../utils/spatial-helpers';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationConfig {
  graphPath: string;
  outputPath: string;
  scenarios: AccuracyScenario[];
}

interface AccuracyScenario {
  name: string;
  description: string;
  groundTruthPath: GroundTruthPoint[];
  noiseProfile: NoiseProfile;
  expectedMedian: number;
  expectedP95: number;
}

interface GroundTruthPoint {
  lat: number;
  lon: number;
  floor: number;
  heading: number;
  speed: number;
  timestamp: number;
}

interface NoiseProfile {
  positionStdDev: number; // meters
  headingStdDev: number;  // degrees
  speedStdDev: number;    // m/s
  accuracyRange: [number, number]; // GPS accuracy range
}

interface ValidationResult {
  scenario: string;
  totalPoints: number;
  successfulMatches: number;
  errors: number[];
  confidences: number[];
  processingTimes: number[];
  medianError: number;
  p95Error: number;
  averageConfidence: number;
  averageProcessingTime: number;
  passesTargets: boolean;
}

class HMMAccuracyValidator {
  private hmmService: HMMTrackingService;
  private graphLoader: GraphLoaderService;

  constructor(graphPath?: string) {
    // Create graph loader service
    this.graphLoader = new GraphLoaderService();
    
    // Mock the config service for graph loader
    (this.graphLoader as any).configService = {
      get: (key: string) => {
        if (key === 'GRAPH_PATH') {
          return graphPath || path.join(__dirname, '../../../data/nav_graph.json');
        }
        return undefined;
      }
    };

    this.hmmService = new HMMTrackingService(this.graphLoader);
  }

  async initialize(): Promise<void> {
    await this.graphLoader.onModuleInit();
    console.log('HMM Accuracy Validator initialized');
  }

  async runValidation(config: ValidationConfig): Promise<ValidationResult[]> {
    console.log('=== HMM Accuracy Validation ===\n');
    
    const results: ValidationResult[] = [];

    for (let i = 0; i < config.scenarios.length; i++) {
      const scenario = config.scenarios[i];
      console.log(`Running scenario ${i + 1}/${config.scenarios.length}: ${scenario.name}`);
      console.log(`Description: ${scenario.description}`);
      
      const result = await this.validateScenario(scenario, `validation-user-${i}`);
      results.push(result);
      
      console.log(`  ✓ Processed ${result.totalPoints} points`);
      console.log(`  ✓ Successful matches: ${result.successfulMatches}/${result.totalPoints} (${(result.successfulMatches/result.totalPoints*100).toFixed(1)}%)`);
      console.log(`  ✓ Median error: ${result.medianError.toFixed(2)}m (target: ≤${scenario.expectedMedian}m)`);
      console.log(`  ✓ P95 error: ${result.p95Error.toFixed(2)}m (target: ≤${scenario.expectedP95}m)`);
      console.log(`  ✓ Average confidence: ${result.averageConfidence.toFixed(3)}`);
      console.log(`  ✓ Average processing time: ${result.averageProcessingTime.toFixed(2)}ms`);
      console.log(`  ✓ Passes targets: ${result.passesTargets ? 'YES' : 'NO'}\n`);
    }

    // Generate comprehensive report
    await this.generateReport(results, config.outputPath);
    
    return results;
  }

  private async validateScenario(scenario: AccuracyScenario, userId: string): Promise<ValidationResult> {
    const errors: number[] = [];
    const confidences: number[] = [];
    const processingTimes: number[] = [];
    let successfulMatches = 0;

    // Clear any existing state for this user
    this.hmmService.clearUserState(userId);

    for (let i = 0; i < scenario.groundTruthPath.length; i++) {
      const truth = scenario.groundTruthPath[i];
      
      // Apply noise based on profile
      const noisyPosition = this.addNoise(truth, scenario.noiseProfile);
      
      const navUpdate: NavUpdateDto = {
        ts: truth.timestamp,
        seq: i + 1,
        userId,
        pos: {
          lat: noisyPosition.lat,
          lon: noisyPosition.lon,
          alt: 0,
          floor: truth.floor,
          acc: scenario.noiseProfile.accuracyRange[0] + 
               Math.random() * (scenario.noiseProfile.accuracyRange[1] - scenario.noiseProfile.accuracyRange[0])
        },
        heading: noisyPosition.heading,
        speed: noisyPosition.speed,
        source: 'gnss',
        stage: 'validation',
        lap: 1,
        confidence: 0.8 + Math.random() * 0.15,
        mode: 'guide',
        device: 'android'
      };

      const startTime = Date.now();
      
      try {
        const result = await this.hmmService.processNavigationUpdate(navUpdate);
        const processingTime = Date.now() - startTime;
        processingTimes.push(processingTime);

        if (result) {
          successfulMatches++;
          confidences.push(result.confidence);
          
          // Calculate error against ground truth
          const error = fastDistance(
            { lat: result.position.lat, lon: result.position.lon },
            { lat: truth.lat, lon: truth.lon }
          );
          errors.push(error);
        }
      } catch (error) {
        console.warn(`Error processing update ${i + 1}: ${error.message}`);
        processingTimes.push(Date.now() - startTime);
      }
    }

    // Calculate statistics
    errors.sort((a, b) => a - b);
    const medianError = errors.length > 0 ? errors[Math.floor(errors.length / 2)] : Infinity;
    const p95Error = errors.length > 0 ? errors[Math.floor(errors.length * 0.95)] : Infinity;
    const averageConfidence = confidences.length > 0 ? 
      confidences.reduce((a, b) => a + b, 0) / confidences.length : 0;
    const averageProcessingTime = processingTimes.length > 0 ?
      processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length : 0;

    const passesTargets = medianError <= scenario.expectedMedian && 
                         p95Error <= scenario.expectedP95 &&
                         averageProcessingTime <= 10; // 10ms processing target

    return {
      scenario: scenario.name,
      totalPoints: scenario.groundTruthPath.length,
      successfulMatches,
      errors,
      confidences,
      processingTimes,
      medianError,
      p95Error,
      averageConfidence,
      averageProcessingTime,
      passesTargets
    };
  }

  private addNoise(truth: GroundTruthPoint, noise: NoiseProfile): GroundTruthPoint {
    // Add Gaussian noise to position
    const noiseLat = this.gaussianNoise(0, noise.positionStdDev) / 110540; // Convert to degrees
    const noiseLon = this.gaussianNoise(0, noise.positionStdDev) / 
                     (Math.cos(truth.lat * Math.PI / 180) * 111320);
    
    // Add noise to heading and speed
    const noiseHeading = this.gaussianNoise(0, noise.headingStdDev);
    const noiseSpeed = this.gaussianNoise(0, noise.speedStdDev);

    return {
      lat: truth.lat + noiseLat,
      lon: truth.lon + noiseLon,
      floor: truth.floor,
      heading: this.normalizeAngle(truth.heading + noiseHeading),
      speed: Math.max(0.1, truth.speed + noiseSpeed),
      timestamp: truth.timestamp
    };
  }

  private gaussianNoise(mean: number, stdDev: number): number {
    // Box-Muller transform
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    return mean + stdDev * z0;
  }

  private normalizeAngle(angle: number): number {
    while (angle < 0) angle += 360;
    while (angle >= 360) angle -= 360;
    return angle;
  }

  private async generateReport(results: ValidationResult[], outputPath: string): Promise<void> {
    // Calculate overall statistics
    const allErrors = results.flatMap(r => r.errors);
    allErrors.sort((a, b) => a - b);
    
    const overallMedian = allErrors.length > 0 ? allErrors[Math.floor(allErrors.length / 2)] : 0;
    const overallP95 = allErrors.length > 0 ? allErrors[Math.floor(allErrors.length * 0.95)] : 0;
    
    const totalProcessingTimes = results.flatMap(r => r.processingTimes);
    const overallProcessingTime = totalProcessingTimes.length > 0 ?
      totalProcessingTimes.reduce((a, b) => a + b, 0) / totalProcessingTimes.length : 0;

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalScenarios: results.length,
        scenariosPassed: results.filter(r => r.passesTargets).length,
        overallMedianError: overallMedian,
        overallP95Error: overallP95,
        overallProcessingTime,
        primaryTargetsMet: {
          medianUnder2m: overallMedian <= 2.0,
          p95Under4m: overallP95 <= 4.0,
          processingUnder10ms: overallProcessingTime <= 10.0
        }
      },
      hmmParameters: {
        K_CANDIDATES: 5,
        R_SEARCH_RADIUS: 20,
        SIGMA_DISTANCE: 3.0,
        SIGMA_HEADING: 25.0,
        TELEPORT_THRESHOLD: 12,
        TELEPORT_CONSECUTIVE: 3,
        EMA_ALPHA: 0.45
      },
      scenarios: results.map(r => ({
        name: r.scenario,
        success: r.passesTargets,
        stats: {
          medianError: r.medianError,
          p95Error: r.p95Error,
          averageConfidence: r.averageConfidence,
          averageProcessingTime: r.averageProcessingTime,
          successRate: r.successfulMatches / r.totalPoints
        }
      }))
    };

    try {
      const reportDir = path.dirname(outputPath);
      if (!fs.existsSync(reportDir)) {
        fs.mkdirSync(reportDir, { recursive: true });
      }
      
      await fs.promises.writeFile(outputPath, JSON.stringify(report, null, 2));
      console.log(`\nValidation report saved to: ${outputPath}`);
      
      // Print summary
      console.log('\n=== VALIDATION SUMMARY ===');
      console.log(`Overall Median Error: ${overallMedian.toFixed(2)}m (Target: ≤2.0m) - ${overallMedian <= 2.0 ? 'PASS' : 'FAIL'}`);
      console.log(`Overall P95 Error: ${overallP95.toFixed(2)}m (Target: ≤4.0m) - ${overallP95 <= 4.0 ? 'PASS' : 'FAIL'}`);
      console.log(`Overall Processing Time: ${overallProcessingTime.toFixed(2)}ms (Target: ≤10ms) - ${overallProcessingTime <= 10 ? 'PASS' : 'FAIL'}`);
      console.log(`Scenarios Passed: ${results.filter(r => r.passesTargets).length}/${results.length}`);
      
    } catch (error) {
      console.error(`Could not save report: ${error.message}`);
    }
  }
}

// Default validation configuration
const defaultConfig: ValidationConfig = {
  graphPath: path.join(__dirname, '../../../data/nav_graph.json'),
  outputPath: path.join(__dirname, '../../../test-artifacts/hmm-validation-report.json'),
  scenarios: [
    {
      name: 'Indoor Linear Path - Low Noise',
      description: 'Straight line movement with minimal GPS noise',
      groundTruthPath: generateLinearPath(21.42246, 39.82616, 20, 1000),
      noiseProfile: {
        positionStdDev: 2.0,
        headingStdDev: 15.0,
        speedStdDev: 0.2,
        accuracyRange: [2, 4]
      },
      expectedMedian: 1.5,
      expectedP95: 3.0
    },
    {
      name: 'Indoor Linear Path - Medium Noise',
      description: 'Straight line movement with typical GPS noise',
      groundTruthPath: generateLinearPath(21.42250, 39.82620, 25, 1000),
      noiseProfile: {
        positionStdDev: 3.5,
        headingStdDev: 25.0,
        speedStdDev: 0.3,
        accuracyRange: [3, 6]
      },
      expectedMedian: 2.0,
      expectedP95: 4.0
    },
    {
      name: 'Stop-and-Go Pattern',
      description: 'Intermittent movement with pauses',
      groundTruthPath: generateStopGoPath(21.42240, 39.82610, 30, 1000),
      noiseProfile: {
        positionStdDev: 3.0,
        headingStdDev: 30.0,
        speedStdDev: 0.4,
        accuracyRange: [3, 7]
      },
      expectedMedian: 2.0,
      expectedP95: 4.5
    }
  ]
};

// Helper functions to generate test paths
function generateLinearPath(startLat: number, startLon: number, length: number, interval: number): GroundTruthPoint[] {
  const path: GroundTruthPoint[] = [];
  const startTime = Date.now();
  
  for (let i = 0; i < length; i++) {
    path.push({
      lat: startLat + i * 0.000015, // ~1.5m steps
      lon: startLon + i * 0.000015,
      floor: 0,
      heading: 45, // Northeast
      speed: 1.2,
      timestamp: startTime + i * interval
    });
  }
  
  return path;
}

function generateStopGoPath(startLat: number, startLon: number, length: number, interval: number): GroundTruthPoint[] {
  const path: GroundTruthPoint[] = [];
  const startTime = Date.now();
  let lat = startLat;
  let lon = startLon;
  
  for (let i = 0; i < length; i++) {
    // Stop-and-go pattern: move for 3 steps, stop for 2 steps
    const isMoving = (i % 5) < 3;
    const speed = isMoving ? 1.5 : 0.1;
    const step = isMoving ? 0.000020 : 0.000002; // 2m or 0.2m steps
    
    lat += step;
    lon += step;
    
    path.push({
      lat,
      lon,
      floor: 0,
      heading: 45,
      speed,
      timestamp: startTime + i * interval
    });
  }
  
  return path;
}

// Export for use in other modules
export { HMMAccuracyValidator, ValidationConfig, ValidationResult };

// Run validation if this file is executed directly
if (require.main === module) {
  async function runValidation() {
    try {
      const validator = new HMMAccuracyValidator();
      await validator.initialize();
      await validator.runValidation(defaultConfig);
      console.log('\nValidation completed successfully!');
    } catch (error) {
      console.error('Validation failed:', error.message);
      console.error(error.stack);
    }
  }
  
  runValidation();
}