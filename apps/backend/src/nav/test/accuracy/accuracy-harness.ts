/**
 * Accuracy Harness for HMM Navigation Testing
 * Computes per-update snap_error_m vs ground truth and reports statistics
 */

import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { SyntheticTrace, GroundTruthPoint } from '../fixtures/synthetic-traces';
import { NavUpdateDto } from '../../dto/nav-update.dto';

export interface AccuracyResult {
  traceId: string;
  updateId: number;
  timestamp: number;
  groundTruth: GroundTruthPoint;
  hmmResult: {
    position: { lat: number; lon: number; floor: string };
    confidence: number;
    snapTo: 'path' | 'node';
    nodeId?: string;
    edgeId?: string;
  } | null;
  snapError: number; // meters
  processingTime: number; // milliseconds
  confidence: number;
}

export interface TraceAccuracyStats {
  traceId: string;
  totalUpdates: number;
  successfulUpdates: number;
  successRate: number;
  snapErrors: number[];
  medianError: number;
  p95Error: number;
  p99Error: number;
  meanError: number;
  stdError: number;
  maxError: number;
  minError: number;
  teleportRecoveryTime?: number; // seconds
  averageConfidence: number;
  averageProcessingTime: number;
}

export interface OverallAccuracyStats {
  totalTraces: number;
  totalUpdates: number;
  successfulUpdates: number;
  overallSuccessRate: number;
  overallMedianError: number;
  overallP95Error: number;
  overallP99Error: number;
  overallMeanError: number;
  worstPerformingTrace: string;
  bestPerformingTrace: string;
  passedCriteria: boolean;
  criteriaResults: {
    medianThreshold: number;
    p95Threshold: number;
    allTracesPassMedian: boolean;
    allTracesPassP95: boolean;
    teleportRecoveryThreshold: number;
    teleportRecoveryPassed: boolean;
  };
}

export class AccuracyHarness {
  private readonly PASS_CRITERIA = {
    MEDIAN_ERROR_THRESHOLD: 2.0, // meters
    P95_ERROR_THRESHOLD: 4.0, // meters
    TELEPORT_RECOVERY_THRESHOLD: 1.2 // seconds
  };

  constructor(
    private readonly hmmService: HMMTrackingService,
    private readonly graphLoader: GraphLoaderService
  ) {}

  /**
   * Run accuracy analysis on a single trace
   */
  async analyzeTrace(trace: SyntheticTrace): Promise<{
    results: AccuracyResult[];
    stats: TraceAccuracyStats;
  }> {
    const results: AccuracyResult[] = [];
    let teleportDetectedAt = -1;
    let teleportRecoveredAt = -1;

    // Clear any existing state for this user
    this.hmmService.clearUserState(trace.measurements[0]?.userId || 'test-user');

    for (let i = 0; i < trace.measurements.length; i++) {
      const measurement = trace.measurements[i];
      const groundTruth = trace.groundTruth[i];
      
      if (!groundTruth) {
        console.warn(`Missing ground truth for measurement ${i} in trace ${trace.name}`);
        continue;
      }

      const startTime = Date.now();
      
      // Process navigation update
      const hmmResult = await this.hmmService.processNavigationUpdate(measurement);
      
      const processingTime = Date.now() - startTime;

      // Calculate snap error
      let snapError = 0;
      let confidence = 0;

      if (hmmResult) {
        snapError = this.calculateDistance(
          groundTruth.lat,
          groundTruth.lon,
          hmmResult.position.lat,
          hmmResult.position.lon
        );
        confidence = hmmResult.confidence;

        // Detect teleport recovery for teleport scenarios
        if (trace.scenario === 'teleport') {
          if (snapError > 50 && teleportDetectedAt === -1) {
            teleportDetectedAt = i;
          } else if (teleportDetectedAt >= 0 && teleportRecoveredAt === -1 && snapError < 5) {
            teleportRecoveredAt = i;
          }
        }
      } else {
        // No HMM result - use raw GPS distance as fallback error metric
        snapError = 999; // High error for failed processing
        confidence = 0;
      }

      results.push({
        traceId: trace.name,
        updateId: i,
        timestamp: measurement.ts,
        groundTruth,
        hmmResult,
        snapError,
        processingTime,
        confidence
      });
    }

    // Calculate statistics
    const stats = this.calculateTraceStats(trace.name, results, teleportDetectedAt, teleportRecoveredAt);

    return { results, stats };
  }

  /**
   * Run accuracy analysis on multiple traces
   */
  async analyzeTraces(traces: SyntheticTrace[]): Promise<{
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>;
    overallStats: OverallAccuracyStats;
  }> {
    const traceResults = new Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>();

    // Process each trace
    for (const trace of traces) {
      console.log(`Analyzing trace: ${trace.name}`);
      const result = await this.analyzeTrace(trace);
      traceResults.set(trace.name, result);
    }

    // Calculate overall statistics
    const overallStats = this.calculateOverallStats(traceResults);

    return { traceResults, overallStats };
  }

  /**
   * Calculate statistics for a single trace
   */
  private calculateTraceStats(
    traceId: string, 
    results: AccuracyResult[], 
    teleportDetectedAt: number = -1, 
    teleportRecoveredAt: number = -1
  ): TraceAccuracyStats {
    const successfulResults = results.filter(r => r.hmmResult !== null);
    const snapErrors = successfulResults.map(r => r.snapError);
    
    // Sort errors for percentile calculations
    const sortedErrors = [...snapErrors].sort((a, b) => a - b);
    
    const stats: TraceAccuracyStats = {
      traceId,
      totalUpdates: results.length,
      successfulUpdates: successfulResults.length,
      successRate: successfulResults.length / results.length,
      snapErrors,
      medianError: this.calculatePercentile(sortedErrors, 50),
      p95Error: this.calculatePercentile(sortedErrors, 95),
      p99Error: this.calculatePercentile(sortedErrors, 99),
      meanError: snapErrors.reduce((sum, error) => sum + error, 0) / snapErrors.length || 0,
      stdError: this.calculateStandardDeviation(snapErrors),
      maxError: Math.max(...snapErrors, 0),
      minError: Math.min(...snapErrors, 0),
      averageConfidence: successfulResults.reduce((sum, r) => sum + r.confidence, 0) / successfulResults.length || 0,
      averageProcessingTime: results.reduce((sum, r) => sum + r.processingTime, 0) / results.length || 0
    };

    // Calculate teleport recovery time if applicable
    if (teleportDetectedAt >= 0 && teleportRecoveredAt >= 0) {
      const recoveryTimeMs = results[teleportRecoveredAt].timestamp - results[teleportDetectedAt].timestamp;
      stats.teleportRecoveryTime = recoveryTimeMs / 1000; // Convert to seconds
    }

    return stats;
  }

  /**
   * Calculate overall statistics across all traces
   */
  private calculateOverallStats(
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>
  ): OverallAccuracyStats {
    const allStats = Array.from(traceResults.values()).map(r => r.stats);
    const allErrors = allStats.flatMap(stats => stats.snapErrors);
    const sortedErrors = [...allErrors].sort((a, b) => a - b);

    const totalUpdates = allStats.reduce((sum, stats) => sum + stats.totalUpdates, 0);
    const successfulUpdates = allStats.reduce((sum, stats) => sum + stats.successfulUpdates, 0);

    // Find best and worst performing traces
    const tracesByMedianError = allStats.sort((a, b) => a.medianError - b.medianError);
    const bestTrace = tracesByMedianError[0]?.traceId || 'none';
    const worstTrace = tracesByMedianError[tracesByMedianError.length - 1]?.traceId || 'none';

    // Check pass criteria
    const overallMedianError = this.calculatePercentile(sortedErrors, 50);
    const overallP95Error = this.calculatePercentile(sortedErrors, 95);
    
    const allTracesPassMedian = allStats.every(stats => stats.medianError <= this.PASS_CRITERIA.MEDIAN_ERROR_THRESHOLD);
    const allTracesPassP95 = allStats.every(stats => stats.p95Error <= this.PASS_CRITERIA.P95_ERROR_THRESHOLD);
    
    // Check teleport recovery
    const teleportTraces = allStats.filter(stats => stats.teleportRecoveryTime !== undefined);
    const teleportRecoveryPassed = teleportTraces.every(stats => 
      stats.teleportRecoveryTime! <= this.PASS_CRITERIA.TELEPORT_RECOVERY_THRESHOLD
    );

    const passedCriteria = allTracesPassMedian && allTracesPassP95 && teleportRecoveryPassed;

    return {
      totalTraces: allStats.length,
      totalUpdates,
      successfulUpdates,
      overallSuccessRate: successfulUpdates / totalUpdates,
      overallMedianError,
      overallP95Error,
      overallP99Error: this.calculatePercentile(sortedErrors, 99),
      overallMeanError: allErrors.reduce((sum, error) => sum + error, 0) / allErrors.length || 0,
      worstPerformingTrace: worstTrace,
      bestPerformingTrace: bestTrace,
      passedCriteria,
      criteriaResults: {
        medianThreshold: this.PASS_CRITERIA.MEDIAN_ERROR_THRESHOLD,
        p95Threshold: this.PASS_CRITERIA.P95_ERROR_THRESHOLD,
        allTracesPassMedian,
        allTracesPassP95,
        teleportRecoveryThreshold: this.PASS_CRITERIA.TELEPORT_RECOVERY_THRESHOLD,
        teleportRecoveryPassed
      }
    };
  }

  /**
   * Generate detailed accuracy report
   */
  generateReport(
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>,
    overallStats: OverallAccuracyStats
  ): string {
    let report = '# HMM Navigation Accuracy Analysis Report\n\n';
    
    report += `## Overall Results\n`;
    report += `- **Total Traces:** ${overallStats.totalTraces}\n`;
    report += `- **Total Updates:** ${overallStats.totalUpdates}\n`;
    report += `- **Success Rate:** ${(overallStats.overallSuccessRate * 100).toFixed(1)}%\n`;
    report += `- **Overall Median Error:** ${overallStats.overallMedianError.toFixed(2)}m\n`;
    report += `- **Overall P95 Error:** ${overallStats.overallP95Error.toFixed(2)}m\n`;
    report += `- **Overall P99 Error:** ${overallStats.overallP99Error.toFixed(2)}m\n`;
    report += `- **Best Performing Trace:** ${overallStats.bestPerformingTrace}\n`;
    report += `- **Worst Performing Trace:** ${overallStats.worstPerformingTrace}\n\n`;

    report += `## Pass Criteria Results\n`;
    report += `- **PASS CRITERIA:** ${overallStats.passedCriteria ? '✅ PASSED' : '❌ FAILED'}\n`;
    report += `- **Median ≤${overallStats.criteriaResults.medianThreshold}m:** ${overallStats.criteriaResults.allTracesPassMedian ? '✅' : '❌'}\n`;
    report += `- **P95 ≤${overallStats.criteriaResults.p95Threshold}m:** ${overallStats.criteriaResults.allTracesPassP95 ? '✅' : '❌'}\n`;
    report += `- **Teleport Recovery ≤${overallStats.criteriaResults.teleportRecoveryThreshold}s:** ${overallStats.criteriaResults.teleportRecoveryPassed ? '✅' : '❌'}\n\n`;

    report += `## Individual Trace Results\n\n`;
    
    for (const [traceName, { stats }] of traceResults) {
      const medianPass = stats.medianError <= this.PASS_CRITERIA.MEDIAN_ERROR_THRESHOLD;
      const p95Pass = stats.p95Error <= this.PASS_CRITERIA.P95_ERROR_THRESHOLD;
      const teleportPass = stats.teleportRecoveryTime === undefined || 
                          stats.teleportRecoveryTime <= this.PASS_CRITERIA.TELEPORT_RECOVERY_THRESHOLD;
      
      report += `### ${traceName} ${medianPass && p95Pass && teleportPass ? '✅' : '❌'}\n`;
      report += `- **Updates:** ${stats.totalUpdates} (${stats.successfulUpdates} successful, ${(stats.successRate * 100).toFixed(1)}%)\n`;
      report += `- **Median Error:** ${stats.medianError.toFixed(2)}m ${medianPass ? '✅' : '❌'}\n`;
      report += `- **P95 Error:** ${stats.p95Error.toFixed(2)}m ${p95Pass ? '✅' : '❌'}\n`;
      report += `- **P99 Error:** ${stats.p99Error.toFixed(2)}m\n`;
      report += `- **Mean Error:** ${stats.meanError.toFixed(2)}m (±${stats.stdError.toFixed(2)}m)\n`;
      report += `- **Range:** ${stats.minError.toFixed(2)}m - ${stats.maxError.toFixed(2)}m\n`;
      report += `- **Average Confidence:** ${(stats.averageConfidence * 100).toFixed(1)}%\n`;
      report += `- **Average Processing Time:** ${stats.averageProcessingTime.toFixed(1)}ms\n`;
      
      if (stats.teleportRecoveryTime !== undefined) {
        report += `- **Teleport Recovery Time:** ${stats.teleportRecoveryTime.toFixed(2)}s ${teleportPass ? '✅' : '❌'}\n`;
      }
      
      report += '\n';
    }

    return report;
  }

  /**
   * Export results to CSV for analysis
   */
  exportToCSV(
    traceResults: Map<string, { results: AccuracyResult[]; stats: TraceAccuracyStats }>,
    outputPath: string
  ): void {
    const fs = require('fs');
    
    // Individual results CSV
    const resultsCSV = ['trace_id,update_id,timestamp,ground_truth_lat,ground_truth_lon,ground_truth_floor,hmm_lat,hmm_lon,hmm_floor,snap_error_m,confidence,processing_time_ms,snap_to,node_id,edge_id'];
    
    for (const [traceName, { results }] of traceResults) {
      for (const result of results) {
        const row = [
          traceName,
          result.updateId,
          result.timestamp,
          result.groundTruth.lat,
          result.groundTruth.lon,
          result.groundTruth.floor,
          result.hmmResult?.position.lat || '',
          result.hmmResult?.position.lon || '',
          result.hmmResult?.position.floor || '',
          result.snapError,
          result.confidence,
          result.processingTime,
          result.hmmResult?.snapTo || '',
          result.hmmResult?.nodeId || '',
          result.hmmResult?.edgeId || ''
        ].join(',');
        resultsCSV.push(row);
      }
    }
    
    fs.writeFileSync(outputPath.replace('.csv', '-detailed.csv'), resultsCSV.join('\n'));

    // Summary stats CSV
    const statsCSV = ['trace_id,total_updates,successful_updates,success_rate,median_error_m,p95_error_m,p99_error_m,mean_error_m,std_error_m,min_error_m,max_error_m,avg_confidence,avg_processing_time_ms,teleport_recovery_s'];
    
    for (const [traceName, { stats }] of traceResults) {
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
        stats.minError.toFixed(3),
        stats.maxError.toFixed(3),
        stats.averageConfidence.toFixed(3),
        stats.averageProcessingTime.toFixed(1),
        stats.teleportRecoveryTime?.toFixed(3) || ''
      ].join(',');
      statsCSV.push(row);
    }
    
    fs.writeFileSync(outputPath.replace('.csv', '-summary.csv'), statsCSV.join('\n'));
  }

  /**
   * Calculate distance between two lat/lon points in meters
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Calculate percentile of sorted array
   */
  private calculatePercentile(sortedArray: number[], percentile: number): number {
    if (sortedArray.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedArray[lower];
    }
    
    const weight = index - lower;
    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  private calculateStandardDeviation(values: number[]): number {
    if (values.length === 0) return 0;
    
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
    
    return Math.sqrt(avgSquaredDiff);
  }
}