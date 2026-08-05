import { z } from "zod";

export const accountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  broker: z.string().optional(),
  accountType: z.string().optional(),
  startingBalance: z.number().positive("Starting balance must be a positive number"),
  currency: z.string().default("USD"),
});

export const accountUpdateSchema = accountSchema.partial();
