import prisma from "../config/prisma";

/**
 * Unlike metricsService (pure SQL aggregate/groupBy), the equity curve needs
 * a *running* cumulative total per trade in chronological order — that's a
 * window-function shape, not a simple aggregate. Prisma's query builder
 * doesn't expose window functions, so this pulls the (small) set of fields
 * actually needed and reduces in JS. If the trade volume ever gets large
 * enough for this to matter, the equity curve piece can be rewritten as a
 * single raw SQL query using SUM() OVER (ORDER BY created_at).
 */
export async function getAnalytics(userId: string, accountId?: string) {
  const where: any = { userId };
  if (accountId) {
    where.accountId = accountId;
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      pair: true,
      direction: true,
      result: true,
      rr: true,
      createdAt: true,
    },
  });

  let cumulativeRR = 0;
  const equityCurve = trades.map((t) => {
    const signedRR = t.rr ? Number(t.rr) : 0;
    if (t.result === "WIN") {
      cumulativeRR += signedRR;
    } else if (t.result === "LOSS") {
      cumulativeRR -= signedRR;
    }
    // BE and null result add 0
    return {
      date: t.createdAt,
      cumulativeRR: Number(cumulativeRR.toFixed(2)),
    };
  });

  const pairStats = new Map<string, { total: number; wins: number; rrSum: number }>();
  for (const t of trades) {
    const stats = pairStats.get(t.pair) ?? { total: 0, wins: 0, rrSum: 0 };
    stats.total += 1;
    if (t.result === "WIN") {
      stats.wins += 1;
      stats.rrSum += t.rr ? Number(t.rr) : 0;
    } else if (t.result === "LOSS") {
      stats.rrSum -= t.rr ? Number(t.rr) : 0;
    }
    // BE and null result add 0
    pairStats.set(t.pair, stats);
  }
  const pairBreakdown = Array.from(pairStats.entries())
    .map(([pair, s]) => ({
      pair,
      totalTrades: s.total,
      winRate: s.total ? Number(((s.wins / s.total) * 100).toFixed(2)) : 0,
      avgRR: s.total ? Number((s.rrSum / s.total).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.avgRR - a.avgRR);

  const winLossBreakdown = {
    win: trades.filter((t) => t.result === "WIN").length,
    loss: trades.filter((t) => t.result === "LOSS").length,
    breakEven: trades.filter((t) => t.result === "BE").length,
    open: trades.filter((t) => t.result === null).length,
  };

  const directionBreakdown = {
    buy: trades.filter((t) => t.direction === "BUY").length,
    sell: trades.filter((t) => t.direction === "SELL").length,
  };

  return { equityCurve, pairBreakdown, winLossBreakdown, directionBreakdown };
}

export async function getCalendar(userId: string, month: string, accountId?: string) {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthIndex = monthNumber - 1;
  const startDate = new Date(Date.UTC(year, monthIndex, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, monthIndex + 1, 0, 23, 59, 59, 999));

  const where: any = {
    userId,
    createdAt: {
      gte: startDate,
      lte: endDate,
    },
  };
  if (accountId) {
    where.accountId = accountId;
  }

  const trades = await prisma.trade.findMany({
    where,
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      pair: true,
      direction: true,
      entry: true,
      rr: true,
      result: true,
      timeframe: true,
      createdAt: true,
    },
  });

  const daysByDate = new Map<
    string,
    {
      date: string;
      netRR: number;
      tradeCount: number;
      trades: Array<{
        id: string;
        pair: string;
        direction: string;
        entry: string;
        rr: string | null;
        result: string | null;
        timeframe: string | null;
        createdAt: Date;
      }>;
    }
  >();

  for (const trade of trades) {
    const date = trade.createdAt.toISOString().slice(0, 10);
    const day = daysByDate.get(date) ?? {
      date,
      netRR: 0,
      tradeCount: 0,
      trades: [],
    };

    const signedRR = trade.rr ? Number(trade.rr) : 0;
    if (trade.result === "WIN") {
      day.netRR += signedRR;
    } else if (trade.result === "LOSS") {
      day.netRR -= signedRR;
    }
    // BE and null result add 0
    day.tradeCount += 1;
    day.trades.push({
      id: trade.id,
      pair: trade.pair,
      direction: trade.direction,
      entry: trade.entry.toString(),
      rr: trade.rr?.toString() ?? null,
      result: trade.result,
      timeframe: trade.timeframe,
      createdAt: trade.createdAt,
    });

    daysByDate.set(date, day);
  }

  const days = Array.from(daysByDate.values())
    .map((day) => ({
      ...day,
      netRR: Number(day.netRR.toFixed(2)),
    }))
    .sort((a, b) => b.date.localeCompare(a.date));

  return { month, days };
}
