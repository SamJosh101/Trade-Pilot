import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { calculateRR } from "../utils/calculateRR";
import { TradeInput, TradeUpdateInput } from "../types/dto";

export async function getAllTrades(userId: string, accountId?: string) {
  const where: any = { userId };
  if (accountId) {
    where.accountId = accountId;
  }
  return prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function getTradeById(userId: string, id: string) {
  // findFirst (not findUnique) so the userId filter is applied at the
  // database level — a trade that exists but belongs to someone else
  // looks identical to a trade that doesn't exist at all.
  const trade = await prisma.trade.findFirst({ where: { id, userId } });
  if (!trade) throw new AppError("Trade not found", 404);
  return trade;
}

export async function createTrade(userId: string, input: TradeInput) {
  // Validate that the account belongs to the user
  const account = await prisma.tradingAccount.findFirst({
    where: { id: input.accountId, userId },
  });
  if (!account) throw new AppError("Account not found", 404);

  const rr = calculateRR(input.direction, input.entry, input.sl, input.tp);
  return prisma.trade.create({
    data: { ...input, rr, userId },
  });
}

export async function updateTrade(userId: string, id: string, input: TradeUpdateInput) {
  const existing = await prisma.trade.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Trade not found", 404);

  const direction = input.direction ?? existing.direction;
  const entry = input.entry ?? Number(existing.entry);
  const sl = input.sl ?? Number(existing.sl);
  const tp = input.tp ?? Number(existing.tp);
  const rr = calculateRR(direction, entry, sl, tp);

  return prisma.trade.update({
    where: { id },
    data: { ...input, rr },
  });
}

export async function deleteTrade(userId: string, id: string) {
  const existing = await prisma.trade.findFirst({ where: { id, userId } });
  if (!existing) throw new AppError("Trade not found", 404);
  await prisma.trade.delete({ where: { id } });
}
