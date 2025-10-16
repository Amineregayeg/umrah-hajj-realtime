/**
 * Automated parameter tuning service for HMM tracking optimization
 * Implements grid search to find optimal parameters for target accuracy
 */

import { Injectable, Logger } from '@nestjs/common';
import { HMMTrackingService } from './hmm-tracking.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { AccuracyHarness, OverallAccuracyStats } from '../test/accuracy/accuracy-harness';
import { SyntheticTrace, generateSyntheticTraces } from '../test/fixtures/synthetic-traces';

export interface ParameterSet {
  sigmaDPerpSlow: number;
  sigmaDPerpFast: number;
  sigmaHeadSlow: number;
  sigmaHeadFast: number;
  kCandidates: number;
  searchRadius: number;
  emaAlpha: number;
}

export interface TuningResult {
  parameters: ParameterSet;
  overallStats: OverallAccuracyStats;
  score: number; // Combined score for optimization
  passedCriteria: boolean;
}

export interface TuningReport {
  bestResult: TuningResult;
  allResults: TuningResult[];
  totalCombinations: number;
  executionTimeMs: number;
  convergenceAnalysis: {
    medianErrors: number[];
    p95Errors: number[];
    bestScores: number[];
  };
}

@Injectable()
export class HMMParameterTunerService {
  private readonly logger = new Logger(HMMParameterTunerService.name);

  // Target criteria
  private readonly TARGET_MEDIAN_ERROR = 2.0; // meters
  private readonly TARGET_P95_ERROR = 4.0; // meters

  constructor(
    private readonly graphLoader: GraphLoaderService
  ) {}

  /**
   * Run automated grid search to find optimal parameters
   */
  async runGridSearch(): Promise<TuningReport> {
    const startTime = Date.now();
    this.logger.log('Starting automated parameter grid search...');

    // Define parameter space
    const parameterSpace = this.defineParameterSpace();
    const parameterCombinations = this.generateParameterCombinations(parameterSpace);
    
    this.logger.log(`Testing ${parameterCombinations.length} parameter combinations`);

    // Generate synthetic traces for testing
    const traces = generateSyntheticTraces();
    this.logger.log(`Using ${traces.length} synthetic traces for evaluation`);

    const results: TuningResult[] = [];
    let bestResult: TuningResult | null = null;

    // Test each parameter combination
    for (let i = 0; i < parameterCombinations.length; i++) {
      const params = parameterCombinations[i];
      this.logger.log(`Testing combination ${i + 1}/${parameterCombinations.length}: ${this.formatParameters(params)}`);

      try {
        const result = await this.evaluateParameters(params, traces);
        results.push(result);

        // Update best result
        if (!bestResult || result.score > bestResult.score || 
            (result.passedCriteria && !bestResult.passedCriteria)) {
          bestResult = result;
          this.logger.log(`New best result: score=${result.score.toFixed(3)}, median=${result.overallStats.overallMedianError.toFixed(2)}m, p95=${result.overallStats.overallP95Error.toFixed(2)}m`);
        }

        // Early termination if perfect score achieved
        if (result.passedCriteria && result.score > 0.95) {
          this.logger.log('Achieved excellent score, terminating early');
          break;
        }
      } catch (error) {
        this.logger.error(`Error evaluating parameters: ${error.message}`);
        // Continue with next combination
      }
    }

    const executionTime = Date.now() - startTime;
    
    if (!bestResult) {
      throw new Error('No valid results obtained from parameter tuning');
    }

    // Generate convergence analysis
    const convergenceAnalysis = this.analyzeConvergence(results);

    const report: TuningReport = {
      bestResult,
      allResults: results,
      totalCombinations: parameterCombinations.length,
      executionTimeMs: executionTime,
      convergenceAnalysis
    };

    this.logger.log(`Grid search completed in ${(executionTime / 1000).toFixed(1)}s`);
    this.logger.log(`Best parameters: ${this.formatParameters(bestResult.parameters)}`);
    this.logger.log(`Best score: ${bestResult.score.toFixed(3)}, passed criteria: ${bestResult.passedCriteria}`);

    return report;
  }

  /**
   * Define parameter search space
   */
  private defineParameterSpace(): Record<keyof ParameterSet, number[]> {
    return {
      sigmaDPerpSlow: [1.4, 1.8, 2.2],
      sigmaDPerpFast: [2.0, 2.4, 2.8],
      sigmaHeadSlow: [35, 45, 55],
      sigmaHeadFast: [18, 22, 28],
      kCandidates: [6, 8, 10],
      searchRadius: [16, 18, 22],
      emaAlpha: [0.35, 0.45, 0.55]
    };
  }

  /**
   * Generate all parameter combinations
   */
  private generateParameterCombinations(parameterSpace: Record<keyof ParameterSet, number[]>): ParameterSet[] {
    const combinations: ParameterSet[] = [];

    for (const sigmaDPerpSlow of parameterSpace.sigmaDPerpSlow) {
      for (const sigmaDPerpFast of parameterSpace.sigmaDPerpFast) {
        for (const sigmaHeadSlow of parameterSpace.sigmaHeadSlow) {
          for (const sigmaHeadFast of parameterSpace.sigmaHeadFast) {
            for (const kCandidates of parameterSpace.kCandidates) {
              for (const searchRadius of parameterSpace.searchRadius) {
                for (const emaAlpha of parameterSpace.emaAlpha) {
                  // Only include combinations where fast sigma >= slow sigma
                  if (sigmaDPerpFast >= sigmaDPerpSlow && sigmaHeadSlow >= sigmaHeadFast) {
                    combinations.push({
                      sigmaDPerpSlow,
                      sigmaDPerpFast,
                      sigmaHeadSlow,
                      sigmaHeadFast,
                      kCandidates,
                      searchRadius,
                      emaAlpha
                    });
                  }
                }
              }
            }
          }
        }
      }
    }

    return combinations;
  }

  /**
   * Evaluate a specific parameter set
   */
  private async evaluateParameters(params: ParameterSet, traces: SyntheticTrace[]): Promise<TuningResult> {
    // Create temporary HMM service with custom parameters
    const hmmService = new HMMTrackingService(this.graphLoader);
    
    // Apply parameters (we'll need to modify the service to accept dynamic parameters)
    this.applyParametersToService(hmmService, params);

    // Create accuracy harness
    const harness = new AccuracyHarness(hmmService, this.graphLoader);

    // Run evaluation
    const { overallStats } = await harness.analyzeTraces(traces);

    // Calculate combined score
    const score = this.calculateScore(overallStats);

    // Check if criteria passed
    const passedCriteria = overallStats.passedCriteria;

    return {
      parameters: params,
      overallStats,
      score,
      passedCriteria
    };
  }

  /**
   * Apply parameters to HMM service (requires service modification)
   */
  private applyParametersToService(service: any, params: ParameterSet): void {
    // This would require modifying HMMTrackingService to accept dynamic parameters
    // For now, we'll use reflection to set private properties
    service['K_CANDIDATES'] = params.kCandidates;
    service['R_SEARCH_RADIUS'] = params.searchRadius;
    service['SIGMA_D_PERP_SLOW'] = params.sigmaDPerpSlow;
    service['SIGMA_D_PERP_FAST'] = params.sigmaDPerpFast;
    service['SIGMA_HEAD_SLOW'] = params.sigmaHeadSlow;
    service['SIGMA_HEAD_FAST'] = params.sigmaHeadFast;
    service['EMA_ALPHA'] = params.emaAlpha;
  }

  /**
   * Calculate optimization score based on accuracy metrics
   */
  private calculateScore(stats: OverallAccuracyStats): number {
    // Weighted scoring function
    const medianWeight = 0.4;
    const p95Weight = 0.4;
    const successRateWeight = 0.2;

    // Normalize metrics (lower error is better)
    const medianScore = Math.max(0, 1 - stats.overallMedianError / this.TARGET_MEDIAN_ERROR);
    const p95Score = Math.max(0, 1 - stats.overallP95Error / this.TARGET_P95_ERROR);
    const successScore = stats.overallSuccessRate;

    // Combined score with bonus for meeting criteria
    let score = medianScore * medianWeight + p95Score * p95Weight + successScore * successRateWeight;

    // Bonus for meeting target criteria
    if (stats.overallMedianError <= this.TARGET_MEDIAN_ERROR && stats.overallP95Error <= this.TARGET_P95_ERROR) {
      score += 0.1; // 10% bonus
    }

    return Math.min(1.0, score);
  }

  /**
   * Analyze convergence patterns
   */
  private analyzeConvergence(results: TuningResult[]): {
    medianErrors: number[];
    p95Errors: number[];
    bestScores: number[];
  } {
    const medianErrors: number[] = [];
    const p95Errors: number[] = [];
    const bestScores: number[] = [];

    let bestScore = 0;

    for (const result of results) {
      medianErrors.push(result.overallStats.overallMedianError);
      p95Errors.push(result.overallStats.overallP95Error);
      
      if (result.score > bestScore) {
        bestScore = result.score;
      }
      bestScores.push(bestScore);
    }

    return { medianErrors, p95Errors, bestScores };
  }

  /**
   * Format parameters for logging
   */
  private formatParameters(params: ParameterSet): string {
    return `σ_d_perp=[${params.sigmaDPerpSlow},${params.sigmaDPerpFast}], σ_head=[${params.sigmaHeadSlow},${params.sigmaHeadFast}], K=${params.kCandidates}, R=${params.searchRadius}, α=${params.emaAlpha}`;
  }

  /**
   * Export tuning report to JSON
   */
  exportReport(report: TuningReport, outputPath: string): void {
    const fs = require('fs');
    
    const exportData = {
      summary: {
        bestScore: report.bestResult.score,
        bestParameters: report.bestResult.parameters,
        medianError: report.bestResult.overallStats.overallMedianError,
        p95Error: report.bestResult.overallStats.overallP95Error,
        passedCriteria: report.bestResult.passedCriteria,
        executionTimeMs: report.executionTimeMs,
        totalCombinations: report.totalCombinations
      },
      bestResult: report.bestResult,
      convergenceAnalysis: report.convergenceAnalysis,
      allResults: report.allResults.map(r => ({
        parameters: r.parameters,
        score: r.score,
        medianError: r.overallStats.overallMedianError,
        p95Error: r.overallStats.overallP95Error,
        passedCriteria: r.passedCriteria
      }))
    };

    fs.writeFileSync(outputPath, JSON.stringify(exportData, null, 2));
    this.logger.log(`Tuning report exported to ${outputPath}`);
  }

  /**
   * Generate recommendations based on results
   */
  generateRecommendations(report: TuningReport): string[] {
    const recommendations: string[] = [];
    const best = report.bestResult;

    if (best.passedCriteria) {
      recommendations.push('✅ Target accuracy criteria achieved');
      recommendations.push(`Recommended parameters: ${this.formatParameters(best.parameters)}`);
    } else {
      recommendations.push('❌ Target criteria not met with current parameter space');
      
      if (best.overallStats.overallMedianError > this.TARGET_MEDIAN_ERROR) {
        recommendations.push('• Consider reducing sigma values for tighter tracking');
        recommendations.push('• Increase number of candidates (K) for better coverage');
      }
      
      if (best.overallStats.overallP95Error > this.TARGET_P95_ERROR) {
        recommendations.push('• Implement additional outlier rejection mechanisms');
        recommendations.push('• Consider velocity-based constraints');
      }
    }

    // Parameter-specific recommendations
    const convergence = report.convergenceAnalysis;
    const finalImprovement = convergence.bestScores[convergence.bestScores.length - 1] - convergence.bestScores[0];
    
    if (finalImprovement < 0.1) {
      recommendations.push('• Parameter space may need expansion for further optimization');
    }

    return recommendations;
  }
}