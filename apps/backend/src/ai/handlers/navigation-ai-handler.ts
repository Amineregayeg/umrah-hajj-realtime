import { Injectable, Logger } from '@nestjs/common';
import { FeatureFlagsService } from '../../shared/config/feature-flags.service';
import { PromptBuilderService } from '../services/prompt-builder.service';
import { RitualStateService } from '../services/ritual-state.service';

/**
 * Navigation AI Handler
 *
 * OPTIONAL integration between navigation system and AI features.
 * This handler is called by NavGateway when navigation events occur,
 * but is fully wrapped in try-catch to ensure navigation NEVER breaks.
 *
 * Features:
 * - Feature flag protected (disabled by default)
 * - Wrapped in try-catch (graceful degradation)
 * - Zero impact on navigation if disabled or errors occur
 *
 * @see apps/backend/src/nav/nav.gateway.ts for integration point
 */
@Injectable()
export class NavigationAIHandler {
  private readonly logger = new Logger(NavigationAIHandler.name);

  constructor(
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly promptBuilderService: PromptBuilderService,
    private readonly ritualStateService: RitualStateService,
  ) {}

  /**
   * Handle navigation update event
   *
   * Called when user moves during navigation.
   * Can generate AI prompts for approaching landmarks, turns, etc.
   *
   * @param userId - User ID
   * @param navUpdate - Navigation update data
   * @returns AI prompt if generated, null otherwise
   */
  async handleNavigationUpdate(
    userId: string,
    navUpdate: {
      lat: number;
      lng: number;
      heading?: number;
      speed?: number;
    },
  ): Promise<{ text: string; language: string } | null> {
    try {
      // Check feature flags
      if (!this.featureFlagsService.isAINavigationPromptsEnabled()) {
        return null;
      }

      if (!this.featureFlagsService.isAIEnabledForUser(userId)) {
        return null;
      }

      // Get ritual state
      const ritualState = await this.ritualStateService.getRitualState(userId);
      if (!ritualState) {
        return null;
      }

      // TODO: Implement location-based prompt generation
      // For now, this is a placeholder that returns null
      // In production, this would:
      // 1. Check distance to landmarks
      // 2. Detect when user is approaching a gate/corner
      // 3. Generate context-aware prompts
      // 4. Track lap completion

      return null;
    } catch (error) {
      // CRITICAL: Never throw errors - just log and return null
      this.logger.error(`AI navigation handler error: ${error.message}`);
      return null;
    }
  }

  /**
   * Handle lap completion event
   *
   * Called when user completes a lap of Tawaf or Sa'i.
   * Generates encouragement and progress update.
   *
   * @param userId - User ID
   * @param lapType - Type of lap (tawaf or sai)
   * @param lapNumber - Lap number completed
   * @returns AI prompt
   */
  async handleLapComplete(
    userId: string,
    lapType: 'tawaf' | 'sai',
    lapNumber: number,
  ): Promise<{ text: string; language: string } | null> {
    try {
      // Check feature flags
      if (!this.featureFlagsService.isAINavigationPromptsEnabled()) {
        return null;
      }

      if (!this.featureFlagsService.isAIEnabledForUser(userId)) {
        return null;
      }

      // Update ritual state
      if (lapType === 'tawaf') {
        await this.ritualStateService.updateTawafProgress(userId, lapNumber);
      } else {
        await this.ritualStateService.updateSaiProgress(userId, lapNumber);
      }

      // Get ritual state
      const ritualState = await this.ritualStateService.getRitualState(userId);
      if (!ritualState) {
        return null;
      }

      const totalLaps = 7;
      const language = 'en'; // TODO: Get from user profile

      // Generate prompt
      const promptText = this.promptBuilderService.buildNavigationPrompt(
        {
          type: 'lap_complete',
          lapNumber,
          totalLaps,
          nextStage:
            lapNumber >= totalLaps
              ? lapType === 'tawaf'
                ? "Great! Now proceed to Sa'i."
                : 'Excellent! Now proceed to complete your ritual.'
              : 'Keep going!',
        },
        language,
      );

      return {
        text: promptText,
        language,
      };
    } catch (error) {
      // CRITICAL: Never throw errors - just log and return null
      this.logger.error(`AI lap completion handler error: ${error.message}`);
      return null;
    }
  }

  /**
   * Handle stage change event
   *
   * Called when user moves to a new ritual stage.
   * Generates guidance for the new stage.
   *
   * @param userId - User ID
   * @param newStage - New ritual stage
   * @returns AI prompt
   */
  async handleStageChange(
    userId: string,
    newStage: string,
  ): Promise<{ text: string; language: string } | null> {
    try {
      // Check feature flags
      if (!this.featureFlagsService.isAINavigationPromptsEnabled()) {
        return null;
      }

      if (!this.featureFlagsService.isAIEnabledForUser(userId)) {
        return null;
      }

      // Update ritual state
      await this.ritualStateService.updateStage(userId, newStage as any);

      const language = 'en'; // TODO: Get from user profile

      // Get stage description
      const stageDescription = this.ritualStateService.getStageDescription(
        newStage as any,
        language,
      );

      // Generate prompt
      const promptText = this.promptBuilderService.buildNavigationPrompt(
        {
          type: 'stage_change',
          nextStage: stageDescription,
        },
        language,
      );

      return {
        text: promptText,
        language,
      };
    } catch (error) {
      // CRITICAL: Never throw errors - just log and return null
      this.logger.error(`AI stage change handler error: ${error.message}`);
      return null;
    }
  }

  /**
   * Check if AI navigation prompts are available for user
   */
  isAvailableForUser(userId: string): boolean {
    try {
      return (
        this.featureFlagsService.isAINavigationPromptsEnabled() &&
        this.featureFlagsService.isAIEnabledForUser(userId)
      );
    } catch (error) {
      // Fail closed - if error checking, assume not available
      return false;
    }
  }
}
