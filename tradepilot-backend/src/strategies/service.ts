import {Prisma} from '@prisma/client';
import {createHash} from 'node:crypto';
import prisma from '../config/prisma';
import {withUserLock} from '../utils/withUserLock';
import {expectedRevision,compareRevision} from '../financial/revision';
import {FinancialError} from '../financial/errors';
import type {StrategyInput} from './schemas';
import * as cursor from './cursor';
const fail=(code:string,message:string,status=400):never=>{throw new FinancialError(code,message,status);};
export const etag=(id:string,revision:number)=>`"strategy:${id}:${revision}"`;
function version(id:string,header:unknown){if(header===undefined)fail('PRECONDITION_REQUIRED','Inspect the Strategy revision before saving',428);if(typeof header!=='string'||!header.startsWith('"strategy:'))fail('INVALID_PRECONDITION','Invalid Strategy revision');return expectedRevision(id,(header as string).replace('"strategy:','"trade:'),undefined);}
function publicStrategy<T extends {userId:string;requestKey:string|null;creationHash:string|null}>(p:T){const {userId,requestKey,creationHash,...rest}=p;return rest;}
function publicAssignment<T extends {userId:string}>(p:T){const {userId,...rest}=p;return rest;}
export async function available(){
 const columns=await prisma.$queryRaw<Array<{table_name:string;column_name:string}>>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Strategy','TradeStrategyAssignment')`;
 const required={Strategy:['id','userId','name','description','revision','archivedAt','createdAt','updatedAt','requestKey','creationHash'],TradeStrategyAssignment:['id','userId','tradeId','accountId','strategyId','strategyRevision','strategyName','strategyDescription','assignedAt','endedAt']};
 if(!Object.entries(required).every(([t,fields])=>fields.every(c=>columns.some(r=>r.table_name===t&&r.column_name===c))))return false;
 const protections=await prisma.$queryRaw<Array<{constraints:number;triggers:number;indexes:number}>>`SELECT
 (SELECT count(*)::int FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('Strategy_userId_fkey','TradeStrategyAssignment_tradeId_accountId_userId_fkey','TradeStrategyAssignment_strategyId_userId_fkey','TradeStrategyAssignment_accountId_userId_fkey','TradeStrategyAssignment_userId_fkey','StrategyAssignment_valid')) AS constraints,
 (SELECT count(*)::int FROM pg_trigger WHERE tgname='strategy_assignment_immutable' AND tgenabled IN ('O','A') AND NOT tgisinternal) AS triggers,
 (SELECT count(*)::int FROM pg_index i JOIN pg_class c ON c.oid=i.indexrelid WHERE c.relname='TradeStrategyAssignment_one_current' AND i.indisunique AND i.indisvalid AND i.indpred IS NOT NULL) AS indexes`;
 return protections[0]?.constraints===6&&protections[0]?.triggers===1&&protections[0]?.indexes===1;
}
async function owned(tx:Prisma.TransactionClient,userId:string,id:string){const p=await tx.strategy.findFirst({where:{id,userId}});if(!p)fail('NOT_FOUND','Strategy not found',404);return p!;}
export async function get(userId:string,id:string){return publicStrategy(await owned(prisma,userId,id));}
export async function list(userId:string,q:{q?:string;state:string;sort:string;limit:number;cursor?:string}){
 return prisma.$transaction(async tx=>{
  const scope=JSON.stringify([userId,'library',q.q??'',q.state,q.sort]),after=cursor.decode(q.cursor,scope),field=q.sort==='name'?'name':'updatedAt',direction=q.sort==='name'?'asc':'desc';
  const where:Prisma.StrategyWhereInput={userId,...(q.state==='active'?{archivedAt:null}:q.state==='archived'?{archivedAt:{not:null}}:{}),...(q.q?{OR:[{name:{contains:q.q,mode:'insensitive'}},{description:{contains:q.q,mode:'insensitive'}}]}:{})};
  if(after){const value=field==='name'?after.value:new Date(after.value);where.AND=[{OR:[{[field]:{[direction==='asc'?'gt':'lt']:value}},{[field]:value,id:{[direction==='asc'?'gt':'lt']:after.id}}]}];}
  const rows=await tx.strategy.findMany({where,orderBy:[{[field]:direction},{id:direction}],take:q.limit+1,include:{_count:{select:{assignments:true}}}}),items=rows.slice(0,q.limit),last=items[items.length-1];
  const counts=await tx.tradeStrategyAssignment.groupBy({by:['strategyId'],where:{userId,endedAt:null,strategyId:{in:items.map(p=>p.id)}},_count:{_all:true}});
  return {items:items.map(p=>{const {_count,...s}=publicStrategy(p);return {...s,currentTradeCount:counts.find(c=>c.strategyId===p.id)?._count._all??0,assignmentHistoryCount:_count.assignments};}),nextCursor:rows.length>q.limit&&last?cursor.encode(scope,last.id,field==='name'?last.name:last.updatedAt.toISOString()):null};
 },{isolationLevel:Prisma.TransactionIsolationLevel.RepeatableRead});
}
async function createInside(tx:Prisma.TransactionClient,userId:string,input:StrategyInput,key:unknown,source?:string){
 if(typeof key!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))fail('IDEMPOTENCY_KEY_REQUIRED','A UUID request key is required');
 const fingerprint=createHash('sha256').update(JSON.stringify([input,source??null])).digest('hex');
 const existing=await tx.strategy.findUnique({where:{userId_requestKey:{userId,requestKey:key as string}}});if(existing){if(existing.creationHash!==fingerprint)fail('IDEMPOTENCY_CONFLICT','This request already saved different content. Inspect the saved Strategy.',409);return publicStrategy(existing);}
 return publicStrategy(await tx.strategy.create({data:{...input,userId,requestKey:key as string,creationHash:fingerprint}}));
}
export const create=(userId:string,input:StrategyInput,key:unknown)=>withUserLock(userId,tx=>createInside(tx,userId,input,key));
export const update=(userId:string,id:string,input:StrategyInput,header:unknown)=>withUserLock(userId,async tx=>{const p=await owned(tx,userId,id);compareRevision(version(id,header),p.revision);if(p.archivedAt)fail('ARCHIVED','Archived Strategies are read-only; duplicate to create an active version',409);return publicStrategy(await tx.strategy.update({where:{id},data:{...input,revision:{increment:1}}}));});
export const archive=(userId:string,id:string,header:unknown)=>withUserLock(userId,async tx=>{const p=await owned(tx,userId,id);compareRevision(version(id,header),p.revision);if(p.archivedAt)return publicStrategy(p);return publicStrategy(await tx.strategy.update({where:{id},data:{archivedAt:new Date(),revision:{increment:1}}}));});
export const duplicate=(userId:string,id:string,name:string,header:unknown,key:unknown)=>withUserLock(userId,async tx=>{const p=await owned(tx,userId,id);compareRevision(version(id,header),p.revision);return createInside(tx,userId,{name,description:p.description},key,id);});
async function ownedTrade(tx:Prisma.TransactionClient,userId:string,tradeId:string){const t=await tx.trade.findFirst({where:{id:tradeId,userId},select:{id:true,accountId:true,revision:true}});if(!t)fail('NOT_FOUND','Trade not found',404);return t!;}
export const assignment=(userId:string,tradeId:string)=>withUserLock(userId,async tx=>{const t=await ownedTrade(tx,userId,tradeId),a=await tx.tradeStrategyAssignment.findFirst({where:{tradeId,userId,endedAt:null}});return {tradeRevision:t.revision,accountId:t.accountId,current:a?publicAssignment(a):null,historyCount:await tx.tradeStrategyAssignment.count({where:{tradeId,userId}})};});
export const assign=(userId:string,tradeId:string,input:{strategyId:string|null;strategyRevision:number|null},header:unknown)=>withUserLock(userId,async tx=>{
 const t=await ownedTrade(tx,userId,tradeId),s=input.strategyId?await owned(tx,userId,input.strategyId):null;
 compareRevision(expectedRevision(tradeId,header,undefined),t.revision);if(s){compareRevision(input.strategyRevision!,s.revision);if(s.archivedAt)fail('ARCHIVED','Choose an active Strategy',409);}
 const previous=await tx.tradeStrategyAssignment.findFirst({where:{tradeId,userId,endedAt:null}});
 if((!s&&!previous)||(s&&previous?.strategyId===s.id&&previous.strategyRevision===s.revision))return {tradeRevision:t.revision,accountId:t.accountId,current:previous?publicAssignment(previous):null,historyCount:await tx.tradeStrategyAssignment.count({where:{tradeId,userId}})};
 const now=new Date(Math.max(Date.now(),previous?.assignedAt.getTime()??0));
 if(previous)await tx.tradeStrategyAssignment.update({where:{id:previous.id},data:{endedAt:now}});
 const current=s?await tx.tradeStrategyAssignment.create({data:{userId,tradeId,accountId:t.accountId,strategyId:s.id,strategyRevision:s.revision,strategyName:s.name,strategyDescription:s.description,assignedAt:now}}):null;
 const updated=await tx.trade.update({where:{id:tradeId},data:{revision:{increment:1}},select:{revision:true}});
 return {tradeRevision:updated.revision,accountId:t.accountId,current:current?publicAssignment(current):null,historyCount:await tx.tradeStrategyAssignment.count({where:{tradeId,userId}})};
});
export const history=(userId:string,tradeId:string,q:{limit:number;cursor?:string})=>withUserLock(userId,async tx=>{await ownedTrade(tx,userId,tradeId);const scope=JSON.stringify([userId,'history',tradeId]),after=cursor.decode(q.cursor,scope),where:Prisma.TradeStrategyAssignmentWhereInput={userId,tradeId};if(after)where.OR=[{assignedAt:{lt:new Date(after.value)}},{assignedAt:new Date(after.value),id:{lt:after.id}}];const rows=await tx.tradeStrategyAssignment.findMany({where,orderBy:[{assignedAt:'desc'},{id:'desc'}],take:q.limit+1}),items=rows.slice(0,q.limit),last=items[items.length-1];return {items:items.map(publicAssignment),nextCursor:rows.length>q.limit&&last?cursor.encode(scope,last.id,last.assignedAt.toISOString()):null};});
export async function tradeList(userId:string,q:{accountId:string;strategyId:string;q?:string;sort:string;limit:number;cursor?:string}){
 const {list}=require('../tradeQuery/service') as typeof import('../tradeQuery/service');
 return list(userId,{...q,sort:q.sort as 'newest'|'oldest',dateBasis:'LOGGED',dateState:'ALL',timezone:'UTC'});
}
