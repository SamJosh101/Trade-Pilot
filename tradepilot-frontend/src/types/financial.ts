export type DecimalString = string;
export type Status = 'OPEN' | 'PARTIAL' | 'CLOSED';
export const SETTLEMENT_UNITS = ['ISO:USD', 'ISO:EUR', 'ISO:GBP', 'ISO:NGN', 'ISO:JPY', 'ISO:CHF', 'ISO:AUD', 'ISO:CAD', 'TOKEN:Tether:USDT:ethereum', 'TOKEN:Tether:USDT:tron'] as const;
export type UnitKey = typeof SETTLEMENT_UNITS[number];
export type Capability = {
    schemaReady?: boolean;
    protocol: 'financial-v1.1';
    writesEnabled: boolean;
    calculationVersion: string;
    settlementUnits: UnitKey[];
    maxEvents: number;
};
export type FxEvidence = {
    version: 1;
    basis: 'IDENTITY' | 'USER_REPORTED';
    fromUnitKey: UnitKey;
    toUnitKey: UnitKey;
    effectiveAt: string;
    policyVersion: 'v11-identity-1' | 'v11-user-event-1';
    sourceRef: string;
    acknowledged: true;
};
export type Instrument = {
    version: 1;
    symbol: string;
    calculationMode: 'LINEAR' | 'TICK_LINEAR' | 'REPORTED_ONLY' | 'INVERSE' | 'OPTION';
    quantityUnit: 'BASE_UNITS' | 'LOTS' | 'CONTRACTS';
    quantityStep: string;
    priceTick: string;
    contractMultiplier: string | null;
    profitUnitKey: UnitKey;
    source: string;
    effectiveAt: string;
};
export type Execution = {
    id?: string;
    clientRef?: string;
    kind: 'ENTRY' | 'EXIT';
    price: string | null;
    quantity: string | null;
    executedAt: string | null;
    sequence: number | null;
    fxRateToAccount: string | null;
    fxEvidence: FxEvidence | null;
};
export type Charge = {
    id?: string;
    executionId: string | null;
    executionRef?: string | null;
    kind: 'COMMISSION' | 'SWAP' | 'OTHER';
    amount: string | null;
    unitKey: UnitKey | null;
    occurredAt: string | null;
    fxRateToAccount: string | null;
    fxEvidence: FxEvidence | null;
};
export type Aggregate = {
    expectedRevision?: number;
    status: Status | null;
    source: 'MANUAL' | 'EXECUTIONS';
    amountUnit: 'SETTLEMENT' | 'ACCOUNT';
    initialRiskAmount: string | null;
    reportedGrossPnl: string | null;
    reportedNetPnl: string | null;
    costsComplete: boolean | null;
    openedAt: string | null;
    closedAt: string | null;
    instrumentSpec: Instrument | null;
    confirmation: {
        state: Status;
        acknowledged: true;
    } | null;
    correctionReason?: string | null;
    correctionToken?: string | null;
    executions: Execution[];
    charges: Charge[];
};
export type Calculation = {
    calculationVersion: string;
    status: Status | null;
    source: Aggregate['source'] | null;
    moneyUnitKey: string | null;
    verification: 'USER_REPORTED';
    grossPnl: string | null;
    netPnl: string | null;
    realizedR: string | null;
    recognizedCosts: string | null;
    remainingQuantity: string | null;
    weightedAverageEntry: string | null;
    scope: string;
    readiness: string;
    reasons: string[];
};
export type Performance = {
    tradeId: string;
    revision: number;
    performance: Aggregate | null;
    derived: Calculation;
    audit?: {
        updatedAt: string;
        provenance: Record<string, unknown>;
    } | null;
    etag?: string;
};
export type Preview = {
    current: Performance;
    revision: number;
    proposed: Calculation;
    correctionRequired: boolean;
    correctionToken: string;
};
export type Summary = {
    calculationVersion: string;
    coverage: {
        totalTrades: number;
        notRecorded: number;
        invalidRecorded: number;
        unknownStatus: number;
        undatedClosed: number;
        eligibleClosed: number;
        missingNet: number;
        missingRisk: number;
        missingRealizedR: number;
        partialCount: number;
    };
    missingReasons: Record<string, number>;
    totals: Array<{
        moneyUnitKey: string;
        closedCount: number;
        knownNetCount: number;
        knownRCount: number;
        netPnl: string | null;
        meanRealizedR: string | null;
        netWinRate: string | null;
    }>;
    partials: Array<Calculation & {
        tradeId: string;
        revision: number;
    }>;
    partialsTruncated: boolean;
    partialDateBasis: string;
    balance: null;
    equity: null;
};
export type Denomination = {
    settlementUnitKey: UnitKey;
    unitsPerMajor: string;
    denominationLabel: string;
    source: string;
    acknowledged: true;
};
