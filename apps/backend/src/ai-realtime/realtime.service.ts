import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocket } from 'ws';
import { RealtimeToolsService } from './realtime.tools';
import { RealtimeSessionManager } from './realtime.session';
import { RealtimeSystemPromptBuilder } from './realtime.system-prompt';
import type {
  RealtimeSession,
  UserContext,
  OpenAIRealtimeConfig,
  OpenAIRealtimeEvent,
  SessionUpdateEvent,
  InputAudioBufferAppendEvent,
  ResponseCreateEvent,
} from './realtime.types';

/**
 * Realtime Service - OpenAI Realtime API Integration
 * Handles WebSocket connection to OpenAI, audio streaming, and tool execution
 * Model: gpt-realtime
 */

@Injectable()
export class RealtimeService implements OnModuleInit {
  private readonly logger = new Logger(RealtimeService.name);
  private readonly openaiApiKey: string;
  private readonly openaiRealtimeUrl =
    'wss://api.openai.com/v1/realtime?model=gpt-realtime';

  // Session-specific OpenAI WebSocket connections
  private readonly openaiConnections = new Map<string, WebSocket>();

  constructor(
    private readonly configService: ConfigService,
    private readonly toolsService: RealtimeToolsService,
    private readonly sessionManager: RealtimeSessionManager,
  ) {
    this.openaiApiKey = this.configService?.get<string>('OPENAI_API_KEY') || '';

    if (!this.openaiApiKey) {
      this.logger.error(
        'OPENAI_API_KEY not configured - Realtime features will not work',
      );
    }
  }

  onModuleInit() {
    this.logger.log('Realtime Service initialized');
    // Start cleanup interval for inactive sessions
    setInterval(
      () => {
        this.sessionManager.cleanupInactiveSessions();
      },
      5 * 60 * 1000,
    ); // Every 5 minutes
  }

  /**
   * Create a new OpenAI Realtime session
   */
  async createRealtimeSession(
    session: RealtimeSession,
  ): Promise<WebSocket> {
    this.logger.log(
      `Creating OpenAI Realtime session for ${session.id}`,
    );

    return new Promise((resolve, reject) => {
      const ws = new WebSocket(this.openaiRealtimeUrl, {
        headers: {
          Authorization: `Bearer ${this.openaiApiKey}`,
          'OpenAI-Beta': 'realtime=v1',
        },
      });

      ws.on('open', () => {
        this.logger.log(
          `OpenAI WebSocket connected for session ${session.id}`,
        );

        // Send session configuration
        this.configureSession(ws, session);

        this.openaiConnections.set(session.id, ws);
        resolve(ws);
      });

      ws.on('message', (data: Buffer) => {
        this.handleOpenAIMessage(session, data);
      });

      ws.on('error', (error) => {
        this.logger.error(
          `OpenAI WebSocket error for session ${session.id}:`,
          error,
        );
        this.sessionManager.recordError(session.id, error.message);
        reject(error);
      });

      ws.on('close', () => {
        this.logger.log(
          `OpenAI WebSocket closed for session ${session.id}`,
        );
        this.openaiConnections.delete(session.id);
      });

      // Set timeout for connection
      setTimeout(() => {
        if (ws.readyState !== WebSocket.OPEN) {
          ws.close();
          reject(new Error('OpenAI WebSocket connection timeout'));
        }
      }, 10000);
    });
  }

  /**
   * Configure OpenAI session with instructions, tools, and settings
   */
  private configureSession(ws: WebSocket, session: RealtimeSession): void {
    const instructions = RealtimeSystemPromptBuilder.buildInstructions(
      session.userContext,
    );

    const sessionConfig: SessionUpdateEvent = {
      type: 'session.update',
      session: {
        model: 'gpt-realtime',
        voice: this.getVoiceForUser(session.userContext),
        instructions,
        input_audio_format: 'pcm16',
        output_audio_format: 'pcm16',
        input_audio_transcription: {
          model: 'whisper-1',
        },
        turn_detection: {
          type: 'server_vad',
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 500,
        },
        tools: this.toolsService.getToolDefinitions(),
        temperature: 0.7,
        max_response_output_tokens: 4096,
      },
    };

    this.sendToOpenAI(ws, sessionConfig);
    this.logger.debug(
      `Session configured for ${session.id} with ${sessionConfig.session.tools?.length} tools`,
    );
  }

  /**
   * Handle incoming audio from Unity client
   */
  async handleAudioFrame(sessionId: string, audioBase64: string): Promise<void> {
    const openaiWs = this.openaiConnections.get(sessionId);
    if (!openaiWs || openaiWs.readyState !== WebSocket.OPEN) {
      throw new Error(`No active OpenAI connection for session ${sessionId}`);
    }

    const event: InputAudioBufferAppendEvent = {
      type: 'input_audio_buffer.append',
      audio: audioBase64, // Already base64 from Unity
    };

    this.sendToOpenAI(openaiWs, event);
    this.sessionManager.incrementMetric(sessionId, 'audioFramesReceived');
    this.sessionManager.updateActivity(sessionId);
  }

  /**
   * Update user context and refresh session instructions
   */
  async updateContext(
    sessionId: string,
    context: Partial<UserContext>,
  ): Promise<void> {
    this.sessionManager.updateContext(sessionId, context);

    const session = this.sessionManager.getSession(sessionId);
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }

    // Rebuild instructions with new context
    const openaiWs = this.openaiConnections.get(sessionId);
    if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
      const instructions = RealtimeSystemPromptBuilder.buildInstructions(
        session.userContext,
      );

      const sessionConfig: SessionUpdateEvent = {
        type: 'session.update',
        session: {
          instructions,
        },
      };

      this.sendToOpenAI(openaiWs, sessionConfig);
      this.logger.debug(`Context updated and instructions refreshed for ${sessionId}`);
    }
  }

  /**
   * Handle messages from OpenAI Realtime API
   */
  private async handleOpenAIMessage(
    session: RealtimeSession,
    data: Buffer,
  ): Promise<void> {
    try {
      const event: OpenAIRealtimeEvent = JSON.parse(data.toString());

      this.logger.debug(`OpenAI event [${session.id}]: ${event.type}`);

      switch (event.type) {
        case 'session.created':
          this.handleSessionCreated(session, event);
          break;

        case 'response.audio.delta':
          this.handleAudioDelta(session, event);
          break;

        case 'response.audio_transcript.delta':
          this.handleTranscriptDelta(session, event);
          break;

        case 'response.function_call_arguments.done':
          await this.handleFunctionCall(session, event);
          break;

        case 'response.done':
          this.handleResponseDone(session, event);
          break;

        case 'error':
          this.handleError(session, event);
          break;

        case 'input_audio_buffer.speech_started':
          this.handleSpeechStarted(session);
          break;

        case 'input_audio_buffer.speech_stopped':
          this.handleSpeechStopped(session);
          break;

        default:
          // Log other events for debugging
          this.logger.debug(
            `Unhandled OpenAI event type: ${event.type}`,
          );
      }
    } catch (error) {
      this.logger.error(
        `Error handling OpenAI message for session ${session.id}:`,
        error,
      );
      this.sessionManager.recordError(
        session.id,
        error instanceof Error ? error.message : 'Unknown error',
      );
    }
  }

  /**
   * Handle session.created event
   */
  private handleSessionCreated(
    session: RealtimeSession,
    event: any,
  ): void {
    this.logger.log(
      `OpenAI session created: ${event.session?.id} for ${session.id}`,
    );

    // Store OpenAI session ID
    session.openAiSessionId = event.session?.id;

    // Notify Unity client that session is ready
    this.sendToUnity(session, {
      type: 'session_ready',
      sessionId: session.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle audio delta from OpenAI (stream audio to Unity)
   */
  private handleAudioDelta(session: RealtimeSession, event: any): void {
    if (!event.delta) return;

    // Send audio delta to Unity
    this.sendToUnity(session, {
      type: 'audio',
      audio: event.delta, // base64 PCM16
      timestamp: Date.now(),
    });

    this.sessionManager.incrementMetric(session.id, 'audioFramesSent');
  }

  /**
   * Handle transcript delta (send text to Unity for display)
   */
  private handleTranscriptDelta(session: RealtimeSession, event: any): void {
    if (!event.delta) return;

    this.sendToUnity(session, {
      type: 'text',
      text: event.delta,
      timestamp: Date.now(),
    });
  }

  /**
   * Handle function call from GPT-Realtime
   */
  private async handleFunctionCall(
    session: RealtimeSession,
    event: any,
  ): Promise<void> {
    const { call_id, name, arguments: argsJson } = event;

    this.logger.log(
      `Function call [${session.id}]: ${name} with args: ${argsJson}`,
    );

    this.sessionManager.incrementMetric(session.id, 'toolCallsCount');

    try {
      // Parse arguments
      const args = JSON.parse(argsJson);

      // Execute tool
      const result = await this.toolsService.executeTool(name, args);

      // Send result back to OpenAI
      const openaiWs = this.openaiConnections.get(session.id);
      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        this.sendToOpenAI(openaiWs, {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id,
            output: JSON.stringify(result),
          },
        });

        // Trigger response generation
        this.sendToOpenAI(openaiWs, {
          type: 'response.create',
        });
      }

      this.logger.debug(`Tool ${name} executed successfully`);
    } catch (error) {
      this.logger.error(`Tool execution error for ${name}:`, error);

      // Send error back to OpenAI
      const openaiWs = this.openaiConnections.get(session.id);
      if (openaiWs && openaiWs.readyState === WebSocket.OPEN) {
        this.sendToOpenAI(openaiWs, {
          type: 'conversation.item.create',
          item: {
            type: 'function_call_output',
            call_id,
            output: JSON.stringify({
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        });

        this.sendToOpenAI(openaiWs, {
          type: 'response.create',
        });
      }

      this.sessionManager.recordError(
        session.id,
        error instanceof Error ? error.message : 'Tool execution failed',
      );
    }
  }

  /**
   * Handle response.done event
   */
  private handleResponseDone(session: RealtimeSession, event: any): void {
    this.logger.debug(
      `Response completed for session ${session.id}: ${event.response?.status}`,
    );

    // Apply safety check to final response if needed
    // (Audio is already streamed, but we can flag issues for logging)
    if (event.response?.output) {
      const textOutput = this.extractTextFromOutput(event.response.output);
      if (textOutput) {
        const safetyResult = this.sessionManager.checkSafety(
          textOutput,
          session.userContext,
        );

        if (!safetyResult.passed) {
          this.logger.warn(
            `Safety check failed for session ${session.id}:`,
            safetyResult.warnings,
          );

          // If critical, send warning to Unity
          if (safetyResult.blockedContent) {
            this.sendToUnity(session, {
              type: 'error',
              error: {
                code: 'SAFETY_BLOCK',
                message:
                  'Response blocked by safety layer. Alternative guidance will be provided.',
              },
              timestamp: Date.now(),
            });
          }
        }
      }
    }
  }

  /**
   * Handle error from OpenAI
   */
  private handleError(session: RealtimeSession, event: any): void {
    const error = event.error;
    this.logger.error(
      `OpenAI error for session ${session.id}:`,
      error,
    );

    this.sessionManager.recordError(session.id, error.message);

    // Forward error to Unity
    this.sendToUnity(session, {
      type: 'error',
      error: {
        code: error.code || 'OPENAI_ERROR',
        message: error.message || 'An error occurred with the AI service',
      },
      timestamp: Date.now(),
    });
  }

  /**
   * Handle speech started (user started speaking)
   */
  private handleSpeechStarted(session: RealtimeSession): void {
    this.logger.debug(`Speech started for session ${session.id}`);
    // Could send UI update to Unity to show "listening" indicator
  }

  /**
   * Handle speech stopped (user stopped speaking)
   */
  private handleSpeechStopped(session: RealtimeSession): void {
    this.logger.debug(`Speech stopped for session ${session.id}`);
    // Could send UI update to Unity to show "processing" indicator
  }

  /**
   * Close OpenAI connection for a session
   */
  closeOpenAIConnection(sessionId: string): void {
    const ws = this.openaiConnections.get(sessionId);
    if (ws) {
      ws.close();
      this.openaiConnections.delete(sessionId);
      this.logger.log(`OpenAI connection closed for session ${sessionId}`);
    }
  }

  // ============================================================================
  // Helpers
  // ============================================================================

  /**
   * Send message to OpenAI
   */
  private sendToOpenAI(ws: WebSocket, event: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(event));
    } else {
      this.logger.warn('Cannot send to OpenAI: WebSocket not open');
    }
  }

  /**
   * Send message to Unity client
   */
  private sendToUnity(session: RealtimeSession, message: any): void {
    if (session.websocket && session.websocket.readyState === 1) {
      // 1 = OPEN
      session.websocket.send(JSON.stringify(message));
    } else {
      this.logger.warn(
        `Cannot send to Unity: WebSocket not open for session ${session.id}`,
      );
    }
  }

  /**
   * Get appropriate voice based on user context
   */
  private getVoiceForUser(context: UserContext): 'alloy' | 'echo' | 'shimmer' | 'coral' | 'verse' {
    // Female users get 'coral' (warm female voice)
    if (context.gender === 'female') {
      return 'coral';
    }

    // Male users get 'verse' (clear male voice)
    if (context.gender === 'male') {
      return 'verse';
    }

    // Default: 'alloy' (neutral voice)
    return 'alloy';
  }

  /**
   * Extract text from response output for safety checking
   */
  private extractTextFromOutput(output: any[]): string | null {
    for (const item of output) {
      if (item.type === 'message' && item.content) {
        for (const content of item.content) {
          if (content.type === 'text' && content.text) {
            return content.text;
          }
        }
      }
    }
    return null;
  }
}
