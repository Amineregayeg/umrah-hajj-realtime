/**
 * Table-driven tests for audit log utilities
 * Tests logging, filtering, security, and performance
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { 
  createAuditLog, 
  filterAuditLogs, 
  sanitizeAuditData,
  validateAuditLogEntry,
  exportAuditLogs,
  AuditLogEntry,
  AuditLogLevel
} from '../utils/audit-log.util';

describe('Audit Log Utilities Tests', () => {
  beforeEach(() => {
    process.env.NAV_SEED = '1337';
  });

  describe('Audit Log Creation', () => {
    const auditLogCases = [
      {
        name: 'user authentication event',
        input: {
          userId: 'user-123',
          action: 'login',
          resource: 'auth',
          level: 'info' as AuditLogLevel,
          metadata: {
            ipAddress: '192.168.1.1',
            userAgent: 'Mozilla/5.0...',
            success: true,
          },
        },
        expectedFields: ['id', 'timestamp', 'userId', 'action', 'resource', 'level', 'metadata'],
        shouldSucceed: true,
      },
      {
        name: 'navigation update event',
        input: {
          userId: 'user-456',
          action: 'nav_update',
          resource: 'navigation',
          level: 'debug' as AuditLogLevel,
          metadata: {
            position: { lat: 21.4225, lon: 39.8262 },
            confidence: 0.85,
            algorithm: 'hmm',
          },
        },
        expectedFields: ['id', 'timestamp', 'userId', 'action', 'resource', 'level', 'metadata'],
        shouldSucceed: true,
      },
      {
        name: 'security violation event',
        input: {
          userId: 'user-789',
          action: 'unauthorized_access',
          resource: 'profile',
          level: 'error' as AuditLogLevel,
          metadata: {
            attemptedResource: '/api/profiles/other-user',
            reason: 'insufficient_permissions',
            blocked: true,
          },
        },
        expectedFields: ['id', 'timestamp', 'userId', 'action', 'resource', 'level', 'metadata'],
        shouldSucceed: true,
      },
      {
        name: 'system event without user',
        input: {
          action: 'system_startup',
          resource: 'system',
          level: 'info' as AuditLogLevel,
          metadata: {
            version: '1.0.0',
            environment: 'production',
          },
        },
        expectedFields: ['id', 'timestamp', 'action', 'resource', 'level', 'metadata'],
        shouldSucceed: true,
      },
      {
        name: 'missing required action',
        input: {
          userId: 'user-123',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldSucceed: false,
        expectedError: 'action is required',
      },
      {
        name: 'missing required resource',
        input: {
          userId: 'user-123',
          action: 'test_action',
          level: 'info' as AuditLogLevel,
        },
        shouldSucceed: false,
        expectedError: 'resource is required',
      },
      {
        name: 'invalid audit level',
        input: {
          userId: 'user-123',
          action: 'test_action',
          resource: 'test',
          level: 'invalid' as AuditLogLevel,
        },
        shouldSucceed: false,
        expectedError: 'invalid level',
      },
    ] as const;

    auditLogCases.forEach((testCase, index) => {
      it(`should handle ${testCase.name} (case ${index + 1})`, () => {
        if (testCase.shouldSucceed) {
          const auditLog = createAuditLog(testCase.input);
          
          expect(auditLog).toBeDefined();
          testCase.expectedFields.forEach(field => {
            expect(auditLog).toHaveProperty(field);
          });
          
          expect(auditLog.id).toMatch(/^[a-f0-9-]{36}$/); // UUID format
          expect(auditLog.timestamp).toBeInstanceOf(Date);
          expect(auditLog.action).toBe(testCase.input.action);
          expect(auditLog.resource).toBe(testCase.input.resource);
          expect(auditLog.level).toBe(testCase.input.level);
          
          if (testCase.input.userId) {
            expect(auditLog.userId).toBe(testCase.input.userId);
          }
          
          if (testCase.input.metadata) {
            expect(auditLog.metadata).toEqual(testCase.input.metadata);
          }
        } else {
          expect(() => createAuditLog(testCase.input))
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Audit Log Filtering', () => {
    const sampleLogs: AuditLogEntry[] = [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        userId: 'user-1',
        action: 'login',
        resource: 'auth',
        level: 'info',
        metadata: { success: true },
      },
      {
        id: '2',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        userId: 'user-2',
        action: 'nav_update',
        resource: 'navigation',
        level: 'debug',
        metadata: { position: { lat: 21.4225, lon: 39.8262 } },
      },
      {
        id: '3',
        timestamp: new Date('2024-01-01T12:00:00Z'),
        userId: 'user-1',
        action: 'profile_update',
        resource: 'profile',
        level: 'info',
        metadata: { fields: ['name', 'email'] },
      },
      {
        id: '4',
        timestamp: new Date('2024-01-01T13:00:00Z'),
        userId: 'user-3',
        action: 'error',
        resource: 'navigation',
        level: 'error',
        metadata: { error: 'invalid_coordinates' },
      },
      {
        id: '5',
        timestamp: new Date('2024-01-01T14:00:00Z'),
        action: 'system_backup',
        resource: 'system',
        level: 'info',
        metadata: { size: '1.2GB' },
      },
    ];

    const filterTestCases = [
      {
        name: 'filter by user ID',
        filter: { userId: 'user-1' },
        expectedIds: ['1', '3'],
      },
      {
        name: 'filter by action',
        filter: { action: 'nav_update' },
        expectedIds: ['2'],
      },
      {
        name: 'filter by resource',
        filter: { resource: 'navigation' },
        expectedIds: ['2', '4'],
      },
      {
        name: 'filter by level',
        filter: { level: 'error' },
        expectedIds: ['4'],
      },
      {
        name: 'filter by date range',
        filter: {
          startDate: new Date('2024-01-01T11:30:00Z'),
          endDate: new Date('2024-01-01T13:30:00Z'),
        },
        expectedIds: ['3', '4'],
      },
      {
        name: 'filter by multiple criteria',
        filter: {
          resource: 'navigation',
          level: 'debug',
        },
        expectedIds: ['2'],
      },
      {
        name: 'filter with no matches',
        filter: { action: 'nonexistent' },
        expectedIds: [],
      },
      {
        name: 'filter system events (no user)',
        filter: { resource: 'system' },
        expectedIds: ['5'],
      },
    ] as const;

    filterTestCases.forEach((testCase, index) => {
      it(`should ${testCase.name} (case ${index + 1})`, () => {
        const filteredLogs = filterAuditLogs(sampleLogs, testCase.filter);
        const filteredIds = filteredLogs.map(log => log.id);
        
        expect(filteredIds).toEqual(testCase.expectedIds);
      });
    });
  });

  describe('Audit Data Sanitization', () => {
    const sanitizationCases = [
      {
        name: 'sanitize sensitive user data',
        input: {
          email: 'user@example.com',
          password: 'secret123',
          token: 'jwt.token.here',
          apiKey: 'api_key_123',
          phoneNumber: '+1234567890',
        },
        expected: {
          email: 'u***@example.com',
          password: '[REDACTED]',
          token: '[REDACTED]',
          apiKey: '[REDACTED]',
          phoneNumber: '+***567890',
        },
      },
      {
        name: 'sanitize nested sensitive data',
        input: {
          user: {
            id: 'user-123',
            email: 'test@example.com',
            profile: {
              name: 'John Doe',
              ssn: '123-45-6789',
              creditCard: '4111-1111-1111-1111',
            },
          },
          request: {
            headers: {
              authorization: 'Bearer token123',
              'x-api-key': 'key123',
            },
          },
        },
        expected: {
          user: {
            id: 'user-123',
            email: 't***@example.com',
            profile: {
              name: 'John Doe',
              ssn: '[REDACTED]',
              creditCard: '[REDACTED]',
            },
          },
          request: {
            headers: {
              authorization: '[REDACTED]',
              'x-api-key': '[REDACTED]',
            },
          },
        },
      },
      {
        name: 'preserve non-sensitive data',
        input: {
          userId: 'user-123',
          action: 'login',
          timestamp: '2024-01-01T12:00:00Z',
          success: true,
          ipAddress: '192.168.1.1',
        },
        expected: {
          userId: 'user-123',
          action: 'login',
          timestamp: '2024-01-01T12:00:00Z',
          success: true,
          ipAddress: '192.168.1.1',
        },
      },
      {
        name: 'handle arrays with sensitive data',
        input: {
          users: [
            { id: 'user-1', email: 'user1@example.com' },
            { id: 'user-2', email: 'user2@example.com' },
          ],
          tokens: ['token1', 'token2'],
        },
        expected: {
          users: [
            { id: 'user-1', email: 'u***@example.com' },
            { id: 'user-2', email: 'u***@example.com' },
          ],
          tokens: ['[REDACTED]', '[REDACTED]'],
        },
      },
      {
        name: 'handle null and undefined values',
        input: {
          nullValue: null,
          undefinedValue: undefined,
          email: 'test@example.com',
        },
        expected: {
          nullValue: null,
          undefinedValue: undefined,
          email: 't***@example.com',
        },
      },
    ] as const;

    sanitizationCases.forEach((testCase, index) => {
      it(`should ${testCase.name} (case ${index + 1})`, () => {
        const sanitized = sanitizeAuditData(testCase.input);
        expect(sanitized).toEqual(testCase.expected);
      });
    });
  });

  describe('Audit Log Validation', () => {
    const validationCases = [
      {
        name: 'valid complete log entry',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          timestamp: new Date(),
          userId: 'user-123',
          action: 'login',
          resource: 'auth',
          level: 'info' as AuditLogLevel,
          metadata: { success: true },
        },
        shouldBeValid: true,
      },
      {
        name: 'valid system log without user',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174001',
          timestamp: new Date(),
          action: 'backup',
          resource: 'system',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: true,
      },
      {
        name: 'missing required ID',
        log: {
          timestamp: new Date(),
          action: 'test',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'id',
      },
      {
        name: 'invalid ID format',
        log: {
          id: 'invalid-id',
          timestamp: new Date(),
          action: 'test',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'id format',
      },
      {
        name: 'missing timestamp',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174002',
          action: 'test',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'timestamp',
      },
      {
        name: 'future timestamp',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174003',
          timestamp: new Date(Date.now() + 60000), // 1 minute in future
          action: 'test',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'future timestamp',
      },
      {
        name: 'invalid action format',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174004',
          timestamp: new Date(),
          action: '',
          resource: 'test',
          level: 'info' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'action',
      },
      {
        name: 'invalid level',
        log: {
          id: '123e4567-e89b-12d3-a456-426614174005',
          timestamp: new Date(),
          action: 'test',
          resource: 'test',
          level: 'invalid' as AuditLogLevel,
        },
        shouldBeValid: false,
        expectedError: 'level',
      },
    ] as const;

    validationCases.forEach((testCase, index) => {
      it(`should validate ${testCase.name} (case ${index + 1})`, () => {
        if (testCase.shouldBeValid) {
          expect(() => validateAuditLogEntry(testCase.log as AuditLogEntry))
            .not.toThrow();
        } else {
          expect(() => validateAuditLogEntry(testCase.log as AuditLogEntry))
            .toThrow(expect.stringContaining(testCase.expectedError!));
        }
      });
    });
  });

  describe('Audit Log Export', () => {
    const exportLogs: AuditLogEntry[] = [
      {
        id: '1',
        timestamp: new Date('2024-01-01T10:00:00Z'),
        userId: 'user-1',
        action: 'login',
        resource: 'auth',
        level: 'info',
        metadata: { success: true, ipAddress: '192.168.1.1' },
      },
      {
        id: '2',
        timestamp: new Date('2024-01-01T11:00:00Z'),
        userId: 'user-2',
        action: 'nav_update',
        resource: 'navigation',
        level: 'debug',
        metadata: { position: { lat: 21.4225, lon: 39.8262 } },
      },
    ];

    const exportCases = [
      {
        name: 'export as JSON',
        format: 'json' as const,
        options: {},
        validator: (result: string) => {
          const parsed = JSON.parse(result);
          expect(Array.isArray(parsed)).toBe(true);
          expect(parsed).toHaveLength(2);
          expect(parsed[0].id).toBe('1');
        },
      },
      {
        name: 'export as CSV',
        format: 'csv' as const,
        options: {},
        validator: (result: string) => {
          const lines = result.split('\n');
          expect(lines[0]).toContain('id,timestamp,userId,action,resource,level');
          expect(lines[1]).toContain('1,2024-01-01T10:00:00.000Z,user-1,login,auth,info');
        },
      },
      {
        name: 'export with sanitization',
        format: 'json' as const,
        options: { sanitize: true },
        validator: (result: string) => {
          const parsed = JSON.parse(result);
          expect(parsed[0].metadata.ipAddress).toBe('192.168.1.1'); // IP should remain
          // Would check for other sanitization if present
        },
      },
      {
        name: 'export with date range filter',
        format: 'json' as const,
        options: {
          startDate: new Date('2024-01-01T10:30:00Z'),
          endDate: new Date('2024-01-01T11:30:00Z'),
        },
        validator: (result: string) => {
          const parsed = JSON.parse(result);
          expect(parsed).toHaveLength(1);
          expect(parsed[0].id).toBe('2');
        },
      },
    ] as const;

    exportCases.forEach((testCase, index) => {
      it(`should ${testCase.name} (case ${index + 1})`, () => {
        const result = exportAuditLogs(exportLogs, testCase.format, testCase.options);
        expect(typeof result).toBe('string');
        testCase.validator(result);
      });
    });
  });

  describe('Performance and Memory Tests', () => {
    it('should handle large volumes of audit logs efficiently', () => {
      const logCount = 10000;
      const logs: AuditLogEntry[] = [];
      
      const startTime = Date.now();
      
      for (let i = 0; i < logCount; i++) {
        const log = createAuditLog({
          userId: `user-${i % 100}`,
          action: 'test_action',
          resource: 'test',
          level: 'info',
          metadata: { iteration: i },
        });
        logs.push(log);
      }
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(5000); // Should create 10k logs in under 5 seconds
      
      // Test filtering performance
      const filterStartTime = Date.now();
      const filtered = filterAuditLogs(logs, { resource: 'test' });
      const filterTime = Date.now() - filterStartTime;
      
      expect(filtered).toHaveLength(logCount);
      expect(filterTime).toBeLessThan(1000); // Should filter 10k logs in under 1 second
    });

    it('should handle deep object sanitization efficiently', () => {
      const deepObject = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  password: 'secret',
                  email: 'deep@example.com',
                  data: 'safe_data',
                },
              },
            },
          },
        },
      };
      
      const startTime = Date.now();
      const sanitized = sanitizeAuditData(deepObject);
      const sanitizationTime = Date.now() - startTime;
      
      expect(sanitizationTime).toBeLessThan(100); // Should be very fast
      expect(sanitized.level1.level2.level3.level4.level5.password).toBe('[REDACTED]');
      expect(sanitized.level1.level2.level3.level4.level5.email).toBe('d***@example.com');
      expect(sanitized.level1.level2.level3.level4.level5.data).toBe('safe_data');
    });

    it('should handle concurrent audit log operations', async () => {
      const concurrentOperations = 100;
      
      const promises = Array.from({ length: concurrentOperations }, (_, i) => 
        Promise.resolve().then(() => {
          return createAuditLog({
            userId: `user-${i}`,
            action: 'concurrent_test',
            resource: 'test',
            level: 'info',
            metadata: { thread: i },
          });
        })
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(concurrentOperations);
      expect(results.every(log => log.id && log.timestamp)).toBe(true);
      
      // All IDs should be unique
      const ids = results.map(log => log.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(concurrentOperations);
    });
  });
});