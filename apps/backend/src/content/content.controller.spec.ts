import { Test, TestingModule } from '@nestjs/testing';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';

describe('ContentController', () => {
  let controller: ContentController;
  let service: ContentService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ContentController],
      providers: [ContentService],
    }).compile();

    controller = module.get<ContentController>(ContentController);
    service = module.get<ContentService>(ContentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('/content/qibla endpoint', () => {
    describe('Qibla calculation acceptance tests', () => {
      it('should calculate correct Qibla bearing for Paris with ±1.5° tolerance', async () => {
        const result = await controller.getQiblaDirection(48.8566, 2.3522);
        
        expect(result).toBeDefined();
        expect(result.location.latitude).toBe(48.8566);
        expect(result.location.longitude).toBe(2.3522);
        expect(result.qibla.direction).toBeGreaterThanOrEqual(118.99 - 1.5);
        expect(result.qibla.direction).toBeLessThanOrEqual(118.99 + 1.5);
        expect(result.qibla.distance).toBeGreaterThan(0);
        expect(result.kaaba.latitude).toBe(21.4225);
        expect(result.kaaba.longitude).toBe(39.8262);
        expect(result.calculatedAt).toBeDefined();
      });

      it('should calculate correct Qibla bearing for NYC with ±1.5° tolerance', async () => {
        const result = await controller.getQiblaDirection(40.7128, -74.0060);
        
        expect(result).toBeDefined();
        expect(result.location.latitude).toBe(40.7128);
        expect(result.location.longitude).toBe(-74.0060);
        expect(result.qibla.direction).toBeGreaterThanOrEqual(58.48 - 1.5);
        expect(result.qibla.direction).toBeLessThanOrEqual(58.48 + 1.5);
        expect(result.qibla.distance).toBeGreaterThan(0);
        expect(result.kaaba.latitude).toBe(21.4225);
        expect(result.kaaba.longitude).toBe(39.8262);
        expect(result.calculatedAt).toBeDefined();
      });

      it('should calculate correct Qibla bearing for Jakarta with ±1.5° tolerance', async () => {
        const result = await controller.getQiblaDirection(-6.2088, 106.8456);
        
        expect(result).toBeDefined();
        expect(result.location.latitude).toBe(-6.2088);
        expect(result.location.longitude).toBe(106.8456);
        expect(result.qibla.direction).toBeGreaterThanOrEqual(295.15 - 1.5);
        expect(result.qibla.direction).toBeLessThanOrEqual(295.15 + 1.5);
        expect(result.qibla.distance).toBeGreaterThan(0);
        expect(result.kaaba.latitude).toBe(21.4225);
        expect(result.kaaba.longitude).toBe(39.8262);
        expect(result.calculatedAt).toBeDefined();
      });
    });

    describe('Input validation', () => {
      it('should throw error when latitude parameter is missing', async () => {
        await expect(controller.getQiblaDirection(undefined, 2.3522))
          .rejects
          .toThrow('Missing required parameters: lat and lng must be provided');
      });

      it('should throw error when longitude parameter is missing', async () => {
        await expect(controller.getQiblaDirection(48.8566, undefined))
          .rejects
          .toThrow('Missing required parameters: lat and lng must be provided');
      });

      it('should throw error when both parameters are missing', async () => {
        await expect(controller.getQiblaDirection(undefined, undefined))
          .rejects
          .toThrow('Missing required parameters: lat and lng must be provided');
      });

      it('should throw error for invalid latitude > 90', async () => {
        await expect(controller.getQiblaDirection(91, 0))
          .rejects
          .toThrow('Invalid latitude: must be between -90 and 90 degrees');
      });

      it('should throw error for invalid latitude < -90', async () => {
        await expect(controller.getQiblaDirection(-91, 0))
          .rejects
          .toThrow('Invalid latitude: must be between -90 and 90 degrees');
      });

      it('should throw error for invalid longitude > 180', async () => {
        await expect(controller.getQiblaDirection(0, 181))
          .rejects
          .toThrow('Invalid longitude: must be between -180 and 180 degrees');
      });

      it('should throw error for invalid longitude < -180', async () => {
        await expect(controller.getQiblaDirection(0, -181))
          .rejects
          .toThrow('Invalid longitude: must be between -180 and 180 degrees');
      });

      it('should accept boundary values', async () => {
        await expect(controller.getQiblaDirection(90, 0)).resolves.toBeDefined();
        await expect(controller.getQiblaDirection(-90, 0)).resolves.toBeDefined();
        await expect(controller.getQiblaDirection(0, 180)).resolves.toBeDefined();
        await expect(controller.getQiblaDirection(0, -180)).resolves.toBeDefined();
      });
    });

    describe('Response format validation', () => {
      it('should return response with correct structure', async () => {
        const result = await controller.getQiblaDirection(48.8566, 2.3522);
        
        expect(result).toHaveProperty('location');
        expect(result).toHaveProperty('qibla');
        expect(result).toHaveProperty('kaaba');
        expect(result).toHaveProperty('calculatedAt');
        
        expect(result.location).toHaveProperty('latitude');
        expect(result.location).toHaveProperty('longitude');
        
        expect(result.qibla).toHaveProperty('direction');
        expect(result.qibla).toHaveProperty('distance');
        
        expect(result.kaaba).toHaveProperty('latitude');
        expect(result.kaaba).toHaveProperty('longitude');
        
        expect(typeof result.qibla.direction).toBe('number');
        expect(typeof result.qibla.distance).toBe('number');
        expect(typeof result.calculatedAt).toBe('string');
      });

      it('should return bearing in 0-360 range', async () => {
        const testLocations = [
          [48.8566, 2.3522],    // Paris
          [40.7128, -74.0060],  // NYC
          [-6.2088, 106.8456],  // Jakarta
          [35.6762, 139.6503],  // Tokyo
          [51.5074, -0.1278],   // London
        ];

        for (const [lat, lng] of testLocations) {
          const result = await controller.getQiblaDirection(lat, lng);
          expect(result.qibla.direction).toBeGreaterThanOrEqual(0);
          expect(result.qibla.direction).toBeLessThan(360);
        }
      });

      it('should return positive distance values', async () => {
        const result = await controller.getQiblaDirection(48.8566, 2.3522);
        expect(result.qibla.distance).toBeGreaterThan(0);
      });

      it('should return valid ISO timestamp', async () => {
        const result = await controller.getQiblaDirection(48.8566, 2.3522);
        const timestamp = new Date(result.calculatedAt);
        expect(timestamp).toBeInstanceOf(Date);
        expect(timestamp.getTime()).not.toBeNaN();
      });
    });

    describe('Real calculation verification (no mocks)', () => {
      it('should use real great-circle calculation, not mock data', async () => {
        // Test with multiple different locations
        const paris = await controller.getQiblaDirection(48.8566, 2.3522);
        const nyc = await controller.getQiblaDirection(40.7128, -74.0060);
        const jakarta = await controller.getQiblaDirection(-6.2088, 106.8456);
        
        // Verify all results are different (proving it's not returning mock data)
        expect(paris.qibla.direction).not.toBe(nyc.qibla.direction);
        expect(paris.qibla.direction).not.toBe(jakarta.qibla.direction);
        expect(nyc.qibla.direction).not.toBe(jakarta.qibla.direction);
        
        // Verify distances are different
        expect(paris.qibla.distance).not.toBe(nyc.qibla.distance);
        expect(paris.qibla.distance).not.toBe(jakarta.qibla.distance);
        expect(nyc.qibla.distance).not.toBe(jakarta.qibla.distance);
        
        // Verify none of them return the old mock value of 0
        expect(paris.qibla.direction).not.toBe(0);
        expect(nyc.qibla.direction).not.toBe(0);
        expect(jakarta.qibla.direction).not.toBe(0);
        
        // Verify distances are not 0 (the old mock value)
        expect(paris.qibla.distance).not.toBe(0);
        expect(nyc.qibla.distance).not.toBe(0);
        expect(jakarta.qibla.distance).not.toBe(0);
      });

      it('should provide consistent results for same input', async () => {
        const result1 = await controller.getQiblaDirection(48.8566, 2.3522);
        const result2 = await controller.getQiblaDirection(48.8566, 2.3522);
        
        expect(result1.qibla.direction).toBe(result2.qibla.direction);
        expect(result1.qibla.distance).toBe(result2.qibla.distance);
      });
    });
  });
});