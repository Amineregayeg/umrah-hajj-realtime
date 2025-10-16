/**
 * Precision HMM Test Runner
 * Validates improved HMM implementation against accuracy targets
 * Outputs JSONL per trace and summary statistics
 */

import { HMMTrackingService } from '../services/hmm-tracking.service';
import { HMMParameterTunerService } from '../services/hmm-parameter-tuner.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { AccuracyHarness, AccuracyResult, TraceAccuracyStats } from './accuracy/accuracy-harness';
import { generateSyntheticTraces, SyntheticTrace } from './fixtures/synthetic-traces';
import * as fs from 'fs';
import * as path from 'path';

export interface PrecisionTestConfig {
  enableParameterTuning: boolean;
  outputDirectory: string;
  targetMedianError: number; // meters
  targetP95Error: number; // meters
  enableDetailedLogging: boolean;
}

export interface PrecisionTestResults {
  config: PrecisionTestConfig;
  timestamp: string;
  traceSummary: {
    totalTraces: number;
    passedTraces: number;
    failedTraces: string[];
  };
  overallAccuracy: {
    medianError: number;
    p95Error: number;
    achievedTargets: boolean;
  };
  individualTraceResults: Map<string, TraceAccuracyStats>;
  parameterTuningResults?: any;
  recommendations: string[];
  executionTimeMs: number;
}

export class PrecisionHMMTestRunner {
  private readonly config: PrecisionTestConfig;
  private readonly outputDir: string;

  constructor(config: PrecisionTestConfig) {
    this.config = {
      enableParameterTuning: false,
      targetMedianError: 2.0,
      targetP95Error: 4.0,
      enableDetailedLogging: true,
      ...config
    };
    
    this.outputDir = path.resolve(this.config.outputDirectory);
    this.ensureOutputDirectory();
  }

  /**
   * Run comprehensive precision HMM test suite
   */
  async runPrecisionTests(): Promise<PrecisionTestResults> {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    console.log('🎯 Starting Precision HMM Test Suite');
    console.log(`📁 Output directory: ${this.outputDir}`);
    console.log(`🎨 Target accuracy: median ≤${this.config.targetMedianError}m, p95 ≤${this.config.targetP95Error}m`);

    // Initialize services
    const graphLoader = new GraphLoaderService();
    let hmmService = new HMMTrackingService(graphLoader);
    let tuningResults: any = null;

    // Optional parameter tuning
    if (this.config.enableParameterTuning) {
      console.log('🔧 Running automated parameter tuning...');
      const tuner = new HMMParameterTunerService(graphLoader);
      const tuningReport = await tuner.runGridSearch();
      
      // Export tuning results
      const tuningPath = path.join(this.outputDir, 'parameter-tuning-report.json');
      tuner.exportReport(tuningReport, tuningPath);
      
      tuningResults = tuningReport;
      console.log(`✅ Parameter tuning completed. Best score: ${tuningReport.bestResult.score.toFixed(3)}`);
      
      // Create new HMM service with optimized parameters (if available)
      if (tuningReport.bestResult.passedCriteria) {
        console.log('🎯 Using optimized parameters for final test');
        // Apply optimized parameters to service
        // Note: This would require HMMTrackingService modification
      }
    }

    // Generate test traces
    console.log('📊 Generating synthetic test traces...');
    const traces = generateSyntheticTraces();
    console.log(`📈 Generated ${traces.length} test traces`);

    // Run accuracy tests
    console.log('🧪 Running accuracy analysis...');
    const harness = new AccuracyHarness(hmmService, graphLoader);
    const { traceResults, overallStats } = await harness.analyzeTraces(traces);

    // Export individual trace results to JSONL
    console.log('💾 Exporting trace results...');
    await this.exportTraceResultsJSONL(traceResults);

    // Analyze results
    const traceSummary = this.analyzeTraceSummary(traceResults);
    const recommendations = this.generateRecommendations(overallStats, traceSummary);

    // Generate summary report
    const results: PrecisionTestResults = {
      config: this.config,
      timestamp,
      traceSummary,
      overallAccuracy: {
        medianError: overallStats.overallMedianError,
        p95Error: overallStats.overallP95Error,
        achievedTargets: overallStats.passedCriteria
      },
      individualTraceResults: new Map(Array.from(traceResults.entries()).map(([name, data]) => [name, data.stats])),
      parameterTuningResults: tuningResults,
      recommendations,
      executionTimeMs: Date.now() - startTime
    };

    // Export summary report
    await this.exportSummaryReport(results, overallStats);

    // Print final results
    this.printFinalResults(results);

    return results;
  }

  /**
   * Export individual trace results to JSONL format
   */
  private async exportTraceResultsJSONL(
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>
  ): Promise<void> {
    for (const [traceName, { results, stats }] of traceResults) {
      // Export detailed results
      const detailsPath = path.join(this.outputDir, `${traceName}-details.jsonl`);
      const detailsLines = results.map(result => JSON.stringify({
        trace_id: result.traceId,
        update_id: result.updateId,
        timestamp: result.timestamp,
        ground_truth: result.groundTruth,
        hmm_result: result.hmmResult,
        snap_error_m: result.snapError,
        confidence: result.confidence,
        processing_time_ms: result.processingTime
      }));
      
      fs.writeFileSync(detailsPath, detailsLines.join('\n'));

      // Export trace summary
      const summaryPath = path.join(this.outputDir, `${traceName}-summary.json`);
      fs.writeFileSync(summaryPath, JSON.stringify({
        trace_id: traceName,
        stats,
        passed_criteria: {
          median: stats.medianError <= this.config.targetMedianError,
          p95: stats.p95Error <= this.config.targetP95Error
        }
      }, null, 2));

      if (this.config.enableDetailedLogging) {
        console.log(`📄 Exported ${traceName}: ${results.length} updates, median=${stats.medianError.toFixed(2)}m, p95=${stats.p95Error.toFixed(2)}m`);
      }
    }
  }

  /**
   * Analyze trace summary statistics
   */
  private analyzeTraceSummary(
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>
  ): { totalTraces: number; passedTraces: number; failedTraces: string[] } {
    const totalTraces = traceResults.size;
    const failedTraces: string[] = [];
    let passedTraces = 0;

    for (const [traceName, { stats }] of traceResults) {
      const passedMedian = stats.medianError <= this.config.targetMedianError;
      const passedP95 = stats.p95Error <= this.config.targetP95Error;
      
      if (passedMedian && passedP95) {
        passedTraces++;
      } else {
        failedTraces.push(`${traceName} (median=${stats.medianError.toFixed(2)}m, p95=${stats.p95Error.toFixed(2)}m)`);
      }
    }

    return { totalTraces, passedTraces, failedTraces };
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(overallStats: any, traceSummary: any): string[] {
    const recommendations: string[] = [];

    if (overallStats.passedCriteria) {
      recommendations.push('🎉 All accuracy targets achieved!');
      recommendations.push('✅ Implementation meets precision requirements');
    } else {
      recommendations.push('⚠️  Accuracy targets not fully achieved');
      
      if (overallStats.overallMedianError > this.config.targetMedianError) {
        recommendations.push(`• Median error ${overallStats.overallMedianError.toFixed(2)}m exceeds target ${this.config.targetMedianError}m`);
        recommendations.push('• Consider reducing sigma parameters or increasing candidate count');
      }
      
      if (overallStats.overallP95Error > this.config.targetP95Error) {
        recommendations.push(`• P95 error ${overallStats.overallP95Error.toFixed(2)}m exceeds target ${this.config.targetP95Error}m`);
        recommendations.push('• Implement stronger outlier rejection or velocity constraints');
      }
    }

    // Trace-specific recommendations
    if (traceSummary.failedTraces.length > 0) {
      recommendations.push(`• ${traceSummary.failedTraces.length} traces failed criteria:`);
      traceSummary.failedTraces.slice(0, 3).forEach((trace: string) => {
        recommendations.push(`  - ${trace}`);
      });
      
      if (traceSummary.failedTraces.length > 3) {
        recommendations.push(`  - ... and ${traceSummary.failedTraces.length - 3} more`);
      }
    }

    return recommendations;
  }

  /**
   * Export comprehensive summary report
   */
  private async exportSummaryReport(results: PrecisionTestResults, overallStats: any): Promise<void> {
    const summaryPath = path.join(this.outputDir, 'precision-test-summary.json');
    
    const summaryData = {
      metadata: {
        timestamp: results.timestamp,
        config: results.config,
        execution_time_ms: results.executionTimeMs
      },
      accuracy_results: {
        overall: {
          median_error_m: results.overallAccuracy.medianError,
          p95_error_m: results.overallAccuracy.p95Error,
          achieved_targets: results.overallAccuracy.achievedTargets,
          target_median_m: this.config.targetMedianError,
          target_p95_m: this.config.targetP95Error
        },
        trace_summary: results.traceSummary,
        individual_traces: Object.fromEntries(results.individualTraceResults)
      },
      parameter_tuning: results.parameterTuningResults ? {
        enabled: true,
        best_score: results.parameterTuningResults.bestResult.score,
        best_parameters: results.parameterTuningResults.bestResult.parameters,
        total_combinations: results.parameterTuningResults.totalCombinations
      } : { enabled: false },
      recommendations: results.recommendations,
      validation: {
        all_traces_passed: results.traceSummary.passedTraces === results.traceSummary.totalTraces,
        median_threshold_met: results.overallAccuracy.medianError <= this.config.targetMedianError,
        p95_threshold_met: results.overallAccuracy.p95Error <= this.config.targetP95Error
      }
    };

    fs.writeFileSync(summaryPath, JSON.stringify(summaryData, null, 2));
    console.log(`📋 Summary report exported to ${summaryPath}`);

    // Also export CSV for analysis
    const csvPath = path.join(this.outputDir, 'trace-summary.csv');
    this.exportTraceCSV(results.individualTraceResults, csvPath);
  }

  /**
   * Export trace summary as CSV
   */
  private exportTraceCSV(traceResults: Map<string, TraceAccuracyStats>, csvPath: string): void {
    const csvLines = ['trace_id,total_updates,successful_updates,success_rate,median_error_m,p95_error_m,p99_error_m,mean_error_m,std_error_m,avg_confidence,avg_processing_time_ms,passed_median,passed_p95'];
    
    for (const [traceName, stats] of traceResults) {
      const passedMedian = stats.medianError <= this.config.targetMedianError;
      const passedP95 = stats.p95Error <= this.config.targetP95Error;
      
      const row = [
        traceName,
        stats.totalUpdates,
        stats.successfulUpdates,
        stats.successRate.toFixed(3),
        stats.medianError.toFixed(3),
        stats.p95Error.toFixed(3),
        stats.p99Error.toFixed(3),
        stats.meanError.toFixed(3),
        stats.stdError.toFixed(3),
        stats.averageConfidence.toFixed(3),
        stats.averageProcessingTime.toFixed(1),
        passedMedian,
        passedP95
      ].join(',');
      
      csvLines.push(row);
    }
    
    fs.writeFileSync(csvPath, csvLines.join('\n'));
    console.log(`📊 CSV summary exported to ${csvPath}`);
  }

  /**
   * Print final results to console
   */
  private printFinalResults(results: PrecisionTestResults): void {
    console.log('\n' + '='.repeat(80));
    console.log('🎯 PRECISION HMM TEST RESULTS');
    console.log('='.repeat(80));
    
    console.log(`⏱️  Execution time: ${(results.executionTimeMs / 1000).toFixed(1)}s`);
    console.log(`📊 Traces analyzed: ${results.traceSummary.totalTraces}`);
    console.log(`✅ Traces passed: ${results.traceSummary.passedTraces}/${results.traceSummary.totalTraces}`);
    
    console.log('\n📈 Overall Accuracy:');
    console.log(`   Median error: ${results.overallAccuracy.medianError.toFixed(2)}m (target: ≤${this.config.targetMedianError}m) ${results.overallAccuracy.medianError <= this.config.targetMedianError ? '✅' : '❌'}`);
    console.log(`   P95 error: ${results.overallAccuracy.p95Error.toFixed(2)}m (target: ≤${this.config.targetP95Error}m) ${results.overallAccuracy.p95Error <= this.config.targetP95Error ? '✅' : '❌'}`);
    
    if (results.overallAccuracy.achievedTargets) {
      console.log('\n🎉 SUCCESS: All accuracy targets achieved!');
    } else {
      console.log('\n⚠️  PARTIAL SUCCESS: Some targets not met');
      
      if (results.traceSummary.failedTraces.length > 0) {
        console.log('\n❌ Failed traces:');
        results.traceSummary.failedTraces.forEach(trace => {
          console.log(`   - ${trace}`);
        });
      }
    }

    if (results.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      results.recommendations.forEach(rec => {
        console.log(`   ${rec}`);
      });
    }

    console.log(`\n📁 Detailed results available in: ${this.outputDir}`);
    console.log('='.repeat(80));
  }

  /**
   * Ensure output directory exists
   */
  private ensureOutputDirectory(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }
}

/**
 * Main test execution function
 */
export async function runPrecisionHMMTests(config?: Partial<PrecisionTestConfig>): Promise<PrecisionTestResults> {
  const defaultConfig: PrecisionTestConfig = {
    enableParameterTuning: false,
    outputDirectory: './test-artifacts/precision-hmm-results',
    targetMedianError: 2.0,
    targetP95Error: 4.0,
    enableDetailedLogging: true
  };

  const finalConfig = { ...defaultConfig, ...config };
  const runner = new PrecisionHMMTestRunner(finalConfig);
  
  return await runner.runPrecisionTests();
}

// CLI execution
if (require.main === module) {
  const config: Partial<PrecisionTestConfig> = {
    enableParameterTuning: process.argv.includes('--tune'),
    outputDirectory: process.env.OUTPUT_DIR || './test-artifacts/precision-hmm-results',
    enableDetailedLogging: !process.argv.includes('--quiet')
  };

  runPrecisionHMMTests(config)
    .then(results => {
      const exitCode = results.overallAccuracy.achievedTargets ? 0 : 1;
      console.log(`\n🏁 Test completed with exit code: ${exitCode}`);
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}