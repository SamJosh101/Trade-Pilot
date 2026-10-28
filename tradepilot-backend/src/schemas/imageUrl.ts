import { z } from 'zod';

export const imageUrlSchema = z.string().max(2048).url().refine(
  (value) => /^https?:\/\//i.test(value),
  'Image URL must use HTTP or HTTPS',
);
