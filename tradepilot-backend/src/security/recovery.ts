import {createCipheriv,createDecipheriv,createHash,createHmac,randomBytes,randomUUID} from 'node:crypto';
import {z} from 'zod';
import prisma from '../config/prisma';
import {env} from '../config/env';
import {AppError} from '../utils/AppError';
import type {Prisma} from '@prisma/client';
import {available,consumeRecovery,newPassword} from './service';
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
export function recoveryTokenMinutes(){const raw=process.env.RECOVERY_TOKEN_TTL_MINUTES??'15',value=Number(raw);if(!/^\d+$/.test(raw)||!Number.isInteger(value)||value<5||value>30)throw new AppError('Recovery expiry configuration is invalid',503);return value;}
function config(){
 const key=process.env.RECOVERY_OUTBOX_KEY,origin=process.env.RECOVERY_WEB_ORIGIN,from=process.env.RECOVERY_FROM;
 const provider=process.env.RECOVERY_PROVIDER??'resend';
 const temporarySender=provider==='brevo'&&env.nodeEnv!=='production'&&process.env.RECOVERY_BREVO_REWRITE_ACKNOWLEDGED==='true';
 if(!['resend','brevo'].includes(provider)||!key||!/^[a-f0-9]{64}$/.test(key)||!origin||!from||!z.email().safeParse(from).success||(/[@](gmail|yahoo|outlook|hotmail)\./i.test(from)&&!temporarySender)||process.env.RECOVERY_SENDER_VERIFIED!=='true')throw new AppError('Password recovery is not configured',503);
 const url=new URL(origin);if(url.origin!==origin||url.username||url.password||(url.protocol!=='https:'&&!(env.nodeEnv!=='production'&&url.hostname==='127.0.0.1')))throw new AppError('Recovery destination is not configured',503);
 return{key:Buffer.from(key,'hex'),origin,from,provider,ttlMinutes:recoveryTokenMinutes()};
}
export function encryptDelivery(value:unknown,id:string,key:Buffer){const iv=randomBytes(12),cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(Buffer.from(id));const data=Buffer.concat([cipher.update(JSON.stringify(value),'utf8'),cipher.final()]);return Buffer.concat([iv,cipher.getAuthTag(),data]).toString('base64');}
export function decryptDelivery(value:string,id:string,key:Buffer){const b=Buffer.from(value,'base64'),cipher=createDecipheriv('aes-256-gcm',key,b.subarray(0,12));cipher.setAAD(Buffer.from(id));cipher.setAuthTag(b.subarray(12,28));return JSON.parse(Buffer.concat([cipher.update(b.subarray(28)),cipher.final()]).toString('utf8'));}
export async function recoveryStoragePermissions(db:Pick<Prisma.TransactionClient,'$queryRaw'>=prisma){return(await db.$queryRaw<Array<{allowed:boolean}>>`SELECT bool_and(has_table_privilege(current_user,'public."RecoveryDelivery"',p.privilege)) AND has_table_privilege(current_user,'public."PasswordResetToken"','SELECT') AND has_table_privilege(current_user,'public."PasswordResetToken"','INSERT') AND has_column_privilege(current_user,'public."PasswordResetToken"','consumedAt','UPDATE') AS allowed FROM (VALUES ('SELECT'),('INSERT'),('UPDATE')) p(privilege)`)[0]?.allowed===true;}
export async function recoveryReady(){
 if(!env.passwordRecoveryEnabled)return false;
 if(env.nodeEnv==='production'&&(process.env.RECOVERY_EXTERNAL_SEND_APPROVED!=='true'||!(process.env.RECOVERY_PROVIDER==='brevo'?process.env.BREVO_API_KEY:process.env.RESEND_API_KEY)))return false;
 try{config();if(!await available())return false;const exists=(await prisma.$queryRaw<Array<{ready:boolean}>>`SELECT to_regclass('public."RecoveryDelivery"') IS NOT NULL AND EXISTS(SELECT 1 FROM pg_index WHERE indexrelid=to_regclass('public."User_email_casefold_key"') AND indisunique AND indisvalid) AS ready`)[0]?.ready===true;if(!exists)return false;return env.nodeEnv==='production'?await recoveryStoragePermissions():true;}catch{return false;}
}
export async function requestRecovery(email:unknown){
 if(!await recoveryReady())throw new AppError('Password recovery is not enabled',503);
 const parsed=z.string().trim().max(254).email().safeParse(email);if(!parsed.success)throw new AppError('Enter a valid email address',400);
 const {key}=config(),normalized=parsed.data.toLowerCase(),recipientHash=createHmac('sha256',key).update(normalized).digest('hex');
 await prisma.$transaction(async tx=>{
  // One small global lock serializes the persisted recipient cooldown and free-plan budget.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(9072813)::text`;
  const cooldown=(await tx.$queryRaw<Array<{n:number}>>`SELECT count(*)::int n FROM "RecoveryDelivery" WHERE "recipientHash"=${recipientHash} AND "createdAt">now()-interval '5 minutes'`)[0].n;
  const limits=(await tx.$queryRaw<Array<{day:number;month:number}>>`SELECT count(*) FILTER(WHERE "createdAt">=date_trunc('day',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC')::int AS "day",count(*)::int AS "month" FROM "RecoveryDelivery" WHERE "createdAt">=date_trunc('month',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC'`)[0];
  if(cooldown||limits.day>=90||limits.month>=2500)return; // Same public response for known/unknown/cooldown.
  const candidates=await tx.user.findMany({where:{email:{equals:normalized,mode:'insensitive'}},take:2,select:{id:true,email:true,password:true}});
  const user=candidates.length===1?candidates[0]:null;
  if(user)await tx.$queryRaw`SELECT id FROM "User" WHERE id=${user.id} FOR UPDATE`;
  const current=user?await tx.user.findUnique({where:{id:user.id},select:{id:true,email:true,password:true}}):null;
  const eligible=current?.email.toLowerCase()===normalized?current:null,id=randomUUID(),token=randomBytes(32).toString('base64url'),digest=hash(token),expires=new Date(Date.now()+config().ttlMinutes*60000);
  if(eligible){
   await tx.$executeRaw`UPDATE "PasswordResetToken" SET "consumedAt"=now() WHERE "userId"=${eligible.id} AND "consumedAt" IS NULL`;
   await tx.$executeRaw`INSERT INTO "PasswordResetToken"(hash,"userId","passwordFingerprint","expiresAt") VALUES(${digest},${eligible.id},${hash(eligible.password+'\0'+eligible.email)},${expires})`;
  }
  const ciphertext=encryptDelivery({email:normalized,token:eligible?token:null},id,key);
  await tx.$executeRaw`INSERT INTO "RecoveryDelivery"(id,"recipientHash","userId","tokenHash",ciphertext,"expiresAt") VALUES(${id}::uuid,${recipientHash},${eligible?.id??null},${eligible?digest:null},${ciphertext},${expires})`;
 },{timeout:10000});
 return{message:'If an eligible account exists, a recovery email will arrive shortly. Please wait before requesting another link.'};
}
export async function resetPassword(token:unknown,password:unknown){if(!await recoveryReady())throw new AppError('Password recovery is not enabled',503);const parsed=newPassword.safeParse(password);if(typeof token!=='string'||!parsed.success)throw new AppError('Use at least 12 characters and at most 72 UTF-8 bytes for the new password',400);return consumeRecovery(token,parsed.data);}
export const emailProvider={async send(id:string,email:string,token:string,expiresAt:Date){
 const c=config(),apiKey=c.provider==='brevo'?process.env.BREVO_API_KEY:process.env.RESEND_API_KEY;if(process.env.RECOVERY_EXTERNAL_SEND_APPROVED!=='true'||!apiKey)throw new AppError('External recovery delivery is not approved',503);
 // An optional private test allowlist prevents accidental delivery to other recipients.
 if(process.env.RECOVERY_TEST_INBOX&&email.toLowerCase()!==process.env.RECOVERY_TEST_INBOX.toLowerCase())throw new AppError('Recipient is outside the approved test scope',503);
 const link=`${c.origin}/reset-password#token=${token}`;
 const text=`A password reset was requested for TradePilot.\n\nOpen this link before ${expiresAt.toISOString()} (UTC):\n${link}\n\nIf you did not request this, ignore this email. Your password has not changed.`,subject='Reset your TradePilot password';
 const response=await fetch(c.provider==='brevo'?'https://api.brevo.com/v3/smtp/email':'https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(15000),redirect:'error',headers:{...(c.provider==='brevo'?{'api-key':apiKey,idempotencyKey:id}:{Authorization:`Bearer ${apiKey}`,'Idempotency-Key':`tradepilot-reset/${id}` }),'Content-Type':'application/json'},body:JSON.stringify(c.provider==='brevo'?{sender:{name:'TradePilot',email:c.from},to:[{email}],subject,textContent:text,headers:{idempotencyKey:id}}:{from:c.from,to:[email],subject,text})});
 if(!response.ok)throw new AppError('Recovery delivery unavailable',502);
 // Do not log response bodies: providers may reflect destinations or message content.
}};
type Job={id:string;userId:string|null;tokenHash:string|null;ciphertext:string|null;attempts:number;expiresAt:Date};
export async function drainRecovery(){
 if(!await recoveryReady())return;
 const c=config();
 for(let i=0;i<3;i++){
  const job=await prisma.$transaction(async tx=>{
   const rows=await tx.$queryRaw<Job[]>`SELECT * FROM "RecoveryDelivery" WHERE state='PENDING' OR (state='SENDING' AND "leaseUntil"<now()) ORDER BY "createdAt",id LIMIT 1 FOR UPDATE SKIP LOCKED`;
   const row=rows[0];if(!row)return null;
   if(row.attempts>=3||+row.expiresAt<Date.now()+120000||!row.ciphertext){await tx.$executeRaw`UPDATE "RecoveryDelivery" SET state='FAILED',ciphertext=NULL,"finishedAt"=now() WHERE id=${row.id}::uuid`;return null;}
   await tx.$executeRaw`UPDATE "RecoveryDelivery" SET state='SENDING',attempts=attempts+1,"leaseUntil"=now()+interval '1 minute' WHERE id=${row.id}::uuid`;
   return row;
  });
  if(!job)return;
  let state='SKIPPED';
  try{
   if(job.userId&&job.tokenHash){
    const record=(await prisma.$queryRaw<Array<{password:string;email:string;passwordFingerprint:string}>>`SELECT u.password,u.email,t."passwordFingerprint" FROM "PasswordResetToken" t JOIN "User" u ON u.id=t."userId" WHERE t.hash=${job.tokenHash} AND t."consumedAt" IS NULL AND t."expiresAt">now()`)[0];
    const valid=record&&record.passwordFingerprint===hash(record.password+'\0'+record.email);
    if(valid){const payload=decryptDelivery(job.ciphertext!,job.id,c.key);if(typeof payload.email!=='string'||typeof payload.token!=='string'||hash(payload.token)!==job.tokenHash)throw Error();await emailProvider.send(job.id,payload.email,payload.token,job.expiresAt);state='SENT';}
   }
   await prisma.$executeRaw`UPDATE "RecoveryDelivery" SET state=${state},ciphertext=NULL,"finishedAt"=now(),"leaseUntil"=NULL WHERE id=${job.id}::uuid`;
  }catch{
   // Same ciphertext and provider idempotency key are retained for a bounded retry.
   if(job.attempts>=2)await prisma.$executeRaw`UPDATE "RecoveryDelivery" SET state='FAILED',ciphertext=NULL,"finishedAt"=now() WHERE id=${job.id}::uuid`;
  }
 }
}
