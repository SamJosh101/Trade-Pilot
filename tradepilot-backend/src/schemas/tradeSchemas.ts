import { z } from "zod";

export const tradeSchema = z.object({
  accountId: z.string().uuid("Invalid account id"),
  pair: z.string().min(1, "Pair is required"),
  direction: z.enum(["BUY", "SELL"]),
  entry: z.number().positive("Entry must be a positive number"),
  sl: z.number().positive("SL must be a positive number"),
  tp: z.number().positive("TP must be a positive number"),
  timeframe: z.string().optional(),
  result: z.enum(["WIN", "LOSS", "BE"]).optional(),
  notes: z.string().optional(),
  imageUrl: z.string().url().optional(),
});

// Used on PUT /api/trades/:id — every field optional, same rules when present.
export const tradeUpdateSchema = tradeSchema.partial();
