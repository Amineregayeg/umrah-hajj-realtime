import { z } from 'zod';

export const FloorSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
});

export const NodeSchema = z.object({
  id: z.string().min(1),
  floor: z.string().min(1),
  lat: z.number().min(-90).max(90),
  lon: z.number().min(-180).max(180),
  kind: z.enum(['gate', 'poi']),
});

export const EdgeSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  weight: z.number().positive(),
  kind: z.enum(['corridor']),
});

export const ConnectorSchema = z.object({
  from: z.string().min(1),
  to: z.string().min(1),
  type: z.enum(['elevator', 'stairs']),
  penalty: z.number().nonnegative(),
});

export const ZoneSchema = z.object({
  id: z.string().min(1),
  floor: z.string().min(1),
  polygon: z.array(z.tuple([z.number(), z.number()])).min(3),
});

export const NavGraphSchema = z.object({
  floors: z.array(FloorSchema),
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
  connectors: z.array(ConnectorSchema),
  zones: z.array(ZoneSchema),
});

export type NavGraphType = z.infer<typeof NavGraphSchema>;