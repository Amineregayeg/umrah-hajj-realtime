import { z } from 'zod';

// Zod schema for UserProfile based on Prisma schema
export const CreateProfileZodSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  country: z.string().min(2, 'Country code required').max(3).optional(),
  languageUi: z.string().min(2, 'UI language required').max(10).default('en'),
  languageAudio: z.string().min(2, 'Audio language required').max(10).default('en'),
  madhhab: z.enum(['hanafi', 'maliki', 'shafii', 'hanbali', 'jafari', 'other']),
  gender: z.enum(['male', 'female', 'other']),
  mobility: z.string().max(100).optional(),
  accessibility: z.record(z.string(), z.any()).optional(), // JSON field
  guidanceMode: z.enum(['basic', 'detailed', 'expert']).default('basic')
});

export const UpdateProfileZodSchema = CreateProfileZodSchema.partial();

export const ProfileResponseZodSchema = z.object({
  userId: z.string().uuid(),
  firstName: z.string().nullable(),
  lastName: z.string().nullable(),
  country: z.string().nullable(),
  languageUi: z.string(),
  languageAudio: z.string(),
  madhhab: z.string(),
  gender: z.string(),
  mobility: z.string().nullable(),
  accessibility: z.record(z.string(), z.any()).nullable(),
  guidanceMode: z.string()
});

// Type exports
export type CreateProfileZodDto = z.infer<typeof CreateProfileZodSchema>;
export type UpdateProfileZodDto = z.infer<typeof UpdateProfileZodSchema>;
export type ProfileResponseZodDto = z.infer<typeof ProfileResponseZodSchema>;