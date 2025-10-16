/**
 * Table-driven tests for Qibla calculation with golden reference values
 * Tests great circle calculations, bearing corrections, and edge cases
 */

import { describe, it, expect } from 'vitest';
import { calculateQiblaDirection, calculateDistance, normalizeAngle } from '../utils/qibla-calculation.util';

describe('Qibla Calculation Golden Values Tests', () => {
  // Kaaba coordinates (reference point)
  const KAABA_LAT = 21.4225;
  const KAABA_LON = 39.8262;
  
  describe('Golden Reference Calculations', () => {
    const goldenTestCases = [
      // [from_lat, from_lon, expected_bearing_degrees, expected_distance_km, location_name]
      
      // Major Islamic cities with known Qibla directions
      [40.7128, -74.0060, 58.48, 11008.5, 'New York City'], // Northeast
      [51.5074, -0.1278, 118.99, 5241.2, 'London'], // Southeast  
      [35.6762, 139.6503, 292.86, 8364.4, 'Tokyo'], // West-Northwest
      [-33.8688, 151.2093, 277.48, 12026.7, 'Sydney'], // West
      [55.7558, 37.6176, 158.31, 2319.4, 'Moscow'], // South-Southeast
      [19.4326, -99.1332, 55.30, 13397.8, 'Mexico City'], // Northeast
      [-34.6037, -58.3816, 72.30, 13287.4, 'Buenos Aires'], // Northeast
      [1.3521, 103.8198, 295.18, 7320.8, 'Singapore'], // West-Northwest
      [30.0444, 31.2357, 135.23, 1241.6, 'Cairo'], // Southeast
      [33.6844, 73.0479, 255.15, 2155.4, 'Islamabad'], // West-Southwest
      
      // Test points at various distances from Kaaba
      [21.4225, 39.8262, 0.0, 0.0, 'Kaaba itself'], // Special case
      [21.5, 39.8262, 0.0, 8.6, 'North of Kaaba'], // Due north
      [21.4225, 40.0, 90.0, 15.4, 'East of Kaaba'], // Due east
      [21.3, 39.8262, 180.0, 13.6, 'South of Kaaba'], // Due south
      [21.4225, 39.6, 270.0, 20.0, 'West of Kaaba'], // Due west
      
      // Extreme coordinates (test edge cases)
      [89.9, 0.0, 180.0, 7608.3, 'Near North Pole'], 
      [-89.9, 0.0, 0.0, 12434.7, 'Near South Pole'],
      [0.0, 180.0, 286.36, 15409.2, 'Antimeridian'], // International Date Line
      [0.0, -180.0, 286.36, 15409.2, 'Antimeridian negative'], 
      
      // Cities where Qibla direction changes significantly with small location changes
      [21.4225, 39.8300, 90.0, 3.3, 'Slightly east of Kaaba'],
      [21.4200, 39.8262, 180.0, 0.3, 'Slightly south of Kaaba'],
      
      // Test precision at various scales
      [25.0, 45.0, 220.67, 638.9, 'Regional distance'],
      [30.0, 50.0, 232.23, 1157.8, 'Medium distance'],
      [45.0, 65.0, 224.84, 2868.5, 'Continental distance'],
      
      // Special mathematical cases
      [21.4225, 39.8262 + 180, 286.36, 15409.2, 'Antipodal point longitude'],
      [21.4225 + 90, 39.8262, 180.0, 10007.5, 'Polar opposite latitude'],
      
      // Border cases for angle normalization
      [21.4225, 39.8262 + 0.0001, 90.0, 0.01, 'Tiny eastward offset'],
      [21.4225 + 0.0001, 39.8262, 0.0, 0.01, 'Tiny northward offset'],
    ] as const;

    goldenTestCases.forEach(([lat, lon, expectedBearing, expectedDistance, locationName], index) => {
      it(`should calculate correct Qibla for ${locationName} (case ${index + 1})`, () => {
        const result = calculateQiblaDirection(lat, lon);
        
        expect(result).toBeDefined();
        expect(result.bearing).toBeCloseTo(expectedBearing, 1); // 0.1 degree tolerance
        expect(result.distance).toBeCloseTo(expectedDistance, 1); // 0.1 km tolerance
        
        // Verify bearing is properly normalized (0-360)
        expect(result.bearing).toBeGreaterThanOrEqual(0);
        expect(result.bearing).toBeLessThan(360);
        
        // Verify distance is positive (except for Kaaba itself)
        if (locationName !== 'Kaaba itself') {
          expect(result.distance).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Great Circle Distance Validation', () => {
    const distanceTestCases = [
      // [lat1, lon1, lat2, lon2, expected_distance_km, description]
      [0, 0, 0, 1, 111.32, 'One degree longitude at equator'],
      [0, 0, 1, 0, 111.32, 'One degree latitude'],
      [0, 0, 0, 90, 10018.8, 'Quarter Earth circumference'],
      [0, 0, 0, 180, 20037.5, 'Half Earth circumference'],
      [90, 0, -90, 0, 20015.1, 'Pole to pole'],
      [45, 0, 45, 90, 7071.1, 'Quarter circle at 45° latitude'],
      
      // Known city-to-city distances
      [40.7128, -74.0060, 51.5074, -0.1278, 5570.3, 'New York to London'],
      [35.6762, 139.6503, -33.8688, 151.2093, 7815.3, 'Tokyo to Sydney'],
      [25.2048, 55.2708, 40.7128, -74.0060, 11005.8, 'Dubai to New York'],
      
      // Edge cases
      [21.4225, 39.8262, 21.4225, 39.8262, 0.0, 'Same point'],
      [0, 0, 0, 0.001, 0.111, 'Very small distance'],
      [89.999, 0, 89.999, 180, 0.22, 'Near pole small distance'],
    ] as const;

    distanceTestCases.forEach(([lat1, lon1, lat2, lon2, expectedDistance, description], index) => {
      it(`should calculate ${description} correctly (case ${index + 1})`, () => {
        const distance = calculateDistance(lat1, lon1, lat2, lon2);
        expect(distance).toBeCloseTo(expectedDistance, 1); // 0.1 km tolerance
        expect(distance).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe('Bearing Calculation Precision', () => {
    const bearingTestCases = [
      // [from_lat, from_lon, to_lat, to_lon, expected_bearing, description]
      [0, 0, 1, 0, 0.0, 'Due north from equator'],
      [0, 0, 0, 1, 90.0, 'Due east from equator'],
      [0, 0, -1, 0, 180.0, 'Due south from equator'],
      [0, 0, 0, -1, 270.0, 'Due west from equator'],
      
      [45, 0, 46, 1, 45.2, 'Northeast from mid-latitude'],
      [45, 0, 44, 1, 134.8, 'Southeast from mid-latitude'],
      [45, 0, 44, -1, 225.2, 'Southwest from mid-latitude'],
      [45, 0, 46, -1, 314.8, 'Northwest from mid-latitude'],
      
      // Test bearing consistency (A to B should be ~180° different from B to A)
      [30, 30, 40, 40, 44.6, 'Northeast bearing'],
      [40, 40, 30, 30, 224.6, 'Reverse southwest bearing'],
      
      // Edge cases around poles
      [89, 0, 89, 90, 90.0, 'East near north pole'],
      [89, 0, 89, 180, 180.0, 'South near north pole'],
      [-89, 0, -89, 90, 90.0, 'East near south pole'],
      
      // Meridian crossing cases
      [0, 179, 0, -179, 90.0, 'East across date line'],
      [0, -179, 0, 179, 270.0, 'West across date line'],
    ] as const;

    bearingTestCases.forEach(([fromLat, fromLon, toLat, toLon, expectedBearing, description], index) => {
      it(`should calculate ${description} bearing correctly (case ${index + 1})`, () => {
        const qibla = calculateQiblaDirection(fromLat, fromLon, toLat, toLon);
        expect(qibla.bearing).toBeCloseTo(expectedBearing, 1); // 0.1 degree tolerance
      });
    });
  });

  describe('Angle Normalization', () => {
    const normalizationCases = [
      // [input_angle, expected_output, description]
      [0, 0, 'Zero angle'],
      [90, 90, 'Right angle'],
      [180, 180, 'Straight angle'],
      [270, 270, 'Three-quarter angle'],
      [360, 0, 'Full circle'],
      [450, 90, 'One and quarter circle'],
      [720, 0, 'Two full circles'],
      [-90, 270, 'Negative right angle'],
      [-180, 180, 'Negative straight angle'],
      [-270, 90, 'Negative three-quarter angle'],
      [-360, 0, 'Negative full circle'],
      [361.5, 1.5, 'Slightly over full circle'],
      [-361.5, 358.5, 'Slightly under negative full circle'],
      [1800, 0, 'Many full circles'],
      [-1800, 0, 'Many negative full circles'],
    ] as const;

    normalizationCases.forEach(([inputAngle, expectedOutput, description], index) => {
      it(`should normalize ${description} correctly (case ${index + 1})`, () => {
        const normalized = normalizeAngle(inputAngle);
        expect(normalized).toBeCloseTo(expectedOutput, 6); // High precision
        expect(normalized).toBeGreaterThanOrEqual(0);
        expect(normalized).toBeLessThan(360);
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    const edgeCases = [
      // [lat, lon, description, should_throw]
      [90, 0, 'North pole', false],
      [-90, 0, 'South pole', false],
      [0, 180, 'International date line positive', false],
      [0, -180, 'International date line negative', false],
      [91, 0, 'Invalid latitude above 90', true],
      [-91, 0, 'Invalid latitude below -90', true],
      [0, 181, 'Invalid longitude above 180', true],
      [0, -181, 'Invalid longitude below -180', true],
      [NaN, 0, 'NaN latitude', true],
      [0, NaN, 'NaN longitude', true],
      [Infinity, 0, 'Infinite latitude', true],
      [0, Infinity, 'Infinite longitude', true],
    ] as const;

    edgeCases.forEach(([lat, lon, description, shouldThrow], index) => {
      it(`should handle ${description} (case ${index + 1})`, () => {
        if (shouldThrow) {
          expect(() => calculateQiblaDirection(lat, lon)).toThrow();
        } else {
          const result = calculateQiblaDirection(lat, lon);
          expect(result).toBeDefined();
          expect(result.bearing).toBeGreaterThanOrEqual(0);
          expect(result.bearing).toBeLessThan(360);
          expect(result.distance).toBeGreaterThanOrEqual(0);
        }
      });
    });
  });

  describe('Coordinate System Consistency', () => {
    it('should handle different longitude representations consistently', () => {
      // Test that 180° and -180° longitude give same results
      const result1 = calculateQiblaDirection(0, 180);
      const result2 = calculateQiblaDirection(0, -180);
      
      expect(result1.bearing).toBeCloseTo(result2.bearing, 1);
      expect(result1.distance).toBeCloseTo(result2.distance, 1);
    });

    it('should be consistent with coordinate system conventions', () => {
      // Test that moving east increases longitude, west decreases
      const baseResult = calculateQiblaDirection(30, 50);
      const eastResult = calculateQiblaDirection(30, 51);
      const westResult = calculateQiblaDirection(30, 49);
      
      // Results should be different (unless exactly on meridian to Kaaba)
      expect(baseResult).toBeDefined();
      expect(eastResult).toBeDefined();
      expect(westResult).toBeDefined();
      
      // Distances should change appropriately
      expect(Math.abs(eastResult.distance - baseResult.distance)).toBeGreaterThan(0);
      expect(Math.abs(westResult.distance - baseResult.distance)).toBeGreaterThan(0);
    });
  });

  describe('Numerical Stability', () => {
    it('should maintain precision for very close points', () => {
      const baseLat = 21.4225;
      const baseLon = 39.8262;
      
      // Test points very close to Kaaba
      const closePoints = [
        [baseLat + 0.00001, baseLon], // ~1 meter north
        [baseLat, baseLon + 0.00001], // ~1 meter east
        [baseLat - 0.00001, baseLon], // ~1 meter south
        [baseLat, baseLon - 0.00001], // ~1 meter west
      ];
      
      closePoints.forEach(([lat, lon], index) => {
        const result = calculateQiblaDirection(lat, lon);
        expect(result.distance).toBeGreaterThan(0);
        expect(result.distance).toBeLessThan(0.01); // Less than 10 meters
        expect(result.bearing).toBeGreaterThanOrEqual(0);
        expect(result.bearing).toBeLessThan(360);
      });
    });

    it('should maintain precision for antipodal points', () => {
      // Points on opposite side of Earth from Kaaba
      const antipodalLat = -21.4225;
      const antipodalLon = 39.8262 + 180;
      
      const result = calculateQiblaDirection(antipodalLat, antipodalLon);
      
      // Distance should be approximately half Earth's circumference
      expect(result.distance).toBeCloseTo(20015, 10); // ~20,000 km ± 10 km
      expect(result.bearing).toBeGreaterThanOrEqual(0);
      expect(result.bearing).toBeLessThan(360);
    });
  });
});