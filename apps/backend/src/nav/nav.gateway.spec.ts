/**
 * Comprehensive unit tests for Navigation WebSocket Gateway
 * Covers multi-client scenarios, origin rejection, message handling
 */

import { Test, TestingModule } from '@nestjs/testing';
import { NavGateway } from './nav.gateway';
import { HMMTrackingService } from './services/hmm-tracking.service';
import { NavigationCorrectionService } from './services/navigation-correction.service';
import { MessagePackUtil } from '../shared/utils/msgpack.util';
import { WsException } from '@nestjs/websockets';

// Mock WebSocket client
class MockSocket {
  id: string;
  handshake: any;
  rooms: Set<string> = new Set();
  data: any = {};
  
  constructor(id: string, handshake: any = {}) {
    this.id = id;
    this.handshake = handshake;
  }

  emit = jest.fn();
  join = jest.fn((room: string) => this.rooms.add(room));
  leave = jest.fn((room: string) => this.rooms.delete(room));
  disconnect = jest.fn();
  to = jest.fn().mockReturnThis();
  broadcast = { emit: jest.fn() };
}

// Mock WebSocket server
const mockServer = {
  emit: jest.fn(),
  to: jest.fn().mockReturnThis(),
  in: jest.fn().mockReturnThis(),
  clients: new Map(),
  sockets: new Map()
};

// Mock services
const mockHMMTrackingService = {
  processNavigationUpdate: jest.fn(),
  clearUserState: jest.fn()
};

const mockNavigationCorrectionService = {
  processCorrection: jest.fn(),
  getRecentCorrections: jest.fn()
};

describe('NavGateway', () => {
  let gateway: NavGateway;
  let hmmService: jest.Mocked<HMMTrackingService>;
  let correctionService: jest.Mocked<NavigationCorrectionService>;

  const createMockClient = (id: string, options: any = {}): MockSocket => {
    return new MockSocket(id, {
      headers: {
        origin: 'https://app.umrah-hajj.com',
        'user-agent': 'Test Client',
        authorization: 'Bearer test-token',
        ...options.headers
      },
      query: {
        userId: `user-${id}`,
        ...options.query
      },
      address: '192.168.1.100'
    });
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NavGateway,
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

    gateway = module.get<NavGateway>(NavGateway);
    hmmService = module.get(HMMTrackingService);
    correctionService = module.get(NavigationCorrectionService);

    // Set up server mock
    (gateway as any).server = mockServer;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('Client Connection Handling', () => {
    it('should accept connection from valid origin', async () => {
      const client = createMockClient('1');

      await gateway.handleConnection(client as any);

      expect(client.join).toHaveBeenCalledWith('navigation');
      expect(client.emit).toHaveBeenCalledWith('connected', expect.objectContaining({
        status: 'success',
        clientId: client.id,
        timestamp: expect.any(Number)
      }));
    });

    it('should reject connection from invalid origin', async () => {
      const client = createMockClient('1', {
        headers: { origin: 'https://malicious-site.com' }
      });

      await expect(gateway.handleConnection(client as any)).rejects.toThrow(WsException);
      expect(client.disconnect).toHaveBeenCalled();
    });

    it('should reject connection without origin header', async () => {
      const client = createMockClient('1', {
        headers: { origin: undefined }
      });

      await expect(gateway.handleConnection(client as any)).rejects.toThrow(WsException);
    });

    it('should handle localhost connections in development', async () => {
      process.env.NODE_ENV = 'development';
      
      const client = createMockClient('1', {
        headers: { origin: 'http://localhost:3000' }
      });

      await gateway.handleConnection(client as any);

      expect(client.join).toHaveBeenCalledWith('navigation');
    });

    it('should validate user authentication', async () => {
      const client = createMockClient('1', {
        headers: { authorization: undefined }
      });

      await expect(gateway.handleConnection(client as any)).rejects.toThrow(WsException);
    });

    it('should handle multiple clients from same user', async () => {
      const client1 = createMockClient('1', { query: { userId: 'user-123' } });
      const client2 = createMockClient('2', { query: { userId: 'user-123' } });

      await gateway.handleConnection(client1 as any);
      await gateway.handleConnection(client2 as any);

      expect(client1.join).toHaveBeenCalledWith('user-user-123');
      expect(client2.join).toHaveBeenCalledWith('user-user-123');
    });
  });

  describe('Client Disconnection Handling', () => {
    it('should handle clean disconnection', async () => {
      const client = createMockClient('1');
      await gateway.handleConnection(client as any);

      await gateway.handleDisconnect(client as any);

      // Should clean up resources
      expect(mockServer.emit).toHaveBeenCalledWith('client_disconnected', expect.objectContaining({
        clientId: client.id
      }));
    });

    it('should handle abrupt disconnection', async () => {
      const client = createMockClient('1');
      await gateway.handleConnection(client as any);

      // Simulate abrupt disconnection
      await gateway.handleDisconnect(client as any);

      expect(mockServer.emit).toHaveBeenCalledWith('client_disconnected', expect.any(Object));
    });

    it('should clear user state on last client disconnection', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      hmmService.clearUserState.mockResolvedValue(undefined);

      await gateway.handleDisconnect(client as any);

      expect(hmmService.clearUserState).toHaveBeenCalledWith('user-123');
    });
  });

  describe('Navigation Update Handling', () => {
    let client: MockSocket;

    beforeEach(async () => {
      client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);
    });

    it('should process navigation update and broadcast result', async () => {
      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      await gateway.handleNavigationUpdate(client as any, navUpdate);

      expect(hmmService.processNavigationUpdate).toHaveBeenCalledWith(navUpdate);
      expect(mockServer.to).toHaveBeenCalledWith('user-user-123');
      expect(mockServer.emit).toHaveBeenCalledWith('navigation_update', expect.objectContaining({
        userId: 'user-123',
        result: mockResult,
        timestamp: expect.any(Number)
      }));
    });

    it('should handle navigation update processing failure', async () => {
      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      hmmService.processNavigationUpdate.mockResolvedValue(null);

      await gateway.handleNavigationUpdate(client as any, navUpdate);

      expect(client.emit).toHaveBeenCalledWith('navigation_error', expect.objectContaining({
        message: 'Failed to process navigation update',
        timestamp: expect.any(Number)
      }));
    });

    it('should validate navigation update data', async () => {
      const invalidUpdate = {
        ts: Date.now(),
        userId: 'user-123',
        // Missing required fields
      };

      await gateway.handleNavigationUpdate(client as any, invalidUpdate as any);

      expect(client.emit).toHaveBeenCalledWith('validation_error', expect.objectContaining({
        message: expect.stringContaining('Invalid navigation data')
      }));
    });

    it('should handle service errors gracefully', async () => {
      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      hmmService.processNavigationUpdate.mockRejectedValue(new Error('Service error'));

      await gateway.handleNavigationUpdate(client as any, navUpdate);

      expect(client.emit).toHaveBeenCalledWith('navigation_error', expect.objectContaining({
        message: 'Service error',
        timestamp: expect.any(Number)
      }));
    });
  });

  describe('Multi-client Scenarios', () => {
    it('should handle 10 clients with 10Hz updates for 60 seconds', async () => {
      const clients: MockSocket[] = [];
      const updateCount = 10 * 10 * 60; // 10 clients × 10Hz × 60s = 6000 updates
      
      // Create 10 clients
      for (let i = 0; i < 10; i++) {
        const client = createMockClient(`client-${i}`, { 
          query: { userId: `user-${i}` } 
        });
        clients.push(client);
        await gateway.handleConnection(client as any);
      }

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      // Simulate updates
      const updates: Promise<void>[] = [];
      let updateCounter = 0;

      for (let second = 0; second < 60; second++) {
        for (let client = 0; client < 10; client++) {
          for (let tick = 0; tick < 10; tick++) {
            const navUpdate = {
              ts: Date.now() + second * 1000 + tick * 100,
              seq: updateCounter++,
              userId: `user-${client}`,
              pos: { 
                lat: 21.4225 + Math.random() * 0.001, 
                lon: 39.8262 + Math.random() * 0.001, 
                alt: 0, 
                floor: 0, 
                acc: 3.0 
              },
              heading: Math.random() * 360,
              speed: 1.0 + Math.random(),
              source: 'gnss',
              stage: 'tawaf',
              lap: 1,
              confidence: 0.8,
              mode: 'guide',
              device: 'android'
            };

            updates.push(
              gateway.handleNavigationUpdate(clients[client] as any, navUpdate)
            );
          }
        }
      }

      // Process all updates
      const startTime = Date.now();
      await Promise.all(updates);
      const endTime = Date.now();

      expect(updates.length).toBe(updateCount);
      expect(hmmService.processNavigationUpdate).toHaveBeenCalledTimes(updateCount);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds
    });

    it('should handle corrections with ~5Hz frequency', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const correctionCount = 5 * 60; // 5Hz × 60s = 300 corrections
      const corrections: Promise<void>[] = [];

      const mockCorrectionResult = {
        id: 'correction-1',
        userId: 'user-123',
        originalPosition: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        correctedPosition: { lat: 21.4227, lon: 39.8264, floor: 'ground' },
        reason: 'auto_correction',
        timestamp: Date.now(),
        applied: true,
        confidence: 0.95
      };

      correctionService.processCorrection.mockResolvedValue(mockCorrectionResult);

      for (let i = 0; i < correctionCount; i++) {
        const correctionData = {
          userId: 'user-123',
          originalPosition: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
          correctedPosition: { 
            lat: 21.4225 + Math.random() * 0.001, 
            lon: 39.8262 + Math.random() * 0.001, 
            floor: 'ground' 
          },
          reason: 'auto_correction',
          timestamp: Date.now() + i * 200 // 5Hz = every 200ms
        };

        corrections.push(
          gateway.handleNavigationCorrection(client as any, correctionData)
        );
      }

      const startTime = Date.now();
      await Promise.all(corrections);
      const endTime = Date.now();

      expect(corrections.length).toBe(correctionCount);
      expect(correctionService.processCorrection).toHaveBeenCalledTimes(correctionCount);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds
    });

    it('should handle message drops ≤2%', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const totalMessages = 1000;
      let successfulMessages = 0;
      let failedMessages = 0;

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      // Simulate occasional failures (< 2%)
      hmmService.processNavigationUpdate.mockImplementation(async () => {
        if (Math.random() < 0.02) { // 2% failure rate
          throw new Error('Simulated failure');
        }
        return mockResult;
      });

      const messages: Promise<void>[] = [];

      for (let i = 0; i < totalMessages; i++) {
        const navUpdate = {
          ts: Date.now() + i,
          seq: i,
          userId: 'user-123',
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

        messages.push(
          gateway.handleNavigationUpdate(client as any, navUpdate)
            .then(() => successfulMessages++)
            .catch(() => failedMessages++)
        );
      }

      await Promise.all(messages);

      const dropRate = failedMessages / totalMessages;
      expect(dropRate).toBeLessThanOrEqual(0.02); // ≤2% drop rate
      expect(successfulMessages + failedMessages).toBe(totalMessages);
    });
  });

  describe('MessagePack Support', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    afterEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'false';
    });

    it('should handle MessagePack encoded messages', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      // Encode message with MessagePack
      const encodedMessage = MessagePackUtil.encode(navUpdate);

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      // Process as binary message
      await gateway.handleBinaryMessage(client as any, encodedMessage);

      expect(hmmService.processNavigationUpdate).toHaveBeenCalledWith(navUpdate);
    });

    it('should send MessagePack encoded responses when enabled', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      await gateway.handleNavigationUpdate(client as any, navUpdate);

      // Should send binary response
      expect(mockServer.emit).toHaveBeenCalledWith('navigation_update', expect.any(Buffer));
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle burst traffic gracefully', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const burstSize = 100;
      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };

      hmmService.processNavigationUpdate.mockResolvedValue(mockResult);

      const updates = Array.from({ length: burstSize }, (_, i) => ({
        ts: Date.now() + i,
        seq: i,
        userId: 'user-123',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android'
      }));

      // Send all updates simultaneously
      const promises = updates.map(update => 
        gateway.handleNavigationUpdate(client as any, update)
      );

      const startTime = Date.now();
      await Promise.all(promises);
      const endTime = Date.now();

      expect(hmmService.processNavigationUpdate).toHaveBeenCalledTimes(burstSize);
      expect(endTime - startTime).toBeLessThan(5000); // Should handle within 5 seconds
    });

    it('should implement connection limits', async () => {
      const maxConnections = 1000;
      const clients: MockSocket[] = [];

      // Try to create many connections
      for (let i = 0; i < maxConnections + 10; i++) {
        const client = createMockClient(`client-${i}`, { 
          query: { userId: `user-${i}` } 
        });
        
        try {
          await gateway.handleConnection(client as any);
          clients.push(client);
        } catch (error) {
          // Expected to fail after reaching limit
          expect(error).toBeInstanceOf(WsException);
        }
      }

      // Should not exceed reasonable connection limit
      expect(clients.length).toBeLessThanOrEqual(maxConnections);
    });
  });

  describe('Error Handling and Recovery', () => {
    it('should recover from temporary service failures', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      // First call fails
      hmmService.processNavigationUpdate.mockRejectedValueOnce(new Error('Service temporarily unavailable'));
      
      // Second call succeeds
      const mockResult = {
        position: { lat: 21.4225, lon: 39.8262, floor: 'ground' },
        confidence: 0.85,
        snapTo: 'path' as const,
        nodeId: 'node-123',
        delta: { x: 0.5, y: 0.3 }
      };
      hmmService.processNavigationUpdate.mockResolvedValueOnce(mockResult);

      // First update should fail
      await gateway.handleNavigationUpdate(client as any, navUpdate);
      expect(client.emit).toHaveBeenCalledWith('navigation_error', expect.any(Object));

      // Second update should succeed
      await gateway.handleNavigationUpdate(client as any, { ...navUpdate, seq: 2 });
      expect(mockServer.emit).toHaveBeenCalledWith('navigation_update', expect.any(Object));
    });

    it('should handle malformed messages gracefully', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const malformedMessage = '{"invalid": json}';

      await gateway.handleTextMessage(client as any, malformedMessage);

      expect(client.emit).toHaveBeenCalledWith('validation_error', expect.objectContaining({
        message: expect.stringContaining('Invalid message format')
      }));
    });

    it('should handle network interruptions', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      // Simulate network interruption
      client.emit.mockImplementation(() => {
        throw new Error('Network error');
      });

      const navUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
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

      // Should not crash the gateway
      await expect(gateway.handleNavigationUpdate(client as any, navUpdate)).resolves.not.toThrow();
    });
  });

  describe('Security and Validation', () => {
    it('should validate message origin', async () => {
      const client = createMockClient('1', {
        headers: { origin: 'https://malicious-site.com' }
      });

      await expect(gateway.handleConnection(client as any)).rejects.toThrow(WsException);
    });

    it('should validate user authorization', async () => {
      const client = createMockClient('1', {
        headers: { authorization: 'Bearer invalid-token' }
      });

      await expect(gateway.handleConnection(client as any)).rejects.toThrow(WsException);
    });

    it('should sanitize message content', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const maliciousUpdate = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123<script>alert("xss")</script>',
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

      await gateway.handleNavigationUpdate(client as any, maliciousUpdate);

      expect(client.emit).toHaveBeenCalledWith('validation_error', expect.any(Object));
    });

    it('should limit message size', async () => {
      const client = createMockClient('1', { query: { userId: 'user-123' } });
      await gateway.handleConnection(client as any);

      const largeMessage = {
        ts: Date.now(),
        seq: 1,
        userId: 'user-123',
        pos: { lat: 21.4225, lon: 39.8262, alt: 0, floor: 0, acc: 3.0 },
        heading: 0,
        speed: 1.0,
        source: 'gnss',
        stage: 'tawaf',
        lap: 1,
        confidence: 0.8,
        mode: 'guide',
        device: 'android',
        largeField: 'x'.repeat(1000000) // 1MB of data
      };

      await gateway.handleNavigationUpdate(client as any, largeMessage);

      expect(client.emit).toHaveBeenCalledWith('validation_error', expect.objectContaining({
        message: expect.stringContaining('Message too large')
      }));
    });
  });
});