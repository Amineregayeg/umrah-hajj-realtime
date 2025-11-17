/**
 * Test setup for deterministic behavior
 * Implements NAV_SEED=1337 for consistent test results
 */

// Set timezone to UTC for consistent date/time behavior
process.env.TZ = 'UTC';

// Set deterministic seed for navigation tests
const NAV_SEED = process.env.NAV_SEED ? parseInt(process.env.NAV_SEED) : 1337;
process.env.NAV_SEED = NAV_SEED.toString();

// Set mock environment variables for testing
process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'sk-test-mock-key-for-testing';
process.env.NODE_ENV = process.env.NODE_ENV || 'test';

// Fixed timestamp for deterministic behavior: July 1, 2021 00:00:00 UTC
const FIXED_TIMESTAMP = 1625097600000;

// Store original functions
const originalDateNow = Date.now;
const originalMathRandom = Math.random;

// Deterministic random number generator (Linear Congruential Generator)
class DeterministicRandom {
  private seed: number;
  private current: number;

  constructor(seed: number) {
    this.seed = seed;
    this.current = seed;
  }

  next(): number {
    // LCG formula: (a * seed + c) % m
    this.current = (this.current * 1664525 + 1013904223) % 4294967296;
    return this.current / 4294967296;
  }

  reset(): void {
    this.current = this.seed;
  }
}

const deterministicRandom = new DeterministicRandom(NAV_SEED);

// Global setup for deterministic behavior
let timeOffset = 0;

// Mock Date.now() with incremental timestamps
Date.now = () => {
  return FIXED_TIMESTAMP + timeOffset++;
};

// Mock Math.random() with deterministic sequence
deterministicRandom.reset();
Math.random = () => deterministicRandom.next();

// Set CI environment flag
if (process.env.CI === 'true') {
  // Disable colors in CI
  process.env.FORCE_COLOR = '0';
}

// Export test utilities
export const testUtils = {
  FIXED_TIMESTAMP,
  NAV_SEED,
  
  // Create deterministic timestamp with offset
  createTimestamp(offset: number = 0): number {
    return FIXED_TIMESTAMP + offset;
  },

  // Create deterministic coordinates
  createCoordinates(seed: number = 0): { lat: number; lon: number } {
    const coordRandom = new DeterministicRandom(NAV_SEED + seed);
    return {
      lat: 21.4225 + (coordRandom.next() - 0.5) * 0.01,
      lon: 39.8262 + (coordRandom.next() - 0.5) * 0.01
    };
  },

  // Create deterministic user ID
  createUserId(index: number = 0): string {
    return `user-${NAV_SEED}-${index}`;
  },

  // Create deterministic session ID
  createSessionId(index: number = 0): string {
    return `session-${NAV_SEED}-${index}`;
  },

  // Reset random generator
  resetRandom(): void {
    deterministicRandom.reset();
    timeOffset = 0;
  },

  // Create deterministic navigation update
  createNavUpdate(overrides: any = {}) {
    return {
      ts: FIXED_TIMESTAMP + timeOffset++,
      seq: 1,
      userId: `user-${NAV_SEED}`,
      pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
      heading: 0,
      speed: 1.0,
      source: 'gnss' as const,
      stage: 'tawaf' as const,
      lap: 1,
      confidence: 0.8,
      mode: 'guide' as const,
      device: 'android' as const,
      ...overrides
    };
  }
};

// Cleanup function for tests
export const cleanupTestUtils = () => {
  // Restore original functions
  Date.now = originalDateNow;
  Math.random = originalMathRandom;
  
  // Reset offsets
  timeOffset = 0;
  deterministicRandom.reset();
};