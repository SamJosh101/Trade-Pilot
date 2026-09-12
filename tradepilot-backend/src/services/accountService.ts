import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { AccountInput, AccountUpdateInput } from "../types/dto";

export async function getAllAccounts(userId: string) {
  return prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function getAccountsWithStats(userId: string) {
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  // Get trade counts and net P/L for each account
  const accountIds = accounts.map((a) => a.id);
  const trades = await prisma.trade.findMany({
    where: { accountId: { in: accountIds } },
    select: { accountId: true, rr: true, result: true },
  });

  const statsByAccountId = new Map<string, { tradeCount: number; netPL: number }>();
  
  for (const trade of trades) {
    const stats = statsByAccountId.get(trade.accountId) ?? { tradeCount: 0, netPL: 0 };
    stats.tradeCount += 1;
    
    // Calculate P/L: WIN adds RR, LOSS subtracts RR, BE adds 0
    if (trade.result === "WIN" && trade.rr) {
      stats.netPL += Number(trade.rr);
    } else if (trade.result === "LOSS" && trade.rr) {
      stats.netPL -= Number(trade.rr);
    }
    
    statsByAccountId.set(trade.accountId, stats);
  }

  return accounts.map((account) => {
    const stats = statsByAccountId.get(account.id) ?? { tradeCount: 0, netPL: 0 };
    return {
      ...account,
      tradeCount: stats.tradeCount,
      netPL: Number(stats.netPL.toFixed(2)),
    };
  });
}

export async function getAccountById(userId: string, id: string) {
  const account = await prisma.tradingAccount.findFirst({
    where: { id, userId },
  });
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

export async function createAccount(userId: string, input: AccountInput) {
  return prisma.tradingAccount.create({
    data: { ...input, userId },
  });
}

export async function updateAccount(userId: string, id: string, input: AccountUpdateInput) {
  const existing = await prisma.tradingAccount.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError("Account not found", 404);

  return prisma.tradingAccount.update({
    where: { id },
    data: input,
  });
}

export async function deleteAccount(userId: string, id: string) {
  const existing = await prisma.tradingAccount.findFirst({
    where: { id, userId },
  });
  if (!existing) throw new AppError("Account not found", 404);

  // Check if account has any trades
  const tradeCount = await prisma.trade.count({
    where: { accountId: id },
  });

  if (tradeCount > 0) {
    throw new AppError("Cannot delete an account with trades", 409);
  }

  await prisma.tradingAccount.delete({ where: { id } });
}
