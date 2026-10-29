import {createHmac,timingSafeEqual} from 'node:crypto';
import {Prisma} from '@prisma/client';
import {env} from '../config/env';
import {withUserLock} from '../utils/withUserLock';
import {databaseCompatibility} from '../utils/schemaCompatibility';
import {expectedRevision,compareRevision} from '../financial/revision';
import {FinancialError} from '../financial/errors';
import {z} from 'zod';
import {financialStorageWritable} from '../financial/gates';
const bodySchema=z.object({confirmationToken:z.string().max(1024),confirmed:z.literal(true)}).strict();
const fail=(code:string,message:string,status=409):never=>{throw new FinancialError(code,message,status);};
async function storage(){const schema=await databaseCompatibility();if(!schema.financial)fail('DELETION_SCHEMA_UNAVAILABLE','Revision-aware deletion is unavailable on this schema',503);return schema;}
async function impact(tx:Prisma.TransactionClient,userId:string,id:string){
 const trade=await tx.trade.findFirst({where:{id,userId},select:{id:true,userId:true,accountId:true,pair:true,revision:true}});if(!trade)fail('TRADE_NOT_FOUND','Trade not found',404);
 const tables=await tx.$queryRaw<Array<{name:string}>>`SELECT table_name AS name FROM information_schema.tables WHERE table_schema='public' AND table_name IN ('Note','TradeGameplanSnapshot','TradeStrategyAssignment','MediaAsset')`;
 const hasNotes=tables.some(t=>t.name==='Note'),hasChecklist=tables.some(t=>t.name==='TradeGameplanSnapshot');
 const notes=hasNotes?await tx.note.findMany({where:{tradeId:id},orderBy:{id:'asc'},take:1001,select:{id:true,userId:true,accountId:true,title:true,revision:true}}):[];
 if(notes.length>1000)fail('TOO_MANY_LINKED_NOTES','Unlink Notes individually before preparing deletion',413);
 if(notes.some(n=>n.userId!==userId||n.accountId!==trade!.accountId))fail('OWNERSHIP_INTEGRITY','Linked Note ownership is inconsistent; deletion stopped');
 const snapshot=hasChecklist?await tx.tradeGameplanSnapshot.findUnique({where:{tradeId:id},select:{id:true,userId:true,accountId:true,revision:true}}):null;
 if(snapshot&&(snapshot.userId!==userId||snapshot.accountId!==trade!.accountId))fail('OWNERSHIP_INTEGRITY','Checklist ownership is inconsistent; deletion stopped');
 const hasStrategies=tables.some(t=>t.name==='TradeStrategyAssignment');
 const strategyAssignments=hasStrategies?await tx.tradeStrategyAssignment.count({where:{tradeId:id}}):0;
 if(hasStrategies&&strategyAssignments!==await tx.tradeStrategyAssignment.count({where:{tradeId:id,userId,accountId:trade!.accountId}}))fail('OWNERSHIP_INTEGRITY','Strategy assignment ownership is inconsistent');
 const strategy=hasStrategies?await tx.tradeStrategyAssignment.findFirst({where:{tradeId:id,userId,endedAt:null},select:{id:true,strategyId:true,strategyRevision:true,strategyName:true,assignedAt:true}}):null;
 const counts={strategyAssignments,checklists:snapshot?1:0,performance:await tx.tradePerformance.count({where:{tradeId:id}}),executions:await tx.tradeExecution.count({where:{tradeId:id}}),charges:await tx.tradeCharge.count({where:{tradeId:id}}),notes:notes.length};
 const hasMedia=tables.some(t=>t.name==='MediaAsset');
 const mediaCount=hasMedia?(await tx.$queryRaw<Array<{n:number}>>`SELECT count(*)::int n FROM "MediaAsset" WHERE "tradeId"=${id} AND "userId"=${userId}`)[0].n:0;
 return {trade:trade!,notes,snapshot,counts:{...counts,managedImages:mediaCount},hasChecklist,hasStrategies,hasMedia,strategy};
}
type Impact=Awaited<ReturnType<typeof impact>>;
const digest=(s:string)=>createHmac('sha256',env.jwtSecret).update(`trade-deletion-v2:${s}`).digest('base64url');
const signature=(p:Impact)=>digest(JSON.stringify([p.trade,p.counts,p.notes,p.snapshot,p.strategy]));
function token(p:Impact){const data=Buffer.from(JSON.stringify({expires:Date.now()+10*60*1000,signature:signature(p)})).toString('base64url');return `${data}.${digest(data)}`;}
function confirmed(p:Impact,body:unknown){const parsed=bodySchema.safeParse(body);if(!parsed.success)fail('CONFIRMATION_REQUIRED','Preview and explicitly confirm this operation',428);try{const [data,sig,...extra]=parsed.data!.confirmationToken.split('.');const expected=digest(data);if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const v=JSON.parse(Buffer.from(data,'base64url').toString());if(v.expires<Date.now()||v.signature!==signature(p))throw Error();}catch{fail('DELETION_PREVIEW_CHANGED','Linked data or the preview changed. Inspect a fresh confirmation before retrying');}}
async function financialAllowed(p:Impact,tx:Prisma.TransactionClient){return !(p.counts.performance||p.counts.executions||p.counts.charges)||await financialStorageWritable(tx);}
export async function preview(userId:string,id:string){await storage();return withUserLock(userId,async tx=>{const p=await impact(tx,userId,id),allowed=await financialAllowed(p,tx);return {protocol:'trade-deletion-v2',trade:{id:p.trade.id,accountId:p.trade.accountId,pair:p.trade.pair,revision:p.trade.revision},counts:p.counts,strategy:p.strategy,notes:p.notes.slice(0,20).map(({userId,...n})=>n),notesShown:Math.min(p.notes.length,20),confirmationToken:token(p),canDelete:p.counts.notes===0&&allowed,financialDeletionEnabled:allowed};});}
export async function unlinkNotes(userId:string,id:string,body:unknown,header:unknown){await storage();return withUserLock(userId,async tx=>{const p=await impact(tx,userId,id);compareRevision(expectedRevision(id,header,undefined),p.trade.revision);confirmed(p,body);const result=await tx.note.updateMany({where:{tradeId:id,userId},data:{tradeId:null,revision:{increment:1}}});if(result.count!==p.notes.length)fail('DELETION_PREVIEW_CHANGED','Linked Notes changed');return {unlinked:result.count,notesPreserved:true};});}
export async function remove(userId:string,id:string,body:unknown,header:unknown){await storage();return withUserLock(userId,async tx=>{
 const p=await impact(tx,userId,id);compareRevision(expectedRevision(id,header,undefined),p.trade.revision);confirmed(p,body);
 if(p.counts.notes)fail('LINKED_NOTES_PROTECTED','Linked Notes are preserved. Separately confirm unlinking before deleting this trade');
 if(!await financialAllowed(p,tx))fail('FINANCIAL_WRITES_DISABLED','Financial deletion is disabled on this backend',503);
 await tx.trade.update({where:{id},data:{revision:{increment:1}}});
 if(p.hasMedia)await tx.$executeRaw`UPDATE "MediaAsset" SET state=CASE WHEN state='DELETED' THEN 'DELETED' ELSE 'RETIRED' END,"tradeId"=NULL,"accountId"=NULL,"updatedAt"=now() WHERE "tradeId"=${id} AND "userId"=${userId}`;
 if(p.hasStrategies)await tx.tradeStrategyAssignment.deleteMany({where:{tradeId:id,userId}});
 if(p.hasChecklist)await tx.tradeGameplanSnapshot.deleteMany({where:{tradeId:id,userId}});
 await tx.tradeCharge.deleteMany({where:{tradeId:id}});
 await tx.tradeExecution.deleteMany({where:{tradeId:id}});
 await tx.tradePerformance.deleteMany({where:{tradeId:id}});
 await tx.trade.delete({where:{id}});
 },{timeout:30000});}
