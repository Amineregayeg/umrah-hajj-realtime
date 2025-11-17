import { Injectable, Logger } from '@nestjs/common';
import type {
  RealtimeSession,
  UserContext,
  SessionMetrics,
  SafetyCheckResult,
  SafetyRule,
} from './realtime.types';

/**
 * Session Management and Safety Layer
 * Manages active sessions, user context, and content safety
 */

@Injectable()
export class RealtimeSessionManager {
  private readonly logger = new Logger(RealtimeSessionManager.name);
  private readonly sessions = new Map<string, RealtimeSession>();
  private readonly metrics = new Map<string, SessionMetrics>();
  private readonly safetyRules: SafetyRule[] = this.initializeSafetyRules();

  /**
   * Create a new realtime session
   */
  createSession(userId: string, websocket: any): RealtimeSession {
    const sessionId = this.generateSessionId();

    const session: RealtimeSession = {
      id: sessionId,
      userId,
      websocket,
      createdAt: new Date(),
      lastActivityAt: new Date(),
      userContext: this.getDefaultUserContext(),
      isActive: true,
    };

    this.sessions.set(sessionId, session);

    // Initialize metrics
    this.metrics.set(sessionId, {
      sessionId,
      userId,
      duration: 0,
      audioFramesReceived: 0,
      audioFramesSent: 0,
      toolCallsCount: 0,
      errorsCount: 0,
    });

    this.logger.log(`Session created: ${sessionId} for user ${userId}`);
    return session;
  }

  /**
   * Get session by ID
   */
  getSession(sessionId: string): RealtimeSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Update user context for a session
   */
  updateContext(sessionId: string, context: Partial<UserContext>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    session.userContext = {
      ...session.userContext,
      ...context,
    };
    session.lastActivityAt = new Date();

    this.logger.debug(`Context updated for session ${sessionId}:`, context);
  }

  /**
   * Update session activity timestamp
   */
  updateActivity(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (session) {
      session.lastActivityAt = new Date();
    }
  }

  /**
   * Increment metrics
   */
  incrementMetric(
    sessionId: string,
    metric: 'audioFramesReceived' | 'audioFramesSent' | 'toolCallsCount' | 'errorsCount',
  ): void {
    const metrics = this.metrics.get(sessionId);
    if (metrics) {
      metrics[metric]++;
    }
  }

  /**
   * Record error
   */
  recordError(sessionId: string, error: string): void {
    const metrics = this.metrics.get(sessionId);
    if (metrics) {
      metrics.errorsCount++;
      metrics.lastError = error;
    }
  }

  /**
   * Close session
   */
  closeSession(sessionId: string): SessionMetrics | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return undefined;
    }

    session.isActive = false;

    // Calculate final metrics
    const metrics = this.metrics.get(sessionId);
    if (metrics) {
      const duration =
        (new Date().getTime() - session.createdAt.getTime()) / 1000;
      metrics.duration = Math.round(duration);
    }

    this.logger.log(`Session closed: ${sessionId}`, metrics);

    // Clean up
    this.sessions.delete(sessionId);
    const finalMetrics = metrics;
    this.metrics.delete(sessionId);

    return finalMetrics;
  }

  /**
   * Get all active sessions
   */
  getActiveSessions(): RealtimeSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.isActive);
  }

  /**
   * Clean up inactive sessions (older than 30 minutes)
   */
  cleanupInactiveSessions(): number {
    const now = new Date();
    const timeout = 30 * 60 * 1000; // 30 minutes
    let cleaned = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      const inactive = now.getTime() - session.lastActivityAt.getTime();
      if (inactive > timeout) {
        this.closeSession(sessionId);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      this.logger.log(`Cleaned up ${cleaned} inactive sessions`);
    }

    return cleaned;
  }

  // ============================================================================
  // Safety Layer
  // ============================================================================

  /**
   * Check content for safety issues before sending to user
   */
  checkSafety(content: string, context: UserContext): SafetyCheckResult {
    const warnings: string[] = [];
    let blockedContent: string | undefined;
    let suggestedAlternative: string | undefined;

    for (const rule of this.safetyRules) {
      if (rule.pattern.test(content)) {
        warnings.push(rule.message);

        if (rule.action === 'block') {
          blockedContent = content;
          suggestedAlternative = this.getSafeAlternative(rule, context);
          this.logger.warn(
            `BLOCKED: ${rule.message} | Content: ${content.substring(0, 100)}`,
          );
        } else if (rule.action === 'warn') {
          this.logger.warn(`WARNING: ${rule.message}`);
        } else if (rule.action === 'modify') {
          // Modify content to be safer
          content = this.modifyUnsafeContent(content, rule);
        }
      }
    }

    return {
      passed: warnings.length === 0 || !blockedContent,
      warnings,
      blockedContent,
      suggestedAlternative,
    };
  }

  /**
   * Initialize safety rules
   */
  private initializeSafetyRules(): SafetyRule[] {
    return [
      // CRITICAL: No fatwas
      {
        pattern: /(is it|is this|are you|am i) (haram|halal|permissible|allowed|forbidden|prohibited)/i,
        severity: 'critical',
        message: 'Attempting to issue fatwa - redirect to scholar',
        action: 'modify',
      },
      {
        pattern: /i (rule|declare|say) that/i,
        severity: 'critical',
        message: 'Attempting to issue authoritative ruling',
        action: 'block',
      },

      // CRITICAL: No encouraging harm
      {
        pattern: /(push|shove|force) (through|your way|others)/i,
        severity: 'critical',
        message: 'Encouraging pushing/harm',
        action: 'block',
      },
      {
        pattern: /you (must|have to|need to) (touch|kiss|reach) (the )?(black stone|hajar)/i,
        severity: 'high',
        message: 'Implying Black Stone touching is obligatory',
        action: 'modify',
      },

      // HIGH: Medical advice
      {
        pattern: /(you have|this is|sounds like|probably) (a |an )?(fever|infection|disease|injury)/i,
        severity: 'high',
        message: 'Attempting medical diagnosis',
        action: 'block',
      },
      {
        pattern: /take (this|these|medication|medicine|drug)/i,
        severity: 'high',
        message: 'Attempting to prescribe medication',
        action: 'block',
      },

      // HIGH: Precise navigation without tools
      {
        pattern: /coordinates? (are|is)? (\d+\.?\d*)/i,
        severity: 'high',
        message: 'Providing GPS coordinates without verification',
        action: 'warn',
      },
      {
        pattern: /exactly (\d+) (meters?|kilometers?|steps?) (to|from)/i,
        severity: 'medium',
        message: 'Providing precise distance without tools',
        action: 'warn',
      },

      // MEDIUM: Overclaiming certainty
      {
        pattern: /(definitely|absolutely|certainly|100%) (correct|true|right|the answer)/i,
        severity: 'medium',
        message: 'Overclaiming certainty',
        action: 'modify',
      },
      {
        pattern: /there is (no|zero) (chance|possibility|way) (that|of)/i,
        severity: 'medium',
        message: 'Absolute statements without qualification',
        action: 'modify',
      },

      // MEDIUM: Overriding Haram staff
      {
        pattern: /(ignore|don't listen to|disregard) (the )?(staff|security|guard)/i,
        severity: 'critical',
        message: 'Suggesting to ignore Haram staff',
        action: 'block',
      },
    ];
  }

  /**
   * Get safe alternative response for blocked content
   */
  private getSafeAlternative(rule: SafetyRule, context: UserContext): string {
    // Provide context-appropriate safe alternatives
    if (rule.message.includes('fatwa')) {
      return `I understand your question, but I cannot issue religious rulings. Please consult with a qualified scholar or your group's religious guide. I can provide general information from the ${context.madhhab !== 'none' ? context.madhhab + ' madhhab' : 'four madhahib'}, but the final decision should come from a scholar who knows your specific situation.`;
    }

    if (rule.message.includes('pushing')) {
      return `Safety first! Please never push or force your way through crowds. The ritual is valid even if performed in a less crowded area or time. Your safety and the safety of others is part of worship.`;
    }

    if (rule.message.includes('medical')) {
      return `I cannot provide medical advice. If you're feeling unwell, please seek help from the medical stations located throughout the Haram. Haram staff can direct you to the nearest medical facility.`;
    }

    if (rule.message.includes('Haram staff')) {
      return `Please always follow Haram security staff instructions. They are there for your safety and to manage crowd flow. Their guidance takes priority.`;
    }

    return `I'm not certain about that. For your safety and to ensure correct guidance, please ask Haram staff or consult with your group's religious guide.`;
  }

  /**
   * Modify unsafe content to be safer
   */
  private modifyUnsafeContent(content: string, rule: SafetyRule): string {
    // Add safety qualifiers
    if (rule.message.includes('obligatory')) {
      content = content.replace(
        /(you )?(must|have to|need to)/gi,
        'it is recommended to',
      );
      content += ' However, if it\'s too crowded or unsafe, gesturing from afar is completely valid.';
    }

    if (rule.message.includes('certainty')) {
      content = content.replace(
        /(definitely|absolutely|certainly|100%)/gi,
        'generally',
      );
      content +=
        ' However, please verify this with your scholar if you need certainty for your specific situation.';
    }

    if (rule.message.includes('fatwa')) {
      content +=
        ' This is general information. For a ruling specific to your situation, please consult a qualified scholar.';
    }

    return content;
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  private getDefaultUserContext(): UserContext {
    return {
      latitude: null,
      longitude: null,
      zoneId: null,
      ritualStep: null,
      tawafLap: undefined,
      saiLap: undefined,
      gender: 'not_specified',
      madhhab: 'none',
      accessibility: 'none',
      preferredLanguage: 'en',
    };
  }
}
