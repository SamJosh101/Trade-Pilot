import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma';

// Serialize this user's account/trade writes so an account cannot be deleted
// between checking its trades and creating/moving a trade into it.
// No schema change; this locks only the existing user row for this transaction.
export function withUserLock<T>(userId: string, operation: (tx: Prisma.TransactionClient) => Promise<T>, options?: {timeout:number}): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`;
    return operation(tx);
  }, options);
}
