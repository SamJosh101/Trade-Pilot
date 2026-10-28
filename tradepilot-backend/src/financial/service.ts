import {assertMediaChange} from '../security/media';
import {remove as deleteConfirmedTrade} from '../services/tradeDeletionService';
import { randomUUID, createHmac } from "node:crypto";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";
import { env } from "../config/env";
import { withUserLock } from "../utils/withUserLock";
import { Aggregate, aggregateSchema, parse, denominationSchema, instant } from "./schemas";
import { calculate, safeCalculate, unknownCalculation, CALCULATION_VERSION } from "./calculate";
import { dec, normalize } from "./decimal";
import { CAPABILITY, expectedRevision, compareRevision } from "./revision";
import { fail, FinancialError } from "./errors";
import { createPlan, updatePlan, exactPlannedRR } from "./planned";
const include = { account: true, performance: { include: { executions: { orderBy: { id: "asc" as const } }, charges: { orderBy: { id: "asc" as const } } } } };
function withFinancialLock<T>(uid: string, op: (tx: Prisma.TransactionClient) => Promise<T>) { return withUserLock(uid, op, { timeout: 30000 }); }
type Loaded = Prisma.TradeGetPayload<{
    include: typeof include;
}>;
export type WriteContext = {
    ifMatch?: unknown;
    capability?: unknown;
};
function json(value: unknown): Prisma.InputJsonValue { return JSON.parse(JSON.stringify(value)); }
export function writesEnabled() { return (env.nodeEnv === "development" || env.nodeEnv === "test") && env.financialWritesEnabled === true; }
function writeGate(ctx: WriteContext) {
    if (ctx.capability !== CAPABILITY)
        fail("CLIENT_CAPABILITY_REQUIRED", "A Version 1.1 client is required");
    if (!writesEnabled())
        fail("FINANCIAL_WRITES_DISABLED", "Financial writes are disabled", 503);
}
async function load(tx: Prisma.TransactionClient, userId: string, id: string) {
    const t = await tx.trade.findFirst({ where: { id, userId }, include });
    if (!t || t.account.userId !== userId)
        fail("TRADE_NOT_FOUND", "Trade not found", 404);
    return t;
}
function precondition(t: Loaded, body: unknown, ctx: WriteContext) { const version = expectedRevision(t.id, ctx.ifMatch, body && typeof body === "object" ? (body as Record<string, unknown>).expectedRevision : undefined); compareRevision(version, t.revision); return version; }
const text = (x: Prisma.Decimal | null) => x === null ? null : x.toFixed();
function fxDto(value: unknown) {
    if (!value)
        return null;
    const { recordedAt, actorId, ...e } = value as Record<string, unknown>;
    return e;
}
export function bodyFromStored(t: Loaded): Aggregate | null {
    const p = t.performance;
    if (!p)
        return null;
    const provenance = p.provenance as Record<string, any> | null;
    if (p.calculationVersion !== CALCULATION_VERSION)
        fail("UNSUPPORTED_CALCULATION_VERSION");
    if (p.source === "MANUAL" && p.status !== null && (!provenance?.confirmation || provenance.confirmation.actorId !== t.userId || provenance.confirmation.acknowledged !== true || !instant.safeParse(provenance.confirmation.recordedAt).success))
        fail("MANUAL_CONFIRMATION_REQUIRED");
    // Strict read validation also protects against unsupported direct writers.
    return parse(aggregateSchema, { status: p.status, source: p.source, amountUnit: "SETTLEMENT", initialRiskAmount: text(p.initialRiskAmount), reportedGrossPnl: text(p.reportedGrossPnl), reportedNetPnl: text(p.reportedNetPnl), costsComplete: p.costsComplete, openedAt: p.openedAt?.toISOString() ?? null, closedAt: p.closedAt?.toISOString() ?? null, instrumentSpec: p.instrumentSpec, confirmation: provenance?.confirmation ? { state: provenance.confirmation.state, acknowledged: true } : null, executions: p.executions.map(e => ({ id: e.id, kind: e.kind, price: text(e.price), quantity: text(e.quantity), executedAt: e.executedAt?.toISOString() ?? null, sequence: e.sequence, fxRateToAccount: text(e.fxRateToAccount), fxEvidence: fxDto(e.fxEvidence) })).sort((a, b) => { const ta = a.executedAt ? Date.parse(a.executedAt) : Infinity, tb = b.executedAt ? Date.parse(b.executedAt) : Infinity; return ta - tb || (a.sequence ?? 0) - (b.sequence ?? 0); }), charges: p.charges.map(c => ({ id: c.id, executionId: c.executionId, kind: c.kind, amount: text(c.amount), unitKey: c.unitKey, occurredAt: c.occurredAt?.toISOString() ?? null, fxRateToAccount: text(c.fxRateToAccount), fxEvidence: fxDto(c.fxEvidence) })) });
}
export function project(t: Loaded) {
    if (!t.performance)
        return { tradeId: t.id, revision: t.revision, performance: null, audit: null, derived: unknownCalculation() };
    try {
        const body = bodyFromStored(t)!;
        return { tradeId: t.id, revision: t.revision, performance: body, audit: { updatedAt: t.performance.updatedAt.toISOString(), provenance: t.performance.provenance }, derived: safeCalculate(t.direction, t.pair, body, t.account) };
    }
    catch (e) {
        if (!(e instanceof FinancialError))
            throw e;
        return { tradeId: t.id, revision: t.revision, performance: null, derived: { ...unknownCalculation(), reasons: ["INVALID_RECORDED_DATA", e.code] } };
    }
}
export function getPerformance(userId: string, id: string) { return withFinancialLock(userId, async (tx) => project(await load(tx, userId, id))); }
function equalDecimal(a: string | null, b: string | null) { return a === null || b === null ? a === b : dec(a).eq(b); }
function prepare(t: Loaded, input: unknown) {
    const body = parse(aggregateSchema, input);
    const inputAmountUnit = body.amountUnit;
    const raw = { initialRiskAmount: body.initialRiskAmount, reportedGrossPnl: body.reportedGrossPnl, reportedNetPnl: body.reportedNetPnl };
    if (body.amountUnit === "ACCOUNT") {
        if (!t.account.unitsPerMajor || !t.account.settlementUnitKey)
            fail("DENOMINATION_UNCONFIRMED");
        for (const key of ["initialRiskAmount", "reportedGrossPnl", "reportedNetPnl"] as const)
            if (body[key] !== null)
                body[key] = normalize(body[key]!, t.account.unitsPerMajor.toString());
        body.amountUnit = "SETTLEMENT";
    }
    if (!t.account.settlementUnitKey || !t.account.unitsPerMajor)
        fail("DENOMINATION_UNCONFIRMED", "Confirm the account settlement unit and denomination first");
    const oldIds = new Set(t.performance?.executions.map(x => x.id));
    const oldCharges = new Set(t.performance?.charges.map(x => x.id));
    for (const f of body.executions)
        if (f.id && !oldIds.has(f.id))
            fail("NESTED_RECORD_NOT_FOUND", "Nested record not found", 404);
    for (const c of body.charges)
        if (c.id && !oldCharges.has(c.id))
            fail("NESTED_RECORD_NOT_FOUND", "Nested record not found", 404);
    const old = t.performance;
    if (old && old.source !== body.source && body.source === "MANUAL" && old.executions.length) {
        for (const e of old.executions) {
            const retained = body.executions.find(f => f.id === e.id);
            if (!retained || !equalDecimal(retained.price, text(e.price)) || !equalDecimal(retained.quantity, text(e.quantity)) || retained.kind !== e.kind || (retained.executedAt === null || e.executedAt === null ? retained.executedAt !== null || e.executedAt !== null : Date.parse(retained.executedAt) !== e.executedAt.getTime()))
                fail("SOURCE_SWITCH_EVIDENCE_REQUIRED");
        }
    }
    const correction = !!old && (old.source !== body.source || stable(old.instrumentSpec) !== stable(body.instrumentSpec) || !equalDecimal(text(old.initialRiskAmount), body.initialRiskAmount));
    if (correction && !body.correctionReason)
        fail("CORRECTION_REASON_REQUIRED");
    const derived = calculate(t.direction, t.pair, body, t.account);
    return { body, raw, inputAmountUnit, derived, correction };
}
function stable(v: any): string {
    if (v === null || typeof v !== "object")
        return JSON.stringify(v);
    if (Array.isArray(v))
        return `[${v.map(stable).join(",")}]`;
    return `{${Object.keys(v).sort().map(k => JSON.stringify(k) + ":" + stable(v[k])).join(",")}}`;
}
function previewToken(t: Loaded, body: Aggregate) { const { correctionToken, ...canonical } = body; return createHmac("sha256", env.jwtSecret).update(JSON.stringify({ id: t.id, revision: t.revision, body: canonical })).digest("hex"); }
export function previewPerformance(userId: string, id: string, input: unknown, ctx: WriteContext) {
    return withFinancialLock(userId, async (tx) => {
        const t = await load(tx, userId, id);
        precondition(t, input, ctx);
        if (ctx.capability !== CAPABILITY)
            fail("CLIENT_CAPABILITY_REQUIRED");
        const p = prepare(t, input);
        return { current: project(t), proposed: p.derived, correctionRequired: p.correction, correctionToken: previewToken(t, p.body), revision: t.revision };
    });
}
export function replacePerformance(userId: string, id: string, input: unknown, ctx: WriteContext) {
    return withFinancialLock(userId, async (tx) => {
        const t = await load(tx, userId, id);
        const revision = precondition(t, input, ctx);
        writeGate(ctx);
        const p = prepare(t, input), a = p.body;
        if (p.correction && a.correctionToken !== previewToken(t, a))
            fail("CORRECTION_PREVIEW_REQUIRED");
        const updated = await tx.trade.updateMany({ where: { id, userId, revision }, data: { revision: { increment: 1 } } });
        if (updated.count !== 1)
            fail("REVISION_CONFLICT", "This trade changed elsewhere", 409);
        const now = new Date().toISOString();
        const provenance = { actorId: userId, recordedAt: now, confirmation: a.confirmation ? { ...a.confirmation, actorId: userId, recordedAt: now } : null, correctionReason: a.correctionReason, normalization: { inputAmountUnit: p.inputAmountUnit, raw: p.raw, unitsPerMajor: t.account.unitsPerMajor!.toString(), unitKey: t.account.settlementUnitKey, accountEvidence: t.account.denominationEvidence } };
        await tx.tradeCharge.deleteMany({ where: { tradeId: id } });
        await tx.tradeExecution.deleteMany({ where: { tradeId: id } });
        await tx.tradePerformance.upsert({ where: { tradeId: id }, create: { tradeId: id, accountId: t.accountId, moneyUnitKey: t.account.settlementUnitKey, ...summary(a), provenance: json(provenance) }, update: { ...summary(a), provenance: json(provenance) } });
        const references = new Map<string, string>();
        const executionRows = a.executions.map(f => {
            const { fxEvidence, clientRef, ...data } = f;
            const executionId = f.id ?? randomUUID();
            if (clientRef)
                references.set(clientRef, executionId);
            return { ...data, id: executionId, tradeId: id, accountId: t.accountId, fxEvidence: fxEvidence ? json({ ...fxEvidence, actorId: userId, recordedAt: now }) : Prisma.DbNull };
        });
        for (let offset = 0; offset < executionRows.length; offset += 500)
            await tx.tradeExecution.createMany({ data: executionRows.slice(offset, offset + 500) });
        const chargeRows = a.charges.map(c => { const { fxEvidence, executionRef, ...data } = c; return { ...data, executionId: c.executionId ?? (executionRef ? references.get(executionRef) : null), id: c.id ?? randomUUID(), tradeId: id, accountId: t.accountId, fxEvidence: fxEvidence ? json({ ...fxEvidence, actorId: userId, recordedAt: now }) : Prisma.DbNull }; });
        for (let offset = 0; offset < chargeRows.length; offset += 500)
            await tx.tradeCharge.createMany({ data: chargeRows.slice(offset, offset + 500) });
        return project(await load(tx, userId, id));
    });
}
function summary(a: Aggregate) { return { status: a.status, source: a.source, initialRiskAmount: a.initialRiskAmount, reportedGrossPnl: a.reportedGrossPnl, reportedNetPnl: a.reportedNetPnl, costsComplete: a.costsComplete, openedAt: a.openedAt, closedAt: a.closedAt, instrumentSpec: a.instrumentSpec ? json(a.instrumentSpec) : Prisma.DbNull, calculationVersion: CALCULATION_VERSION }; }
export function deleteFinancialTrade(userId:string,id:string,body:unknown,ctx:WriteContext){return deleteConfirmedTrade(userId,id,body,ctx.ifMatch);}
export function setDenomination(userId: string, id: string, input: unknown, ctx: WriteContext) {
    return withFinancialLock(userId, async (tx) => {
        const a = await tx.tradingAccount.findFirst({ where: { id, userId }, include: { performances: { select: { tradeId: true }, take: 1 } } });
        if (!a)
            fail("ACCOUNT_NOT_FOUND", "Account not found", 404);
        writeGate(ctx);
        const data = parse(denominationSchema, input);
        if (a.performances.length)
            fail("DENOMINATION_FROZEN");
        if (data.settlementUnitKey.startsWith('ISO:') && data.settlementUnitKey !== `ISO:${a.currency}`)
            fail("SETTLEMENT_CURRENCY_MISMATCH");
        return tx.tradingAccount.update({ where: { id }, data: { settlementUnitKey: data.settlementUnitKey, unitsPerMajor: data.unitsPerMajor, denominationLabel: data.denominationLabel, denominationEvidence: json({ source: data.source, actorId: userId, recordedAt: new Date().toISOString(), acknowledged: true, verification: "USER_REPORTED" }) } });
    });
}
export function createExactTrade(userId: string, input: unknown, ctx: WriteContext) {
    return withFinancialLock(userId, async (tx) => {
        writeGate(ctx);
        const data = parse(createPlan, input);
        assertMediaChange(null,data.imageUrl);
        const account = await tx.tradingAccount.findFirst({ where: { id: data.accountId, userId } });
        if (!account)
            fail("ACCOUNT_NOT_FOUND", "Account not found", 404);
        return tx.trade.create({ data: { ...data, userId, rr: exactPlannedRR(data.direction, data.entry, data.sl, data.tp) } });
    });
}
export function updateExactTrade(userId: string, id: string, input: unknown, ctx: WriteContext) {
    return withFinancialLock(userId, async (tx) => {
        const t = await load(tx, userId, id);
        const revision = precondition(t, input, ctx);
        writeGate(ctx);
        const { expectedRevision: _, ...data } = parse(updatePlan, input);
        assertMediaChange(t.imageUrl,data.imageUrl);
        if (data.accountId) {
            const a = await tx.tradingAccount.findFirst({ where: { id: data.accountId, userId } });
            if (!a)
                fail("ACCOUNT_NOT_FOUND", "Account not found", 404);
        }
        if (t.performance) {
            for (const k of ['accountId', 'pair', 'direction'] as const) {
                if (data[k] !== undefined && data[k] !== t[k])
                    fail("FINANCIAL_PLAN_IMMUTABLE", "Create/reconcile a separate position instead of changing actual evidence");
            }
        }
        const priceChange = (data.direction !== undefined && data.direction !== t.direction) || (["entry", "sl", "tp"] as const).some(k => data[k] !== undefined && !equalDecimal(data[k]!, t[k].toFixed()));
        const rr = priceChange ? exactPlannedRR(data.direction ?? t.direction, data.entry ?? t.entry.toFixed(), data.sl ?? t.sl.toFixed(), data.tp ?? t.tp.toFixed()) : t.rr;
        const row = await tx.trade.updateMany({ where: { id, userId, revision }, data: { ...data, rr, revision: { increment: 1 } } });
        if (row.count !== 1)
            fail("REVISION_CONFLICT", "This trade changed elsewhere", 409);
        return tx.trade.findUniqueOrThrow({ where: { id } });
    });
}
export function planDto(t: Prisma.TradeGetPayload<{}>) { return { ...t, entry: t.entry.toFixed(), sl: t.sl.toFixed(), tp: t.tp.toFixed(), rr: t.rr?.toFixed(2) ?? null }; }
export function getExactTrade(userId: string, id: string) { return withFinancialLock(userId, async (tx) => { const { account, performance, ...t } = await load(tx, userId, id); return planDto(t); }); }
