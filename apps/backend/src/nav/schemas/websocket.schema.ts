import { z } from 'zod';

// Position schema matching the event contract
export const PositionSchema = z.object({
  lat: z.number(),
  lon: z.number(),
  alt: z.number(),
  floor: z.number(),
  acc: z.number(),
});

// Nav Update schema matching the event contract
export const NavUpdateSchema = z.object({
  ts: z.number(),
  seq: z.number(),
  userId: z.string(),
  pos: PositionSchema,
  heading: z.number(),
  speed: z.number(),
  source: z.enum(['gnss', 'imu', 'arcore', 'ble']),
  stage: z.string(),
  lap: z.number(),
  sai_leg: z.number().nullable(),
  confidence: z.number(),
  mode: z.enum(['guide', 'respond', 'mute']),
  device: z.enum(['android', 'ios']),
});

// Delta schema for nav correction
export const DeltaSchema = z.object({
  x: z.number(),
  y: z.number(),
});

// Nav Correction schema matching the event contract
export const NavCorrectionSchema = z.object({
  ts: z.number(),
  seq: z.number(),
  delta: DeltaSchema,
  snapTo: z.enum(['path', 'zone', 'node']),
  confidence: z.number(),
});

// AI Prompt schema matching the event contract
export const AiPromptSchema = z.object({
  ts: z.number(),
  text: z.string(),
  voice: z.string(),
  priority: z.enum(['high', 'medium', 'low']),
  stage: z.string(),
});

// UI Banner schema matching the event contract
export const UiBannerSchema = z.object({
  id: z.string(),
  title: z.string(),
  body: z.string(),
  level: z.enum(['info', 'warning', 'error', 'success']),
});

// Accessibility schema for state set
export const AccessibilitySchema = z.object({
  mobility: z.string().optional(),
});

// State Set schema matching the event contract
export const StateSetSchema = z.object({
  mode: z.enum(['guide', 'respond', 'mute']),
  madhhab: z.enum(['hanafi', 'maliki', 'shafii', 'hanbali']),
  lang: z.string(),
  accessibility: AccessibilitySchema.optional(),
});

// WebSocket message wrapper schema
export const WebSocketMessageSchema = z.object({
  event: z.enum(['nav.update', 'nav.correction', 'ai.prompt', 'ui.banner', 'state.set', 'ping', 'pong']),
  data: z.any(),
});

// Export types
export type PositionType = z.infer<typeof PositionSchema>;
export type NavUpdateType = z.infer<typeof NavUpdateSchema>;
export type NavCorrectionType = z.infer<typeof NavCorrectionSchema>;
export type AiPromptType = z.infer<typeof AiPromptSchema>;
export type UiBannerType = z.infer<typeof UiBannerSchema>;
export type StateSetType = z.infer<typeof StateSetSchema>;
export type WebSocketMessageType = z.infer<typeof WebSocketMessageSchema>;