import prisma from "../config/prisma";
import { Prisma } from "@prisma/client";
import { project } from "./service";
import { dec, canonical } from "./decimal";
import { fail } from "./errors";
import { CALCULATION_VERSION } from "./calculate";
import {completedMetrics,type ClosedResult} from './completedMetrics';
export type PerformanceFilter = {
    accountId?: string;
    from?: Date;
    to?: Date;
};
// A repeatable-read snapshot prevents mixing parent and child revisions across query batches.
export async function realizedSummary(userId: string, filter: PerformanceFilter = {}) {
    if (filter.from && filter.to && filter.from >= filter.to)
        fail("INVALID_DATE_RANGE");
    return prisma.$transaction(async (tx) => {
        if (filter.accountId && !await tx.tradingAccount.findFirst({ where: { id: filter.accountId, userId } }))
            fail("ACCOUNT_NOT_FOUND", "Account not found", 404);
        const count = await tx.trade.count({ where: { userId, ...(filter.accountId ? { accountId: filter.accountId } : {}) } });
        if (count > 100000)
            fail("QUERY_LIMIT", "Narrow this query to an account", 413);
        const groups: Record<string, {
            closedCount: number;
            knownNetCount: number;
            knownRCount: number;
            winCount: number;
            net: ReturnType<typeof dec>;
            r: ReturnType<typeof dec>;
            rows: ClosedResult[];
        }> = {};
        const coverage = { totalTrades: count, notRecorded: 0, invalidRecorded: 0, unknownStatus: 0, undatedClosed: 0, eligibleClosed: 0, missingNet: 0, missingRisk: 0, missingRealizedR: 0, partialCount: 0 };
        const missingReasons: Record<string, number> = {};
        const partials: any[] = [];
        let cursor: string | undefined;
        while (true) {
            const rows = await tx.trade.findMany({ where: { userId, ...(filter.accountId ? { accountId: filter.accountId } : {}) }, orderBy: { id: "asc" }, take: 25, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}), include: { account: true, performance: { include: { executions: { orderBy: { id: "asc" } }, charges: { orderBy: { id: "asc" } } } } } });
            if (!rows.length)
                break;
            for (const row of rows) {
                const p = project(row);
                for (const reason of p.derived.reasons)
                    missingReasons[reason] = (missingReasons[reason] ?? 0) + 1;
                if (!p.performance) {
                    if (row.performance)
                        coverage.invalidRecorded++;
                    else
                        coverage.notRecorded++;
                    continue;
                }
                const a = p.performance, d = p.derived;
                if (!d.status) {
                    coverage.unknownStatus++;
                    continue;
                }
                if (d.status === "PARTIAL") {
                    coverage.partialCount++;
                    if (partials.length < 1000)
                        partials.push({ tradeId: row.id, revision: row.revision, ...d });
                    continue;
                }
                if (d.status !== "CLOSED")
                    continue;
                if (!a.closedAt) {
                    coverage.undatedClosed++;
                    continue;
                }
                const closed = new Date(a.closedAt);
                if ((filter.from && closed < filter.from) || (filter.to && closed >= filter.to))
                    continue;
                coverage.eligibleClosed++;
                if (d.netPnl === null)
                    coverage.missingNet++;
                if (d.realizedR === null)
                    coverage.missingRealizedR++;
                if (a.initialRiskAmount === null)
                    coverage.missingRisk++;
                if (!d.moneyUnitKey)
                    continue;
                const g = groups[d.moneyUnitKey] ??= { closedCount: 0, knownNetCount: 0, knownRCount: 0, winCount: 0, net: dec(0), r: dec(0), rows: [] };
                g.rows.push({id:row.id,closedAt:a.closedAt,net:d.netPnl,r:d.realizedR});
                g.closedCount++;
                if (d.netPnl !== null) {
                    g.net = g.net.plus(d.netPnl);
                    g.knownNetCount++;
                    if (dec(d.netPnl).gt(0))
                        g.winCount++;
                }
                if (d.realizedR !== null) {
                    g.r = g.r.plus(d.realizedR);
                    g.knownRCount++;
                }
            }
            cursor = rows[rows.length - 1].id;
        }
        return { calculationVersion: CALCULATION_VERSION, closedDateFilter: { from: filter.from?.toISOString() ?? null, to: filter.to?.toISOString() ?? null, bounds: "[from,to)" }, coverageDateBasis: "Coverage describes all owned records; eligibleClosed and totals apply the closedAt filter", coverage, missingReasons, totals: Object.entries(groups).map(([moneyUnitKey, g]) => ({ moneyUnitKey, ...completedMetrics(g.rows), closedCount: g.closedCount, knownNetCount: g.knownNetCount, knownRCount: g.knownRCount, netPnl: g.knownNetCount ? canonical(g.net) : null, meanRealizedR: g.knownRCount ? canonical(g.r.div(g.knownRCount)) : null, netWinRate: g.knownNetCount ? canonical(dec(g.winCount).div(g.knownNetCount).times(100)) : null })), partials, partialsTruncated: coverage.partialCount > partials.length, partialDateBasis: "Current open exposure, independent of completed closedAt date filter", balance: null, equity: null };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead, timeout: 30000 });
}

