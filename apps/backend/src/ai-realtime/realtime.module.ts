import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { RealtimeToolsService } from './realtime.tools';
import { RealtimeSessionManager } from './realtime.session';
import { UmrahKnowledgeModule } from '../umrah/knowledge/umrah-knowledge.module';

/**
 * Realtime Module - GPT-4o Realtime Voice Guidance
 * Provides WebSocket endpoint for Unity clients
 * Integrates with OpenAI Realtime API and Umrah Knowledge Base
 */

@Module({
  imports: [
    ConfigModule.forRoot(), // For OPENAI_API_KEY
    UmrahKnowledgeModule, // For KB access
  ],
  providers: [
    RealtimeGateway,
    RealtimeService,
    RealtimeToolsService,
    RealtimeSessionManager,
  ],
  exports: [RealtimeService, RealtimeToolsService],
})
export class RealtimeModule {}
