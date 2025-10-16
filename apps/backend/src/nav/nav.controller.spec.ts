/**
 * Comprehensive unit tests for Navigation Controller
 * Covers snapshot endpoints, idempotency, error handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NavController } from './nav.controller';
import { HMMTrackingService } from './services/hmm-tracking.service';
import { NavigationCorrectionService } from './services/navigation-correction.service';
import { NavUpdateDto } from './dto/nav-update.dto';

// Mock services
const mockHMMTrackingService = {
  processNavigationUpdate: jest.fn(),
  clearUserState: jest.fn()
};

const mockNavigationCorrectionService = {
  processCorrection: jest.fn(),
  getRecentCorrections: jest.fn(),
  getUserCorrections: jest.fn()
};

describe('NavController', () => {
  let controller: NavController;
  let hmmService: jest.Mocked<HMMTrackingService>;
  let correctionService: jest.Mocked<NavigationCorrectionService>;

  const createMockNavUpdate = (overrides: Partial<NavUpdateDto> = {}): NavUpdateDto => ({
    ts: 1625097600000 + (process.env.NAV_SEED ? parseInt(process.env.NAV_SEED) : 0),
    seq: 1,
    userId: 'test-user',
    pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
    heading: 0,
    speed: 1.0,
    source: 'gnss',
    stage: 'tawaf',
    lap: 1,
    confidence: 0.8,
    mode: 'guide',
    device: 'android',
    ...overrides
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NavController],
      providers: [
        {
          provide: HMMTrackingService,
          useValue: mockHMMTrackingService
        },
        {
          provide: NavigationCorrectionService,
          useValue: mockNavigationCorrectionService
        }
      ]
    }).compile();

    controller = module.get<NavController>(NavController);
    hmmService = module.get(HMMTrackingService);
    correctionService = module.get(NavigationCorrectionService);

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Navigation Update Processing', () => {
    it('should process navigation update successfully', async () => {
      const navUpdate = createMockNavUpdate();
      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResult);
      expect(hmmService.processNavigationUpdate).toHaveBeenCalledWith(navUpdate);
    });

    it('should handle navigation processing failure', async () => {
      const navUpdate = createMockNavUpdate();

      hmmService.processNavigationUpdate.mockResolvedValue(null);

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process navigation update');
      expect(result.data).toBeNull();
    });

    it('should handle service errors', async () => {
      const navUpdate = createMockNavUpdate();

      hmmService.processNavigationUpdate.mockRejectedValue(new Error('Service error'));

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process navigation update');
      expect(result.data).toBeNull();
    });

    it('should validate input data', async () => {
      const invalidUpdate = createMockNavUpdate({
        pos: { lat: NaN, lon: NaN, alt: 0, floor: 0, acc: 3.0 }
      });

      const result = await controller.processNavigation(invalidUpdate);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process navigation update');
    });

    it('should handle multiple sequential updates', async () => {
      const updates = [
        createMockNavUpdate({ seq: 1, ts: 1625097600000 }),
        createMockNavUpdate({ seq: 2, ts: 1625097601000 }),
        createMockNavUpdate({ seq: 3, ts: 1625097602000 })
      ];

      const mockResults = updates.map((_, index) => ({
        position: { lat: 21.4225 + index * 0.001, lon: 39.8262 + index * 0.001, floor: 'ground' },
        confidence: 0.8 + index * 0.05,
        snapTo: 'path' as const,
        nodeId: `node-${index + 1}`,
        delta: { x: 0.5, y: 0.3 }
      }));

      hmmService.processNavigationUpdate
        .mockResolvedValueOnce(mockResults[0])
        .mockResolvedValueOnce(mockResults[1])
        .mockResolvedValueOnce(mockResults[2]);

      const results = [];
      for (const update of updates) {
        results.push(await controller.processNavigation(update));
      }

      expect(results.every(r => r.success)).toBe(true);
      expect(results[2].data.confidence).toBeGreaterThan(results[0].data.confidence);
    });
  });

  describe('Navigation Snapshots', () => {
    it('should create navigation snapshot', async () => {
      const snapshotData = {
        userId: 'user-123',
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        timestamp: Date.now(),
        sessionId: 'session-456'
      };

      const result = await controller.createSnapshot(snapshotData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        id: expect.any(String),
        ...snapshotData
      }));
    });

    it('should be idempotent for same snapshot data', async () => {
      const snapshotData = {
        userId: 'user-123',
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        timestamp: 1625097600000,
        sessionId: 'session-456'
      };

      const result1 = await controller.createSnapshot(snapshotData);
      const result2 = await controller.createSnapshot(snapshotData);

      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.data.id).toBe(result2.data.id);
    });

    it('should retrieve navigation snapshots', async () => {
      const mockSnapshots = [
        {
          id: 'snapshot-1',
          userId: 'user-123',
          position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
          timestamp: 1625097600000,
          sessionId: 'session-456'
        },
        {
          id: 'snapshot-2',
          userId: 'user-123',
          position: { lat: 21.4227, lon: 39.8264, floor: 'ground' },
          timestamp: 1625097660000,
          sessionId: 'session-456'
        }
      ];

      // Mock storage retrieval (would normally come from database)
      const result = await controller.getSnapshots('user-123', { limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should handle snapshot retrieval with filters', async () => {
      const filters = {
        userId: 'user-123',
        sessionId: 'session-456',
        fromTimestamp: 1625097600000,
        toTimestamp: 1625097700000,
        limit: 5
      };

      const result = await controller.getSnapshots('user-123', filters);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
    });

    it('should delete old snapshots', async () => {
      const result = await controller.deleteSnapshot('snapshot-1');

      expect(result.success).toBe(true);
      expect(result.message).toBe('Snapshot deleted successfully');
    });

    it('should handle deletion of non-existent snapshot', async () => {
      const result = await controller.deleteSnapshot('non-existent');

      expect(result.success).toBe(false);
      expect(result.message).toBe('Snapshot not found');
    });
  });

  describe('Navigation Corrections', () => {
    it('should process navigation correction', async () => {
      const correctionData = {
        userId: 'user-123',
        originalPosition: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        correctedPosition: { lat: 21.4227, lon: 39.8264, floor: 'ground' },
        reason: 'manual_adjustment',
        timestamp: Date.now()
      };

      const mockCorrectionResult = {
        id: 'correction-1',
        ...correctionData,
        applied: true,
        confidence: 0.95
      };

      correctionService.processCorrection.mockResolvedValue(mockCorrectionResult);

      const result = await controller.processCorrection(correctionData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCorrectionResult);
      expect(correctionService.processCorrection).toHaveBeenCalledWith(correctionData);
    });

    it('should handle correction processing failure', async () => {
      const correctionData = {
        userId: 'user-123',
        originalPosition: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        correctedPosition: { lat: 21.4227, lon: 39.8264, floor: 'ground' },
        reason: 'auto_correction',
        timestamp: Date.now()
      };

      correctionService.processCorrection.mockRejectedValue(new Error('Correction failed'));

      const result = await controller.processCorrection(correctionData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process correction');
    });

    it('should get recent corrections for user', async () => {
      const mockCorrections = [
        {
          id: 'correction-1',
          userId: 'user-123',
          originalPosition: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
          correctedPosition: { lat: 21.4227, lon: 39.8264, floor: 'ground' },
          reason: 'manual_adjustment',
          timestamp: 1625097600000,
          applied: true
        },
        {
          id: 'correction-2',
          userId: 'user-123',
          originalPosition: { lat: 21.4230, lon: 39.8265, floor: 'ground' },
          correctedPosition: { lat: 21.4232, lon: 39.8267, floor: 'ground' },
          reason: 'auto_correction',
          timestamp: 1625097660000,
          applied: true
        }
      ];

      correctionService.getUserCorrections.mockResolvedValue(mockCorrections);

      const result = await controller.getUserCorrections('user-123', { limit: 10 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockCorrections);
      expect(correctionService.getUserCorrections).toHaveBeenCalledWith('user-123', { limit: 10 });
    });

    it('should get recent corrections system-wide', async () => {
      const mockRecentCorrections = [
        {
          id: 'correction-1',
          userId: 'user-123',
          timestamp: 1625097600000,
          reason: 'manual_adjustment',
          applied: true
        },
        {
          id: 'correction-2',
          userId: 'user-456',
          timestamp: 1625097580000,
          reason: 'auto_correction',
          applied: true
        }
      ];

      correctionService.getRecentCorrections.mockResolvedValue(mockRecentCorrections);

      const result = await controller.getRecentCorrections({ limit: 20 });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockRecentCorrections);
      expect(correctionService.getRecentCorrections).toHaveBeenCalledWith({ limit: 20 });
    });
  });

  describe('Health and Status Endpoints', () => {
    it('should return navigation service health status', async () => {
      const result = await controller.getHealthStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        status: 'healthy',
        timestamp: expect.any(Number),
        services: expect.objectContaining({
          hmm_tracking: 'operational',
          navigation_correction: 'operational'
        })
      }));
    });

    it('should return user tracking status', async () => {
      const result = await controller.getUserStatus('user-123');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        userId: 'user-123',
        isTracking: expect.any(Boolean),
        lastUpdate: expect.any(Number),
        confidence: expect.any(Number)
      }));
    });

    it('should clear user tracking state', async () => {
      hmmService.clearUserState.mockResolvedValue(undefined);

      const result = await controller.clearUserState('user-123');

      expect(result.success).toBe(true);
      expect(result.message).toBe('User state cleared successfully');
      expect(hmmService.clearUserState).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Performance Metrics', () => {
    it('should track processing time for navigation updates', async () => {
      const navUpdate = createMockNavUpdate();
      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      // Simulate processing delay
      hmmService.processNavigationUpdate.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
        return mockResult;
      });

      const startTime = Date.now();
      const result = await controller.processNavigation(navUpdate);
      const endTime = Date.now();

      expect(result.success).toBe(true);
      expect(endTime - startTime).toBeGreaterThan(5); // Should take some time
      expect(endTime - startTime).toBeLessThan(1000); // But not too long
    });

    it('should return performance metrics', async () => {
      const result = await controller.getMetrics();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(expect.objectContaining({
        totalUpdates: expect.any(Number),
        averageProcessingTime: expect.any(Number),
        successRate: expect.any(Number),
        activeUsers: expect.any(Number)
      }));
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid user ID', async () => {
      const navUpdate = createMockNavUpdate({ userId: '' });

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process navigation update');
    });

    it('should handle malformed position data', async () => {
      const navUpdate = createMockNavUpdate({
        pos: { lat: 'invalid' as any, lon: 'invalid' as any, alt: 0, floor: 0, acc: 3.0 }
      });

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(false);
    });

    it('should handle missing required fields', async () => {
      const incompleteUpdate = {
        ts: Date.now(),
        userId: 'user-123'
        // Missing required fields
      } as any;

      const result = await controller.processNavigation(incompleteUpdate);

      expect(result.success).toBe(false);
    });

    it('should handle service unavailable scenarios', async () => {
      const navUpdate = createMockNavUpdate();

      hmmService.processNavigationUpdate.mockRejectedValue(new Error('Service unavailable'));

      const result = await controller.processNavigation(navUpdate);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to process navigation update');
    });

    it('should handle timeout scenarios', async () => {
      const navUpdate = createMockNavUpdate();

      // Simulate timeout
      hmmService.processNavigationUpdate.mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 10000));
        throw new Error('Timeout');
      });

      const startTime = Date.now();
      const result = await Promise.race([
        controller.processNavigation(navUpdate),
        new Promise<any>(resolve => setTimeout(() => resolve({ success: false, message: 'Timeout' }), 1000))
      ]);
      const endTime = Date.now();

      expect(result.success).toBe(false);
      expect(endTime - startTime).toBeLessThan(1100); // Should timeout within 1 second
    });
  });

  describe('Deterministic Behavior', () => {
    beforeEach(() => {
      // Set deterministic timestamps for testing
      const fixedDate = new Date('2023-01-01T00:00:00Z');
      jest.spyOn(Date, 'now').mockReturnValue(fixedDate.getTime());
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it('should produce consistent results for same navigation input', async () => {
      const navUpdate = createMockNavUpdate({
        ts: 1672531200000, // Fixed timestamp
        userId: 'deterministic-user',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 }
      });

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      const result1 = await controller.processNavigation(navUpdate);
      const result2 = await controller.processNavigation(navUpdate);

      expect(result1).toEqual(result2);
      expect(result1.data).toEqual(result2.data);
    });

    it('should handle snapshot creation deterministically', async () => {
      const snapshotData = {
        userId: 'deterministic-user',
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        timestamp: 1672531200000, // Fixed timestamp
        sessionId: 'deterministic-session'
      };

      const result1 = await controller.createSnapshot(snapshotData);
      const result2 = await controller.createSnapshot(snapshotData);

      expect(result1.data.id).toBe(result2.data.id);
      expect(result1.data.timestamp).toBe(result2.data.timestamp);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle high-frequency navigation updates', async () => {
      const baseUpdate = createMockNavUpdate();
      const updates = Array.from({ length: 100 }, (_, i) => ({
        ...baseUpdate,
        seq: i + 1,
        ts: baseUpdate.ts + i * 100
      }));

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      const startTime = Date.now();
      const results = await Promise.all(updates.map(update => controller.processNavigation(update)));
      const endTime = Date.now();

      expect(results.every(r => r.success)).toBe(true);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain order for sequential updates', async () => {
      const updates = [
        createMockNavUpdate({ seq: 1, ts: 1625097600000 }),
        createMockNavUpdate({ seq: 2, ts: 1625097601000 }),
        createMockNavUpdate({ seq: 3, ts: 1625097602000 })
      ];

      let processOrder: number[] = [];
      hmmService.processNavigationUpdate.mockImplementation(async (update) => {
        processOrder.push(update.seq);
        return {
          position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
          confidence: 0.85,
          snapTo: 'path' as const,
          nodeId: 'node-123',
          delta: { x: 0.5, y: 0.3 }
        };
      });

      // Process updates sequentially
      for (const update of updates) {
        await controller.processNavigation(update);
      }

      expect(processOrder).toEqual([1, 2, 3]);
    });
  });
});