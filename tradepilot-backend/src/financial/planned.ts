import { z } from "zod";
import { price, parse } from "./schemas";
import { dec, decimalString } from "./decimal";
import { fail } from "./errors";
import { imageUrlSchema } from "../schemas/imageUrl";
const fields = { accountId: z.string().uuid(), pair: z.string().trim().min(1).max(40), direction: z.enum(["BUY", "SELL"]), entry: price, sl: price, tp: price, timeframe: z.string().max(40).nullable().optional(), notes: z.string().max(20000).nullable().optional(), result: z.enum(["WIN", "LOSS", "BE"]).nullable().optional(), imageUrl: imageUrlSchema.nullable().optional() };
export const createPlan = z.object(fields).strict();
export const updatePlan = createPlan.partial().extend({ expectedRevision: z.number().int().nonnegative().optional() }).strict();
export function exactPlannedRR(direction: "BUY" | "SELL", entry: string, sl: string, tp: string): string {
    decimalString(entry, 38, 18, true);
    decimalString(sl, 38, 18, true);
    decimalString(tp, 38, 18, true);
    const e = dec(entry), s = dec(sl), t = dec(tp);
    if (direction === "BUY" ? !s.lt(e) || !t.gt(e) : !s.gt(e) || !t.lt(e))
        fail("INVALID_PLAN_GEOMETRY");
    const rr = t.minus(e).abs().div(e.minus(s).abs()).toDecimalPlaces(2);
    if (rr.lte(0) || rr.gte(1000))
        fail("PRECISION_INSUFFICIENT", "Planned RR does not fit its unchanged legacy range");
    return rr.toFixed(2);
}
