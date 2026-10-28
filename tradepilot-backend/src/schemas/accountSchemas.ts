import { z } from "zod";
import { Prisma } from "@prisma/client";
import { imageUrlSchema } from './imageUrl';

export const accountSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  broker: z.string().trim().max(120).nullable().optional(),
  brokerId: z.string().trim().max(120).nullable().optional(),
  brokerName: z.string().trim().max(120).nullable().optional(),
  brokerLogo: imageUrlSchema.nullable().optional(),
  avatarUrl: imageUrlSchema.nullable().optional(),
  accountType: z.string().trim().max(120).nullable().optional(),
  startingBalance: z.number().nonnegative("Starting balance cannot be negative").max(9999999999.99)
    .refine((value) => new Prisma.Decimal(value).decimalPlaces() <= 2, "Starting balance supports up to 2 decimal places"),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Currency must be a three-letter code").default("USD"),
});

export const accountUpdateSchema = accountSchema.partial();
