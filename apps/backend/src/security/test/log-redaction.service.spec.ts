import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { LogRedactionService, PII_PATTERNS, PII_FIELD_NAMES } from '../log-redaction.service';

describe('LogRedactionService', () => {
  let service: LogRedactionService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogRedactionService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                LOG_REDACTION_ENABLED: true,
                LOG_REDACTION_TOKEN: '[REDACTED]',
                LOG_REDACTION_PRESERVE_LENGTH: false,
                LOG_REDACTION_PATTERNS: true,
                LOG_REDACTION_FIELDS: true,
                LOG_REDACTION_CUSTOM_PATTERNS: '',
                LOG_REDACTION_WHITELIST: 'id,timestamp,level',
                LOG_REDACTION_EVENTS: false,
              };
              return config[key] ?? defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<LogRedactionService>(LogRedactionService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('Email Pattern Redaction', () => {
    it('should redact email addresses', () => {
      const testData = {
        message: 'Contact john.doe@example.com for more info',
        userEmail: 'jane.smith@company.org',
      };

      const result = service.redactPII(testData);

      expect(result.redactedData.message).toContain('[REDACTED]');
      expect(result.redactedData.message).not.toContain('john.doe@example.com');
      expect(result.redactedData.userEmail).toBe('[REDACTED]');
      expect(result.redactionCount).toBeGreaterThan(0);
      expect(result.patterns).toContain('EMAIL');
    });

    it('should redact multiple email formats', () => {
      const emails = [
        'simple@example.com',
        'user.name+tag@domain.co.uk',
        'test_email@sub.domain.org',
        'numbers123@domain456.com',
      ];

      emails.forEach(email => {
        const result = service.redactPII({ text: email });
        expect(result.redactedData.text).toBe('[REDACTED]');
        expect(result.redactionCount).toBe(1);
      });
    });
  });

  describe('Phone Number Pattern Redaction', () => {
    it('should redact various phone number formats', () => {
      const phoneNumbers = [
        '(555) 123-4567',
        '555-123-4567',
        '555.123.4567',
        '5551234567',
        '+1 555 123 4567',
        '+1-555-123-4567',
      ];

      phoneNumbers.forEach(phone => {
        const result = service.redactPII({ phone });
        expect(result.redactedData.phone).toBe('[REDACTED]');
        expect(result.patterns).toContain('PHONE');
      });
    });
  });

  describe('Credit Card Pattern Redaction', () => {
    it('should redact credit card numbers', () => {
      const creditCards = [
        '4111 1111 1111 1111',
        '4111-1111-1111-1111',
        '4111111111111111',
        '5555 5555 5555 4444',
      ];

      creditCards.forEach(card => {
        const result = service.redactPII({ cardNumber: card });
        expect(result.redactedData.cardNumber).toBe('[REDACTED]');
        expect(result.patterns).toContain('CREDIT_CARD');
      });
    });
  });

  describe('SSN Pattern Redaction', () => {
    it('should redact Social Security Numbers', () => {
      const ssns = [
        '123-45-6789',
        '987-65-4321',
      ];

      ssns.forEach(ssn => {
        const result = service.redactPII({ ssn });
        expect(result.redactedData.ssn).toBe('[REDACTED]');
        expect(result.patterns).toContain('SSN');
      });
    });
  });

  describe('JWT Token Pattern Redaction', () => {
    it('should redact JWT tokens', () => {
      const tokens = [
        'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
        'eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiIxIiwianRpIjoiMjNhNGE4ZDY5NGYwOGViNjEyYzNhMzQ1NjczN2VhODhjMjNlMzEyZSIsImlhdCI6MTYzMjI0OTg0MCwiZXhwIjoxNjMyMjUzNDQwfQ.test-signature',
      ];

      tokens.forEach(token => {
        const result = service.redactPII({ authorization: `Bearer ${token}` });
        expect(result.redactedData.authorization).toContain('[REDACTED]');
        expect(result.patterns).toContain('JWT_TOKEN');
      });
    });
  });

  describe('API Key Pattern Redaction', () => {
    it('should redact API keys', () => {
      const apiKeys = [
        'api_key: sk_test_1234567890abcdef',
        'access_token=ghp_1234567890abcdefghijklmnop',
        'secret: "xyzabc123456789012345678"',
      ];

      apiKeys.forEach(key => {
        const result = service.redactPII({ config: key });
        expect(result.redactedData.config).toContain('[REDACTED]');
        expect(result.patterns).toContain('API_KEY');
      });
    });
  });

  describe('Password Pattern Redaction', () => {
    it('should redact passwords in various formats', () => {
      const passwords = [
        'password: "mySecretPass123"',
        'pwd=supersecret',
        'pass: mypassword',
      ];

      passwords.forEach(pwd => {
        const result = service.redactPII({ config: pwd });
        expect(result.redactedData.config).toContain('[REDACTED]');
        expect(result.patterns).toContain('PASSWORD');
      });
    });
  });

  describe('IP Address Pattern Redaction', () => {
    it('should redact IP addresses', () => {
      const ips = [
        '192.168.1.1',
        '10.0.0.1',
        '172.16.254.1',
        '8.8.8.8',
      ];

      ips.forEach(ip => {
        const result = service.redactPII({ clientIP: ip });
        expect(result.redactedData.clientIP).toBe('[REDACTED]');
        expect(result.patterns).toContain('IP_ADDRESS');
      });
    });
  });

  describe('Cryptocurrency Address Redaction', () => {
    it('should redact Bitcoin addresses', () => {
      const bitcoinAddresses = [
        '1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa',
        '3J98t1WpEZ73CNmQviecrnyiWrnqRhWNLy',
      ];

      bitcoinAddresses.forEach(address => {
        const result = service.redactPII({ walletAddress: address });
        expect(result.redactedData.walletAddress).toBe('[REDACTED]');
        expect(result.patterns).toContain('BITCOIN');
      });
    });

    it('should redact Ethereum addresses', () => {
      const ethAddresses = [
        '0x742d35Cc7Bf8C2b1234567890abcdef1234567890',
        '0xde0B295669a9FD93d5F28D9Ec85E40f4cb697BAe',
      ];

      ethAddresses.forEach(address => {
        const result = service.redactPII({ ethWallet: address });
        expect(result.redactedData.ethWallet).toBe('[REDACTED]');
        expect(result.patterns).toContain('ETHEREUM');
      });
    });
  });

  describe('Field-based Redaction', () => {
    it('should redact fields based on field names', () => {
      const sensitiveData = {
        password: 'secret123',
        email: 'user@example.com',
        phone: '555-1234',
        creditCard: '4111111111111111',
        firstName: 'John',
        lastName: 'Doe',
        safeField: 'this should not be redacted',
      };

      const result = service.redactPII(sensitiveData);

      // Field-based redaction
      expect(result.redactedData.password).toBe('[REDACTED]');
      expect(result.redactedData.email).toBe('[REDACTED]');
      expect(result.redactedData.phone).toBe('[REDACTED]');
      expect(result.redactedData.creditCard).toBe('[REDACTED]');
      expect(result.redactedData.firstName).toBe('[REDACTED]');
      expect(result.redactedData.lastName).toBe('[REDACTED]');

      // Non-PII field should remain
      expect(result.redactedData.safeField).toBe('this should not be redacted');

      expect(result.redactionCount).toBeGreaterThan(0);
      expect(result.redactedFields).toContain('password');
      expect(result.redactedFields).toContain('email');
    });

    it('should respect whitelisted fields', () => {
      const data = {
        id: '12345', // whitelisted
        timestamp: '2023-01-01T00:00:00Z', // whitelisted
        level: 'info', // whitelisted
        email: 'user@example.com', // should be redacted
      };

      const result = service.redactPII(data);

      expect(result.redactedData.id).toBe('12345');
      expect(result.redactedData.timestamp).toBe('2023-01-01T00:00:00Z');
      expect(result.redactedData.level).toBe('info');
      expect(result.redactedData.email).toBe('[REDACTED]');
    });
  });

  describe('Complex Data Structures', () => {
    it('should redact nested objects', () => {
      const complexData = {
        user: {
          profile: {
            email: 'user@example.com',
            phone: '555-1234',
            address: {
              street: '123 Main St',
              city: 'Anytown',
            },
          },
          settings: {
            notifications: true,
          },
        },
        metadata: {
          ip: '192.168.1.1',
        },
      };

      const result = service.redactPII(complexData);

      expect(result.redactedData.user.profile.email).toBe('[REDACTED]');
      expect(result.redactedData.user.profile.phone).toBe('[REDACTED]');
      expect(result.redactedData.metadata.ip).toBe('[REDACTED]');
      expect(result.redactedData.user.settings.notifications).toBe(true);
    });

    it('should redact arrays', () => {
      const arrayData = {
        emails: [
          'user1@example.com',
          'user2@example.com',
          'user3@example.com',
        ],
        phoneNumbers: [
          '555-1111',
          '555-2222',
        ],
      };

      const result = service.redactPII(arrayData);

      result.redactedData.emails.forEach(email => {
        expect(email).toBe('[REDACTED]');
      });

      result.redactedData.phoneNumbers.forEach(phone => {
        expect(phone).toBe('[REDACTED]');
      });
    });
  });

  describe('Audit Log Redaction', () => {
    it('should redact audit logs while preserving critical fields', () => {
      const auditLog = {
        timestamp: new Date().toISOString(),
        level: 'info',
        userId: 'user-123',
        userEmail: 'user@example.com',
        action: 'profile_update',
        ipAddress: '192.168.1.100',
        details: {
          updatedFields: ['email', 'phone'],
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
        },
      };

      const redactedLog = service.redactAuditLog(auditLog);

      // Critical audit fields should be partially preserved
      expect(redactedLog.userId).toMatch(/user_[a-f0-9]+/);
      expect(redactedLog.ipAddress).toBe('192.168.xxx.xxx');
      expect(redactedLog.timestamp).toBe(auditLog.timestamp);
      expect(redactedLog.level).toBe(auditLog.level);
      expect(redactedLog.action).toBe(auditLog.action);

      // Sensitive details should be redacted
      expect(redactedLog.userEmail).toBe('[REDACTED]');
      expect(redactedLog.details.oldEmail).toBe('[REDACTED]');
      expect(redactedLog.details.newEmail).toBe('[REDACTED]');
    });
  });

  describe('Configuration Tests', () => {
    it('should handle disabled redaction', () => {
      // Create service with redaction disabled
      const disabledConfigService = {
        get: jest.fn((key: string, defaultValue?: any) => {
          if (key === 'LOG_REDACTION_ENABLED') return false;
          return defaultValue;
        }),
      };

      const disabledService = new LogRedactionService(disabledConfigService as any);

      const sensitiveData = {
        email: 'user@example.com',
        password: 'secret123',
      };

      const result = disabledService.redactPII(sensitiveData);

      expect(result.redactedData).toEqual(sensitiveData);
      expect(result.redactionCount).toBe(0);
    });

    it('should validate configuration', () => {
      expect(service.validateConfig()).toBe(true);
    });

    it('should provide redaction statistics', () => {
      const stats = service.getRedactionStats();

      expect(stats).toHaveProperty('enabled');
      expect(stats).toHaveProperty('patternRedaction');
      expect(stats).toHaveProperty('fieldRedaction');
      expect(stats).toHaveProperty('builtInPatterns');
      expect(stats.builtInPatterns).toBe(Object.keys(PII_PATTERNS).length);
      expect(stats.piiFieldNames).toBe(PII_FIELD_NAMES.length);
    });
  });

  describe('Length Preservation', () => {
    it('should preserve length when configured', () => {
      // Create service with length preservation
      const lengthPreservingConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            LOG_REDACTION_ENABLED: true,
            LOG_REDACTION_PRESERVE_LENGTH: true,
            LOG_REDACTION_PATTERNS: true,
            LOG_REDACTION_FIELDS: true,
            LOG_REDACTION_CUSTOM_PATTERNS: '',
            LOG_REDACTION_WHITELIST: '',
            LOG_REDACTION_EVENTS: false,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const lengthService = new LogRedactionService(lengthPreservingConfig as any);

      const result = lengthService.redactPII({ 
        password: 'short' 
      });

      expect(result.redactedData.password).toBe('*****');
      expect(result.redactedData.password.length).toBe(5);
    });

    it('should handle long strings with partial preservation', () => {
      const lengthPreservingConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            LOG_REDACTION_ENABLED: true,
            LOG_REDACTION_PRESERVE_LENGTH: true,
            LOG_REDACTION_PATTERNS: true,
            LOG_REDACTION_FIELDS: true,
            LOG_REDACTION_CUSTOM_PATTERNS: '',
            LOG_REDACTION_WHITELIST: '',
            LOG_REDACTION_EVENTS: false,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const lengthService = new LogRedactionService(lengthPreservingConfig as any);

      const result = lengthService.redactPII({ 
        password: 'verylongpassword123' 
      });

      expect(result.redactedData.password).toMatch(/^v\*+3$/);
      expect(result.redactedData.password.length).toBe(19);
    });
  });

  describe('Custom Patterns', () => {
    it('should handle custom regex patterns', () => {
      const customPatternConfig = {
        get: jest.fn((key: string, defaultValue?: any) => {
          const config = {
            LOG_REDACTION_ENABLED: true,
            LOG_REDACTION_PATTERNS: true,
            LOG_REDACTION_FIELDS: true,
            LOG_REDACTION_CUSTOM_PATTERNS: '/test\\d{3}/gi|/custom-[a-z]+/gi',
            LOG_REDACTION_WHITELIST: '',
            LOG_REDACTION_EVENTS: false,
          };
          return config[key] ?? defaultValue;
        }),
      };

      const customService = new LogRedactionService(customPatternConfig as any);

      const result = customService.redactPII({
        message: 'Found test123 and custom-pattern in logs'
      });

      expect(result.redactedData.message).toContain('[REDACTED]');
      expect(result.patterns).toContain('CUSTOM');
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = {
        circular: null as any,
      };
      malformedData.circular = malformedData;

      expect(() => {
        service.redactPII(malformedData);
      }).not.toThrow();
    });

    it('should handle null and undefined values', () => {
      const result1 = service.redactPII(null);
      const result2 = service.redactPII(undefined);
      const result3 = service.redactPII({ 
        nullField: null, 
        undefinedField: undefined 
      });

      expect(result1.redactedData).toBeNull();
      expect(result2.redactedData).toBeUndefined();
      expect(result3.redactedData.nullField).toBeNull();
      expect(result3.redactedData.undefinedField).toBeUndefined();
    });
  });
});