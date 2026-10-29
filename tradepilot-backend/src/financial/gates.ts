import type {Prisma} from '@prisma/client';
import prisma from '../config/prisma';
import {env} from '../config/env';
export function writesEnabled(){return env.financialWritesEnabled === true && (env.nodeEnv!=='production'||env.financialPolicy==='v11-linear-1');}
export async function financialStorageWritable(db:Pick<Prisma.TransactionClient,'$queryRaw'>=prisma){
 if(!writesEnabled())return false;
 if(env.nodeEnv!=='production')return true;
 // Check ALL privileges separately: PostgreSQL comma-separated lists mean ANY.
 const rows=await db.$queryRaw<Array<{allowed:boolean}>>`
 SELECT bool_and(has_table_privilege(current_user,format('public.%I',t.name),p.privilege)) AS allowed
 FROM (VALUES ('TradePerformance'),('TradeExecution'),('TradeCharge')) t(name)
 CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(privilege)`;
 return rows[0]?.allowed===true;
}
