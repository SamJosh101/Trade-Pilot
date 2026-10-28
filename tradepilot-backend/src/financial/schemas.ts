import { z } from "zod";
import { decimalString } from "./decimal";
import { FinancialError } from "./errors";
export const UNIT_KEYS = ["ISO:USD", "ISO:EUR", "ISO:GBP", "ISO:NGN", "ISO:JPY", "ISO:CHF", "ISO:AUD", "ISO:CAD", "TOKEN:Tether:USDT:ethereum", "TOKEN:Tether:USDT:tron"] as const;
export const unit = z.enum(UNIT_KEYS);
const numeric = (p = 38, s = 18, positive = false) => z.string().max(128).superRefine((v, c) => {
    try {
        decimalString(v, p, s, positive);
    }
    catch (e) {
        c.addIssue({ code: "custom", message: e instanceof FinancialError ? e.code : "INVALID_DECIMAL" });
    }
});
export const price = numeric(38, 18, true), money = numeric(38, 12), risk = numeric(38, 12, true), rate = numeric(38, 18, true);
export const instant = z.iso.datetime({ offset: true }).refine(v => /T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2})$/.test(v), "TIMESTAMP_PRECISION");
const nullable = <T extends z.ZodType>(s: T) => s.nullable().default(null);
export const fxSchema = z.object({ version: z.literal(1), basis: z.enum(["IDENTITY", "USER_REPORTED"]), fromUnitKey: unit, toUnitKey: unit, effectiveAt: instant, policyVersion: z.enum(["v11-identity-1", "v11-user-event-1"]), sourceRef: z.string().min(1).max(256), acknowledged: z.literal(true) }).strict();
export const instrument = z.object({ version: z.literal(1), symbol: z.string().min(1).max(40), calculationMode: z.enum(["LINEAR", "TICK_LINEAR", "REPORTED_ONLY", "INVERSE", "OPTION"]), quantityUnit: z.enum(["BASE_UNITS", "LOTS", "CONTRACTS"]), quantityStep: price, priceTick: price, contractMultiplier: nullable(rate), profitUnitKey: unit, source: z.string().min(1).max(160), effectiveAt: instant }).strict();
export const execution = z.object({ clientRef: z.string().min(1).max(64).optional(), id: z.string().uuid().optional(), kind: z.enum(["ENTRY", "EXIT"]), price: nullable(price), quantity: nullable(price), executedAt: nullable(instant), sequence: nullable(z.number().int().nonnegative().max(2147483647)), fxRateToAccount: nullable(rate), fxEvidence: nullable(fxSchema) }).strict();
export const charge = z.object({ executionRef: z.string().min(1).max(64).nullable().default(null), id: z.string().uuid().optional(), executionId: z.string().uuid().nullable().default(null), kind: z.enum(["COMMISSION", "SWAP", "OTHER"]), amount: nullable(money), unitKey: nullable(unit), occurredAt: nullable(instant), fxRateToAccount: nullable(rate), fxEvidence: nullable(fxSchema) }).strict();
export const aggregateSchema = z.object({ expectedRevision: z.number().int().nonnegative().max(2147483646).optional(), status: z.enum(["OPEN", "PARTIAL", "CLOSED"]).nullable(), source: z.enum(["MANUAL", "EXECUTIONS"]), amountUnit: z.enum(["SETTLEMENT", "ACCOUNT"]).default("SETTLEMENT"), initialRiskAmount: nullable(risk), reportedGrossPnl: nullable(money), reportedNetPnl: nullable(money), costsComplete: nullable(z.boolean()), openedAt: nullable(instant), closedAt: nullable(instant), instrumentSpec: nullable(instrument), confirmation: z.object({ state: z.enum(["OPEN", "PARTIAL", "CLOSED"]), acknowledged: z.literal(true) }).strict().nullable().default(null), correctionToken: z.string().regex(/^[a-f0-9]{64}$/).nullable().default(null), correctionReason: z.string().min(1).max(1000).nullable().default(null), executions: z.array(execution).max(10000), charges: z.array(charge).max(10000) }).strict().refine(v => v.executions.length + v.charges.length <= 10000, "EVENT_LIMIT");
export type Aggregate = z.infer<typeof aggregateSchema>;
export type Fx = z.infer<typeof fxSchema>;
export const denominationSchema = z.object({ settlementUnitKey: unit, unitsPerMajor: numeric(20, 8, true), denominationLabel: z.string().min(1).max(32), source: z.string().min(1).max(256), acknowledged: z.literal(true) }).strict();
export function parse<T>(schema: z.ZodType<T>, input: unknown): T {
    const r = schema.safeParse(input);
    if (!r.success) {
        const issue = r.error.issues[0];
        throw new FinancialError(issue.code === 'custom' ? issue.message : 'INVALID_FINANCIAL_INPUT', "Invalid financial input", 422, { field: issue.path.join('.') });
    }
    return r.data;
}
