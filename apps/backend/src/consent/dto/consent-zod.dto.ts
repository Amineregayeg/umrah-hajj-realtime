import { z } from 'zod';

// Zod schema for Consent based on Prisma schema
export const CreateConsentZodSchema = z.object({
  essential: z.boolean().default(true),
  crashReports: z.boolean().default(true),
  analytics: z.boolean().default(true),
  uploadTranscripts: z.boolean().default(false),
  uploadAudioClips: z.boolean().default(false),
  backgroundLocation: z.boolean().default(false),
  emailUpdates: z.boolean().default(false)
});

export const UpdateConsentZodSchema = CreateConsentZodSchema.partial();

export const ConsentResponseZodSchema = z.object({
  userId: z.string().uuid(),
  essential: z.boolean(),
  crashReports: z.boolean(),
  analytics: z.boolean(),
  uploadTranscripts: z.boolean(),
  uploadAudioClips: z.boolean(),
  backgroundLocation: z.boolean(),
  emailUpdates: z.boolean(),
  updatedAt: z.date()
});

// Type exports
export type CreateConsentZodDto = z.infer<typeof CreateConsentZodSchema>;
export type UpdateConsentZodDto = z.infer<typeof UpdateConsentZodSchema>;
export type ConsentResponseZodDto = z.infer<typeof ConsentResponseZodSchema>;