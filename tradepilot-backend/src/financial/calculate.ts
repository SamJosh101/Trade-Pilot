import { Aggregate, Fx, UNIT_KEYS } from "./schemas";
import { Decimal, dec, canonical } from "./decimal";
import { fail, FinancialError } from "./errors";
export type AccountUnit = {
    settlementUnitKey: string | null;
    unitsPerMajor: {
        toString(): string;
    } | null;
};
export const CALCULATION_VERSION = "v11-linear-1";
function fxValue(rate: string | null, e: Fx | null, native: string | null, target: string | null, at: string | null): InstanceType<typeof Decimal> | null {
    if (rate === null && e === null)
        return null;
    if (rate === null || !e)
        fail("FX_EVIDENCE_REQUIRED");
    if (!native || !target)
        return null;
    if (!at)
        fail("FX_EVENT_CONTEXT_REQUIRED");
    if (e.fromUnitKey !== native || e.toUnitKey !== target || Date.parse(e.effectiveAt) !== Date.parse(at))
        fail("FX_EVIDENCE_MISMATCH");
    if (native === target) {
        if (e.basis !== "IDENTITY" || e.policyVersion !== "v11-identity-1" || !dec(rate).eq(1))
            fail("INVALID_IDENTITY_FX");
    }
    else if (e.basis !== "USER_REPORTED" || e.policyVersion !== "v11-user-event-1")
        fail("INVALID_FX_POLICY");
    return dec(rate);
}
export function calculate(direction: "BUY" | "SELL", pair: string, a: Aggregate, account: AccountUnit) {
    const reasons = new Set<string>();
    const add = (r: string) => reasons.add(r);
    const publish = (v: InstanceType<typeof Decimal> | null) => {
        if (v === null)
            return null;
        const s = canonical(v);
        if (s === null)
            add("PRECISION_INSUFFICIENT");
        return s;
    };
    const unitSupported = UNIT_KEYS.includes(account.settlementUnitKey as typeof UNIT_KEYS[number]);
    const denominated = unitSupported && !!account.unitsPerMajor;
    if (account.settlementUnitKey && !unitSupported)
        add("UNSUPPORTED_SETTLEMENT_UNIT");
    if (!denominated)
        add("DENOMINATION_UNCONFIRMED");
    if (!a.initialRiskAmount)
        add("RISK_MISSING");
    const actualTimes = [a.openedAt, a.closedAt, ...a.executions.map(f => f.executedAt), ...a.charges.map(c => c.occurredAt)];
    if (actualTimes.some(t => t !== null && Date.parse(t) > Date.now()))
        fail("FUTURE_ACTUAL_TIMESTAMP");
    const spec = a.instrumentSpec;
    const supported = !!spec && spec.calculationMode === "LINEAR" && !!spec.contractMultiplier;
    if (spec && spec.symbol !== pair)
        fail("INSTRUMENT_MISMATCH");
    if (a.source === "EXECUTIONS" && !supported)
        add("UNSUPPORTED_INSTRUMENT");
    let entered = dec(0), exited = dec(0), weightedSum = dec(0), exitSeen = false, streamComplete = a.executions.length > 0 && a.executions.every(f => f.price !== null && f.quantity !== null && f.executedAt !== null);
    let previousTime: number | null = null, previousSequence: number | null = null, lastExit: string | null = null;
    const ids = new Set<string>();
    const localRefs = new Set<string>();
    for (const f of a.executions) {
        if (f.clientRef) {
            if (localRefs.has(f.clientRef))
                fail("DUPLICATE_EVENT_REFERENCE");
            localRefs.add(f.clientRef);
        }
        if (f.id) {
            if (ids.has(f.id))
                fail("DUPLICATE_EVENT_ID");
            ids.add(f.id);
        }
        if (f.price === null || f.quantity === null || f.executedAt === null) {
            streamComplete = false;
            continue;
        }
        const time = Date.parse(f.executedAt);
        if (previousTime !== null && (time < previousTime || (time === previousTime && (f.sequence === null || previousSequence === null || f.sequence <= previousSequence))))
            fail("EXECUTION_ORDER_INVALID");
        previousTime = time;
        previousSequence = f.sequence;
        if (spec) {
            if (Date.parse(spec.effectiveAt) > time)
                fail("INSTRUMENT_NOT_EFFECTIVE");
            if (!dec(f.quantity).mod(spec.quantityStep).isZero() || !dec(f.price).mod(spec.priceTick).isZero())
                fail("INSTRUMENT_STEP_INVALID");
        }
        if (f.kind === "ENTRY") {
            if (exitSeen)
                fail("UNSUPPORTED_REENTRY");
            entered = entered.plus(f.quantity);
            weightedSum = weightedSum.plus(dec(f.price).times(f.quantity));
        }
        else {
            exitSeen = true;
            exited = exited.plus(f.quantity);
            lastExit = f.executedAt;
            if (streamComplete && exited.gt(entered))
                fail("OVER_CLOSE");
        }
    }
    const remaining = streamComplete ? entered.minus(exited) : null;
    const weighted = streamComplete && entered.gt(0) ? weightedSum.div(entered) : null;
    if (a.closedAt !== null && a.status !== "CLOSED")
        fail("STATUS_INCONSISTENT");
    if (a.openedAt && a.closedAt && Date.parse(a.closedAt) < Date.parse(a.openedAt))
        fail("TIMESTAMP_ORDER_INVALID");
    if (a.source === "EXECUTIONS") {
        if (a.confirmation !== null)
            fail("UNEXPECTED_MANUAL_CONFIRMATION");
        if (a.reportedNetPnl !== null || a.reportedGrossPnl !== null)
            fail("CONFLICTING_SOURCE_TOTALS");
        if (a.status !== null) {
            if (!supported)
                fail("UNSUPPORTED_INSTRUMENT");
            if (!streamComplete || entered.lte(0))
                fail("STATUS_EVIDENCE_INCOMPLETE");
            const status = exited.isZero() ? "OPEN" : remaining!.isZero() ? "CLOSED" : "PARTIAL";
            if (a.status !== status)
                fail("STATUS_INCONSISTENT");
            if (a.status === "CLOSED" && (!a.closedAt || Date.parse(a.closedAt) !== Date.parse(lastExit!)))
                fail("CLOSE_TIME_MISMATCH");
        }
    }
    else if (a.status !== null) {
        if (!a.confirmation || a.confirmation.state !== a.status)
            fail("MANUAL_CONFIRMATION_REQUIRED");
        if (a.status === "OPEN" && (a.reportedNetPnl !== null || a.reportedGrossPnl !== null))
            fail("OPEN_REALIZATION_CONFLICT");
        if (a.executions.length) {
            if (!streamComplete || !entered.gt(0))
                fail("REFERENCE_FILLS_INCOMPLETE");
            const status = exited.isZero() ? "OPEN" : remaining!.isZero() ? "CLOSED" : "PARTIAL";
            if (status !== a.status)
                fail("MANUAL_EXECUTION_CONTRADICTION");
        }
    }
    if (a.status === null)
        add("STATUS_UNKNOWN");
    if (a.status === "CLOSED" && !a.closedAt)
        add("DATE_UNKNOWN");
    if (a.executions.length && !streamComplete)
        add("EXECUTIONS_INCOMPLETE");
    // Validate conversion evidence even for entry/reference fills; unknown rates are retained as unknown.
    const rates = a.executions.map(f => fxValue(f.fxRateToAccount, f.fxEvidence, spec?.profitUnitKey ?? null, account.settlementUnitKey, f.executedAt));
    let costs = dec(0), costsKnown = a.costsComplete === true;
    if (a.costsComplete !== true)
        add("COSTS_INCOMPLETE");
    const chargeIds = new Set<string>();
    for (const c of a.charges) {
        if (c.id) {
            if (chargeIds.has(c.id))
                fail("DUPLICATE_EVENT_ID");
            chargeIds.add(c.id);
        }
        if (c.amount !== null && c.unitKey === null)
            fail("CHARGE_UNIT_REQUIRED");
        if (c.executionId && c.executionRef)
            fail("AMBIGUOUS_EXECUTION_REFERENCE");
        if (c.executionRef && !localRefs.has(c.executionRef))
            fail("CHARGE_EXECUTION_MISMATCH");
        if (c.executionId && !ids.has(c.executionId))
            fail("CHARGE_EXECUTION_MISMATCH");
        const rate = fxValue(c.fxRateToAccount, c.fxEvidence, c.unitKey, account.settlementUnitKey, c.occurredAt);
        if (c.amount === null || !rate || !c.occurredAt) {
            costsKnown = false;
            if (!rate)
                add("FX_MISSING");
            if (!c.occurredAt)
                add("EVENT_DATE_MISSING");
        }
        else
            costs = costs.plus(dec(c.amount).times(rate));
    }
    let gross: InstanceType<typeof Decimal> | null = null, net: InstanceType<typeof Decimal> | null = null;
    if (a.source === "MANUAL") {
        gross = a.reportedGrossPnl === null ? null : dec(a.reportedGrossPnl);
        net = a.reportedNetPnl === null ? null : dec(a.reportedNetPnl);
        if (gross !== null && costsKnown) {
            const derived = gross.minus(costs);
            if (net !== null && publish(derived) !== publish(net))
                fail("REPORTED_TOTALS_CONFLICT");
            if (net === null)
                net = derived;
        }
        if (gross !== null && net !== null && a.costsComplete === true && !costsKnown)
            fail("RECONCILIATION_INCOMPLETE");
    }
    else if (supported && streamComplete && weighted !== null && exited.gt(0)) {
        gross = dec(0);
        for (let i = 0; i < a.executions.length; i++) {
            const f = a.executions[i];
            if (f.kind !== "EXIT")
                continue;
            const r = rates[i];
            if (!r) {
                gross = null;
                add("FX_MISSING");
                break;
            }
            const movement = direction === "BUY" ? dec(f.price!).minus(weighted) : weighted.minus(f.price!);
            gross = gross.plus(movement.times(f.quantity!).times(spec!.contractMultiplier!).times(r));
        }
        if (gross !== null && costsKnown)
            net = gross.minus(costs);
    }
    if (!denominated) {
        gross = null;
        net = null;
    }
    if (net === null)
        add("NET_UNKNOWN");
    const grossPnl = publish(gross), netPnl = publish(net);
    const realizedR = netPnl !== null && a.initialRiskAmount !== null ? publish(dec(netPnl).div(a.initialRiskAmount)) : null;
    return { calculationVersion: CALCULATION_VERSION, status: a.status, source: a.source, moneyUnitKey: account.settlementUnitKey, verification: "USER_REPORTED" as const, grossPnl, netPnl, realizedR, recognizedCosts: denominated && costsKnown ? publish(costs) : null, remainingQuantity: remaining?.toFixed() ?? null, weightedAverageEntry: weighted?.toDecimalPlaces(18).toFixed(18) ?? null, scope: a.status === "CLOSED" ? "COMPLETED" : a.status === "PARTIAL" ? "PARTIAL" : a.status ?? "UNKNOWN", readiness: reasons.has("PRECISION_INSUFFICIENT") ? "PRECISION_INSUFFICIENT" : reasons.has("UNSUPPORTED_INSTRUMENT") ? "UNSUPPORTED" : netPnl === null ? "UNKNOWN" : "KNOWN", reasons: [...reasons] };
}
export type Calculation = ReturnType<typeof calculate>;
export function safeCalculate(direction: "BUY" | "SELL", pair: string, a: Aggregate, account: AccountUnit) {
    try {
        return calculate(direction, pair, a, account);
    }
    catch (e) {
        if (!(e instanceof FinancialError))
            throw e;
        return { ...unknownCalculation(), reasons: ["INVALID_RECORDED_DATA", e.code] };
    }
}
export function unknownCalculation() { return { calculationVersion: CALCULATION_VERSION, status: null, source: null, moneyUnitKey: null, verification: "USER_REPORTED" as const, grossPnl: null, netPnl: null, realizedR: null, recognizedCosts: null, remainingQuantity: null, weightedAverageEntry: null, scope: "UNKNOWN", readiness: "UNKNOWN", reasons: ["NOT_RECORDED"] }; }
