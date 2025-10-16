/**
 * Simple demonstration of HMM tracking system
 * This script validates the implementation without requiring full Jest setup
 */

import { HMMTrackingService } from '../services/hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { NavUpdateDto } from '../dto/nav-update.dto';

interface TestResult {
  scenario: string;
  processed: number;
  succeeded: number;
  averageError: number;
  averageConfidence: number;
  averageProcessingTime: number;
}

class HMMDemo {
  private hmmService: HMMTrackingService;
  private graphLoader: GraphLoaderService;

  constructor() {
    // Mock graph loader for demo
    this.graphLoader = {
      getGraph: () => ({
        floors: [{ id: 'ground', name: 'Ground Floor' }],
        nodes: [
          { id: 'node1', floor: 'ground', lat: 21.42246, lon: 39.82616, kind: 'poi' },
          { id: 'node2', floor: 'ground', lat: 21.42250, lon: 39.82620, kind: 'poi' },
          { id: 'node3', floor: 'ground', lat: 21.42254, lon: 39.82624, kind: 'poi' },
          { id: 'node4', floor: 'ground', lat: 21.42258, lon: 39.82628, kind: 'poi' }
        ],
        edges: [
          { from: 'node1', to: 'node2', weight: 1, kind: 'corridor' },
          { from: 'node2', to: 'node3', weight: 1, kind: 'corridor' },
          { from: 'node3', to: 'node4', weight: 1, kind: 'corridor' }
        ],
        connectors: [],
        zones: []
      })
    } as any;

    this.hmmService = new HMMTrackingService(this.graphLoader);
  }

  async runDemo(): Promise<void> {
    console.log('=== HMM Tracking System Demonstration ===\n');

    const results: TestResult[] = [];

    // Test 1: Linear path tracking
    results.push(await this.testLinearPath());

    // Test 2: Noisy GPS scenario
    results.push(await this.testNoisyGPS());

    // Test 3: Performance test
    results.push(await this.testPerformance());

    // Print summary
    this.printSummary(results);
  }

  private async testLinearPath(): Promise<TestResult> {
    console.log('Test 1: Linear Path Tracking');
    console.log('----------------------------');

    const userId = 'demo-user-1';
    let processed = 0;
    let succeeded = 0;
    let totalError = 0;
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    // Generate straight-line path
    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      const groundTruth = {
        lat: 21.42246 + i * 0.00002,
        lon: 39.82616 + i * 0.00002
      };

      // Add small amount of noise
      const noiseLat = (Math.random() - 0.5) * 0.000005; // ~0.5m
      const noiseLon = (Math.random() - 0.5) * 0.000005;

      const navUpdate: NavUpdateDto = {
        ts: startTime + i * 1000,
        seq: i + 1,
        userId,
        pos: {
          lat: groundTruth.lat + noiseLat,
          lon: groundTruth.lon + noiseLon,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 45, // Northeast
        speed: 1.2,
        source: 'gnss',
        stage: 'demo',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      processed++;
      const processingStart = Date.now();
      
      try {
        const result = await this.hmmService.processNavigationUpdate(navUpdate);
        const processingTime = Date.now() - processingStart;
        totalProcessingTime += processingTime;

        if (result) {
          succeeded++;
          totalConfidence += result.confidence;
          
          // Calculate error
          const error = this.calculateDistance(
            result.position,
            groundTruth
          );
          totalError += error;
          
          console.log(`  Step ${i + 1}: Error=${error.toFixed(2)}m, Confidence=${result.confidence.toFixed(3)}, Time=${processingTime}ms`);
        } else {
          console.log(`  Step ${i + 1}: No result`);
        }
      } catch (error) {
        console.log(`  Step ${i + 1}: Error - ${error.message}`);
      }
    }

    const result: TestResult = {
      scenario: 'Linear Path',
      processed,
      succeeded,
      averageError: succeeded > 0 ? totalError / succeeded : 0,
      averageConfidence: succeeded > 0 ? totalConfidence / succeeded : 0,
      averageProcessingTime: processed > 0 ? totalProcessingTime / processed : 0
    };

    console.log(`\nResults: ${succeeded}/${processed} successful, Avg Error: ${result.averageError.toFixed(2)}m, Avg Confidence: ${result.averageConfidence.toFixed(3)}\n`);
    
    return result;
  }

  private async testNoisyGPS(): Promise<TestResult> {
    console.log('Test 2: Noisy GPS Scenario');
    console.log('---------------------------');

    const userId = 'demo-user-2';
    let processed = 0;
    let succeeded = 0;
    let totalError = 0;
    let totalConfidence = 0;
    let totalProcessingTime = 0;

    const startTime = Date.now();
    for (let i = 0; i < 10; i++) {
      const groundTruth = {
        lat: 21.42250 + i * 0.000015,
        lon: 39.82620 + i * 0.000015
      };

      // Add significant noise (±3m)
      const noiseLat = (Math.random() - 0.5) * 0.000027; // ~3m
      const noiseLon = (Math.random() - 0.5) * 0.000027;

      const navUpdate: NavUpdateDto = {
        ts: startTime + i * 1000,
        seq: i + 1,
        userId,
        pos: {
          lat: groundTruth.lat + noiseLat,
          lon: groundTruth.lon + noiseLon,
          alt: 0,
          floor: 0,
          acc: 5
        },
        heading: 30 + (Math.random() - 0.5) * 60, // ±30° noise
        speed: 1.0 + (Math.random() - 0.5) * 0.4,
        source: 'gnss',
        stage: 'demo',
        lap: 1,
        confidence: 0.7 + Math.random() * 0.2,
        mode: 'guide',
        device: 'android'
      };

      processed++;
      const processingStart = Date.now();
      
      try {
        const result = await this.hmmService.processNavigationUpdate(navUpdate);
        const processingTime = Date.now() - processingStart;
        totalProcessingTime += processingTime;

        if (result) {
          succeeded++;
          totalConfidence += result.confidence;
          
          const error = this.calculateDistance(result.position, groundTruth);
          totalError += error;
          
          console.log(`  Step ${i + 1}: Error=${error.toFixed(2)}m, Confidence=${result.confidence.toFixed(3)}, Time=${processingTime}ms`);
        } else {
          console.log(`  Step ${i + 1}: No result`);
        }
      } catch (error) {
        console.log(`  Step ${i + 1}: Error - ${error.message}`);
      }
    }

    const result: TestResult = {
      scenario: 'Noisy GPS',
      processed,
      succeeded,
      averageError: succeeded > 0 ? totalError / succeeded : 0,
      averageConfidence: succeeded > 0 ? totalConfidence / succeeded : 0,
      averageProcessingTime: processed > 0 ? totalProcessingTime / processed : 0
    };

    console.log(`\nResults: ${succeeded}/${processed} successful, Avg Error: ${result.averageError.toFixed(2)}m, Avg Confidence: ${result.averageConfidence.toFixed(3)}\n`);
    
    return result;
  }

  private async testPerformance(): Promise<TestResult> {
    console.log('Test 3: Performance Test');
    console.log('-------------------------');

    const userId = 'demo-user-3';
    let processed = 0;
    let succeeded = 0;
    let totalProcessingTime = 0;

    const startTime = Date.now();
    
    // Run 50 updates quickly
    for (let i = 0; i < 50; i++) {
      const navUpdate: NavUpdateDto = {
        ts: startTime + i * 100, // 10Hz updates
        seq: i + 1,
        userId,
        pos: {
          lat: 21.42246 + i * 0.000010,
          lon: 21.42616 + i * 0.000010,
          alt: 0,
          floor: 0,
          acc: 3
        },
        heading: 45,
        speed: 1.0,
        source: 'gnss',
        stage: 'demo',
        lap: 1,
        confidence: 0.9,
        mode: 'guide',
        device: 'android'
      };

      processed++;
      const processingStart = Date.now();
      
      try {
        const result = await this.hmmService.processNavigationUpdate(navUpdate);
        const processingTime = Date.now() - processingStart;
        totalProcessingTime += processingTime;

        if (result) {
          succeeded++;
        }
        
        if (i % 10 === 0) {
          console.log(`  Processed ${i + 1} updates, avg time: ${(totalProcessingTime / (i + 1)).toFixed(2)}ms`);
        }
      } catch (error) {
        console.log(`  Update ${i + 1}: Error - ${error.message}`);
      }
    }

    const result: TestResult = {
      scenario: 'Performance',
      processed,
      succeeded,
      averageError: 0,
      averageConfidence: 0,
      averageProcessingTime: processed > 0 ? totalProcessingTime / processed : 0
    };

    console.log(`\nResults: ${succeeded}/${processed} successful, Avg Processing Time: ${result.averageProcessingTime.toFixed(2)}ms\n`);
    
    return result;
  }

  private calculateDistance(
    p1: { lat: number; lon: number },
    p2: { lat: number; lon: number }
  ): number {
    // Simple Euclidean approximation for short distances
    const latDiff = (p1.lat - p2.lat) * 110540; // ~meters per degree latitude
    const lonDiff = (p1.lon - p2.lon) * Math.cos(p1.lat * Math.PI / 180) * 111320; // ~meters per degree longitude
    return Math.sqrt(latDiff * latDiff + lonDiff * lonDiff);
  }

  private printSummary(results: TestResult[]): void {
    console.log('=== SUMMARY ===');
    console.log('----------------');
    
    for (const result of results) {
      console.log(`${result.scenario}:`);
      console.log(`  Success Rate: ${(result.succeeded / result.processed * 100).toFixed(1)}%`);
      if (result.averageError > 0) {
        console.log(`  Average Error: ${result.averageError.toFixed(2)}m`);
        console.log(`  Average Confidence: ${result.averageConfidence.toFixed(3)}`);
      }
      console.log(`  Average Processing Time: ${result.averageProcessingTime.toFixed(2)}ms`);
      console.log('');
    }

    // Check if targets are met
    const overallError = results
      .filter(r => r.averageError > 0)
      .reduce((sum, r) => sum + r.averageError, 0) / 
      results.filter(r => r.averageError > 0).length;
    
    const overallProcessingTime = results.reduce((sum, r) => sum + r.averageProcessingTime, 0) / results.length;

    console.log('Target Analysis:');
    console.log(`  Average Error: ${overallError.toFixed(2)}m (Target: ≤2.0m) - ${overallError <= 2.0 ? 'PASS' : 'FAIL'}`);
    console.log(`  Processing Time: ${overallProcessingTime.toFixed(2)}ms (Target: ≤10ms) - ${overallProcessingTime <= 10 ? 'PASS' : 'FAIL'}`);
    
    console.log('\n=== HMM Parameters Used ===');
    console.log('K_CANDIDATES: 5');
    console.log('R_SEARCH_RADIUS: 20m');
    console.log('SIGMA_DISTANCE: 3.0m');
    console.log('SIGMA_HEADING: 25.0°');
    console.log('TELEPORT_THRESHOLD: 12m');
    console.log('EMA_ALPHA: 0.45');
  }
}

// Run the demo
async function runDemo() {
  try {
    const demo = new HMMDemo();
    await demo.runDemo();
    console.log('\nDemo completed successfully!');
  } catch (error) {
    console.error('Demo failed:', error.message);
    console.error(error.stack);
  }
}

// Export for use in other contexts
export { HMMDemo, runDemo };

// Run if this file is executed directly
if (require.main === module) {
  runDemo();
}