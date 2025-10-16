import { qiblaBearingDeg, distanceToKaabaKm, getKaabaCoordinates } from './qibla-calculation.util';

describe('QiblaCalculationUtil', () => {
  describe('qiblaBearingDeg', () => {
    // Test cases for the 3 required cities with ±1.5° tolerance
    describe('Required acceptance tests', () => {
      it('should calculate Qibla bearing for Paris with ±1.5° tolerance', () => {
        const result = qiblaBearingDeg(48.8566, 2.3522);
        const expected = 118.99;
        const tolerance = 1.5;
        
        expect(result).toBeGreaterThanOrEqual(expected - tolerance);
        expect(result).toBeLessThanOrEqual(expected + tolerance);
        // Our calculation: 119.16° is within tolerance (117.49° to 120.49°)
        expect(Math.abs(result - expected)).toBeLessThanOrEqual(tolerance);
      });

      it('should calculate Qibla bearing for New York City with ±1.5° tolerance', () => {
        const result = qiblaBearingDeg(40.7128, -74.0060);
        const expected = 58.48;
        const tolerance = 1.5;
        
        expect(result).toBeGreaterThanOrEqual(expected - tolerance);
        expect(result).toBeLessThanOrEqual(expected + tolerance);
        expect(result).toBeCloseTo(expected, 1);
      });

      it('should calculate Qibla bearing for Jakarta with ±1.5° tolerance', () => {
        const result = qiblaBearingDeg(-6.2088, 106.8456);
        const expected = 295.15;
        const tolerance = 1.5;
        
        expect(result).toBeGreaterThanOrEqual(expected - tolerance);
        expect(result).toBeLessThanOrEqual(expected + tolerance);
        expect(result).toBeCloseTo(expected, 1);
      });
    });

    describe('Edge cases and validation', () => {
      it('should handle locations at the Kaaba (return 0)', () => {
        const kaabaCoords = getKaabaCoordinates();
        const result = qiblaBearingDeg(kaabaCoords.latitude, kaabaCoords.longitude);
        // At Kaaba location, bearing should be 0 or very close to it due to floating point precision
        expect(result).toBeCloseTo(0, 1);
      });

      it('should handle North Pole', () => {
        const result = qiblaBearingDeg(90, 0);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(360);
      });

      it('should handle South Pole', () => {
        const result = qiblaBearingDeg(-90, 0);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(360);
      });

      it('should handle International Date Line (longitude 180)', () => {
        const result = qiblaBearingDeg(0, 180);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(360);
      });

      it('should handle longitude -180 (equivalent to 180)', () => {
        const result = qiblaBearingDeg(0, -180);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThan(360);
      });

      it('should normalize bearing to 0-360 range', () => {
        // Test multiple locations to ensure all results are in valid range
        const testLocations = [
          [48.8566, 2.3522],    // Paris
          [40.7128, -74.0060],  // NYC
          [-6.2088, 106.8456],  // Jakarta
          [35.6762, 139.6503],  // Tokyo
          [51.5074, -0.1278],   // London
          [-33.8688, 151.2093], // Sydney
        ];

        testLocations.forEach(([lat, lng]) => {
          const result = qiblaBearingDeg(lat, lng);
          expect(result).toBeGreaterThanOrEqual(0);
          expect(result).toBeLessThan(360);
        });
      });
    });

    describe('Input validation', () => {
      it('should throw error for invalid latitude > 90', () => {
        expect(() => qiblaBearingDeg(91, 0)).toThrow('Invalid latitude: must be between -90 and 90 degrees');
      });

      it('should throw error for invalid latitude < -90', () => {
        expect(() => qiblaBearingDeg(-91, 0)).toThrow('Invalid latitude: must be between -90 and 90 degrees');
      });

      it('should throw error for invalid longitude > 180', () => {
        expect(() => qiblaBearingDeg(0, 181)).toThrow('Invalid longitude: must be between -180 and 180 degrees');
      });

      it('should throw error for invalid longitude < -180', () => {
        expect(() => qiblaBearingDeg(0, -181)).toThrow('Invalid longitude: must be between -180 and 180 degrees');
      });

      it('should accept boundary values', () => {
        expect(() => qiblaBearingDeg(90, 0)).not.toThrow();
        expect(() => qiblaBearingDeg(-90, 0)).not.toThrow();
        expect(() => qiblaBearingDeg(0, 180)).not.toThrow();
        expect(() => qiblaBearingDeg(0, -180)).not.toThrow();
      });
    });

    describe('Mathematical accuracy', () => {
      it('should be consistent with known geographical bearings', () => {
        // London to Mecca should be roughly Southeast (around 110-120 degrees)
        const londonResult = qiblaBearingDeg(51.5074, -0.1278);
        expect(londonResult).toBeGreaterThan(100);
        expect(londonResult).toBeLessThan(140);

        // Tokyo to Mecca should be roughly West-Southwest (around 280-300 degrees)
        const tokyoResult = qiblaBearingDeg(35.6762, 139.6503);
        expect(tokyoResult).toBeGreaterThan(270);
        expect(tokyoResult).toBeLessThan(310);
      });
    });
  });

  describe('distanceToKaabaKm', () => {
    it('should calculate distance from Paris to Kaaba', () => {
      const result = distanceToKaabaKm(48.8566, 2.3522);
      // Approximate distance from Paris to Mecca is around 4200km
      expect(result).toBeGreaterThan(4000);
      expect(result).toBeLessThan(4500);
    });

    it('should calculate distance from NYC to Kaaba', () => {
      const result = distanceToKaabaKm(40.7128, -74.0060);
      // Approximate distance from NYC to Mecca is around 10000km
      expect(result).toBeGreaterThan(9500);
      expect(result).toBeLessThan(11000);
    });

    it('should calculate distance from Jakarta to Kaaba', () => {
      const result = distanceToKaabaKm(-6.2088, 106.8456);
      // Approximate distance from Jakarta to Mecca is around 7900km
      expect(result).toBeGreaterThan(7500);
      expect(result).toBeLessThan(8500);
    });

    it('should return 0 for Kaaba location', () => {
      const kaabaCoords = getKaabaCoordinates();
      const result = distanceToKaabaKm(kaabaCoords.latitude, kaabaCoords.longitude);
      expect(result).toBeCloseTo(0, 1);
    });
  });

  describe('getKaabaCoordinates', () => {
    it('should return correct Kaaba coordinates', () => {
      const coords = getKaabaCoordinates();
      expect(coords.latitude).toBe(21.4225);
      expect(coords.longitude).toBe(39.8262);
    });
  });

  describe('Integration tests', () => {
    it('should provide consistent results across multiple calculations', () => {
      // Run the same calculation multiple times to ensure consistency
      const lat = 48.8566;
      const lng = 2.3522;
      
      const results = Array(10).fill(0).map(() => qiblaBearingDeg(lat, lng));
      
      // All results should be identical
      results.forEach(result => {
        expect(result).toBe(results[0]);
      });
    });

    it('should handle precision for very close locations', () => {
      const baseResult = qiblaBearingDeg(48.8566, 2.3522);
      
      // Test with very small differences (1 meter precision)
      const veryCloseResult = qiblaBearingDeg(48.8566001, 2.3522001);
      
      // Results should be very close but may have small differences due to precision
      expect(Math.abs(baseResult - veryCloseResult)).toBeLessThan(0.1);
    });
  });
});