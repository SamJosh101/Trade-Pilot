import prisma from "../config/prisma";
import { AppError } from "../utils/AppError";
import { AccountInput, AccountUpdateInput } from "../types/dto";

export async function getAllAccounts(userId: string) {
  return prisma.tradingAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
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
