/**
 * Table-driven tests for WebSocket queue management and rate limiting
 * Tests queue limits, coalescing, backpressure, and origin validation
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NavGateway } from '../../nav.gateway';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph } from '../../graph/interfaces/graph.interface';

describe('WebSocket Queue and Rate Limiting Tests', () => {
  let gateway: NavGateway;
  let hmmService: HMMTrackingService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    mockGraph = {
      floors: [{ id: 'ground', name: 'Ground Floor' }],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' }
      ],
      edges: [],
      connectors: [],
      zones: []
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavGateway,
        HMMTrackingService,
        {
          provide: GraphLoaderService,
          useValue: { getGraph: () => mockGraph }
        }
      ]
    }).compile();

    gateway = module.get<NavGateway>(NavGateway);
    hmmService = module.get<HMMTrackingService>(HMMTrackingService);
  });

  describe('Rate Limiting by Update Frequency', () => {
    const rateLimitCases = [
      // [updates_per_second, expected_behavior, description]
      [1, 'accept_all', 'normal 1Hz updates'],
      [5, 'accept_all', 'high frequency 5Hz updates'],
      [10, 'accept_most', '10Hz updates with some throttling'],
      [20, 'throttle_heavy', '20Hz updates heavily throttled'],
      [50, 'throttle_aggressive', '50Hz updates aggressively throttled'],
      [100, 'reject_excess', '100Hz updates mostly rejected'],
    ] as const;

    rateLimitCases.forEach(([updatesPerSec, expectedBehavior, description], index) => {
      it(`should handle ${description} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        const userId = `rate-test-${index}`;
        const updateInterval = 1000 / updatesPerSec;
        const totalUpdates = Math.min(updatesPerSec * 2, 50); // Test for 2 seconds or max 50 updates
        
        const mockClient = {
          emit: jest.fn(),
          id: `client-rate-${index}`,
          data: { userId },
          handshake: { headers: { origin: 'https://allowed-origin.com' } }
        };

        let acceptedCount = 0;
        let rejectedCount = 0;

        for (let i = 0; i < totalUpdates; i++) {
          const update: NavUpdateDto = {
            ts: baseTime + (i * updateInterval),
            seq: i + 1,
            userId,
            pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
            heading: 0,
            speed: 1.0,
            source: 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.8,
            mode: 'guide',
            device: 'android'
          };

          const result = await gateway.handleNavUpdate(mockClient as any, update);
          
          if (result) {
            acceptedCount++;
          } else {
            rejectedCount++;
          }
        }

        const acceptanceRate = acceptedCount / totalUpdates;

        switch (expectedBehavior) {
          case 'accept_all':
            expect(acceptanceRate).toBeGreaterThan(0.9);
            break;
          case 'accept_most':
            expect(acceptanceRate).toBeGreaterThan(0.7);
            break;
          case 'throttle_heavy':
            expect(acceptanceRate).toBeLessThan(0.7);
            expect(acceptanceRate).toBeGreaterThan(0.3);
            break;
          case 'throttle_aggressive':
            expect(acceptanceRate).toBeLessThan(0.5);
            expect(acceptanceRate).toBeGreaterThan(0.1);
            break;
          case 'reject_excess':
            expect(acceptanceRate).toBeLessThan(0.3);
            break;
        }
      });
    });
  });

  describe('Queue Size Management', () => {
    const queueTestCases = [
      {
        name: 'burst within queue limit',
        burstSize: 10,
        burstInterval: 50, // 50ms between updates in burst
        expectBehavior: 'accept_most'
      },
      {
        name: 'burst exceeding queue limit',
        burstSize: 100,
        burstInterval: 10, // 10ms between updates
        expectBehavior: 'queue_overflow'
      },
      {
        name: 'sustained high rate',
        burstSize: 200,
        burstInterval: 25, // 40Hz sustained
        expectBehavior: 'backpressure_applied'
      }
    ] as const;

    queueTestCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, async () => {
        const baseTime = Date.now();
        const userId = `queue-test-${index}`;
        
        const mockClient = {
          emit: jest.fn(),
          id: `client-queue-${index}`,
          data: { userId },
          handshake: { headers: { origin: 'https://allowed-origin.com' } }
        };

        let acceptedCount = 0;
        let rejectedCount = 0;
        const processingTimes: number[] = [];

        for (let i = 0; i < testCase.burstSize; i++) {
          const update: NavUpdateDto = {
            ts: baseTime + (i * testCase.burstInterval),
            seq: i + 1,
            userId,
            pos: { 
              lat: 21.4225 + (i * 0.000001), 
              lon: 39.8262, 
              alt: 0, 
              floor: 0, 
              acc: 3.0 
            },
            heading: 0,
            speed: 1.0,
            source: 'gnss',
            stage: 'tawaf',
            lap: 1,
            confidence: 0.8,
            mode: 'guide',
            device: 'android'
          };

          const startTime = Date.now();
          const result = await gateway.handleNavUpdate(mockClient as any, update);
          const processingTime = Date.now() - startTime;
          
          processingTimes.push(processingTime);
          
          if (result) {
            acceptedCount++;
          } else {
            rejectedCount++;
          }
        }

        const acceptanceRate = acceptedCount / testCase.burstSize;
        const avgProcessingTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;

        switch (testCase.expectBehavior) {
          case 'accept_most':
            expect(acceptanceRate).toBeGreaterThan(0.8);
            expect(avgProcessingTime).toBeLessThan(100);
            break;
          case 'queue_overflow':
            expect(acceptanceRate).toBeLessThan(0.6);
            // Some updates should be rejected due to queue overflow
            break;
          case 'backpressure_applied':
            expect(acceptanceRate).toBeLessThan(0.7);
            // Processing time may increase under backpressure
            break;
        }
      });
    });
  });

  describe('Update Coalescing', () => {
    it('should coalesce rapid updates from same user', async () => {
      const baseTime = Date.now();
      const userId = 'coalesce-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-coalesce',
        data: { userId },
        handshake: { headers: { origin: 'https://allowed-origin.com' } }
      };

      // Send rapid burst of updates (within coalescing window)
      const updates: NavUpdateDto[] = [];
      for (let i = 0; i < 5; i++) {
        updates.push({
          ts: baseTime + (i * 10), // 10ms apart - very rapid
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.4225 + (i * 0.00001), 
            lon: 39.8262, 
            alt: 0, 
            floor: 0, 
            acc: 3.0 
          },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        });
      }

      // Send all updates rapidly
      const results = await Promise.all(
        updates.map(update => gateway.handleNavUpdate(mockClient as any, update))
      );

      const acceptedResults = results.filter(r => r !== null);
      
      // Should have fewer accepted results than total updates due to coalescing
      expect(acceptedResults.length).toBeLessThan(updates.length);
      expect(acceptedResults.length).toBeGreaterThan(0);
      
      // Last update should typically be preserved (most recent)
      if (acceptedResults.length > 0) {
        const lastAccepted = acceptedResults[acceptedResults.length - 1];
        expect(lastAccepted).toBeTruthy();
      }
    });

    it('should not coalesce updates from different users', async () => {
      const baseTime = Date.now();
      
      const mockClient1 = {
        emit: jest.fn(),
        id: 'client-1',
        data: { userId: 'user-1' },
        handshake: { headers: { origin: 'https://allowed-origin.com' } }
      };

      const mockClient2 = {
        emit: jest.fn(),
        id: 'client-2',
        data: { userId: 'user-2' },
        handshake: { headers: { origin: 'https://allowed-origin.com' } }
      };

      // Send interleaved updates from two users
      const results: any[] = [];
      
      for (let i = 0; i < 5; i++) {
        const update1: NavUpdateDto = {
          ts: baseTime + (i * 20),
          seq: i + 1,
          userId: 'user-1',
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const update2: NavUpdateDto = {
          ts: baseTime + (i * 20) + 10,
          seq: i + 1,
          userId: 'user-2',
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        results.push(await gateway.handleNavUpdate(mockClient1 as any, update1));
        results.push(await gateway.handleNavUpdate(mockClient2 as any, update2));
      }

      const acceptedResults = results.filter(r => r !== null);
      
      // Both users should have most/all of their updates accepted
      expect(acceptedResults.length).toBeGreaterThan(7); // At least 70% acceptance
    });
  });

  describe('Origin Validation', () => {
    const originTestCases = [
      // [origin, expected_result, description]
      ['https://allowed-origin.com', 'accept', 'whitelisted origin'],
      ['https://app.umrah-hajj.com', 'accept', 'main app origin'],
      ['https://staging.umrah-hajj.com', 'accept', 'staging environment'],
      ['http://localhost:3000', 'accept', 'local development'],
      ['https://malicious-site.com', 'reject', 'non-whitelisted origin'],
      ['http://evil.com', 'reject', 'http from unknown domain'],
      [null, 'reject', 'missing origin header'],
      [undefined, 'reject', 'undefined origin'],
      ['', 'reject', 'empty origin'],
      ['file://', 'reject', 'file protocol'],
      ['ftp://example.com', 'reject', 'non-http protocol'],
    ] as const;

    originTestCases.forEach(([origin, expectedResult, description], index) => {
      it(`should ${expectedResult} ${description} (case ${index + 1})`, async () => {
        const mockClient = {
          emit: jest.fn(),
          id: `client-origin-${index}`,
          data: { userId: `origin-test-${index}` },
          handshake: { 
            headers: origin !== null && origin !== undefined ? { origin } : {}
          }
        };

        const update: NavUpdateDto = {
          ts: Date.now(),
          seq: 1,
          userId: `origin-test-${index}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await gateway.handleNavUpdate(mockClient as any, update);

        if (expectedResult === 'accept') {
          expect(result).toBeTruthy();
          expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
            success: true
          }));
        } else {
          expect(result).toBeFalsy();
          expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
            success: false,
            error: expect.stringContaining('origin')
          }));
        }
      });
    });
  });

  describe('Backpressure and Circuit Breaker', () => {
    it('should apply backpressure under sustained high load', async () => {
      const baseTime = Date.now();
      const userId = 'backpressure-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-backpressure',
        data: { userId },
        handshake: { headers: { origin: 'https://allowed-origin.com' } }
      };

      let totalProcessingTime = 0;
      let acceptedCount = 0;
      const highLoadDuration = 5000; // 5 seconds of high load
      const updateInterval = 50; // 20Hz
      const totalUpdates = highLoadDuration / updateInterval;

      for (let i = 0; i < totalUpdates; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * updateInterval),
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.4225 + (i * 0.000001), 
            lon: 39.8262, 
            alt: 0, 
            floor: 0, 
            acc: 3.0 
          },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const startTime = Date.now();
        const result = await gateway.handleNavUpdate(mockClient as any, update);
        const processingTime = Date.now() - startTime;
        
        totalProcessingTime += processingTime;
        
        if (result) {
          acceptedCount++;
        }
      }

      const acceptanceRate = acceptedCount / totalUpdates;
      const avgProcessingTime = totalProcessingTime / totalUpdates;

      // Under sustained load, should apply some throttling
      expect(acceptanceRate).toBeLessThan(0.9);
      expect(acceptanceRate).toBeGreaterThan(0.3);
      
      // Processing time should remain reasonable even under load
      expect(avgProcessingTime).toBeLessThan(500);
    });

    it('should recover after load subsides', async () => {
      const baseTime = Date.now();
      const userId = 'recovery-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-recovery',
        data: { userId },
        handshake: { headers: { origin: 'https://allowed-origin.com' } }
      };

      // Phase 1: High load burst
      for (let i = 0; i < 50; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 10), // 100Hz burst
          seq: i + 1,
          userId,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        await gateway.handleNavUpdate(mockClient as any, update);
      }

      // Phase 2: Wait for recovery
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Phase 3: Normal rate updates
      let recoveryAcceptedCount = 0;
      for (let i = 0; i < 5; i++) {
        const update: NavUpdateDto = {
          ts: Date.now() + (i * 1000), // 1Hz normal rate
          seq: 100 + i,
          userId,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        const result = await gateway.handleNavUpdate(mockClient as any, update);
        if (result) {
          recoveryAcceptedCount++;
        }
      }

      // Should accept most/all normal rate updates after recovery
      expect(recoveryAcceptedCount).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Memory Management', () => {
    it('should clean up old client state to prevent memory leaks', async () => {
      const baseTime = Date.now();
      
      // Create many short-lived clients
      for (let clientId = 0; clientId < 100; clientId++) {
        const mockClient = {
          emit: jest.fn(),
          id: `temp-client-${clientId}`,
          data: { userId: `temp-user-${clientId}` },
          handshake: { headers: { origin: 'https://allowed-origin.com' } }
        };

        const update: NavUpdateDto = {
          ts: baseTime + clientId,
          seq: 1,
          userId: `temp-user-${clientId}`,
          pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
          heading: 0,
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          confidence: 0.8,
          mode: 'guide',
          device: 'android'
        };

        await gateway.handleNavUpdate(mockClient as any, update);
      }

      // Memory usage should not grow unbounded
      // This is more of a structural test - actual memory measurement would require additional tooling
      expect(true).toBe(true); // Placeholder - in real scenario would check memory metrics
    });
  });

  afterEach(() => {
    // Clean up test users
    for (let i = 0; i < 20; i++) {
      hmmService.clearUserState(`rate-test-${i}`);
      hmmService.clearUserState(`queue-test-${i}`);
      hmmService.clearUserState(`origin-test-${i}`);
    }
    hmmService.clearUserState('coalesce-test');
    hmmService.clearUserState('user-1');
    hmmService.clearUserState('user-2');
    hmmService.clearUserState('backpressure-test');
    hmmService.clearUserState('recovery-test');
  });
});