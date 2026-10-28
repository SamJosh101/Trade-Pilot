import {Prisma} from '@prisma/client';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import prisma from '../config/prisma';
import {env} from '../config/env';
import {withUserLock} from '../utils/withUserLock';
import {AppError} from '../utils/AppError';
import {revision as noteRevision} from '../notes/service';
import type {PlanInput} from './schemas';

export class GameplanError extends AppError {
 constructor(public code:string,message:string,status=400){super(message,status);Object.setPrototypeOf(this,GameplanError.prototype);}
}
const fail=(code:string,message:string,status=400):never=>{throw new GameplanError(code,message,status);};
export const etag=(kind:'gameplan'|'checklist',id:string,rev:number)=>`"${kind}:${id}:${rev}"`;
export function revision(kind:'gameplan'|'checklist'|'trade',id:string,header:unknown){
 if(typeof header!=='string')return fail('PRECONDITION_REQUIRED','Inspect the current revision before saving',428);
 // Reuse the exact integer/identity validation used by Notes; only the resource prefix differs.
 if(!header.startsWith(`"${kind}:`))return fail('INVALID_PRECONDITION','Invalid revision',400);
 return noteRevision('note',id,header.replace(`"${kind}:`,'"note:'));
}
function same(expected:number,current:number){if(expected!==current)fail('REVISION_CONFLICT','This record changed elsewhere. Your draft is preserved; inspect the latest saved version.',409);}
export async function available(){
 const rows=await prisma.$queryRaw<Array<{table_name:string;column_name:string}>>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('Gameplan','GameplanItem','TradeGameplanSnapshot')`;
 const expected={Gameplan:['id','userId','name','description','revision','archivedAt','createdAt','updatedAt','requestKey','creationHash'],GameplanItem:['id','gameplanId','userId','label','position','required'],TradeGameplanSnapshot:['id','tradeId','accountId','userId','templateId','templateRevision','templateName','templateDescription','itemsJson','answersJson','revision','createdAt','updatedAt']};
 if(!Object.entries(expected).every(([t,cols])=>cols.every(c=>rows.some(r=>r.table_name===t&&r.column_name===c))))return false;
 const checks=await prisma.$queryRaw<Array<{n:number}>>`SELECT count(*)::int n FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('Snapshot_trade_owner_fkey','Snapshot_account_owner_fkey','Snapshot_template_owner_fkey','GameplanItem_gameplanId_userId_fkey','Snapshot_valid')`;
 const triggers=await prisma.$queryRaw<Array<{n:number}>>`SELECT count(*)::int n FROM pg_trigger WHERE tgname='gameplan_snapshot_guard' AND tgenabled IN ('O','A') AND NOT tgisinternal`;
 return checks[0]?.n===5&&triggers[0]?.n===1;
}
const include={items:{orderBy:{position:'asc' as const}}};
function project(p:any){const {userId,requestKey,creationHash,...rest}=p;return {...rest,items:rest.items?.map(({gameplanId,userId,...i}:any)=>i)};}
async function owned(tx:Prisma.TransactionClient,userId:string,id:string){const p=await tx.gameplan.findFirst({where:{id,userId},include});if(!p)fail('NOT_FOUND','Gameplan not found',404);return p!;}
export async function get(userId:string,id:string){return project(await owned(prisma,userId,id));}
const mac=(s:string)=>createHmac('sha256',env.jwtSecret).update('gameplans-v1:'+s).digest('base64url');
export async function list(userId:string,q:{q?:string;state:string;sort:string;limit:number;cursor?:string}){
 const scope=JSON.stringify([userId,q.q??'',q.state,q.sort]),field=q.sort==='name'?'name':'updatedAt',direction=q.sort==='name'?'asc':'desc';let after:{id:string;value:string}|null=null;
 if(q.cursor)try{const [data,sig,...extra]=q.cursor.split('.');const expected=mac(data);if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const c=JSON.parse(Buffer.from(data,'base64url').toString());if(c.scope!==scope||typeof c.id!=='string'||typeof c.value!=='string')throw Error();after=c;}catch{fail('INVALID_CURSOR','Refresh this gameplan list',400);}
 const where:Prisma.GameplanWhereInput={userId,...(q.state==='active'?{archivedAt:null}:q.state==='archived'?{archivedAt:{not:null}}:{}),...(q.q?{OR:[{name:{contains:q.q,mode:'insensitive'}},{description:{contains:q.q,mode:'insensitive'}}]}:{})};
 if(after){const value=field==='name'?after.value:new Date(after.value);where.AND=[{OR:[{[field]:{[direction==='asc'?'gt':'lt']:value}},{[field]:value,id:{[direction==='asc'?'gt':'lt']:after.id}}]}];}
 const rows=await prisma.gameplan.findMany({where,orderBy:[{[field]:direction},{id:direction}],take:q.limit+1,select:{id:true,name:true,description:true,revision:true,archivedAt:true,createdAt:true,updatedAt:true,_count:{select:{items:true}}}});const items=rows.slice(0,q.limit),last=items[items.length-1];let cursor=null;
 if(rows.length>q.limit&&last){const data=Buffer.from(JSON.stringify({scope,id:last.id,value:field==='name'?last.name:last.updatedAt.toISOString()})).toString('base64url');cursor=`${data}.${mac(data)}`;}
 return {items,nextCursor:cursor};
}
function duplicateId(key:unknown,id:string){const bytes=createHash('sha256').update(`${String(key)}:${id}`).digest().subarray(0,16);bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const s=bytes.toString('hex');return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;}
async function createInside(tx:Prisma.TransactionClient,userId:string,input:PlanInput,key:unknown,source?:string){
 if(typeof key!=='string'||!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(key))fail('IDEMPOTENCY_KEY_REQUIRED','A UUID creation request key is required');
 const fingerprint=createHash('sha256').update(JSON.stringify([input,source??null])).digest('hex');
 const existing=await tx.gameplan.findUnique({where:{userId_requestKey:{userId,requestKey:key as string}},include});
 if(existing){if(existing.creationHash!==fingerprint)fail('IDEMPOTENCY_CONFLICT','This request already saved different content. Inspect it before creating another.',409);return project(existing);}
 const {items,...fields}=input;const created=await tx.gameplan.create({data:{...fields,userId,requestKey:key as string,creationHash:fingerprint}});await tx.gameplanItem.createMany({data:items.map((i,position)=>({...i,userId,gameplanId:created.id,position}))});return project(await owned(tx,userId,created.id));
}
export const create=(userId:string,input:PlanInput,key:unknown)=>withUserLock(userId,tx=>createInside(tx,userId,input,key));
export const update=(userId:string,id:string,input:PlanInput,header:unknown)=>withUserLock(userId,async tx=>{
 const p=await owned(tx,userId,id);same(revision('gameplan',id,header),p.revision);if(p.archivedAt)fail('ARCHIVED','Archived gameplans are read-only; duplicate to create an active plan.',409);
 // Reused IDs must already belong to this template; new UUIDs cannot capture another template's item.
 const ids=await tx.gameplanItem.findMany({where:{id:{in:input.items.map(i=>i.id)}},select:{id:true,gameplanId:true}});if(ids.some(i=>i.gameplanId!==id))fail('INVALID_ITEM','A rule ID belongs to another template',404);
 await tx.gameplanItem.deleteMany({where:{gameplanId:id,userId}});
 await tx.gameplan.update({where:{id},data:{name:input.name,description:input.description,revision:{increment:1}}});await tx.gameplanItem.createMany({data:input.items.map((i,position)=>({...i,userId,gameplanId:id,position}))});return project(await owned(tx,userId,id));
});
export const archive=(userId:string,id:string,header:unknown)=>withUserLock(userId,async tx=>{const p=await owned(tx,userId,id);same(revision('gameplan',id,header),p.revision);if(p.archivedAt)return project(p);return project(await tx.gameplan.update({where:{id},data:{archivedAt:new Date(),revision:{increment:1}},include}));});
export const duplicate=(userId:string,id:string,name:string,header:unknown,key:unknown)=>withUserLock(userId,async tx=>{const p=await owned(tx,userId,id);same(revision('gameplan',id,header),p.revision);return createInside(tx,userId,{name,description:p.description,items:p.items.map(i=>({id:duplicateId(key,i.id),label:i.label,required:i.required}))},key,id);});
export async function checklist(userId:string,tradeId:string){
 return withUserLock(userId,async tx=>{const t=await tx.trade.findFirst({where:{id:tradeId,userId},select:{id:true,accountId:true,revision:true}});if(!t)fail('NOT_FOUND','Trade not found',404);const s=await tx.tradeGameplanSnapshot.findFirst({where:{tradeId,userId}});return {tradeRevision:t!.revision,accountId:t!.accountId,snapshot:s?project(s):null};});
}
export const attach=(userId:string,tradeId:string,input:{templateId:string;templateRevision:number},header:unknown)=>withUserLock(userId,async tx=>{
 const t=await tx.trade.findFirst({where:{id:tradeId,userId}});if(!t)fail('NOT_FOUND','Trade not found',404);const p=await owned(tx,userId,input.templateId);
 same(revision('trade',tradeId,header),t!.revision);same(input.templateRevision,p.revision);if(p.archivedAt)fail('ARCHIVED','Choose an active gameplan',409);if(!p.items.length)fail('EMPTY_GAMEPLAN','Add at least one rule');
 if(await tx.tradeGameplanSnapshot.findUnique({where:{tradeId}}))fail('ALREADY_ATTACHED','This trade already has an immutable primary checklist',409);
 const items=p.items.map(({id,label,position,required})=>({id,label,position,required}));
 const s=await tx.tradeGameplanSnapshot.create({data:{tradeId,accountId:t!.accountId,userId,templateId:p.id,templateRevision:p.revision,templateName:p.name,templateDescription:p.description,itemsJson:items,answersJson:Object.fromEntries(items.map(i=>[i.id,false]))}});
 const updated=await tx.trade.update({where:{id:tradeId},data:{revision:{increment:1}},select:{revision:true}});return {snapshot:project(s),tradeRevision:updated.revision,accountId:t!.accountId};
});
export const answer=(userId:string,tradeId:string,answers:Record<string,boolean>,header:unknown,tradeHeader:unknown)=>withUserLock(userId,async tx=>{
 const t=await tx.trade.findFirst({where:{id:tradeId,userId},select:{id:true,revision:true,accountId:true}});if(!t)fail('NOT_FOUND','Trade not found',404);const s=await tx.tradeGameplanSnapshot.findFirst({where:{tradeId,userId}});if(!s)fail('NOT_FOUND','Checklist not found',404);
 same(revision('checklist',s!.id,header),s!.revision);same(revision('trade',tradeId,tradeHeader),t!.revision);
 const items=s!.itemsJson as Array<{id:string}>;if(items.length!==Object.keys(answers).length||items.some(i=>typeof answers[i.id]!=='boolean'))fail('INVALID_ANSWERS','Answers must exactly match the historical checklist');
 const snapshot=await tx.tradeGameplanSnapshot.update({where:{id:s!.id},data:{answersJson:answers,revision:{increment:1}}});const updated=await tx.trade.update({where:{id:tradeId},data:{revision:{increment:1}},select:{revision:true}});return {snapshot:project(snapshot),tradeRevision:updated.revision,accountId:t!.accountId};
});
