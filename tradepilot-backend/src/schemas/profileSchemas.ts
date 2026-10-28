import { z } from 'zod';

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  email: z.string().trim().email('Invalid email address').max(254),
  currentPassword: z.string().max(1024).optional(),
}).strict();
