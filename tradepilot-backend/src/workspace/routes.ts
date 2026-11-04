import {Router} from 'express';
import {z} from 'zod';
import prisma from '../config/prisma';
import {authMiddleware} from '../middleware/authMiddleware';
import {AppError} from '../utils/AppError';
import {withUserLock} from '../utils/withUserLock';
import {project} from '../financial/service';
import {dec,canonical} from '../financial/decimal';
const normalize=(v:ReturnType<typeof dec>)=>{const value=canonical(v);if(value===null)throw new AppError('Report precision limit exceeded',422);return value;};

const router=Router();
router.use(authMiddleware,(_q,r,n)=>{r.setHeader('Cache-Control','no-store');n();});
const endpoint=(fn:(q:any)=>Promise<unknown>)=>(q:any,r:any,n:any)=>{Promise.resolve().then(()=>fn(q)).then(v=>r.json(v)).catch(n);};
const text=(max:number)=>z.string().max(max).refine(v=>!v.includes('\0'));
const preferences=z.object({theme:z.enum(['pitch','soft','light']),density:z.enum(['comfortable','compact']),accent:z.enum(['blue','green','ice']),reduceMotion:z.boolean(),defaultTimeframe:text(40).optional(),defaultDirection:z.enum(['BUY','SELL']).optional()}).strict();
const strategy=z.object({timeframe:text(100),pairs:text(200),conditions:text(5000),entryRules:text(5000),riskRules:text(5000),exitRules:text(5000),tags:z.array(text(40)).max(20)}).strict();
const note=z.object({pinned:z.boolean(),tags:z.array(text(40)).max(20),strategyId:z.string().uuid().nullable()}).strict();
const session=z.object({session:text(100),pairs:text(200),timeframe:text(100),answers:z.record(z.string().uuid(),z.boolean()),startedAt:z.iso.datetime().nullable(),sessionDate:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(v=>{const date=new Date(v+'T00:00:00Z');return Number.isFinite(+date)&&date.toISOString().slice(0,10)===v;})}).strict();
async function ready(){return (await prisma.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."WorkspaceEntry"') IS NOT NULL AS ready`)[0]?.ready===true;}
async function owned(tx:any,userId:string,key:string){const [kind,id]=key.split(':');if(key==='preferences')return;if(!z.uuid().safeParse(id).success||!['strategy','note','gameplan'].includes(kind))throw new AppError('Invalid workspace key',400);const row=await tx[kind].findFirst({where:{id,userId},select:{id:true}});if(!row)throw new AppError('Record not found',404);}
router.get('/capabilities',endpoint(async()=>({protocol:'workspace-v1',available:await ready()})));
router.get('/pairs',endpoint(async q=>{const parsed=z.object({accountId:z.string().uuid()}).strict().safeParse(q.query);if(!parsed.success)throw new AppError('Choose an account',400);if(!await prisma.tradingAccount.findFirst({where:{id:parsed.data.accountId,userId:q.user.id},select:{id:true}}))throw new AppError('Account not found',404);return {items:await prisma.trade.findMany({where:{accountId:parsed.data.accountId,userId:q.user.id},select:{pair:true},distinct:['pair'],orderBy:{pair:'asc'}})};}));
router.get('/entries',endpoint(async q=>{if(!await ready())throw new AppError('Workspace preferences require the additive workspace migration',503);return {items:await prisma.$queryRaw`SELECT key,value,revision FROM "WorkspaceEntry" WHERE "userId"=${q.user.id}`};}));
router.put('/entries/:key',endpoint(async q=>{
 if(!await ready())throw new AppError('Workspace preferences are unavailable',503);
 const key=String(q.params.key),kind=key.split(':')[0],schema=key==='preferences'?preferences:kind==='strategy'?strategy:kind==='note'?note:kind==='gameplan'?session:null;
 if(!schema)throw new AppError('Invalid workspace key',400);
 const input=z.object({revision:z.number().int().min(-1).max(2147483646),value:schema}).strict().safeParse(q.body);
 if(!input.success)throw new AppError(input.error.issues[0].message,422);
 return withUserLock(q.user.id,async tx=>{
  await owned(tx,q.user.id,key);
  if(kind==='note'&&(input.data.value as z.infer<typeof note>).strategyId)await owned(tx,q.user.id,`strategy:${(input.data.value as z.infer<typeof note>).strategyId}`);
  if(kind==='gameplan'){const plan=await tx.gameplan.findFirst({where:{id:key.split(':')[1],userId:q.user.id},include:{items:true}});if(!plan||Object.keys((input.data.value as z.infer<typeof session>).answers).some(id=>!plan.items.some(i=>i.id===id)))throw new AppError('Checklist contains an unknown rule',422);}
  const current=(await tx.$queryRaw<Array<{revision:number}>>`SELECT revision FROM "WorkspaceEntry" WHERE "userId"=${q.user.id} AND key=${key}`)[0];
  if((current?.revision??-1)!==input.data.revision)throw new AppError('Preferences changed elsewhere. Reload before saving.',409);
  const value=JSON.stringify(input.data.value);
  return (await tx.$queryRaw`INSERT INTO "WorkspaceEntry"("userId",key,value) VALUES(${q.user.id},${key},${value}::jsonb) ON CONFLICT("userId",key) DO UPDATE SET value=EXCLUDED.value,revision="WorkspaceEntry".revision+1,"updatedAt"=now() RETURNING key,value,revision` as unknown[])[0];
 });
}));

const reportQuery=z.object({accountId:z.string().uuid(),from:z.iso.datetime().optional(),to:z.iso.datetime().optional()}).strict();
router.get('/report',endpoint(async q=>{
 const parsed=reportQuery.safeParse(q.query);if(!parsed.success)throw new AppError('Choose an account and valid report dates',400);const {accountId,from,to}=parsed.data;
 if(from&&to&&from>=to)throw new AppError('Report start must precede end',400);
 return prisma.$transaction(async tx=>{
  const account=await tx.tradingAccount.findFirst({where:{id:accountId,userId:q.user.id}});if(!account)throw new AppError('Account not found',404);
  const rows=await tx.trade.findMany({where:{accountId,userId:q.user.id},include:{account:true,performance:{include:{executions:{orderBy:{id:'asc'}},charges:{orderBy:{id:'asc'}}}}},orderBy:[{createdAt:'asc'},{id:'asc'}],take:10001});
  if(rows.length>10000)throw new AppError('Report exceeds 10,000 records. Narrow account history using the trade journal.',413);
  const records=rows.map(t=>{const p=project(t);return {id:t.id,pair:t.pair,direction:t.direction,createdAt:t.createdAt.toISOString(),closedAt:p.performance?.closedAt??null,initialRisk:p.performance?.initialRiskAmount??null,...p.derived};});
  const eligible=records.filter(r=>r.status==='CLOSED'&&r.closedAt&&(!from||r.closedAt>=from)&&(!to||r.closedAt<to));
  const units=[...new Set(eligible.map(r=>r.moneyUnitKey).filter((v):v is string=>!!v))];
  const groups=units.map(unit=>{
   const items=eligible.filter(r=>r.moneyUnitKey===unit),known=items.filter(r=>r.netPnl!==null),rs=items.filter(r=>r.realizedR!==null);
   const sum=(values:string[])=>values.reduce((s,v)=>s.plus(dec(v)),dec('0'));
   const net=sum(known.map(r=>r.netPnl!)),profits=sum(known.filter(r=>dec(r.netPnl!).gt(0)).map(r=>r.netPnl!)),losses=sum(known.filter(r=>dec(r.netPnl!).lt(0)).map(r=>r.netPnl!)).abs();
   const wins=known.filter(r=>dec(r.netPnl!).gt(0)).length,loss=known.filter(r=>dec(r.netPnl!).lt(0)).length,breakeven=known.length-wins-loss;
   const buckets=new Map<string,typeof known>();for(const r of known){const day=r.closedAt!.slice(0,10);buckets.set(day,[...(buckets.get(day)??[]),r]);}
   let cumulative=dec('0');const daily=[...buckets].sort(([a],[b])=>a.localeCompare(b)).map(([date,items])=>{const n=sum(items.map(r=>r.netPnl!));cumulative=cumulative.plus(n);return {date,net:normalize(n),cumulative:normalize(cumulative),count:items.length};});
   const pairs=[...new Set(items.map(r=>r.pair))].map(pair=>{const values=known.filter(r=>r.pair===pair);return {pair,count:items.filter(r=>r.pair===pair).length,known:values.length,net:values.length?normalize(sum(values.map(r=>r.netPnl!))):null};});
   return {unit,net:known.length?normalize(net):null,meanR:rs.length?normalize(sum(rs.map(r=>r.realizedR!)).div(rs.length)):null,winRate:known.length?normalize(dec(String(wins)).times(100).div(known.length)):null,profitFactor:losses.gt(0)?normalize(profits.div(losses)):null,profitFactorReason:losses.eq(0)?'No recorded losses':null,wins,losses:loss,breakeven,closed:items.length,known:known.length,knownR:rs.length,daily,pairs};
  });
  return {protocol:'workspace-report-v1',dateBasis:'Actual close date · UTC',groups,records,coverage:{total:rows.length,eligible:eligible.length,unknown:records.filter(r=>!r.status).length,undated:records.filter(r=>r.status==='CLOSED'&&!r.closedAt).length,open:records.filter(r=>r.status==='OPEN').length,partial:records.filter(r=>r.status==='PARTIAL').length}};
 },{isolationLevel:'RepeatableRead',timeout:30000});
}));
export default router;
