/**
 * Type definitions for GPT-Realtime Voice Guidance System
 * Handles binary PCM16 audio, user context, and KB integration
 */

// ============================================================================
// OpenAI Realtime API Types
// ============================================================================

export interface RealtimeSession {
  id: string;
  userId: string;
  openAiSessionId?: string;
  websocket?: any; // WebSocket connection to Unity
  createdAt: Date;
  lastActivityAt: Date;
  userContext: UserContext;
  isActive: boolean;
}

export interface UserContext {
  // Location & Position
  latitude: number | null;
  longitude: number | null;
  zoneId: string | null;

  // Ritual Progress
  ritualStep: 'ihram' | 'entering_haram' | 'tawaf' | 'tawaf_prayer' | 'zamzam' | 'sai' | 'halq_taqsir' | null;
  tawafLap?: number;
  saiLap?: number;

  // User Profile
  gender: 'male' | 'female' | 'not_specified';
  madhhab: 'hanafi' | 'maliki' | 'shafii' | 'hanbali' | 'none';
  accessibility: 'none' | 'wheelchair' | 'elderly' | 'mobility_limited';

  // Language
  preferredLanguage: 'en' | 'ar' | 'fr';
}

export interface RealtimeAudioFrame {
  type: 'audio';
  audio: Buffer; // PCM16 24kHz mono
  timestamp: number;
}

export interface RealtimeTextMessage {
  type: 'text';
  text: string;
  role: 'user' | 'assistant' | 'system';
}

export interface RealtimeContextUpdate {
  type: 'context_update';
  context: Partial<UserContext>;
}

export interface RealtimeGuidanceMessage {
  type: 'guidance';
  guidanceType: 'ritual_step' | 'safety_warning' | 'navigation' | 'dua' | 'madhhab_specific';
  content: string;
  metadata?: {
    stepId?: string;
    gateNumber?: number;
    zoneId?: string;
    severity?: 'critical' | 'high' | 'medium' | 'low';
  };
}

// ============================================================================
// OpenAI Realtime Protocol Types
// ============================================================================

export interface OpenAIRealtimeConfig {
  model: 'gpt-realtime'; // Exact model name
  voice: 'alloy' | 'echo' | 'shimmer' | 'coral' | 'verse';
  instructions: string;
  input_audio_format: 'pcm16';
  output_audio_format: 'pcm16';
  input_audio_transcription?: {
    model: 'whisper-1';
  };
  turn_detection?: {
    type: 'server_vad';
    threshold: number;
    prefix_padding_ms: number;
    silence_duration_ms: number;
  };
  tools?: RealtimeTool[];
  temperature?: number;
  max_response_output_tokens?: number;
}

export interface RealtimeTool {
  type: 'function';
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export interface OpenAIRealtimeEvent {
  type: string;
  event_id?: string;
  [key: string]: any;
}

// Client → Server Events
export interface SessionUpdateEvent extends OpenAIRealtimeEvent {
  type: 'session.update';
  session: Partial<OpenAIRealtimeConfig>;
}

export interface InputAudioBufferAppendEvent extends OpenAIRealtimeEvent {
  type: 'input_audio_buffer.append';
  audio: string; // base64-encoded PCM16
}

export interface InputAudioBufferCommitEvent extends OpenAIRealtimeEvent {
  type: 'input_audio_buffer.commit';
}

export interface ConversationItemCreateEvent extends OpenAIRealtimeEvent {
  type: 'conversation.item.create';
  item: {
    type: 'message' | 'function_call' | 'function_call_output';
    role?: 'user' | 'assistant' | 'system';
    content?: Array<{ type: 'input_text' | 'input_audio'; text?: string; audio?: string }>;
  };
}

export interface ResponseCreateEvent extends OpenAIRealtimeEvent {
  type: 'response.create';
  response?: {
    modalities?: ('text' | 'audio')[];
    instructions?: string;
    voice?: string;
    output_audio_format?: 'pcm16';
    tools?: RealtimeTool[];
    temperature?: number;
  };
}

// Server → Client Events
export interface SessionCreatedEvent extends OpenAIRealtimeEvent {
  type: 'session.created';
  session: {
    id: string;
    model: string;
    modalities: string[];
    instructions: string;
    voice: string;
    input_audio_format: string;
    output_audio_format: string;
    tools: RealtimeTool[];
  };
}

export interface ResponseAudioDeltaEvent extends OpenAIRealtimeEvent {
  type: 'response.audio.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // base64-encoded PCM16
}

export interface ResponseAudioTranscriptDeltaEvent extends OpenAIRealtimeEvent {
  type: 'response.audio_transcript.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  content_index: number;
  delta: string; // text delta
}

export interface ResponseFunctionCallArgumentsDeltaEvent extends OpenAIRealtimeEvent {
  type: 'response.function_call_arguments.delta';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  delta: string; // JSON delta
}

export interface ResponseFunctionCallArgumentsDoneEvent extends OpenAIRealtimeEvent {
  type: 'response.function_call_arguments.done';
  response_id: string;
  item_id: string;
  output_index: number;
  call_id: string;
  name: string;
  arguments: string; // JSON string
}

export interface ResponseDoneEvent extends OpenAIRealtimeEvent {
  type: 'response.done';
  response: {
    id: string;
    status: 'completed' | 'failed' | 'cancelled';
    output: any[];
  };
}

export interface ErrorEvent extends OpenAIRealtimeEvent {
  type: 'error';
  error: {
    type: string;
    code: string;
    message: string;
    param?: string;
  };
}

// ============================================================================
// Unity ↔ Backend Protocol Types
// ============================================================================

export interface UnityMessage {
  type: 'init' | 'audio' | 'context_update' | 'ping';
  userId?: string;
  audio?: string; // base64 PCM16 if type=audio
  context?: Partial<UserContext>;
  timestamp?: number;
}

export interface BackendMessage {
  type: 'session_ready' | 'audio' | 'text' | 'guidance' | 'error' | 'pong';
  sessionId?: string;
  audio?: string; // base64 PCM16
  text?: string;
  guidance?: RealtimeGuidanceMessage;
  error?: {
    code: string;
    message: string;
  };
  timestamp?: number;
}

// ============================================================================
// Tool Function Types
// ============================================================================

export interface GetRitualStepInfoParams {
  step_id: 'ihram' | 'entering_haram' | 'tawaf' | 'tawaf_prayer' | 'zamzam' | 'sai' | 'halq_taqsir';
}

export interface GetMadhhabGuidanceParams {
  topic_id: string;
  madhhab: 'hanafi' | 'maliki' | 'shafii' | 'hanbali';
}

export interface GetGateInfoParams {
  gate_number: number | string;
}

export interface GetSafetyRulesParams {
  context: 'tawaf' | 'sai' | 'ihram' | 'general' | 'accessibility' | 'heat' | 'emergency';
}

export interface GetDuasParams {
  location: string; // e.g., 'black_stone_istilam', 'safa_arrival', 'ihram_entry'
}

export interface GetBestRouteParams {
  from_zone: string;
  to_zone: string;
  accessibility_needs?: 'none' | 'wheelchair' | 'elderly';
}

// ============================================================================
// Safety Layer Types
// ============================================================================

export interface SafetyCheckResult {
  passed: boolean;
  warnings: string[];
  blockedContent?: string;
  suggestedAlternative?: string;
}

export interface SafetyRule {
  pattern: RegExp;
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  action: 'block' | 'warn' | 'modify';
}

// ============================================================================
// Session Management Types
// ============================================================================

export interface SessionMetrics {
  sessionId: string;
  userId: string;
  duration: number; // seconds
  audioFramesReceived: number;
  audioFramesSent: number;
  toolCallsCount: number;
  errorsCount: number;
  lastError?: string;
}
