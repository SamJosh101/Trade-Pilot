import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma';
import { AppError } from './AppError';

// Explicit legacy projections prevent the generated V1.1 client from selecting
// newly introduced columns merely because a normal journal endpoint is used.
export const legacyAccountSelect = {
  id:true,userId:true,name:true,broker:true,accountType:true,startingBalance:true,
  currency:true,isCurrent:true,avatarUrl:true,brokerId:true,brokerName:true,
  brokerLogo:true,createdAt:true,
} satisfies Prisma.TradingAccountSelect;
export const legacyTradeSelect = {
  id:true,userId:true,accountId:true,pair:true,direction:true,entry:true,sl:true,
  tp:true,rr:true,timeframe:true,result:true,notes:true,imageUrl:true,createdAt:true,
} satisfies Prisma.TradeSelect;

const financialColumns: Record<string,string[]> = {
  TradingAccount:['settlementUnitKey','unitsPerMajor','denominationLabel','denominationEvidence'],
  Trade:['revision'],
  TradePerformance:['tradeId','accountId','status','source','moneyUnitKey','initialRiskAmount','reportedGrossPnl','reportedNetPnl','costsComplete','openedAt','closedAt','instrumentSpec','provenance','calculationVersion','updatedAt'],
  TradeExecution:['id','tradeId','accountId','kind','price','quantity','executedAt','sequence','fxRateToAccount','fxEvidence','provider','externalDealId','externalOrderId','externalPositionId'],
  TradeCharge:['id','tradeId','accountId','executionId','kind','amount','unitKey','occurredAt','fxRateToAccount','fxEvidence','provider','externalComponentId'],
};
type Columns = {table_name:string;column_name:string};
export type SchemaCompatibility = {
  financial:boolean;
  legacyWritable:boolean;
  state:'legacy'|'v11'|'incomplete';
  accountSelect:Prisma.TradingAccountSelect;
  tradeSelect:Prisma.TradeSelect;
};
let pending:Promise<SchemaCompatibility>|undefined;

export function databaseCompatibility():Promise<SchemaCompatibility> {
  if(pending)return pending;
  // Read only catalog metadata. Never load dotenv here, alter a schema, repair
  // records, or treat a connection/permissions failure as an old database.
  pending=(async()=>{
    const rows=await prisma.$queryRaw<Columns[]>`
      SELECT table_name,column_name FROM information_schema.columns
      WHERE table_schema=current_schema()
        AND table_name IN ('TradingAccount','Trade','TradePerformance','TradeExecution','TradeCharge')`;
    const has=(table:string,col:string)=>rows.some(r=>r.table_name===table&&r.column_name===col);
    const entries=Object.entries(financialColumns);
    const legacyComplete=Object.keys(legacyAccountSelect).every(c=>has('TradingAccount',c))&&Object.keys(legacyTradeSelect).every(c=>has('Trade',c));
    const financial=legacyComplete&&entries.every(([t,cols])=>cols.every(c=>has(t,c)));
    const anyFinancial=entries.some(([t,cols])=>cols.some(c=>has(t,c)));
    const project=<T extends Record<string,true>>(table:string,fields:T)=>Object.fromEntries(Object.keys(fields).filter(c=>has(table,c)).map(c=>[c,true]));
    return {financial,state:financial?'v11':anyFinancial?'incomplete':'legacy',
      legacyWritable:financial||(!anyFinancial&&legacyComplete),
      accountSelect:project('TradingAccount',legacyAccountSelect),tradeSelect:project('Trade',legacyTradeSelect)} as SchemaCompatibility;
  })().finally(()=>{pending=undefined});
  return pending;
}

export async function writableJournalSchema() {
  const schema=await databaseCompatibility();
  if(!schema.legacyWritable)throw new AppError('Journal writes are unavailable because the database schema is incomplete. Existing records have not been changed.',503);
  return schema;
}
