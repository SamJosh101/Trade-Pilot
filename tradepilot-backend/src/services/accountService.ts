import {assertMediaChange} from '../security/media';
import { databaseCompatibility, writableJournalSchema } from '../utils/schemaCompatibility';
import {Prisma} from "@prisma/client";
import {FinancialError} from "../financial/errors";
import prisma from "../config/prisma";
import { withUserLock } from "../utils/withUserLock";
import { AppError } from "../utils/AppError";
import { AccountInput, AccountUpdateInput } from "../types/dto";

export async function getAllAccounts(userId: string) {
  const schema=await databaseCompatibility();
  return prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select:schema.financial?undefined:schema.accountSelect,
  });
}

export async function getAccountsWithStats(userId: string) {
  const schema=await databaseCompatibility();
  const accounts = await prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    select:schema.financial?undefined:schema.accountSelect,
  });

  // Get trade counts and net P/L for each account
  const accountIds = accounts.map((a) => a.id);
  const trades = await prisma.trade.findMany({
    where: { userId, accountId: { in: accountIds } },
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
  const schema=await databaseCompatibility();
  const account = await prisma.tradingAccount.findFirst({
    where: { id, userId },
    select:schema.financial?undefined:schema.accountSelect,
  });
  if (!account) throw new AppError("Account not found", 404);
  return account;
}

export async function createAccount(userId: string, input: AccountInput) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    assertMediaChange(null,input.avatarUrl);
    const current = await tx.tradingAccount.findFirst({ where: { userId, isCurrent: true },select:{id:true} });
    return tx.tradingAccount.create({ data: { ...input, userId, isCurrent: !current },select:schema.financial?undefined:schema.accountSelect });
  });
}

export async function updateAccount(userId: string, id: string, input: AccountUpdateInput) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    const existing = await tx.tradingAccount.findFirst({ where: { id, userId },select:schema.financial?undefined:schema.accountSelect });
    if (!existing) throw new AppError("Account not found", 404);
    assertMediaChange(existing.avatarUrl,input.avatarUrl);
    if(schema.financial && await tx.tradePerformance.findFirst({where:{accountId:id},select:{tradeId:true}}) && ((input.currency!==undefined&&input.currency!==existing.currency)||(input.accountType!==undefined&&input.accountType!==existing.accountType)))throw new FinancialError("DENOMINATION_FROZEN","Financial account identity cannot be reinterpreted");
    const identityChanged=(input.currency!==undefined&&input.currency!==existing.currency)||(input.accountType!==undefined&&input.accountType!==existing.accountType);
    return tx.tradingAccount.update({ where: { id }, data: {...input,...(schema.financial&&identityChanged?{settlementUnitKey:null,unitsPerMajor:null,denominationLabel:null,denominationEvidence:Prisma.DbNull}:{})},select:schema.financial?undefined:schema.accountSelect });
  });
}

export async function setCurrentAccount(userId: string, id: string) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    const account = await tx.tradingAccount.findFirst({ where: { id, userId },select:{id:true} });
    if (!account) throw new AppError("Account not found", 404);
    await tx.tradingAccount.updateMany({ where: { userId, isCurrent: true }, data: { isCurrent: false } });
    return tx.tradingAccount.update({ where: { id }, data: { isCurrent: true },select:schema.financial?undefined:schema.accountSelect });
  });
}

export async function deleteAccount(userId: string, id: string, newCurrentAccountId?: string) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    const existing = await tx.tradingAccount.findFirst({ where: { id, userId },select:schema.financial?undefined:schema.accountSelect });
    if (!existing) throw new AppError("Account not found", 404);
    // This check and all trade writes take the same user lock.
    if (await tx.trade.count({ where: { accountId: id } }) > 0) {
      throw new AppError("Cannot delete an account with trades", 409);
    }
    if (existing.isCurrent) {
      const other = await tx.tradingAccount.findFirst({ where: { userId, id: { not: id } },select:{id:true} });
      if (other) {
        if (!newCurrentAccountId || newCurrentAccountId === id) {
          throw new AppError("Select a different replacement current account", 400);
        }
        const replacement = await tx.tradingAccount.findFirst({ where: { id: newCurrentAccountId, userId },select:{id:true} });
        if (!replacement) throw new AppError("Invalid newCurrentAccountId", 400);
        await tx.tradingAccount.updateMany({ where: { userId, isCurrent: true }, data: { isCurrent: false } });
        await tx.tradingAccount.update({ where: { id: newCurrentAccountId }, data: { isCurrent: true },select:schema.financial?undefined:schema.accountSelect });
      }
    }
    await tx.tradingAccount.delete({ where: { id },select:{id:true} });
  });
}
