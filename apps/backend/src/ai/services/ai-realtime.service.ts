import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FeatureFlagsService } from '../../shared/config/feature-flags.service';
import { KnowledgeSearchService } from './knowledge-search.service';

export interface RealtimeSessionResponse {
  websocketUrl: string;
  apiKey: string;
  voice: string;
  language: string;
  model: string;
}

interface UserContext {
  userId: string;
  gender?: string;
  preferredLanguage?: string;
  madhhab?: string;
  mobilityNeeds?: string;
  ritualType?: 'umrah' | 'hajj';
  currentStage?: string;
}

/**
 * AI Realtime Service
 *
 * Manages OpenAI Realtime API sessions for voice-based AI guidance.
 * Provides context-aware instructions based on user profile and ritual state.
 *
 * @see https://platform.openai.com/docs/guides/realtime
 */
@Injectable()
export class AIRealtimeService {
  private readonly logger = new Logger(AIRealtimeService.name);
  private readonly openAIApiKey: string;
  private readonly realtimeModel: string;
  private readonly defaultVoice: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly featureFlagsService: FeatureFlagsService,
    private readonly knowledgeSearchService: KnowledgeSearchService,
  ) {
    this.openAIApiKey = this.configService.get<string>('OPENAI_API_KEY', '');
    this.realtimeModel = this.configService.get<string>('REALTIME_MODEL', 'gpt-realtime');
    this.defaultVoice = this.configService.get<string>('REALTIME_VOICE', 'verse');

    if (!this.openAIApiKey) {
      this.logger.warn('OPENAI_API_KEY not configured - AI Realtime features will be disabled');
    }
  }

  /**
   * Create OpenAI Realtime API session
   *
   * @param userContext - User profile and ritual context
   * @returns Session configuration with ephemeral token and WebSocket URL
   */
  async createSession(userContext: UserContext): Promise<RealtimeSessionResponse> {
    // Check feature flags
    if (!this.featureFlagsService.isAIRealtimeEnabled()) {
      throw new BadRequestException('AI Realtime feature is not enabled');
    }

    if (!this.featureFlagsService.isAIEnabledForUser(userContext.userId)) {
      throw new BadRequestException('AI features not enabled for this user');
    }

    if (!this.openAIApiKey) {
      throw new BadRequestException('OpenAI API not configured');
    }

    try {
      // Select voice based on gender and language
      const voice = this.selectVoice(userContext);
      const language = userContext.preferredLanguage || 'en';

      // TESTING ONLY: Return direct WebSocket connection details
      // TODO: Switch to WebRTC (ephemeral sessions) before production
      const result: RealtimeSessionResponse = {
        websocketUrl: `wss://api.openai.com/v1/realtime?model=${this.realtimeModel}`,
        apiKey: this.openAIApiKey,
        voice: voice,
        language: language,
        model: this.realtimeModel,
      };

      this.logger.log(`Created AI Realtime WebSocket config for user ${userContext.userId}`);
      this.logger.warn('TESTING MODE: Using direct WebSocket with API key (not production-safe)');

      return result;
    } catch (error) {
      this.logger.error(`Failed to create AI session: ${error.message}`);
      throw error;
    }
  }

  /**
   * Build context-aware instructions for the AI
   *
   * Includes:
   * - User profile (gender, language, madhhab)
   * - Ritual context (Umrah/Hajj, current stage)
   * - Knowledge base references
   * - Multi-language support
   */
  private async buildInstructions(userContext: UserContext): Promise<string> {
    const language = userContext.preferredLanguage || 'en';
    const languageNames = {
      en: 'English',
      fr: 'French',
      ar: 'Arabic',
    };
    const primaryLanguage = languageNames[language] || 'English';

    // Search knowledge base for relevant content
    const knowledgeResults = await this.searchKnowledge(userContext);

    // Build base instructions
    let instructions = `You are an AI voice guide for Muslim pilgrims performing ${userContext.ritualType === 'hajj' ? 'Hajj' : 'Umrah'}.

**Communication:**
- Respond in ${primaryLanguage} (language code: ${language})
- Auto-detect user's spoken language and switch if they speak in English, French, or Arabic
- Be warm, respectful, and encouraging
- Keep responses concise for voice interaction (2-3 sentences typically)
- Use simple, clear language

**User Profile:**
- Gender: ${userContext.gender || 'unspecified'}
${userContext.madhhab ? `- Islamic school of thought (madhhab): ${userContext.madhhab}` : ''}
${userContext.mobilityNeeds ? `- Mobility considerations: ${userContext.mobilityNeeds}` : ''}

**Your Role:**
1. Answer questions about ${userContext.ritualType === 'hajj' ? 'Hajj' : 'Umrah'} rituals, duas, and Islamic practices
2. Provide real-time navigation guidance when requested
3. Offer emotional support and encouragement
4. Respect different Islamic schools of thought (madhahib)
${userContext.madhhab ? `5. When relevant, provide guidance according to ${userContext.madhhab} madhhab, but mention if practices differ` : ''}

**Knowledge Base Context:**
${knowledgeResults}

**Voice Commands:**
Users may ask you to execute commands like:
- "Show timeline" - Respond: "Opening the timeline for you"
- "Switch to [language]" - Acknowledge the language change
- "Go to settings" - Respond: "Opening settings"
- "Show map" - Respond: "Opening the map"

**Navigation Prompts:**
${userContext.currentStage ? `Current ritual stage: ${userContext.currentStage}` : ''}
When providing navigation prompts:
- Be specific about distances and directions
- Mention landmarks (gates, minarets, etc.)
- Provide context about what comes next
- Encourage the pilgrim

**Guidelines:**
- NEVER provide medical advice (direct to healthcare professionals)
- Acknowledge uncertainty if you don't know something
- Respect the sacred nature of the pilgrimage
- Be encouraging and supportive
- Keep responses brief and conversational for voice interaction

**Example Interactions:**
User: "What are the steps of Umrah?"
You: "Umrah has four main steps: First, enter Ihram before the Miqat. Second, perform Tawaf - seven circles around the Kaaba. Third, perform Sa'i - walking seven times between Safa and Marwa. Finally, cut or shave your hair to exit Ihram. Would you like details about any step?"

User: "I'm at Bab al-Salam"
You: "Wonderful! Bab al-Salam is one of the main gates to the Masjid al-Haram. You're very close to the Kaaba now. Continue straight ahead, and you'll enter the sacred mosque. May Allah accept your pilgrimage."

Remember: You're a supportive companion on this sacred journey.`;

    return instructions;
  }

  /**
   * Search knowledge base for relevant context
   */
  private async searchKnowledge(userContext: UserContext): Promise<string> {
    const queries: string[] = [];

    // Search for ritual-specific content
    if (userContext.ritualType === 'umrah') {
      queries.push('umrah steps');
    } else if (userContext.ritualType === 'hajj') {
      queries.push('hajj steps');
    }

    // Search for current stage content
    if (userContext.currentStage) {
      queries.push(userContext.currentStage);
    }

    // Search for madhhab-specific content
    if (userContext.madhhab) {
      queries.push(`${userContext.madhhab} differences`);
    }

    const allResults: string[] = [];

    for (const query of queries) {
      const results = this.knowledgeSearchService.search(query, 2);
      for (const result of results) {
        allResults.push(`**${result.title}:**\n${result.snippet}`);
      }
    }

    if (allResults.length === 0) {
      return 'No specific knowledge base context available.';
    }

    return allResults.join('\n\n');
  }

  /**
   * Select appropriate voice based on user context
   *
   * OpenAI Realtime API voices:
   * - alloy (neutral)
   * - echo (male)
   * - shimmer (female)
   * - ash (male, warm)
   * - ballad (male, calm)
   * - coral (female, warm)
   * - sage (female, calm)
   * - verse (male, clear) - default
   */
  private selectVoice(userContext: UserContext): string {
    const gender = userContext.gender?.toLowerCase();
    const language = userContext.preferredLanguage || 'en';

    // Voice selection based on gender and language
    // For production, you might want different voices per language
    if (gender === 'female') {
      return 'coral'; // Warm female voice
    } else if (gender === 'male') {
      return 'verse'; // Clear male voice
    } else {
      return 'alloy'; // Neutral voice
    }
  }

  /**
   * Update session instructions (for dynamic context changes)
   */
  async updateSessionInstructions(
    sessionId: string,
    userContext: UserContext,
  ): Promise<void> {
    try {
      const instructions = await this.buildInstructions(userContext);

      // Note: OpenAI Realtime API uses WebSocket for instruction updates
      // This would be handled through the WebSocket connection
      // in the AI Realtime Gateway

      this.logger.log(`Updated instructions for session ${sessionId}`);
    } catch (error) {
      this.logger.error(`Failed to update session instructions: ${error.message}`);
      throw error;
    }
  }

  /**
   * Generate navigation prompt for AI to speak
   */
  generateNavigationPrompt(context: {
    type: 'approaching' | 'turn' | 'arrived' | 'lap_complete' | 'stage_change';
    landmark?: string;
    direction?: string;
    distance?: number;
    lapNumber?: number;
    totalLaps?: number;
    nextStage?: string;
  }): string {
    switch (context.type) {
      case 'approaching':
        return `You're approaching ${context.landmark}${context.distance ? ` in ${context.distance} meters` : ''}`;

      case 'turn':
        return `Turn ${context.direction}${context.distance ? ` in ${context.distance} meters` : ''}`;

      case 'arrived':
        return `You've arrived at ${context.landmark}. ${context.nextStage || ''}`;

      case 'lap_complete':
        return `You've completed lap ${context.lapNumber} of ${context.totalLaps}. ${context.nextStage || 'Keep going!'}`;

      case 'stage_change':
        return `Great progress! ${context.nextStage}`;

      default:
        return 'Continue on your path';
    }
  }

  /**
   * Check if AI Realtime is available
   */
  isAvailable(): boolean {
    return !!(
      this.openAIApiKey &&
      this.featureFlagsService.isAIEnabled() &&
      this.featureFlagsService.isAIRealtimeEnabled()
    );
  }

  /**
   * Check if AI Realtime is available for a specific user
   */
  isAvailableForUser(userId: string): boolean {
    return this.isAvailable() && this.featureFlagsService.isAIEnabledForUser(userId);
  }
}
