import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Feature Flags Service
 *
 * Manages feature flags for gradual rollout and risk mitigation.
 * All AI features are disabled by default for safety.
 *
 * @see AI_GUIDE_ZERO_RISK_STRATEGY.md for rollout strategy
 */
@Injectable()
export class FeatureFlagsService {
  private readonly logger = new Logger(FeatureFlagsService.name);

  constructor(private readonly configService: ConfigService) {
    this.logFeatureStatus();
  }

  /**
   * Check if AI features are enabled globally
   */
  isAIEnabled(): boolean {
    return this.configService.get<boolean>('FEATURE_AI_ENABLED', false);
  }

  /**
   * Check if AI Realtime voice chat is enabled
   */
  isAIRealtimeEnabled(): boolean {
    return this.configService.get<boolean>('FEATURE_AI_REALTIME_ENABLED', false);
  }

  /**
   * Check if AI navigation prompts are enabled
   */
  isAINavigationPromptsEnabled(): boolean {
    return this.configService.get<boolean>('FEATURE_AI_NAV_PROMPTS_ENABLED', false);
  }

  /**
   * Check if emergency kill switch is active (disables ALL AI)
   */
  isEmergencyKillSwitchActive(): boolean {
    return this.configService.get<boolean>('EMERGENCY_KILL_SWITCH', false);
  }

  /**
   * Check if AI is enabled for a specific user (for testing/canary)
   */
  isAIEnabledForUser(userId: string): boolean {
    // Emergency kill switch overrides everything
    if (this.isEmergencyKillSwitchActive()) {
      return false;
    }

    // Check if user is in test users list
    const testUsers = this.getTestUsers();
    if (testUsers.includes(userId)) {
      return true;
    }

    // Check rollout percentage
    const rolloutPercentage = this.getRolloutPercentage();
    if (rolloutPercentage >= 100) {
      return this.isAIEnabled();
    }

    // Use user ID hash to determine if in rollout percentage
    const userHash = this.hashUserId(userId);
    const inRollout = (userHash % 100) < rolloutPercentage;

    return this.isAIEnabled() && inRollout;
  }

  /**
   * Get list of test users who always have AI enabled
   */
  private getTestUsers(): string[] {
    const testUsersStr = this.configService.get<string>('FEATURE_AI_TEST_USERS', '');
    return testUsersStr.split(',').filter(id => id.trim().length > 0);
  }

  /**
   * Get rollout percentage (0-100)
   */
  private getRolloutPercentage(): number {
    return this.configService.get<number>('FEATURE_AI_ROLLOUT_PERCENTAGE', 0);
  }

  /**
   * Hash user ID to a number (for consistent percentage-based rollout)
   */
  private hashUserId(userId: string): number {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      const char = userId.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Log feature flag status on startup
   */
  private logFeatureStatus(): void {
    this.logger.log('=== Feature Flags Status ===');
    this.logger.log(`AI Enabled: ${this.isAIEnabled()}`);
    this.logger.log(`AI Realtime Enabled: ${this.isAIRealtimeEnabled()}`);
    this.logger.log(`AI Navigation Prompts Enabled: ${this.isAINavigationPromptsEnabled()}`);
    this.logger.log(`Emergency Kill Switch: ${this.isEmergencyKillSwitchActive()}`);
    this.logger.log(`Rollout Percentage: ${this.getRolloutPercentage()}%`);
    this.logger.log(`Test Users: ${this.getTestUsers().length} configured`);
    this.logger.log('===========================');
  }
}
