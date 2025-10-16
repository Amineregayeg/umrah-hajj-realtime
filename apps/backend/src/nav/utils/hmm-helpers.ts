/**
 * Helper functions for HMM-based map-matching
 * Provides common utilities for probability calculations and spatial operations
 */

import { haversineDistance, angularDistance, normalizeAngle } from './spatial-helpers';

/**
 * Calculate emission probability for HMM map-matching
 * Combines distance and heading components using appropriate distributions
 */
export function calculateEmissionProbability(
  observedPosition: { lat: number; lon: number },
  candidatePosition: { lat: number; lon: number },
  observedHeading: number,
  candidateHeading: number,
  sigmaDistance: number = 3.0,
  sigmaHeading: number = 25.0
): number {
  // Distance component using Gaussian distribution
  const distance = haversineDistance(observedPosition, candidatePosition);
  const distanceProb = gaussianPDF(distance, 0, sigmaDistance);

  // Heading component using von Mises distribution (circular normal)
  const headingDiff = angularDistance(observedHeading, candidateHeading);
  const headingProb = vonMisesPDF(headingDiff, 0, sigmaHeading);

  return distanceProb * headingProb;
}

/**
 * Calculate transition probability between two HMM states
 * Considers velocity constraints, heading changes, and graph connectivity
 */
export function calculateTransitionProbability(
  fromPosition: { lat: number; lon: number },
  toPosition: { lat: number; lon: number },
  fromHeading: number,
  toHeading: number,
  deltaTime: number, // seconds
  expectedSpeed: number, // m/s
  isConnected: boolean = false
): number {
  const distance = haversineDistance(fromPosition, toPosition);
  const expectedDistance = expectedSpeed * deltaTime;

  // Velocity constraint - penalize unrealistic jumps
  if (distance > expectedDistance * 3) {
    return 1e-10; // Very low probability
  }

  // Distance probability around expected displacement
  const distanceProb = gaussianPDF(distance, expectedDistance, expectedDistance * 0.3);

  // Heading change penalty
  const headingChange = angularDistance(fromHeading, toHeading);
  let headingPenalty = 1.0;
  
  if (headingChange > 150) {
    headingPenalty = 0.1; // Strong penalty for u-turns
  } else if (headingChange > 90) {
    headingPenalty = 0.5; // Moderate penalty for sharp turns
  }

  // Connectivity bonus
  const connectivityBonus = isConnected ? 2.0 : 1.0;

  return distanceProb * headingPenalty * connectivityBonus;
}

/**
 * Gaussian probability density function
 */
export function gaussianPDF(x: number, mean: number, stdDev: number): number {
  const variance = stdDev * stdDev;
  const exponent = -Math.pow(x - mean, 2) / (2 * variance);
  return Math.exp(exponent) / (stdDev * Math.sqrt(2 * Math.PI));
}

/**
 * von Mises probability density function for circular data (headings)
 */
export function vonMisesPDF(x: number, mean: number, stdDevDegrees: number): number {
  // Convert to radians
  const xRad = x * Math.PI / 180;
  const meanRad = mean * Math.PI / 180;
  
  // Convert standard deviation to concentration parameter
  const kappa = 1 / Math.pow(stdDevDegrees * Math.PI / 180, 2);

  const exponent = kappa * Math.cos(xRad - meanRad);
  return Math.exp(exponent) / (2 * Math.PI * besselI0(kappa));
}

/**
 * Modified Bessel function of the first kind of order 0
 * Approximation for von Mises distribution
 */
function besselI0(x: number): number {
  if (x < 3.75) {
    const y = Math.pow(x / 3.75, 2);
    return 1.0 + y * (3.5156229 + y * (3.0899424 + y * (1.2067492 +
      y * (0.2659732 + y * (0.0360768 + y * 0.0045813)))));
  } else {
    const y = 3.75 / x;
    const exp = Math.exp(x) / Math.sqrt(x);
    return exp * (0.39894228 + y * (0.01328592 + y * (0.00225319 +
      y * (-0.00157565 + y * (0.00916281 + y * (-0.02057706 +
      y * (0.02635537 + y * (-0.01647633 + y * 0.00392377))))))));
  }
}

/**
 * Apply exponential moving average to smooth position updates
 */
export function applyEMASmoothing(
  previousPosition: { lat: number; lon: number } | null,
  newPosition: { lat: number; lon: number },
  alpha: number = 0.45
): { lat: number; lon: number } {
  if (!previousPosition) {
    return newPosition;
  }

  return {
    lat: alpha * newPosition.lat + (1 - alpha) * previousPosition.lat,
    lon: alpha * newPosition.lon + (1 - alpha) * previousPosition.lon
  };
}

/**
 * Detect potential teleportation based on position jump
 */
export function detectTeleport(
  previousPosition: { lat: number; lon: number },
  currentPosition: { lat: number; lon: number },
  threshold: number = 12 // meters
): boolean {
  const distance = haversineDistance(previousPosition, currentPosition);
  return distance > threshold;
}

/**
 * Calculate confidence score from HMM probabilities
 */
export function calculateConfidence(
  probabilities: number[],
  minConfidence: number = 0.3,
  maxConfidence: number = 0.95
): number {
  if (probabilities.length === 0) {
    return minConfidence;
  }

  // Find maximum probability (log space)
  const maxProb = Math.max(...probabilities);
  
  // Normalize probabilities
  const normalizedProbs = probabilities.map(p => Math.exp(p - maxProb));
  const sum = normalizedProbs.reduce((a, b) => a + b, 0);
  const normalizedMax = Math.max(...normalizedProbs) / sum;

  // Scale to confidence range
  const confidence = minConfidence + (maxConfidence - minConfidence) * normalizedMax;
  
  return Math.max(minConfidence, Math.min(maxConfidence, confidence));
}

/**
 * Validate floor transition using graph connectivity
 */
export function validateFloorTransition(
  fromFloor: string,
  toFloor: string,
  confidence: number,
  connectors: Array<{ from: string; to: string; type: string }>,
  floorNodes: Map<string, string[]>, // floor -> node IDs
  confidenceThreshold: number = 0.7
): boolean {
  // Same floor is always valid
  if (fromFloor === toFloor) {
    return true;
  }

  // Allow uncertain transitions
  if (confidence < confidenceThreshold) {
    return true;
  }

  // Check for valid connector between floors
  const fromNodeIds = floorNodes.get(fromFloor) || [];
  const toNodeIds = floorNodes.get(toFloor) || [];

  return connectors.some(connector => {
    return (fromNodeIds.includes(connector.from) && toNodeIds.includes(connector.to)) ||
           (fromNodeIds.includes(connector.to) && toNodeIds.includes(connector.from));
  });
}

/**
 * Clamp speed to realistic indoor pedestrian range
 */
export function clampIndoorSpeed(
  speed: number,
  minSpeed: number = 0.2,
  maxSpeed: number = 1.6
): number {
  return Math.max(minSpeed, Math.min(maxSpeed, speed));
}

/**
 * Calculate expected heading between two points
 */
export function calculateExpectedHeading(
  fromPosition: { lat: number; lon: number },
  toPosition: { lat: number; lon: number }
): number {
  const dx = toPosition.lon - fromPosition.lon;
  const dy = toPosition.lat - fromPosition.lat;
  
  const bearing = Math.atan2(dx, dy) * 180 / Math.PI;
  return normalizeAngle(bearing);
}

/**
 * Find the best matching candidate from HMM results
 */
export function selectBestCandidate<T>(
  candidates: T[],
  probabilities: number[]
): { candidate: T; probability: number; index: number } | null {
  if (candidates.length === 0 || probabilities.length === 0) {
    return null;
  }

  let bestIndex = 0;
  let bestProb = probabilities[0];
  
  for (let i = 1; i < probabilities.length; i++) {
    if (probabilities[i] > bestProb) {
      bestProb = probabilities[i];
      bestIndex = i;
    }
  }

  return {
    candidate: candidates[bestIndex],
    probability: bestProb,
    index: bestIndex
  };
}

/**
 * Generate synthetic GPS noise for testing
 */
export function addGPSNoise(
  position: { lat: number; lon: number },
  stdDevMeters: number = 3.0
): { lat: number; lon: number } {
  // Box-Muller transform for Gaussian noise
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);

  // Convert noise to degrees
  const noiseLat = (z0 * stdDevMeters) / 110540; // ~meters per degree latitude
  const noiseLon = (z1 * stdDevMeters) / (Math.cos(position.lat * Math.PI / 180) * 111320);

  return {
    lat: position.lat + noiseLat,
    lon: position.lon + noiseLon
  };
}

/**
 * Calculate trajectory consistency score
 */
export function calculateTrajectoryConsistency(
  positions: Array<{ lat: number; lon: number; ts: number }>,
  headings: number[],
  windowSize: number = 5
): number {
  if (positions.length < 2 || headings.length < 2) {
    return 1.0; // Default to consistent
  }

  const recent = Math.min(windowSize, positions.length);
  let consistencyScore = 0;
  let measurements = 0;

  for (let i = recent - 1; i >= 1; i--) {
    // Calculate actual movement direction
    const actualHeading = calculateExpectedHeading(
      positions[positions.length - i - 1],
      positions[positions.length - i]
    );

    // Compare with reported heading
    const reportedHeading = headings[headings.length - i];
    const headingDiff = angularDistance(actualHeading, reportedHeading);

    // Score: 1.0 for perfect match, 0.0 for 180° difference
    const score = Math.max(0, 1 - headingDiff / 180);
    consistencyScore += score;
    measurements++;
  }

  return measurements > 0 ? consistencyScore / measurements : 1.0;
}

/**
 * HMM state management utilities
 */
export class HMMStateManager {
  private maxHistoryLength: number;

  constructor(maxHistoryLength: number = 10) {
    this.maxHistoryLength = maxHistoryLength;
  }

  /**
   * Maintain bounded history for memory efficiency
   */
  maintainBoundedHistory<T>(history: T[]): T[] {
    if (history.length > this.maxHistoryLength) {
      return history.slice(-this.maxHistoryLength);
    }
    return history;
  }

  /**
   * Reset HMM state while preserving essential information
   */
  resetState(state: any): any {
    return {
      ...state,
      candidates: [],
      probabilities: [],
      backpointers: [],
      pathLength: 0
    };
  }

  /**
   * Check if HMM state needs reset based on performance
   */
  shouldResetState(
    confidenceHistory: number[],
    teleportCount: number,
    minConfidenceThreshold: number = 0.3,
    maxTeleports: number = 3
  ): boolean {
    // Reset if too many teleports
    if (teleportCount >= maxTeleports) {
      return true;
    }

    // Reset if confidence consistently low
    if (confidenceHistory.length >= 5) {
      const recentConfidence = confidenceHistory.slice(-5);
      const avgConfidence = recentConfidence.reduce((a, b) => a + b, 0) / recentConfidence.length;
      if (avgConfidence < minConfidenceThreshold) {
        return true;
      }
    }

    return false;
  }
}