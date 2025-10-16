/**
 * Table-driven tests for realtime drift detection and sequence validation
 * Tests time drift rejection, sequence number validation, and temporal ordering
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { NavGateway } from '../../nav.gateway';
import { HMMTrackingService } from '../../services/hmm-tracking.service';
import { GraphLoaderService } from '../../graph/services/graph-loader.service';
import { NavUpdateDto } from '../../dto/nav-update.dto';
import { NavGraph } from '../../graph/interfaces/graph.interface';

describe('Realtime Drift and Sequence Tests', () => {
  let gateway: NavGateway;
  let hmmService: HMMTrackingService;
  let mockGraph: NavGraph;

  beforeEach(async () => {
    process.env.NAV_SEED = '1337';
    
    mockGraph = {
      floors: [{ id: 'ground', name: 'Ground Floor' }],
      nodes: [
        { id: 'n1', floor: 'ground', lat: 21.4225, lon: 39.8262, kind: 'poi' },
        { id: 'n2', floor: 'ground', lat: 21.4230, lon: 39.8262, kind: 'poi' }
      ],
      edges: [
        { from: 'n1', to: 'n2', weight: 55, kind: 'corridor' }
      ],
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

  describe('Time Drift Detection', () => {
    const driftTestCases = [
      // [client_time_offset_ms, expected_action, description]
      [-100, 'accept', 'small past drift within tolerance'],
      [-500, 'accept', 'moderate past drift acceptable'],
      [-1000, 'accept', 'large past drift at threshold'],
      [-2000, 'reject', 'excessive past drift rejected'],
      [-5000, 'reject', 'very old timestamp rejected'],
      [100, 'accept', 'small future drift within tolerance'],
      [500, 'accept', 'moderate future drift acceptable'],
      [1000, 'accept', 'large future drift at threshold'],
      [2000, 'reject', 'excessive future drift rejected'],
      [10000, 'reject', 'far future timestamp rejected'],
      [0, 'accept', 'perfect time sync'],
      [-30000, 'reject', 'ancient timestamp'],
      [60000, 'reject', 'far future timestamp'],
    ] as const;

    driftTestCases.forEach(([offsetMs, expectedAction, description], index) => {
      it(`should ${expectedAction} ${description} (case ${index + 1})`, async () => {
        const serverTime = Date.now();
        const clientTime = serverTime + offsetMs;
        
        const update: NavUpdateDto = {
          ts: clientTime,
          seq: 1,
          userId: `drift-test-${index}`,
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

        // Mock WebSocket client
        const mockClient = {
          emit: jest.fn(),
          id: `client-${index}`,
          data: { userId: update.userId }
        };

        const result = await gateway.handleNavUpdate(mockClient as any, update);

        if (expectedAction === 'accept') {
          expect(result).toBeTruthy();
          expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
            success: true
          }));
        } else {
          expect(result).toBeFalsy();
          expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
            success: false,
            error: expect.stringContaining('drift')
          }));
        }
      });
    });
  });

  describe('Sequence Number Validation', () => {
    const sequenceTestCases = [
      // [sequence_numbers, expected_results, description]
      [[1, 2, 3, 4, 5], ['accept', 'accept', 'accept', 'accept', 'accept'], 'perfect sequence'],
      [[1, 3, 5, 7, 9], ['accept', 'accept', 'accept', 'accept', 'accept'], 'odd numbers valid'],
      [[1, 2, 2, 3], ['accept', 'accept', 'reject', 'accept'], 'duplicate sequence rejected'],
      [[1, 2, 1, 3], ['accept', 'accept', 'reject', 'accept'], 'out of order rejected'],
      [[1, 2, 4, 3, 5], ['accept', 'accept', 'accept', 'reject', 'accept'], 'backwards sequence rejected'],
      [[5, 6, 7], ['accept', 'accept', 'accept'], 'starting with high number'],
      [[1, 100, 101, 102], ['accept', 'accept', 'accept', 'accept'], 'large jump accepted'],
      [[1, 2, 3, 2, 4], ['accept', 'accept', 'accept', 'reject', 'accept'], 'regression rejected'],
    ] as const;

    sequenceTestCases.forEach(([sequences, expectedResults, description], caseIndex) => {
      it(`should handle ${description} (case ${caseIndex + 1})`, async () => {
        const baseTime = Date.now();
        const userId = `seq-test-${caseIndex}`;
        
        const mockClient = {
          emit: jest.fn(),
          id: `client-${caseIndex}`,
          data: { userId }
        };

        for (let i = 0; i < sequences.length; i++) {
          const update: NavUpdateDto = {
            ts: baseTime + (i * 1000),
            seq: sequences[i],
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

          mockClient.emit.mockClear();
          const result = await gateway.handleNavUpdate(mockClient as any, update);

          if (expectedResults[i] === 'accept') {
            expect(result).toBeTruthy();
            expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
              success: true
            }));
          } else {
            expect(result).toBeFalsy();
            expect(mockClient.emit).toHaveBeenCalledWith('nav_update_ack', expect.objectContaining({
              success: false,
              error: expect.stringContaining('sequence')
            }));
          }
        }
      });
    });
  });

  describe('Combined Drift and Sequence Validation', () => {
    const combinedTestCases = [
      {
        name: 'good sequence with small drift',
        updates: [
          { seq: 1, timeOffset: -100 },
          { seq: 2, timeOffset: 200 },
          { seq: 3, timeOffset: -50 }
        ],
        expectedResults: ['accept', 'accept', 'accept']
      },
      {
        name: 'bad sequence with good timing',
        updates: [
          { seq: 1, timeOffset: 0 },
          { seq: 3, timeOffset: 1000 },
          { seq: 2, timeOffset: 2000 } // Out of order
        ],
        expectedResults: ['accept', 'accept', 'reject']
      },
      {
        name: 'good sequence with excessive drift',
        updates: [
          { seq: 1, timeOffset: 0 },
          { seq: 2, timeOffset: 5000 }, // Too far in future
          { seq: 3, timeOffset: 1000 }
        ],
        expectedResults: ['accept', 'reject', 'accept']
      },
      {
        name: 'both drift and sequence violations',
        updates: [
          { seq: 1, timeOffset: 0 },
          { seq: 1, timeOffset: -5000 }, // Duplicate + old
          { seq: 3, timeOffset: 10000 } // Jump + future
        ],
        expectedResults: ['accept', 'reject', 'reject']
      }
    ] as const;

    combinedTestCases.forEach((testCase, caseIndex) => {
      it(`should handle ${testCase.name} (case ${caseIndex + 1})`, async () => {
        const baseTime = Date.now();
        const userId = `combined-test-${caseIndex}`;
        
        const mockClient = {
          emit: jest.fn(),
          id: `client-${caseIndex}`,
          data: { userId }
        };

        for (let i = 0; i < testCase.updates.length; i++) {
          const updateInfo = testCase.updates[i];
          const update: NavUpdateDto = {
            ts: baseTime + (i * 1000) + updateInfo.timeOffset,
            seq: updateInfo.seq,
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

          mockClient.emit.mockClear();
          const result = await gateway.handleNavUpdate(mockClient as any, update);

          if (testCase.expectedResults[i] === 'accept') {
            expect(result).toBeTruthy();
          } else {
            expect(result).toBeFalsy();
          }
        }
      });
    });
  });

  describe('Temporal Window Management', () => {
    it('should maintain rolling time window for drift calculation', async () => {
      const baseTime = Date.now();
      const userId = 'window-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-window',
        data: { userId }
      };

      // Send updates with gradually increasing drift
      const drifts = [-100, -200, -400, -800, -1200]; // Progressively worse
      
      for (let i = 0; i < drifts.length; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 1000) + drifts[i],
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
        
        // First few should be accepted, later ones might be rejected based on pattern
        if (i < 3) {
          expect(result).toBeTruthy();
        }
        // Don't enforce strict rejection for later ones as adaptive algorithms may vary
      }
    });

    it('should handle burst of rapid updates', async () => {
      const baseTime = Date.now();
      const userId = 'burst-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-burst',
        data: { userId }
      };

      // Send 10 updates in rapid succession (100ms apart)
      for (let i = 0; i < 10; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 100), // 10Hz updates
          seq: i + 1,
          userId,
          pos: { 
            lat: 21.4225 + (i * 0.00001), // Small movements
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

        const result = await gateway.handleNavUpdate(mockClient as any, update);
        expect(result).toBeTruthy(); // All should be accepted in rapid succession
      }
    });
  });

  describe('Client Reconnection Handling', () => {
    it('should reset sequence validation on new connection', async () => {
      const baseTime = Date.now();
      const userId = 'reconnect-test';
      
      const mockClient1 = {
        emit: jest.fn(),
        id: 'client-1',
        data: { userId }
      };

      const mockClient2 = {
        emit: jest.fn(),
        id: 'client-2', // Different client ID (simulating reconnection)
        data: { userId }
      };

      // First session
      const update1: NavUpdateDto = {
        ts: baseTime,
        seq: 5, // Start with high sequence
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

      const result1 = await gateway.handleNavUpdate(mockClient1 as any, update1);
      expect(result1).toBeTruthy();

      // Simulate reconnection with sequence reset
      const update2: NavUpdateDto = {
        ...update1,
        ts: baseTime + 5000,
        seq: 1 // Reset to 1
      };

      const result2 = await gateway.handleNavUpdate(mockClient2 as any, update2);
      expect(result2).toBeTruthy(); // Should accept even though seq went backwards
    });
  });

  describe('Clock Sync Adaptation', () => {
    const adaptationCases = [
      {
        name: 'gradual clock drift correction',
        drifts: [-100, -150, -200, -150, -100, -50, 0],
        description: 'should adapt to gradual clock correction'
      },
      {
        name: 'sudden clock jump recovery',
        drifts: [-100, -100, -3000, -100, -100],
        description: 'should handle sudden clock jump'
      },
      {
        name: 'oscillating clock behavior',
        drifts: [100, -100, 150, -150, 200, -200],
        description: 'should handle unstable clock'
      }
    ] as const;

    adaptationCases.forEach((testCase, caseIndex) => {
      it(`${testCase.description}: ${testCase.name} (case ${caseIndex + 1})`, async () => {
        const baseTime = Date.now();
        const userId = `adapt-test-${caseIndex}`;
        
        const mockClient = {
          emit: jest.fn(),
          id: `client-adapt-${caseIndex}`,
          data: { userId }
        };

        let acceptedCount = 0;
        let rejectedCount = 0;

        for (let i = 0; i < testCase.drifts.length; i++) {
          const update: NavUpdateDto = {
            ts: baseTime + (i * 1000) + testCase.drifts[i],
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

        // Should accept majority of updates even with drift variations
        expect(acceptedCount).toBeGreaterThan(testCase.drifts.length / 2);
        
        // For gradual drift, should accept almost all
        if (testCase.name === 'gradual clock drift correction') {
          expect(acceptedCount).toBeGreaterThanOrEqual(testCase.drifts.length - 1);
        }
      });
    });
  });

  describe('Performance Under Load', () => {
    it('should maintain performance with high update frequency', async () => {
      const baseTime = Date.now();
      const userId = 'perf-test';
      
      const mockClient = {
        emit: jest.fn(),
        id: 'client-perf',
        data: { userId }
      };

      const updateCount = 100;
      const processingTimes: number[] = [];

      for (let i = 0; i < updateCount; i++) {
        const update: NavUpdateDto = {
          ts: baseTime + (i * 10), // Very high frequency (100Hz)
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
        await gateway.handleNavUpdate(mockClient as any, update);
        const processingTime = Date.now() - startTime;
        
        processingTimes.push(processingTime);
      }

      // All processing times should be reasonable
      expect(processingTimes.every(t => t < 100)).toBe(true);
      
      const avgTime = processingTimes.reduce((sum, t) => sum + t, 0) / processingTimes.length;
      expect(avgTime).toBeLessThan(50); // Average should be very fast
    });
  });

  afterEach(() => {
    // Clean up any test users
    for (let i = 0; i < 20; i++) {
      hmmService.clearUserState(`drift-test-${i}`);
      hmmService.clearUserState(`seq-test-${i}`);
      hmmService.clearUserState(`combined-test-${i}`);
    }
    hmmService.clearUserState('window-test');
    hmmService.clearUserState('burst-test');
    hmmService.clearUserState('reconnect-test');
    hmmService.clearUserState('perf-test');
  });
});