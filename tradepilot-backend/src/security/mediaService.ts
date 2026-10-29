import {createHash,randomUUID} from 'node:crypto';
import type {Prisma} from '@prisma/client';
import prisma from '../config/prisma';
import {env} from '../config/env';
import {AppError} from '../utils/AppError';
import {withUserLock} from '../utils/withUserLock';
import {validatedImage} from './imageValidation';
import {mediaProvider} from './cloudinaryProvider';
import {z} from 'zod';
type Asset={id:string;userId:string;purpose:string;targetKey:string;tradeId:string|null;accountId:string|null;requestKey:string;fingerprint:string;publicId:string;state:string;bytes:number};
const fail=(s:string,status=409):never=>{throw new AppError(s,status);};
const reference=(a:Asset)=>({id:a.id,purpose:a.purpose,bytes:a.bytes,contentPath:`/media/assets/${a.id}/content`});
export async function mediaStorage(){return(await prisma.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."MediaAsset"') IS NOT NULL AND to_regclass('public."FeatureUsage"') IS NOT NULL AS ready`)[0]?.ready===true;}
export async function mediaWritePermissions(db:Pick<Prisma.TransactionClient,'$queryRaw'>=prisma){
 if(env.nodeEnv!=='production')return true;
 return(await db.$queryRaw<Array<{allowed:boolean}>>`SELECT bool_and(has_table_privilege(current_user,format('public.%I',t.name),p.privilege)) allowed FROM (VALUES ('MediaAsset'),('FeatureUsage')) t(name) CROSS JOIN (VALUES ('SELECT'),('INSERT'),('UPDATE')) p(privilege)`)[0]?.allowed===true;
}
export async function capabilities(){return{uploads:env.mediaUploadsEnabled===true&&process.env.TRADEPILOT_MEDIA_PRIVATE_VERIFIED==='true'&&!!process.env.CLOUDINARY_CLOUD_NAME&&!!process.env.CLOUDINARY_API_KEY&&!!process.env.CLOUDINARY_API_SECRET&&await mediaStorage()&&await mediaWritePermissions(),privateDeliveryVerified:process.env.TRADEPILOT_MEDIA_PRIVATE_VERIFIED==='true',maxBytes:5242880,types:['image/jpeg','image/png','image/webp'],multipleScreenshots:false};}
async function target(tx:Prisma.TransactionClient,uid:string,key:string,revision?:number){
 if(key==='profile')return null;
 if(!key.startsWith('trade:')||key.length>128)fail('Invalid image target',400);
 const trade=await tx.trade.findFirst({where:{id:key.slice(6),userId:uid},select:{id:true,accountId:true,revision:true}});
 if(!trade)fail('Trade not found',404);
 if(revision!==undefined&&trade!.revision!==revision)fail('Trade changed. Your image selection is preserved; reload the trade before attaching it.',409);
 return trade!;
}
async function current(tx:Prisma.TransactionClient,uid:string,key:string){return(await tx.$queryRaw<Asset[]>`SELECT * FROM "MediaAsset" WHERE "userId"=${uid} AND "targetKey"=${key} AND state='READY'`)[0]??null;}
export async function lookup(uid:string,key:string){return withUserLock(uid,async tx=>{await target(tx,uid,key);if(!await mediaStorage())return{asset:null};const a=await current(tx,uid,key);return{asset:a?reference(a):null};});}
function expected(a:Asset|null,id:string){if((a?.id??'none')!==id)fail('Image changed in another session. Reload before replacing it.');}
export async function upload(uid:string,key:string,requestKey:string,expectedAsset:string,revision:number|undefined,input:Buffer,mime:string){
 if(!(await capabilities()).uploads)fail('New uploads are unavailable until provider, privacy and storage checks are complete',503);
 if(!z.uuid().safeParse(requestKey).success||!(z.uuid().safeParse(expectedAsset).success||expectedAsset==='none'))fail('Invalid image request',400);
 if(key!=='profile'&&(!Number.isSafeInteger(revision)||revision!<0))fail('Trade revision is required',428);
 await withUserLock(uid,tx=>target(tx,uid,key));
 const bytes=await validatedImage(input,mime,key==='profile');
 const fingerprint=createHash('sha256').update(bytes).update(JSON.stringify([key,expectedAsset,revision])).digest('hex');
 const reserved=await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(9072811)::text`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${uid} FOR UPDATE`;
  const duplicate=(await tx.$queryRaw<Asset[]>`SELECT * FROM "MediaAsset" WHERE "userId"=${uid} AND "requestKey"=${requestKey}::uuid`)[0];
  if(duplicate){if(duplicate.fingerprint!==fingerprint)fail('Request key already belongs to another upload');if(duplicate.state!=='READY')fail('Upload is pending or retired. Inspect its status before retrying.');return{asset:duplicate,reused:true};}
  const trade=await target(tx,uid,key,revision);expected(await current(tx,uid,key),expectedAsset);
  const usage=(await tx.$queryRaw<Array<{total:bigint;owned:bigint}>>`SELECT COALESCE(sum(bytes),0)::bigint total,COALESCE(sum(bytes) FILTER(WHERE "userId"=${uid}),0)::bigint owned FROM "MediaAsset" WHERE state<>'DELETED'`)[0];
  if(usage.total+5242880n>524288000n||usage.owned+5242880n>52428800n)fail('Media storage allowance reached; pending cleanup still counts.',429);
  // Charge attempts before provider I/O, including ambiguous failures. Byte quotas
  // alone would let tiny images exhaust the free provider's processing allowance.
  const date=new Date().toISOString();
  for(const [budget,limit] of [[`media-upload-day:${date.slice(0,10)}`,100n],[`media-upload-month:${date.slice(0,7)}`,1000n],[`media-upload-user:${uid}:${date.slice(0,7)}`,100n]] as const){
   const used=(await tx.$queryRaw<Array<{amount:bigint}>>`SELECT amount FROM "FeatureUsage" WHERE key=${budget}`)[0]?.amount??0n;
   if(used>=limit)fail('Image upload allowance reached. Saved images are preserved.',429);
   await tx.$executeRaw`INSERT INTO "FeatureUsage"(key,amount) VALUES(${budget},1) ON CONFLICT(key) DO UPDATE SET amount="FeatureUsage".amount+1`;
  }
  const id=randomUUID(),publicId=`tradepilot-owned/${uid}/${id}`;
  await tx.$executeRaw`INSERT INTO "MediaAsset"(id,"userId",purpose,"targetKey","tradeId","accountId","requestKey",fingerprint,"publicId",state) VALUES(${id},${uid},${key==='profile'?'AVATAR':'SCREENSHOT'},${key},${trade?.id??null},${trade?.accountId??null},${requestKey}::uuid,${fingerprint},${publicId},'PENDING')`;
  return{asset:{id,userId:uid,purpose:key==='profile'?'AVATAR':'SCREENSHOT',targetKey:key,tradeId:trade?.id??null,accountId:trade?.accountId??null,requestKey,fingerprint,publicId,state:'PENDING',bytes:5242880} as Asset,reused:false};
 });
 if(reserved.reused)return{asset:reference(reserved.asset),reused:true};
 try{
  await mediaProvider.put(reserved.asset.publicId,bytes);
  return await withUserLock(uid,async tx=>{
   const pending=(await tx.$queryRaw<Asset[]>`SELECT * FROM "MediaAsset" WHERE id=${reserved.asset.id} AND "userId"=${uid} FOR UPDATE`)[0];
   if(pending?.state!=='PENDING')fail('Upload expired before attachment');
   const trade=await target(tx,uid,key,revision);expected(await current(tx,uid,key),expectedAsset);
   await tx.$executeRaw`UPDATE "MediaAsset" SET state='RETIRED',"updatedAt"=now() WHERE "userId"=${uid} AND "targetKey"=${key} AND state='READY'`;
   await tx.$executeRaw`UPDATE "MediaAsset" SET state='READY',bytes=${bytes.length},"updatedAt"=now() WHERE id=${reserved.asset.id}`;
   if(trade)await tx.trade.update({where:{id:trade.id},data:{revision:{increment:1}}});
   return{asset:reference({...reserved.asset,bytes:bytes.length}),revision:trade?trade.revision+1:undefined};
  });
 }catch(e){
  await prisma.$executeRaw`UPDATE "MediaAsset" SET state='RETIRED',"updatedAt"=now() WHERE id=${reserved.asset.id} AND state='PENDING'`;
  throw e instanceof AppError?e:new AppError('Upload interrupted. Inspect the saved image before retrying.',502);
 }
}
export async function detach(uid:string,key:string,assetId:string,revision?:number){
 if(!(await capabilities()).uploads)fail('Image changes are disabled',503);
 if(!z.uuid().safeParse(assetId).success)fail('A saved image identity is required',400);
 if(key!=='profile'&&(!Number.isSafeInteger(revision)||revision!<0))fail('Trade revision is required',428);
 return withUserLock(uid,async tx=>{const trade=await target(tx,uid,key,revision);expected(await current(tx,uid,key),assetId);await tx.$executeRaw`UPDATE "MediaAsset" SET state='RETIRED',"updatedAt"=now() WHERE "userId"=${uid} AND "targetKey"=${key} AND state='READY'`;if(trade)await tx.trade.update({where:{id:trade.id},data:{revision:{increment:1}}});return{removed:true,revision:trade?trade.revision+1:undefined,remoteCleanupPending:true};});
}
export async function content(uid:string,id:string){
 const a=(await prisma.$queryRaw<Asset[]>`SELECT * FROM "MediaAsset" WHERE id=${id} AND "userId"=${uid} AND state='READY'`)[0];if(!a)fail('Image not found',404);
 const date=new Date().toISOString();
 await prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(9072812)::text`;
  for(const [key,limit] of [[`media-day:${date.slice(0,10)}`,104857600n],[`media-month:${date.slice(0,7)}`,2147483648n]] as const){
   const used=(await tx.$queryRaw<Array<{amount:bigint}>>`SELECT amount FROM "FeatureUsage" WHERE key=${key}`)[0]?.amount??0n;
   if(used+BigInt(a.bytes)>limit)fail('Image delivery allowance reached. Try again later.',429);
   await tx.$executeRaw`INSERT INTO "FeatureUsage"(key,amount) VALUES(${key},${BigInt(a.bytes)}) ON CONFLICT(key) DO UPDATE SET amount="FeatureUsage".amount+EXCLUDED.amount`;
  }
 });
 const bytes=await mediaProvider.get(a.publicId);
 const still=(await prisma.$queryRaw<Array<{id:string}>>`SELECT id FROM "MediaAsset" WHERE id=${id} AND "userId"=${uid} AND state='READY'`)[0];if(!still)fail('Image not found',404);
 return bytes;
}
export async function cleanupMedia(){
 if(!env.mediaUploadsEnabled||!await mediaStorage())return;
 await prisma.$executeRaw`UPDATE "MediaAsset" SET state='RETIRED',"updatedAt"=now() WHERE state='PENDING' AND "createdAt"<now()-interval '10 minutes'`;
 const rows=await prisma.$queryRaw<Asset[]>`SELECT * FROM "MediaAsset" WHERE state='RETIRED' AND "updatedAt"<now()-interval '2 minutes' ORDER BY "updatedAt",id LIMIT 5`;
 for(const a of rows){try{await mediaProvider.remove(a.publicId);await prisma.$executeRaw`UPDATE "MediaAsset" SET state='DELETED',"updatedAt"=now() WHERE id=${a.id} AND state='RETIRED'`;}catch{await prisma.$executeRaw`UPDATE "MediaAsset" SET "updatedAt"=now() WHERE id=${a.id} AND state='RETIRED'`;}}
}
