import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AIService } from './ai.service';
import { AIController } from './ai.controller';
import { VoiceTokenService } from './services/voice-token.service';
import { AIRealtimeService } from './services/ai-realtime.service';
import { KnowledgeSearchService } from './services/knowledge-search.service';
import { PromptBuilderService } from './services/prompt-builder.service';
import { RitualStateService } from './services/ritual-state.service';
import { VoiceCommandService } from './services/voice-command.service';
import { AIRealtimeGateway } from './ai-realtime.gateway';
import { NavigationAIHandler } from './handlers/navigation-ai-handler';

/**
 * AI Module
 *
 * Provides AI-powered features for the Umrah/Hajj app:
 * - Voice chat with AI guide (OpenAI Realtime API)
 * - Real-time navigation prompts
 * - Multi-language support (EN/FR/AR)
 * - Voice commands
 * - Ritual state tracking
 *
 * All features are feature-flag protected (disabled by default).
 *
 * @see AI_GUIDE_PRODUCTION_INTEGRATION_PLAN.md
 * @see AI_GUIDE_ZERO_RISK_STRATEGY.md
 */
@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'fallback-secret-for-development'),
        signOptions: {
          algorithm: 'HS256',
          issuer: 'umrah-hajj-backend',
          audience: 'umrah-hajj-voice-api',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AIController],
  providers: [
    // Core Services
    AIService,
    VoiceTokenService,

    // AI Realtime Services (NEW)
    AIRealtimeService,
    KnowledgeSearchService,
    PromptBuilderService,
    RitualStateService,
    VoiceCommandService,

    // WebSocket Gateway (NEW)
    AIRealtimeGateway,

    // Handlers (NEW)
    NavigationAIHandler,
  ],
  exports: [
    AIService,
    VoiceTokenService,
    AIRealtimeService,
    RitualStateService,
    PromptBuilderService,
    NavigationAIHandler,
  ],
})
export class AIModule {}