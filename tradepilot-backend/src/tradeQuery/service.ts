import {Prisma} from '@prisma/client';
import prisma from '../config/prisma';
import {FinancialError} from '../financial/errors';
import {project} from '../financial/service';
import {CALCULATION_VERSION} from '../financial/calculate';
import type {Query} from './schemas';
import * as cursor from './cursor';
const include={account:true,performance:{include:{executions:true,charges:true}},strategyAssignments:{where:{endedAt:null}}} satisfies Prisma.TradeInclude;
const fail=(message:string,status=400):never=>{throw new FinancialError('TRADE_QUERY',message,status);};
async function predicate(tx:Prisma.TransactionClient,userId:string,q:Query){
 if(!await tx.tradingAccount.findFirst({where:{id:q.accountId,userId},select:{id:true}}))fail('Account not found',404);
 if(q.strategyId&&q.strategyId!=='unassigned'&&!await tx.strategy.findFirst({where:{id:q.strategyId,userId},select:{id:true}}))fail('Strategy not found',404);
 const valid={calculationVersion:CALCULATION_VERSION,source:{not:null}};
 const known:Prisma.TradeWhereInput={performance:{is:{...valid,status:'CLOSED',closedAt:{not:null}}}};
 const base:Prisma.TradeWhereInput={userId,accountId:q.accountId,AND:[...(q.q?[{pair:{contains:q.q.replace(/[\\%_]/g,'\\$&'),mode:'insensitive' as const}}]:[]),...(q.direction?[{direction:q.direction}]:[]),...(q.result?[{result:q.result==='UNRECORDED'?null:q.result}]:[]),...(q.status?[q.status==='UNKNOWN'?{OR:[{performance:{is:null}},{performance:{is:{status:null}}},{performance:{is:{calculationVersion:{not:CALCULATION_VERSION}}}},{performance:{is:{calculationVersion:null}}},{performance:{is:{source:null}}}]}:{performance:{is:{...valid,status:q.status}}}]:[]),...(q.timeframeMissing?[{OR:[{timeframe:null},{timeframe:''}]}]:q.timeframe!==undefined?[{timeframe:q.timeframe}]:[]),...(q.strategyId?[{strategyAssignments:q.strategyId==='unassigned'?{none:{userId,endedAt:null}}:{some:{userId,endedAt:null,strategyId:q.strategyId}}}]:[])]};
 const unknownDateCount=q.dateBasis==='ACTUAL_CLOSED'?await tx.trade.count({where:{AND:[base,{NOT:known}]}}):0;
 const where:Prisma.TradeWhereInput={AND:[base]};const conditions=where.AND as Prisma.TradeWhereInput[];
 if(q.dateState==='UNKNOWN')conditions.push(q.dateBasis==='LOGGED'?{id:{in:[]}}:{NOT:known});
 else if(q.dateBasis==='ACTUAL_CLOSED'&&(q.dateState==='KNOWN'||q.from||q.through))conditions.push(known);
 let bounds:{from:Date|null;to:Date|null}={from:null,to:null};
 if(q.from||q.through){const zones=await tx.$queryRaw<Array<{ok:boolean}>>`SELECT EXISTS(SELECT 1 FROM pg_timezone_names WHERE lower(name)=lower(${q.timezone})) AS ok`;if(!zones[0]?.ok)fail('Reporting timezone is not supported by this PostgreSQL server');const rows=await tx.$queryRaw<Array<{from:Date|null;to:Date|null}>>`SELECT (${q.from??null}::date::timestamp AT TIME ZONE ${q.timezone}) AS "from", ((${q.through??null}::date+1)::timestamp AT TIME ZONE ${q.timezone}) AS "to"`;bounds=rows[0];const range={...(bounds.from?{gte:bounds.from}:{}),...(bounds.to?{lt:bounds.to}:{})};conditions.push(q.dateBasis==='LOGGED'?{createdAt:range}:{performance:{is:{closedAt:range}}});}
 return {where,unknownDateCount,bounds};
}
function ordering(q:Query){return {field:q.sort.startsWith('symbol')?'pair':'createdAt',direction:q.sort==='oldest'||q.sort==='symbol'?'asc':'desc'} as const;}
function pageWhere(where:Prisma.TradeWhereInput,q:Query,userId:string){const {cursor:unused,...scopeQuery}=q;const scope=JSON.stringify([userId,scopeQuery]),after=cursor.decode(q.cursor,scope),{field,direction}=ordering(q);if(after){const value=field==='pair'?after.value:new Date(after.value);if(value instanceof Date&&isNaN(+value))fail('Invalid cursor date');where={AND:[where,{OR:[{[field]:{[direction==='asc'?'gt':'lt']:value}},{[field]:value,id:{[direction==='asc'?'gt':'lt']:after.id}}]}]};}return {where,scope};}
export async function list(userId:string,q:Query){return prisma.$transaction(async tx=>{
 await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '8s'");
 const {where:base,unknownDateCount,bounds}=await predicate(tx,userId,q),total=await tx.trade.count({where:base}),{where,scope}=pageWhere(base,q,userId),{field,direction}=ordering(q);
 const rows=await tx.trade.findMany({where,orderBy:[{[field]:direction},{id:direction}],take:q.limit+1,include}),items=rows.slice(0,q.limit),last=items[items.length-1];
 const financial=Object.fromEntries(items.map(t=>{const p=project(t);return [t.id,{tradeId:t.id,revision:t.revision,derived:p.derived}];}));
 return {items:items.map(({account,performance,userId,strategyAssignments,...t})=>({...t,entry:t.entry.toFixed(),sl:t.sl.toFixed(),tp:t.tp.toFixed(),rr:t.rr?.toFixed()??null,performance:performance?{status:financial[t.id].derived.status}:null,strategy:strategyAssignments[0]?{strategyId:strategyAssignments[0].strategyId,strategyName:strategyAssignments[0].strategyName,strategyRevision:strategyAssignments[0].strategyRevision}:null})),financial,total,unknownDateCount,bounds,timezone:q.timezone,dateBasis:q.dateBasis,nextCursor:rows.length>q.limit&&last?cursor.encode(scope,last.id,field==='pair'?last.pair:last.createdAt.toISOString()):null};
 },{isolationLevel:'RepeatableRead',timeout:15000});}
export const cell=(value:unknown)=>{let s=value===null||value===undefined?'UNKNOWN':String(value);if((/^[\s\u0000-\u001f\uFEFF]*[=+\-@＝＋－＠]/u.test(s)||/^[\t\r\n]/.test(s))&&!(typeof value==='string'&&/^-?\d+(\.\d+)?$/.test(value)))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
export async function exportCsv(userId:string,q:Query,scope:'ACCOUNT'|'MATCHING'){
 // A synchronous export is deliberately bounded; no partial CSV is returned.
 const selected:Query=scope==='ACCOUNT'?{accountId:q.accountId,dateBasis:'LOGGED',dateState:'ALL',timezone:'UTC',sort:'newest',limit:25}:{...q,cursor:undefined};
 return prisma.$transaction(async tx=>{await tx.$executeRawUnsafe("SET LOCAL statement_timeout = '20s'");const {where}=await predicate(tx,userId,selected),count=await tx.trade.count({where});if(count>10000)fail('Export exceeds10,000 trades. Narrow the filters; larger exports require a separately implemented snapshot job.',413);
 const headers=['Trade ID','Account ID','Symbol','Direction','Entry exact','SL exact','TP exact','Planned RR','Legacy result','Timeframe','Logged at UTC','Actual status','Actual closed at UTC','Actual net settlement','Actual realized R','Settlement identity','Actual scope','Actual readiness','Actual missing reasons','Current Strategy ID','Saved Strategy name','Saved Strategy revision','Account currency label','Account settlement identity','Account units per major','Account denomination','Journal notes','Screenshot URL'];
 const lines=[headers.map(cell).join(',')];let bytes=Buffer.byteLength('\uFEFF'+lines[0]+'\r\n');const {field,direction}=ordering(selected);let lastId:string|undefined;
 // ID cursor is safe inside this repeatable-read snapshot and fixed deterministic ordering.
 for(;;){const rows=await tx.trade.findMany({where,orderBy:[{[field]:direction},{id:direction}],take:250,...(lastId?{cursor:{id:lastId},skip:1}:{}),include});if(!rows.length)break;
 for(const t of rows){const a=t.strategyAssignments[0],p=project(t),d=p.derived;const line=[t.id,t.accountId,t.pair,t.direction,t.entry.toFixed(),t.sl.toFixed(),t.tp.toFixed(),t.rr?.toFixed()??null,t.result,t.timeframe,t.createdAt.toISOString(),d.status,p.performance?.closedAt??null,d.netPnl,d.realizedR,d.moneyUnitKey,d.scope,d.readiness,d.reasons.join(';'),a?.strategyId??null,a?.strategyName??null,a?.strategyRevision??null,t.account.currency,t.account.settlementUnitKey,t.account.unitsPerMajor?.toFixed()??null,t.account.denominationLabel,t.notes,t.imageUrl].map(cell).join(',');bytes+=Buffer.byteLength(line)+2;if(bytes>16*1024*1024)fail('Export exceeds16MiB. Narrow filters; no partial export was produced.',413);lines.push(line);}lastId=rows[rows.length-1]!.id;if(rows.length<250)break;}
 return '\uFEFF'+lines.join('\r\n')+'\r\n';},{isolationLevel:'RepeatableRead',timeout:30000,maxWait:5000});
}
