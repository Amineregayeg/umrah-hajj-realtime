/**
 * Comprehensive unit tests for MessagePack Utility
 * Covers ON/OFF round-trip, encoding/decoding, feature flag handling
 */

import { MessagePackUtil } from './msgpack.util';

describe('MessagePackUtil', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    // Reset static cache
    (MessagePackUtil as any).isEnabled = null;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('Feature Flag Management', () => {
    it('should return false when WS_MSGPACK_ENABLED is not set', () => {
      delete process.env.WS_MSGPACK_ENABLED;
      
      const isEnabled = MessagePackUtil.isMessagePackEnabled();
      
      expect(isEnabled).toBe(false);
    });

    it('should return false when WS_MSGPACK_ENABLED is false', () => {
      process.env.WS_MSGPACK_ENABLED = 'false';
      
      const isEnabled = MessagePackUtil.isMessagePackEnabled();
      
      expect(isEnabled).toBe(false);
    });

    it('should return true when WS_MSGPACK_ENABLED is true', () => {
      process.env.WS_MSGPACK_ENABLED = 'true';
      
      const isEnabled = MessagePackUtil.isMessagePackEnabled();
      
      expect(isEnabled).toBe(true);
    });

    it('should cache the enabled state', () => {
      process.env.WS_MSGPACK_ENABLED = 'true';
      
      // First call
      const isEnabled1 = MessagePackUtil.isMessagePackEnabled();
      
      // Change environment (should not affect cached value)
      process.env.WS_MSGPACK_ENABLED = 'false';
      
      // Second call should return cached value
      const isEnabled2 = MessagePackUtil.isMessagePackEnabled();
      
      expect(isEnabled1).toBe(true);
      expect(isEnabled2).toBe(true);
    });

    it('should handle various truthy/falsy values', () => {
      const testCases = [
        { value: 'true', expected: true },
        { value: 'false', expected: false },
        { value: '1', expected: false },
        { value: '0', expected: false },
        { value: 'yes', expected: false },
        { value: 'no', expected: false },
        { value: '', expected: false },
        { value: undefined, expected: false }
      ];

      testCases.forEach(({ value, expected }, index) => {
        // Reset cache for each test
        (MessagePackUtil as any).isEnabled = null;
        
        if (value === undefined) {
          delete process.env.WS_MSGPACK_ENABLED;
        } else {
          process.env.WS_MSGPACK_ENABLED = value;
        }
        
        const isEnabled = MessagePackUtil.isMessagePackEnabled();
        expect(isEnabled).toBe(expected);
      });
    });
  });

  describe('Content Type Determination', () => {
    it('should return MessagePack content type when enabled', () => {
      process.env.WS_MSGPACK_ENABLED = 'true';
      
      const contentType = MessagePackUtil.getContentType();
      
      expect(contentType).toBe('application/x-msgpack');
    });

    it('should return JSON content type when disabled', () => {
      process.env.WS_MSGPACK_ENABLED = 'false';
      
      const contentType = MessagePackUtil.getContentType();
      
      expect(contentType).toBe('application/json');
    });
  });

  describe('MessagePack Encoding (Enabled)', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should encode simple object', () => {
      const data = { message: 'hello', timestamp: 123456789 };
      
      const encoded = MessagePackUtil.encode(data);
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(0);
      expect(encoded[0]).toBe(0x82); // Mock header
      expect(encoded[1]).toBe(0x01);
    });

    it('should encode complex nested object', () => {
      const complexData = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        timestamp: Date.now(),
        coordinates: [21.4225, 39.8262],
        metadata: null
      };
      
      const encoded = MessagePackUtil.encode(complexData);
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(2);
    });

    it('should encode arrays', () => {
      const arrayData = [1, 2, 3, 'hello', { nested: true }];
      
      const encoded = MessagePackUtil.encode(arrayData);
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(2);
    });

    it('should encode primitive types', () => {
      const primitives = [
        'string',
        123,
        true,
        false,
        null
      ];
      
      primitives.forEach(primitive => {
        const encoded = MessagePackUtil.encode(primitive);
        expect(Buffer.isBuffer(encoded)).toBe(true);
        expect(encoded.length).toBeGreaterThan(2);
      });
    });

    it('should handle empty object', () => {
      const emptyData = {};
      
      const encoded = MessagePackUtil.encode(emptyData);
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(2);
    });

    it('should handle large objects', () => {
      const largeData = {
        items: Array.from({ length: 1000 }, (_, i) => ({
          id: i,
          name: `Item ${i}`,
          description: `Description for item ${i}`.repeat(10)
        }))
      };
      
      const encoded = MessagePackUtil.encode(largeData);
      
      expect(Buffer.isBuffer(encoded)).toBe(true);
      expect(encoded.length).toBeGreaterThan(1000);
    });
  });

  describe('MessagePack Decoding (Enabled)', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should decode simple object', () => {
      const originalData = { message: 'hello', timestamp: 123456789 };
      const encoded = MessagePackUtil.encode(originalData);
      
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(originalData);
    });

    it('should decode complex nested object', () => {
      const complexData = {
        user: {
          id: 'user-123',
          name: 'John Doe',
          preferences: {
            theme: 'dark',
            notifications: true
          }
        },
        timestamp: 1640995200000,
        coordinates: [21.4225, 39.8262],
        metadata: null
      };
      
      const encoded = MessagePackUtil.encode(complexData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(complexData);
    });

    it('should decode arrays', () => {
      const arrayData = [1, 2, 3, 'hello', { nested: true }];
      
      const encoded = MessagePackUtil.encode(arrayData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(arrayData);
    });

    it('should decode primitive types', () => {
      const primitives = [
        'string',
        123,
        true,
        false,
        null
      ];
      
      primitives.forEach(primitive => {
        const encoded = MessagePackUtil.encode(primitive);
        const decoded = MessagePackUtil.decode(encoded);
        expect(decoded).toEqual(primitive);
      });
    });

    it('should handle invalid MessagePack data', () => {
      const invalidData = Buffer.from([0x99, 0x88, 0x77]); // Invalid format
      
      expect(() => MessagePackUtil.decode(invalidData)).toThrow('Invalid MessagePack format');
    });

    it('should handle corrupted header', () => {
      const corruptedData = Buffer.from([0x00, 0x01, 0x02]); // Wrong header
      
      expect(() => MessagePackUtil.decode(corruptedData)).toThrow('Invalid MessagePack format');
    });

    it('should handle empty buffer', () => {
      const emptyBuffer = Buffer.alloc(0);
      
      expect(() => MessagePackUtil.decode(emptyBuffer)).toThrow('Invalid MessagePack format');
    });
  });

  describe('Round-trip Encoding/Decoding (Enabled)', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should maintain data integrity through encode/decode cycle', () => {
      const testData = {
        navigation: {
          userId: 'user-123',
          position: {
            lat: 21.4225,
            lon: 39.8262,
            floor: 'ground',
            accuracy: 3.0
          },
          timestamp: 1640995200000,
          sequence: 42
        },
        metadata: {
          source: 'mobile_app',
          version: '1.2.3'
        }
      };
      
      const encoded = MessagePackUtil.encode(testData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(testData);
      expect(decoded.navigation.position.lat).toBe(21.4225);
      expect(decoded.navigation.position.lon).toBe(39.8262);
      expect(decoded.metadata.source).toBe('mobile_app');
    });

    it('should handle special characters and Unicode', () => {
      const unicodeData = {
        message: 'Hello مرحبا 🕋 مكة',
        emoji: '🏢🚶‍♂️📱',
        arabic: 'الحرم الشريف',
        chinese: '清真寺',
        symbols: '♪♫♦♣'
      };
      
      const encoded = MessagePackUtil.encode(unicodeData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(unicodeData);
      expect(decoded.message).toBe('Hello مرحبا 🕋 مكة');
      expect(decoded.arabic).toBe('الحرم الشريف');
    });

    it('should maintain number precision', () => {
      const numericData = {
        integer: 123456789,
        float: 3.14159265359,
        negative: -987.654,
        zero: 0,
        largeInteger: Number.MAX_SAFE_INTEGER,
        smallFloat: Number.MIN_VALUE
      };
      
      const encoded = MessagePackUtil.encode(numericData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded.integer).toBe(123456789);
      expect(decoded.float).toBeCloseTo(3.14159265359, 10);
      expect(decoded.negative).toBe(-987.654);
      expect(decoded.zero).toBe(0);
    });

    it('should handle nested arrays and objects', () => {
      const nestedData = {
        level1: {
          level2: {
            level3: {
              array: [
                { item: 1, data: [1, 2, 3] },
                { item: 2, data: [4, 5, 6] }
              ]
            }
          }
        }
      };
      
      const encoded = MessagePackUtil.encode(nestedData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(nestedData);
      expect(decoded.level1.level2.level3.array[0].data).toEqual([1, 2, 3]);
    });
  });

  describe('Feature Disabled Mode', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'false';
    });

    it('should throw error when trying to encode with feature disabled', () => {
      const data = { test: 'data' };
      
      expect(() => MessagePackUtil.encode(data)).toThrow('MessagePack is not enabled');
    });

    it('should throw error when trying to decode with feature disabled', () => {
      const buffer = Buffer.from([0x82, 0x01, 0x02, 0x03]);
      
      expect(() => MessagePackUtil.decode(buffer)).toThrow('MessagePack is not enabled');
    });

    it('should return false for isMessagePackData when disabled', () => {
      const buffer = Buffer.from([0x82, 0x01, 0x02, 0x03]);
      
      const isMessagePack = MessagePackUtil.isMessagePackData(buffer);
      
      expect(isMessagePack).toBe(false);
    });
  });

  describe('Data Format Detection', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should detect valid MessagePack data', () => {
      const data = { test: 'message' };
      const encoded = MessagePackUtil.encode(data);
      
      const isMessagePack = MessagePackUtil.isMessagePackData(encoded);
      
      expect(isMessagePack).toBe(true);
    });

    it('should not detect invalid MessagePack data', () => {
      const invalidBuffer = Buffer.from([0x99, 0x88, 0x77]);
      
      const isMessagePack = MessagePackUtil.isMessagePackData(invalidBuffer);
      
      expect(isMessagePack).toBe(false);
    });

    it('should not detect string data as MessagePack', () => {
      const stringData = '{"test": "json"}';
      
      const isMessagePack = MessagePackUtil.isMessagePackData(stringData);
      
      expect(isMessagePack).toBe(false);
    });

    it('should handle empty buffer in detection', () => {
      const emptyBuffer = Buffer.alloc(0);
      
      const isMessagePack = MessagePackUtil.isMessagePackData(emptyBuffer);
      
      expect(isMessagePack).toBe(false);
    });
  });

  describe('WebSocket Message Processing', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should process incoming MessagePack message', () => {
      const originalData = { 
        type: 'navigation_update',
        payload: { userId: 'user-123', position: { lat: 21.4225, lon: 39.8262 } }
      };
      const encoded = MessagePackUtil.encode(originalData);
      
      const processed = MessagePackUtil.processIncomingMessage(encoded);
      
      expect(processed).toEqual(originalData);
    });

    it('should process incoming JSON string message', () => {
      const jsonData = { type: 'heartbeat', timestamp: 123456789 };
      const jsonString = JSON.stringify(jsonData);
      
      const processed = MessagePackUtil.processIncomingMessage(jsonString);
      
      expect(processed).toEqual(jsonData);
    });

    it('should process incoming JSON buffer message', () => {
      const jsonData = { type: 'ping', id: 'ping-123' };
      const jsonBuffer = Buffer.from(JSON.stringify(jsonData), 'utf8');
      
      const processed = MessagePackUtil.processIncomingMessage(jsonBuffer);
      
      expect(processed).toEqual(jsonData);
    });

    it('should prepare outgoing MessagePack message when enabled', () => {
      const data = { 
        type: 'navigation_response',
        payload: { status: 'success', data: [1, 2, 3] }
      };
      
      const prepared = MessagePackUtil.prepareOutgoingMessage(data);
      
      expect(Buffer.isBuffer(prepared)).toBe(true);
      
      // Verify it can be decoded back
      const decoded = MessagePackUtil.decode(prepared as Buffer);
      expect(decoded).toEqual(data);
    });

    it('should prepare outgoing JSON message when disabled', () => {
      process.env.WS_MSGPACK_ENABLED = 'false';
      (MessagePackUtil as any).isEnabled = null; // Reset cache
      
      const data = { type: 'status', message: 'connected' };
      
      const prepared = MessagePackUtil.prepareOutgoingMessage(data);
      
      expect(typeof prepared).toBe('string');
      expect(JSON.parse(prepared as string)).toEqual(data);
    });
  });

  describe('Error Handling', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should handle encoding errors gracefully', () => {
      // Create circular reference
      const circularData: any = { name: 'test' };
      circularData.self = circularData;
      
      expect(() => MessagePackUtil.encode(circularData)).toThrow(/MessagePack encoding failed/);
    });

    it('should handle decoding errors gracefully', () => {
      const malformedBuffer = Buffer.from([0x82, 0x01]); // Incomplete data
      
      expect(() => MessagePackUtil.decode(malformedBuffer)).toThrow(/MessagePack decoding failed/);
    });

    it('should handle invalid JSON in processIncomingMessage', () => {
      const invalidJson = '{"invalid": json}';
      
      expect(() => MessagePackUtil.processIncomingMessage(invalidJson)).toThrow();
    });

    it('should handle non-buffer, non-string input', () => {
      const invalidInput = 123 as any;
      
      expect(() => MessagePackUtil.processIncomingMessage(invalidInput)).toThrow();
    });
  });

  describe('Performance and Edge Cases', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should handle very large objects', () => {
      const largeObject = {
        data: Array.from({ length: 10000 }, (_, i) => ({
          id: i,
          value: `value-${i}`,
          metadata: {
            timestamp: Date.now() + i,
            active: i % 2 === 0
          }
        }))
      };
      
      const encoded = MessagePackUtil.encode(largeObject);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded.data.length).toBe(10000);
      expect(decoded.data[9999].id).toBe(9999);
      expect(decoded.data[5000].value).toBe('value-5000');
    });

    it('should handle deeply nested objects', () => {
      let deepObject: any = { level: 0 };
      for (let i = 1; i <= 50; i++) {
        deepObject.nested = { level: i, data: `level-${i}` };
        deepObject = deepObject.nested;
      }
      
      const encoded = MessagePackUtil.encode(deepObject);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded.level).toBe(50);
      expect(decoded.data).toBe('level-50');
    });

    it('should handle binary data', () => {
      const binaryData = {
        buffer: Array.from(Buffer.from('Hello World', 'utf8')),
        metadata: { encoding: 'utf8' }
      };
      
      const encoded = MessagePackUtil.encode(binaryData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(decoded).toEqual(binaryData);
      expect(Buffer.from(decoded.buffer).toString('utf8')).toBe('Hello World');
    });

    it('should maintain type information', () => {
      const typedData = {
        string: 'hello',
        number: 42,
        boolean: true,
        null: null,
        undefined: undefined, // Will be converted to null in JSON
        array: [1, 'two', true],
        object: { nested: 'value' }
      };
      
      const encoded = MessagePackUtil.encode(typedData);
      const decoded = MessagePackUtil.decode(encoded);
      
      expect(typeof decoded.string).toBe('string');
      expect(typeof decoded.number).toBe('number');
      expect(typeof decoded.boolean).toBe('boolean');
      expect(decoded.null).toBeNull();
      expect(Array.isArray(decoded.array)).toBe(true);
      expect(typeof decoded.object).toBe('object');
    });
  });

  describe('Deterministic Behavior', () => {
    beforeEach(() => {
      process.env.WS_MSGPACK_ENABLED = 'true';
    });

    it('should produce consistent encoding for same input', () => {
      const data = {
        userId: 'user-123',
        timestamp: 1640995200000,
        position: { lat: 21.4225, lon: 39.8262 }
      };
      
      const encoded1 = MessagePackUtil.encode(data);
      const encoded2 = MessagePackUtil.encode(data);
      
      expect(encoded1).toEqual(encoded2);
      expect(encoded1.toString('hex')).toBe(encoded2.toString('hex'));
    });

    it('should produce consistent decoding for same input', () => {
      const data = { test: 'consistency', timestamp: 1640995200000 };
      const encoded = MessagePackUtil.encode(data);
      
      const decoded1 = MessagePackUtil.decode(encoded);
      const decoded2 = MessagePackUtil.decode(encoded);
      
      expect(decoded1).toEqual(decoded2);
      expect(JSON.stringify(decoded1)).toBe(JSON.stringify(decoded2));
    });
  });
});