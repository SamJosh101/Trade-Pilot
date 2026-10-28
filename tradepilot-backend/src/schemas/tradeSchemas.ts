import { z } from "zod";
import { Prisma } from "@prisma/client";
import { imageUrlSchema } from './imageUrl';

// Compatibility bridge: exact-string frontend input remains bounded to the legacy
// domain here; the existing numeric planned-RR implementation is unchanged.
const legacyString = z.string().max(32).regex(/^(?:0|[1-9][0-9]{0,4})(?:\.[0-9]{1,5})?$/).transform(value => Number(value));
const price = z.union([z.number(), legacyString]).pipe(z.number().positive("Price must be positive").max(99999.99999))
  .refine((value) => new Prisma.Decimal(value).decimalPlaces() <= 5, "Prices support up to 5 decimal places");

export const tradeSchema = z.object({
  accountId: z.string().uuid("Invalid account id"),
  pair: z.string().trim().min(1, "Pair is required").max(40),
  direction: z.enum(["BUY", "SELL"]),
  entry: price,
  sl: price,
  tp: price,
  timeframe: z.string().trim().max(40).nullable().optional(),
  result: z.enum(["WIN", "LOSS", "BE"]).nullable().optional(),
  notes: z.string().max(20000).nullable().optional(),
  imageUrl: imageUrlSchema.nullable().optional(),
});

// Used on PUT /api/trades/:id — every field optional, same rules when present.
export const tradeUpdateSchema = tradeSchema.partial();
