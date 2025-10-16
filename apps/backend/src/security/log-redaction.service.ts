import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Common PII patterns for redaction
export const PII_PATTERNS = {
  // Email addresses
  EMAIL: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  
  // Phone numbers (various formats)
  PHONE: /(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g,
  
  // Credit card numbers (basic pattern)
  CREDIT_CARD: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
  
  // SSN (US Social Security Numbers)
  SSN: /\b\d{3}-\d{2}-\d{4}\b/g,
  
  // IP addresses
  IP_ADDRESS: /\b(?:[0-9]{1,3}\.){3}[0-9]{1,3}\b/g,
  
  // JWT tokens (basic pattern)
  JWT_TOKEN: /eyJ[a-zA-Z0-9_-]*\.eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*/g,
  
  // API keys (common patterns)
  API_KEY: /(?:api[_-]?key|access[_-]?token|secret)["\s:=]+[a-zA-Z0-9_-]{20,}/gi,
  
  // Passwords in URLs or logs
  PASSWORD: /(?:password|pwd|pass)["\s:=]+[^\s"&]{6,}/gi,
  
  // Bank account numbers (basic)
  BANK_ACCOUNT: /\b\d{8,17}\b/g,
  
  // National ID patterns (can be extended for different countries)
  NATIONAL_ID: /\b\d{9,13}\b/g,
  
  // Bitcoin addresses
  BITCOIN: /\b[13][a-km-zA-HJ-NP-Z1-9]{25,34}\b/g,
  
  // Ethereum addresses
  ETHEREUM: /\b0x[a-fA-F0-9]{40}\b/g,
  
  // UUID patterns (sometimes contain sensitive data)
  UUID: /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi,
};

// Field names that commonly contain PII
export const PII_FIELD_NAMES = [
  'password', 'pwd', 'secret', 'token', 'key', 'auth', 'authorization',
  'email', 'mail', 'e_mail', 'emailAddress', 'email_address',
  'phone', 'telephone', 'mobile', 'phoneNumber', 'phone_number',
  'ssn', 'social_security', 'socialSecurityNumber', 'social_security_number',
  'creditCard', 'credit_card', 'cardNumber', 'card_number',
  'bankAccount', 'bank_account', 'accountNumber', 'account_number',
  'nationalId', 'national_id', 'passport', 'driverLicense', 'driver_license',
  'address', 'street', 'streetAddress', 'street_address', 'homeAddress', 'home_address',
  'firstName', 'first_name', 'lastName', 'last_name', 'fullName', 'full_name',
  'dateOfBirth', 'date_of_birth', 'birthDate', 'birth_date', 'dob',
  'ipAddress', 'ip_address', 'clientIp', 'client_ip', 'remoteAddr', 'remote_addr',
];

export interface RedactionConfig {
  enabled: boolean;
  redactionToken: string;
  preserveLength: boolean;
  enablePatternRedaction: boolean;
  enableFieldRedaction: boolean;
  customPatterns: RegExp[];
  whitelistedFields: string[];
  logRedactionEvents: boolean;
}

export interface RedactionResult {
  redactedData: any;
  redactionCount: number;
  redactedFields: string[];
  patterns: string[];
}

@Injectable()
export class LogRedactionService {
  private readonly logger = new Logger(LogRedactionService.name);
  private readonly config: RedactionConfig;

  constructor(private readonly configService: ConfigService) {
    this.config = {
      enabled: this.configService.get<boolean>('LOG_REDACTION_ENABLED', true),
      redactionToken: this.configService.get<string>('LOG_REDACTION_TOKEN', '[REDACTED]'),
      preserveLength: this.configService.get<boolean>('LOG_REDACTION_PRESERVE_LENGTH', false),
      enablePatternRedaction: this.configService.get<boolean>('LOG_REDACTION_PATTERNS', true),
      enableFieldRedaction: this.configService.get<boolean>('LOG_REDACTION_FIELDS', true),
      customPatterns: this.parseCustomPatterns(),
      whitelistedFields: this.configService.get<string>('LOG_REDACTION_WHITELIST', '').split(',').filter(f => f.trim()),
      logRedactionEvents: this.configService.get<boolean>('LOG_REDACTION_EVENTS', false),
    };

    if (this.config.enabled) {
      this.logger.log('Log redaction service initialized');
      this.logger.log(`Pattern redaction: ${this.config.enablePatternRedaction ? 'enabled' : 'disabled'}`);
      this.logger.log(`Field redaction: ${this.config.enableFieldRedaction ? 'enabled' : 'disabled'}`);
      this.logger.log(`Whitelisted fields: ${this.config.whitelistedFields.length}`);
    } else {
      this.logger.warn('Log redaction service is DISABLED');
    }
  }

  /**
   * Parse custom regex patterns from environment variables
   */
  private parseCustomPatterns(): RegExp[] {
    const customPatternsStr = this.configService.get<string>('LOG_REDACTION_CUSTOM_PATTERNS', '');
    if (!customPatternsStr) return [];

    try {
      const patterns = customPatternsStr.split('|').map(pattern => {
        // Expect patterns in format: /pattern/flags
        const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
        if (match) {
          return new RegExp(match[1], match[2]);
        }
        // Fallback to simple string pattern
        return new RegExp(pattern, 'gi');
      });
      
      this.logger.log(`Loaded ${patterns.length} custom redaction patterns`);
      return patterns;
    } catch (error) {
      this.logger.error('Failed to parse custom redaction patterns:', error);
      return [];
    }
  }

  /**
   * Redact PII from any data structure (object, string, array)
   */
  redactPII(data: any, context?: string): RedactionResult {
    if (!this.config.enabled) {
      return {
        redactedData: data,
        redactionCount: 0,
        redactedFields: [],
        patterns: [],
      };
    }

    const result: RedactionResult = {
      redactedData: null,
      redactionCount: 0,
      redactedFields: [],
      patterns: [],
    };

    try {
      result.redactedData = this.redactRecursive(data, result, '');
      
      if (this.config.logRedactionEvents && result.redactionCount > 0) {
        this.logger.log(`Redacted ${result.redactionCount} items in ${context || 'unknown context'}`, {
          redactedFields: result.redactedFields,
          patterns: result.patterns,
        });
      }
    } catch (error) {
      this.logger.error('Error during PII redaction:', error);
      result.redactedData = this.config.redactionToken;
    }

    return result;
  }

  /**
   * Recursively redact data
   */
  private redactRecursive(data: any, result: RedactionResult, path: string): any {
    if (data === null || data === undefined) {
      return data;
    }

    // Handle strings
    if (typeof data === 'string') {
      return this.redactString(data, result, path);
    }

    // Handle arrays
    if (Array.isArray(data)) {
      return data.map((item, index) => 
        this.redactRecursive(item, result, `${path}[${index}]`)
      );
    }

    // Handle objects
    if (typeof data === 'object') {
      const redactedObj: any = {};
      
      for (const [key, value] of Object.entries(data)) {
        const fieldPath = path ? `${path}.${key}` : key;
        
        // Check if field should be redacted based on name
        if (this.config.enableFieldRedaction && this.shouldRedactField(key)) {
          redactedObj[key] = this.createRedactionToken(value);
          result.redactionCount++;
          result.redactedFields.push(fieldPath);
        } else {
          redactedObj[key] = this.redactRecursive(value, result, fieldPath);
        }
      }
      
      return redactedObj;
    }

    // For primitive types (number, boolean), return as-is
    return data;
  }

  /**
   * Redact PII patterns from strings
   */
  private redactString(text: string, result: RedactionResult, path: string): string {
    if (!this.config.enablePatternRedaction || !text || typeof text !== 'string') {
      return text;
    }

    let redactedText = text;
    
    // Apply built-in PII patterns
    for (const [patternName, pattern] of Object.entries(PII_PATTERNS)) {
      const matches = redactedText.match(pattern);
      if (matches) {
        redactedText = redactedText.replace(pattern, (match) => this.createRedactionToken(match));
        result.redactionCount += matches.length;
        result.patterns.push(patternName);
        
        if (path) {
          result.redactedFields.push(`${path}:${patternName}`);
        }
      }
    }

    // Apply custom patterns
    for (const pattern of this.config.customPatterns) {
      const matches = redactedText.match(pattern);
      if (matches) {
        redactedText = redactedText.replace(pattern, (match) => this.createRedactionToken(match));
        result.redactionCount += matches.length;
        result.patterns.push('CUSTOM');
        
        if (path) {
          result.redactedFields.push(`${path}:CUSTOM`);
        }
      }
    }

    return redactedText;
  }

  /**
   * Check if a field name indicates PII
   */
  private shouldRedactField(fieldName: string): boolean {
    if (this.config.whitelistedFields.includes(fieldName)) {
      return false;
    }

    const lowerFieldName = fieldName.toLowerCase();
    return PII_FIELD_NAMES.some(piiField => 
      lowerFieldName.includes(piiField.toLowerCase())
    );
  }

  /**
   * Create redaction token, optionally preserving length
   */
  private createRedactionToken(originalValue: any): string {
    if (!this.config.preserveLength || typeof originalValue !== 'string') {
      return this.config.redactionToken;
    }

    // Preserve length for better debugging
    const length = originalValue.length;
    if (length <= 10) {
      return '*'.repeat(length);
    } else {
      // Show first and last characters for longer strings
      return `${originalValue[0]}${'*'.repeat(length - 2)}${originalValue[length - 1]}`;
    }
  }

  /**
   * Redact log entry specifically for audit logs
   */
  redactAuditLog(logEntry: any): any {
    const result = this.redactPII(logEntry, 'audit_log');
    
    // Ensure critical audit fields are never fully redacted
    if (result.redactedData && typeof result.redactedData === 'object') {
      // Preserve partial information for audit trail
      if (result.redactedData.userId === this.config.redactionToken) {
        result.redactedData.userId = `user_${this.hashString(logEntry.userId || 'unknown')}`;
      }
      
      if (result.redactedData.ipAddress === this.config.redactionToken) {
        result.redactedData.ipAddress = this.partiallyRedactIP(logEntry.ipAddress || 'unknown');
      }
    }
    
    return result.redactedData;
  }

  /**
   * Partially redact IP address for audit purposes
   */
  private partiallyRedactIP(ip: string): string {
    if (!ip || ip === 'unknown') return ip;
    
    // For IPv4, show first two octets
    const ipv4Match = ip.match(/^(\d+\.\d+)\.\d+\.\d+$/);
    if (ipv4Match) {
      return `${ipv4Match[1]}.xxx.xxx`;
    }
    
    // For IPv6, show first block
    const ipv6Match = ip.match(/^([a-f0-9:]+):/i);
    if (ipv6Match) {
      return `${ipv6Match[1]}::xxxx`;
    }
    
    return 'xxx.xxx.xxx.xxx';
  }

  /**
   * Create deterministic hash for consistent redaction
   */
  private hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16).substring(0, 8);
  }

  /**
   * Validate redaction configuration
   */
  validateConfig(): boolean {
    if (!this.config.enabled) {
      this.logger.warn('Redaction is disabled - PII may be exposed in logs');
      return false;
    }

    if (this.config.redactionToken.length < 5) {
      this.logger.error('Redaction token is too short - should be at least 5 characters');
      return false;
    }

    // Test patterns
    let patternErrors = 0;
    for (const pattern of this.config.customPatterns) {
      try {
        'test'.match(pattern);
      } catch (error) {
        this.logger.error('Invalid custom pattern:', pattern);
        patternErrors++;
      }
    }

    if (patternErrors > 0) {
      this.logger.error(`${patternErrors} invalid custom patterns detected`);
      return false;
    }

    this.logger.log('Redaction configuration validated successfully');
    return true;
  }

  /**
   * Get redaction statistics for monitoring
   */
  getRedactionStats(): any {
    return {
      enabled: this.config.enabled,
      patternRedaction: this.config.enablePatternRedaction,
      fieldRedaction: this.config.enableFieldRedaction,
      customPatterns: this.config.customPatterns.length,
      whitelistedFields: this.config.whitelistedFields.length,
      builtInPatterns: Object.keys(PII_PATTERNS).length,
      piiFieldNames: PII_FIELD_NAMES.length,
    };
  }
}