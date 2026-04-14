import { z } from 'zod';

export const UpdateProfileSchema = z.object({
  fullName: z.string().min(2).max(255).optional(),
  avatarUrl: z.string().url('Invalid URL').optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;
