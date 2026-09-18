import prisma from "../config/prisma";

/**
 * RR sign convention: WIN adds RR, LOSS subtracts RR, BE adds 0.
 * This requires pulling trade data and calculating in JS since SQL aggregation
 * doesn't support conditional sign application based on result.
 */
export async function getMetrics(userId: string, accountId?: string) {
  const where: any = { userId };
  if (accountId) {
    where.accountId = accountId;
  }

  const trades = await prisma.trade.findMany({
    where,
    select: {
      pair: true,
      result: true,
      rr: true,
    },
  });

  let totalRR = 0;
  const pairStats = new Map<string, { total: number; rrSum: number }>();
  let winCount = 0;

  for (const trade of trades) {
    const signedRR = trade.rr ? Number(trade.rr) : 0;
    
    if (trade.result === "WIN") {
      totalRR += signedRR;
      winCount += 1;
    } else if (trade.result === "LOSS") {
      totalRR -= signedRR;
    }
    // BE and null result add 0

    const stats = pairStats.get(trade.pair) ?? { total: 0, rrSum: 0 };
    stats.total += 1;
    if (trade.result === "WIN") {
      stats.rrSum += signedRR;
    } else if (trade.result === "LOSS") {
      stats.rrSum -= signedRR;
    }
    // BE and null result add 0
    pairStats.set(trade.pair, stats);
  }

  const totalTrades = trades.length;
  const winRate = totalTrades ? Number(((winCount / totalTrades) * 100).toFixed(2)) : 0;
  const avgRR = totalTrades ? Number((totalRR / totalTrades).toFixed(2)) : 0;

  const pairBreakdown = Array.from(pairStats.entries())
    .map(([pair, s]) => ({
      pair,
      avgRR: s.total ? Number((s.rrSum / s.total).toFixed(2)) : 0,
    }))
    .sort((a, b) => b.avgRR - a.avgRR);

  return {
    totalTrades,
    winRate,
    avgRR,
    bestPair: pairBreakdown.length ? pairBreakdown[0].pair : null,
    worstPair: pairBreakdown.length ? pairBreakdown[pairBreakdown.length - 1].pair : null,
  };
}
