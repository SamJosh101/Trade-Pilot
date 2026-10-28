import {assertMediaChange} from '../security/media';
import * as deletion from './tradeDeletionService';
import { databaseCompatibility, writableJournalSchema, legacyTradeSelect } from '../utils/schemaCompatibility';
import { randomUUID } from 'node:crypto';
import {Prisma} from '@prisma/client';
import {FinancialError} from "../financial/errors";
import {expectedRevision,compareRevision} from '../financial/revision';
import {dec} from "../financial/decimal";
import prisma from "../config/prisma";
import { withUserLock } from "../utils/withUserLock";
import { AppError } from "../utils/AppError";
import { calculateRR } from "../utils/calculateRR";
import { TradeInput, TradeUpdateInput } from "../types/dto";

export async function getAllTrades(userId: string, accountId?: string) {
  const schema=await databaseCompatibility();
  const where: any = { userId };
  if (accountId) {
    where.accountId = accountId;
  }
  if(!schema.financial)return prisma.trade.findMany({where,orderBy:{createdAt:'desc'},select:schema.tradeSelect});
  return prisma.trade.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include:{performance:{select:{status:true}}},
  });
}

export async function getTradeById(userId: string, id: string) {
  const schema=await databaseCompatibility();
  // findFirst (not findUnique) so the userId filter is applied at the
  // database level — a trade that exists but belongs to someone else
  // looks identical to a trade that doesn't exist at all.
  const trade = await prisma.trade.findFirst({ where: { id, userId },select:schema.financial?undefined:schema.tradeSelect });
  if (!trade) throw new AppError("Trade not found", 404);
  return trade;
}

export async function createTrade(userId: string, input: TradeInput) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    // Validate that the account belongs to the user
    const account = await tx.tradingAccount.findFirst({
      where: { id: input.accountId, userId },select:{id:true},
    });
    if (!account) throw new AppError("Account not found", 404);

    assertMediaChange(null,input.imageUrl);
    const rr = calculateRR(input.direction, input.entry, input.sl, input.tp);
    if(!schema.financial){
      // Prisma supplies the new revision @default even when it is absent from
      // create.data. Insert only original columns on a verified legacy schema.
      // All values are bound parameters; ownership and the user lock stay above.
      const id=randomUUID();
      await tx.$executeRaw`INSERT INTO "Trade"
        (id,"userId","accountId",pair,direction,entry,sl,tp,rr,timeframe,result,notes,"imageUrl")
        VALUES (${id},${userId},${input.accountId},${input.pair},${input.direction}::"Direction",
          ${input.entry}::numeric,${input.sl}::numeric,${input.tp}::numeric,${rr}::numeric,
          ${input.timeframe??null},${input.result??null}::"Result",${input.notes??null},${input.imageUrl??null})`;
      return tx.trade.findFirstOrThrow({where:{id,userId},select:legacyTradeSelect});
    }
    return tx.trade.create({
      data: { ...input, entry:new Prisma.Decimal(String(input.entry)),sl:new Prisma.Decimal(String(input.sl)),tp:new Prisma.Decimal(String(input.tp)),rr, userId },select:schema.financial?undefined:legacyTradeSelect,
    });
  });
}

export async function updateTrade(userId: string, id: string, input: TradeUpdateInput, ifMatch?: unknown) {
  const schema=await writableJournalSchema();
  return withUserLock(userId, async (tx) => {
    const existing = await tx.trade.findFirst({ where: { id, userId }, select:{...legacyTradeSelect,...(schema.financial?{revision:true,performance:true}:{})} });
    if (!existing) throw new AppError("Trade not found", 404);
    assertMediaChange(existing.imageUrl,input.imageUrl);
    if(schema.financial&&existing.performance)throw new FinancialError("CLIENT_CAPABILITY_REQUIRED","Use revision-aware Version 1.1 editing for this trade");
    if([existing.entry,existing.sl,existing.tp].some(v=>dec(v).decimalPlaces()>5||dec(v).gt("99999.99999")))throw new FinancialError("CLIENT_CAPABILITY_REQUIRED","This trade requires exact-price Version 1.1 editing");
    if(schema.financial)compareRevision(expectedRevision(id,ifMatch,undefined),existing.revision!);

    if (input.accountId !== undefined) {
      const account = await tx.tradingAccount.findFirst({
        where: { id: input.accountId, userId },select:{id:true},
      });
      if (!account) throw new AppError("Account not found", 404);
    }

    const direction = input.direction ?? existing.direction;
    const entry = input.entry ?? Number(existing.entry);
    const sl = input.sl ?? Number(existing.sl);
    const tp = input.tp ?? Number(existing.tp);
    const pricesChanged = input.direction !== undefined || input.entry !== undefined || input.sl !== undefined || input.tp !== undefined;
    const rr = pricesChanged ? calculateRR(direction, entry, sl, tp) : existing.rr;

    return tx.trade.update({
      where: { id },
      data: { ...input,...(schema.financial?Object.fromEntries((['entry','sl','tp'] as const).filter(k=>input[k]!==undefined).map(k=>[k,new Prisma.Decimal(String(input[k]))])):{}), rr,...(schema.financial?{revision:{increment:1}}:{}) },select:schema.financial?undefined:legacyTradeSelect,
    });
  });
}

export async function deleteTrade(userId:string,id:string,body?:unknown,ifMatch?:unknown){
 const schema=await writableJournalSchema();
 if(schema.financial)return deletion.remove(userId,id,body,ifMatch);
 const existing=await prisma.trade.findFirst({where:{id,userId},select:legacyTradeSelect});
 if(!existing)throw new AppError('Trade not found',404);
 throw new FinancialError('DELETION_SCHEMA_UNAVAILABLE','Revision-aware deletion requires a compatible schema. No records were deleted.',503);
}
