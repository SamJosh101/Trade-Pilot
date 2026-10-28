import { z } from 'zod';
import { AppError } from '../utils/AppError';

const accountQuery = z.object({ accountId: z.string().uuid('Invalid account id').optional() });
const calendarQuery = accountQuery.extend({
  month: z.string().regex(/^(?:[1-9]\d{3})-(?:0[1-9]|1[0-2])$/, 'Month must be in YYYY-MM format (1000–9999)').optional(),
});

export function parseAccountQuery(query: unknown) {
  const result = accountQuery.safeParse(query);
  if (!result.success) throw new AppError(result.error.issues[0].message, 400);
  return result.data;
}

export function parseCalendarQuery(query: unknown) {
  const result = calendarQuery.safeParse(query);
  if (!result.success) throw new AppError(result.error.issues[0].message, 400);
  return result.data;
}
