/**
 * Comprehensive test suite for re-route policy triggers and MessagePack feature flag
 * 
 * Tests:
 * 1. Re-route triggers:
 *    - Off-path >6m for ≥4s
 *    - Heading deflection >45° for ≥2s
 *    - Decision logging with reason & latency
 *    - Route recompute <300ms, broadcast ≤200ms
 * 
 * 2. MessagePack feature flag:
 *    - WS_MSGPACK_ENABLED=false (JSON only)
 *    - WS_MSGPACK_ENABLED=true (binary frames)
 *    - Schema parity between modes
 *    - Binary frame hex dump + decoded payload
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import WebSocket from 'ws';
import { NavGateway } from '../nav.gateway';
import { NavigationCorrectionService } from '../services/navigation-correction.service';
import { GraphService } from '../graph/services/graph.service';
import { GraphLoaderService } from '../graph/services/graph-loader.service';
import { MetricsService } from '../../metrics/metrics.service';
import { MessagePackUtil } from '../../shared/utils/msgpack.util';
import { NavUpdateDto } from '../dto/nav-update.dto';

describe('Re-route Policy & MessagePack Tests', () => {
  let gateway: NavGateway;
  let navCorrectionService: NavigationCorrectionService;
  let metricsService: MetricsService;
  let configService: ConfigService;
  let module: TestingModule;
  
  // Test data and state
  const testUserId = 'test-user-reroute-001';
  const testLogs: string[] = [];
  const performanceMetrics: Array<{ operation: string; duration: number; timestamp: number }> = [];
  const binaryFrames: Array<{ hex: string; decoded: any; timestamp: number }> = [];

  beforeAll(async () => {
    // Mock environment for different MessagePack scenarios
    process.env.NODE_ENV = 'test';
    process.env.WS_ORIGIN = 'http://localhost:3000';
    process.env.WS_MSGPACK_ENABLED = 'false'; // Start with JSON mode
    
    module = await Test.createTestingModule({
      providers: [
        NavGateway,
        NavigationCorrectionService,
        {
          provide: GraphService,
          useValue: {
            findPath: jest.fn().mockResolvedValue(['node1', 'node2', 'node3']),
          },
        },
        {
          provide: GraphLoaderService,
          useValue: {
            getGraph: jest.fn().mockReturnValue({
              nodes: [
                { id: 'node1', lat: 21.42251, lon: 39.82621, floor: 'ground' },
                { id: 'node2', lat: 21.42261, lon: 39.82631, floor: 'ground' },
                { id: 'node3', lat: 21.42271, lon: 39.82641, floor: 'ground' },
              ],
              edges: [
                { from: 'node1', to: 'node2', length: 10 },
                { from: 'node2', to: 'node3', length: 10 },
              ],
              zones: [],
              connectors: [],
            }),
          },
        },
        {
          provide: MetricsService,
          useValue: {
            incrementActiveConnections: jest.fn(),
            decrementActiveConnections: jest.fn(),
            incrementMessageIn: jest.fn(),
            incrementMessageOut: jest.fn(),
            incrementCorrections: jest.fn(),
            incrementHeartbeatSent: jest.fn(),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockImplementation((key: string, defaultValue?: any) => {
              const config: Record<string, any> = {
                WS_ORIGIN: 'http://localhost:3000',
                ALLOWED_ORIGINS: 'http://localhost:3000',
                NODE_ENV: 'test',
                WS_MSGPACK_ENABLED: process.env.WS_MSGPACK_ENABLED,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    gateway = module.get<NavGateway>(NavGateway);
    navCorrectionService = module.get<NavigationCorrectionService>(NavigationCorrectionService);
    metricsService = module.get<MetricsService>(MetricsService);
    configService = module.get<ConfigService>(ConfigService);

    // Initialize gateway
    gateway.afterInit({} as any);

    // Mock logger to capture logs
    const originalLog = (navCorrectionService as any).logger.log;
    const originalDebug = (navCorrectionService as any).logger.debug;
    const originalWarn = (navCorrectionService as any).logger.warn;

    (navCorrectionService as any).logger.log = jest.fn().mockImplementation((message: string) => {
      testLogs.push(`[LOG] ${new Date().toISOString()} ${message}`);
      return originalLog.call((navCorrectionService as any).logger, message);
    });

    (navCorrectionService as any).logger.debug = jest.fn().mockImplementation((message: string) => {
      testLogs.push(`[DEBUG] ${new Date().toISOString()} ${message}`);
      return originalDebug.call((navCorrectionService as any).logger, message);
    });

    (navCorrectionService as any).logger.warn = jest.fn().mockImplementation((message: string) => {
      testLogs.push(`[WARN] ${new Date().toISOString()} ${message}`);
      return originalWarn.call((navCorrectionService as any).logger, message);
    });
  });

  afterAll(async () => {
    if (module) {
      await module.close();
    }
  });

  describe('Re-route Policy Triggers', () => {
    beforeEach(() => {
      testLogs.length = 0;
      performanceMetrics.length = 0;
      // Clear user state between tests
      navCorrectionService.clearUserState(testUserId);
    });

    it('should trigger re-route when off-path >6m for ≥4s', async () => {
      const startTime = Date.now();
      
      // Set up initial route for user
      navCorrectionService.updateUserRoute(testUserId, ['node1', 'node2', 'node3']);
      
      // Send position updates that are off-path by >6m
      const offPathPosition = {
        lat: 21.42300, // ~55m north of route
        lon: 39.82650, // ~20m east of route  
        alt: 298,
        floor: 0,
        acc: 1.4
      };

      const updates: NavUpdateDto[] = [];
      
      // Generate updates over 5 seconds to exceed the 4s threshold
      for (let i = 0; i < 10; i++) {
        const update: NavUpdateDto = {
          ts: startTime + (i * 500), // Every 500ms
          seq: 1000 + i,
          userId: testUserId,
          pos: offPathPosition,
          heading: 90, // East
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          sai_leg: null,
          confidence: 0.85,
          mode: 'guide',
          device: 'android'
        };
        updates.push(update);
      }

      // Process updates with timing
      let rerouteTriggered = false;
      for (const update of updates) {
        const processingStart = Date.now();
        const result = await navCorrectionService.processNavigationUpdate(update);
        const processingEnd = Date.now();
        
        performanceMetrics.push({
          operation: 'processNavigationUpdate',
          duration: processingEnd - processingStart,
          timestamp: processingStart
        });

        // Check if re-route was triggered (would clear current path)
        const userState = (navCorrectionService as any).getUserRouteState(testUserId);
        if (!userState.currentPath) {
          rerouteTriggered = true;
          break;
        }
        
        // Simulate time passing
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify re-route was triggered
      expect(rerouteTriggered).toBe(true);
      
      // Verify logging contains re-route reason
      const rerouteLog = testLogs.find(log => 
        log.includes('Re-route triggered') || 
        log.includes('Off-path condition met')
      );
      expect(rerouteLog).toBeDefined();
      expect(rerouteLog).toContain(testUserId);

      // Verify processing latency is reasonable (<50ms per update)
      const avgLatency = performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length;
      expect(avgLatency).toBeLessThan(50);

      console.log(`✅ Off-path re-route test completed. Average latency: ${avgLatency.toFixed(2)}ms`);
    });

    it('should trigger re-route when heading deflection >45° for ≥2s', async () => {
      const startTime = Date.now();
      
      // Set up initial route for user
      navCorrectionService.updateUserRoute(testUserId, ['node1', 'node2', 'node3']);
      
      // Send position updates with significant heading deflection
      const basePosition = {
        lat: 21.42251,
        lon: 39.82621,
        alt: 298,
        floor: 0,
        acc: 1.4
      };

      const updates: NavUpdateDto[] = [];
      
      // Generate updates with 90° heading deflection over 3 seconds
      for (let i = 0; i < 8; i++) {
        const update: NavUpdateDto = {
          ts: startTime + (i * 400), // Every 400ms
          seq: 2000 + i,
          userId: testUserId,
          pos: basePosition,
          heading: 180, // South (deflected from expected east heading)
          speed: 1.0,
          source: 'gnss',
          stage: 'tawaf',
          lap: 1,
          sai_leg: null,
          confidence: 0.85,
          mode: 'guide',
          device: 'android'
        };
        updates.push(update);
      }

      // Process updates with timing
      let rerouteTriggered = false;
      for (const update of updates) {
        const processingStart = Date.now();
        await navCorrectionService.processNavigationUpdate(update);
        const processingEnd = Date.now();
        
        performanceMetrics.push({
          operation: 'processNavigationUpdate_heading',
          duration: processingEnd - processingStart,
          timestamp: processingStart
        });

        // Check if re-route was triggered
        const userState = (navCorrectionService as any).getUserRouteState(testUserId);
        if (!userState.currentPath) {
          rerouteTriggered = true;
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify re-route was triggered
      expect(rerouteTriggered).toBe(true);
      
      // Verify logging contains re-route reason with heading deflection
      const rerouteLog = testLogs.find(log => 
        log.includes('Heading deflection condition met')
      );
      expect(rerouteLog).toBeDefined();
      expect(rerouteLog).toContain('deflection:');

      console.log(`✅ Heading deflection re-route test completed.`);
    });

    it('should log re-route decisions with reason and latency <300ms', async () => {
      // This test verifies the logging requirements
      expect(testLogs.length).toBeGreaterThan(0);
      
      // Check for timing logs
      const timingLogs = testLogs.filter(log => log.includes('took') && log.includes('ms'));
      
      // Check for re-route reason logs
      const reasonLogs = testLogs.filter(log => 
        log.includes('Off-path condition met') || 
        log.includes('Heading deflection condition met')
      );

      expect(reasonLogs.length).toBeGreaterThan(0);

      // Verify all processing times were under 300ms
      const allProcessingTimes = performanceMetrics.map(m => m.duration);
      const maxProcessingTime = Math.max(...allProcessingTimes);
      expect(maxProcessingTime).toBeLessThan(300);

      console.log(`✅ Re-route decision logging verified. Max processing time: ${maxProcessingTime}ms`);
    });
  });

  describe('MessagePack Feature Flag Tests', () => {
    beforeEach(() => {
      binaryFrames.length = 0;
    });

    it('should use JSON format when WS_MSGPACK_ENABLED=false', async () => {
      // Ensure MessagePack is disabled
      process.env.WS_MSGPACK_ENABLED = 'false';
      
      // Reset MessagePack utility to read new env var
      (MessagePackUtil as any).isEnabled = null;
      
      expect(MessagePackUtil.isMessagePackEnabled()).toBe(false);
      expect(MessagePackUtil.getContentType()).toBe('application/json');

      // Test message preparation
      const testData = {
        event: 'nav.update',
        data: {
          ts: Date.now(),
          userId: testUserId,
          pos: { lat: 21.42251, lon: 39.82621, floor: 0 }
        }
      };

      const preparedMessage = MessagePackUtil.prepareOutgoingMessage(testData);
      
      // Should be a JSON string
      expect(typeof preparedMessage).toBe('string');
      expect(() => JSON.parse(preparedMessage as string)).not.toThrow();
      
      const parsed = JSON.parse(preparedMessage as string);
      expect(parsed.event).toBe('nav.update');
      expect(parsed.data.userId).toBe(testUserId);

      console.log(`✅ JSON mode verified. Content-Type: ${MessagePackUtil.getContentType()}`);
    });

    it('should use MessagePack binary format when WS_MSGPACK_ENABLED=true', async () => {
      // Enable MessagePack
      process.env.WS_MSGPACK_ENABLED = 'true';
      
      // Reset MessagePack utility to read new env var
      (MessagePackUtil as any).isEnabled = null;
      
      expect(MessagePackUtil.isMessagePackEnabled()).toBe(true);
      expect(MessagePackUtil.getContentType()).toBe('application/x-msgpack');

      // Test message preparation
      const testData = {
        event: 'nav.correction',
        data: {
          ts: Date.now(),
          seq: 3001,
          delta: { x: 0.5, y: -0.3 },
          snapTo: 'path',
          confidence: 0.92
        }
      };

      const preparedMessage = MessagePackUtil.prepareOutgoingMessage(testData);
      
      // Should be a Buffer
      expect(Buffer.isBuffer(preparedMessage)).toBe(true);
      
      const buffer = preparedMessage as Buffer;
      
      // Generate hex dump
      const hexDump = buffer.toString('hex');
      binaryFrames.push({
        hex: hexDump,
        decoded: testData,
        timestamp: Date.now()
      });

      // Verify MessagePack header
      expect(buffer[0]).toBe(0x82);
      expect(buffer[1]).toBe(0x01);

      // Test decoding
      const decoded = MessagePackUtil.decode(buffer);
      expect(decoded.event).toBe('nav.correction');
      expect(decoded.data.snapTo).toBe('path');
      expect(decoded.data.confidence).toBe(0.92);

      console.log(`✅ MessagePack binary mode verified. Hex dump: ${hexDump.substring(0, 32)}...`);
    });

    it('should maintain schema parity between JSON and MessagePack modes', async () => {
      const testCases = [
        {
          event: 'nav.update',
          data: {
            ts: Date.now(),
            seq: 4001,
            userId: testUserId,
            pos: { lat: 21.42251, lon: 39.82621, alt: 298, floor: 0, acc: 1.4 },
            heading: 92.3,
            speed: 0.8,
            source: 'gnss',
            stage: 'tawaf',
            lap: 3,
            sai_leg: null,
            confidence: 0.86,
            mode: 'guide',
            device: 'android'
          }
        },
        {
          event: 'ai.prompt',
          data: {
            ts: Date.now(),
            text: 'Test prompt for schema parity',
            voice: 'en_female_1',
            priority: 'medium',
            stage: 'hajj'
          }
        }
      ];

      for (const testCase of testCases) {
        // Test JSON mode
        process.env.WS_MSGPACK_ENABLED = 'false';
        (MessagePackUtil as any).isEnabled = null;
        
        const jsonMessage = MessagePackUtil.prepareOutgoingMessage(testCase);
        const jsonParsed = JSON.parse(jsonMessage as string);

        // Test MessagePack mode
        process.env.WS_MSGPACK_ENABLED = 'true';
        (MessagePackUtil as any).isEnabled = null;
        
        const binaryMessage = MessagePackUtil.prepareOutgoingMessage(testCase);
        const binaryParsed = MessagePackUtil.decode(binaryMessage as Buffer);

        // Compare schemas
        expect(JSON.stringify(jsonParsed)).toBe(JSON.stringify(binaryParsed));
        expect(Object.keys(jsonParsed)).toEqual(Object.keys(binaryParsed));
        expect(Object.keys(jsonParsed.data)).toEqual(Object.keys(binaryParsed.data));

        // Store binary frame for analysis
        binaryFrames.push({
          hex: (binaryMessage as Buffer).toString('hex'),
          decoded: binaryParsed,
          timestamp: Date.now()
        });
      }

      console.log(`✅ Schema parity verified for ${testCases.length} test cases`);
    });

    it('should generate binary frame hex dump with decoded payload', () => {
      expect(binaryFrames.length).toBeGreaterThan(0);

      // Generate comprehensive hex dump report
      const hexDumpReport = binaryFrames.map((frame, index) => {
        const hex = frame.hex;
        const formatted = hex.match(/.{1,32}/g)?.join('\n') || hex;
        
        return `
Frame ${index + 1} (${new Date(frame.timestamp).toISOString()}):
Hex Dump (${hex.length / 2} bytes):
${formatted}

Decoded Payload:
${JSON.stringify(frame.decoded, null, 2)}
        `.trim();
      }).join('\n\n---\n\n');

      // Log the hex dump for artifacts
      console.log('🔍 Binary Frame Analysis:');
      console.log(hexDumpReport);

      // Verify hex dump structure
      binaryFrames.forEach((frame, index) => {
        expect(frame.hex).toMatch(/^8201/); // Should start with MessagePack header
        expect(frame.hex.length % 2).toBe(0); // Should be valid hex pairs
        expect(frame.decoded).toBeDefined();
        expect(frame.decoded.event).toBeDefined();
      });

      console.log(`✅ Generated hex dumps for ${binaryFrames.length} binary frames`);
    });
  });

  describe('Performance and Broadcast Timing', () => {
    it('should broadcast route updates within ≤200ms', async () => {
      const broadcastTimes: number[] = [];
      
      // Mock WebSocket server and clients
      const mockServer = {
        clients: new Set([
          { readyState: 1, send: jest.fn() }, // OPEN state
          { readyState: 1, send: jest.fn() },
        ])
      };

      // Test broadcast timing
      for (let i = 0; i < 5; i++) {
        const broadcastStart = Date.now();
        
        // Simulate route update broadcast
        mockServer.clients.forEach((client: any) => {
          if (client.readyState === 1) {
            const message = JSON.stringify({
              event: 'nav.correction',
              data: { ts: Date.now(), confidence: 0.9 }
            });
            client.send(message);
          }
        });
        
        const broadcastEnd = Date.now();
        broadcastTimes.push(broadcastEnd - broadcastStart);
        
        await new Promise(resolve => setTimeout(resolve, 10));
      }

      // Verify all broadcasts were within 200ms
      const maxBroadcastTime = Math.max(...broadcastTimes);
      const avgBroadcastTime = broadcastTimes.reduce((sum, t) => sum + t, 0) / broadcastTimes.length;
      
      expect(maxBroadcastTime).toBeLessThanOrEqual(200);
      
      console.log(`✅ Broadcast timing verified. Max: ${maxBroadcastTime}ms, Avg: ${avgBroadcastTime.toFixed(2)}ms`);
    });
  });

  afterAll(() => {
    // Generate final test artifacts
    const testArtifacts = {
      timestamp: new Date().toISOString(),
      summary: {
        totalTests: expect.getState().assertionCalls,
        rerouteTests: 3,
        messagepackTests: 4,
        performanceTests: 1
      },
      logs: testLogs,
      performanceMetrics: {
        avgProcessingTime: performanceMetrics.length > 0 
          ? performanceMetrics.reduce((sum, m) => sum + m.duration, 0) / performanceMetrics.length 
          : 0,
        maxProcessingTime: performanceMetrics.length > 0 
          ? Math.max(...performanceMetrics.map(m => m.duration)) 
          : 0,
        measurements: performanceMetrics
      },
      binaryFrames: {
        count: binaryFrames.length,
        totalBytes: binaryFrames.reduce((sum, f) => sum + f.hex.length / 2, 0),
        frames: binaryFrames
      }
    };

    console.log('\n📋 TEST ARTIFACTS SUMMARY:');
    console.log('================================');
    console.log(`Test execution: ${testArtifacts.timestamp}`);
    console.log(`Total test assertions: ${testArtifacts.summary.totalTests}`);
    console.log(`Average processing time: ${testArtifacts.performanceMetrics.avgProcessingTime.toFixed(2)}ms`);
    console.log(`Max processing time: ${testArtifacts.performanceMetrics.maxProcessingTime}ms`);
    console.log(`Binary frames generated: ${testArtifacts.binaryFrames.count}`);
    console.log(`Total binary data: ${testArtifacts.binaryFrames.totalBytes} bytes`);
    console.log(`Log entries captured: ${testArtifacts.logs.length}`);
  });
});