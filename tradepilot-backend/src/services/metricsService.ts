import prisma from "../config/prisma";

/**
 * All aggregation happens in Prisma's aggregate/groupBy, which compile down
 * to single SQL queries executed by Postgres — not by pulling every trade
 * row into Node and looping. Keeps this both fast and type-safe.
 */
export async function getMetrics(userId: string, accountId?: string) {
  const where: any = { userId };
  if (accountId) {
    where.accountId = accountId;
  }

  const [totals, byPair, winCount] = await Promise.all([
    prisma.trade.aggregate({
      where,
      _count: { _all: true },
      _avg: { rr: true },
    }),
    prisma.trade.groupBy({
      by: ["pair"],
      where,
      _avg: { rr: true },
      orderBy: { _avg: { rr: "desc" } },
    }),
    prisma.trade.count({ where: { ...where, result: "WIN" } }),
  ]);

  const totalTrades = totals._count._all;
  const winRate = totalTrades ? Number(((winCount / totalTrades) * 100).toFixed(2)) : 0;
  const avgRR = totals._avg.rr ? Number(totals._avg.rr) : 0;

  return {
    totalTrades,
    winRate,
    avgRR,
    bestPair: byPair.length ? byPair[0].pair : null,
    worstPair: byPair.length ? byPair[byPair.length - 1].pair : null,
  };
}
