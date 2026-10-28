import {createHash,randomBytes,randomUUID} from 'node:crypto';
import bcrypt from 'bcrypt';
import jwt,{type JwtPayload} from 'jsonwebtoken';
import type {Prisma} from '@prisma/client';
import {z} from 'zod';
import prisma from '../config/prisma';
import {env} from '../config/env';
import {withUserLock} from '../utils/withUserLock';
import {AppError} from '../utils/AppError';
import {newPassword,passwordChange,confirmation} from './schemas';
export {newPassword,passwordChange,confirmation};
const hash=(s:string)=>createHash('sha256').update(s).digest('hex');
const credentialFingerprint=(u:{password:string;email:string})=>hash(u.password+'\0'+u.email);
const fail=(s:string,status=400):never=>{throw new AppError(s,status);};
let observedSecuritySchema=false;
export async function available(){
 const rows=await prisma.$queryRaw<Array<{table_name:string;column_name:string}>>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND table_name IN ('AuthSecurityState','AuthSession','PasswordResetToken')`;
 if(!rows.some(r=>['AuthSecurityState','AuthSession','PasswordResetToken'].includes(r.table_name))){if(observedSecuritySchema||env.authSecurityRequired)fail('Required security storage unavailable; authentication cannot downgrade',503);return false;}
 const fields={AuthSecurityState:['userId','denyLegacy'],AuthSession:['id','userId','kind','label','createdAt','expiresAt','revokedAt'],PasswordResetToken:['hash','userId','passwordFingerprint','createdAt','expiresAt','consumedAt']};
 if(!Object.entries(fields).every(([t,cols])=>cols.every(c=>rows.some(r=>r.table_name===t&&r.column_name===c))))fail('Security schema incomplete; no authentication downgrade allowed',503);
 const constraints=await prisma.$queryRaw<Array<{conname:string}>>`SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('AuthSecurityState_userId_fkey','AuthSession_userId_fkey','PasswordResetToken_userId_fkey','AuthSession_expiry','PasswordReset_expiry')`;
 if(constraints.length!==5)fail('Security protections incomplete; no authentication downgrade allowed',503);
 observedSecuritySchema=true;return true;
}
async function requireStorage(){if(!await available())fail('Session and password controls require the separately approved security database upgrade',503);}
type Session={id:string;userId:string;kind:string;label:string;createdAt:Date;expiresAt:Date;revokedAt:Date|null};
async function denied(tx:Prisma.TransactionClient,uid:string){return (await tx.$queryRaw<Array<{denyLegacy:boolean}>>`SELECT "denyLegacy" FROM "AuthSecurityState" WHERE "userId"=${uid}`)[0]?.denyLegacy===true;}
export async function issue(tx:Prisma.TransactionClient,uid:string,label='Browser'){
 const active=(await tx.$queryRaw<Array<{n:number}>>`SELECT count(*)::int n FROM "AuthSession" WHERE "userId"=${uid} AND "revokedAt" IS NULL AND "expiresAt">now()`)[0].n;
 if(active>=100)fail('Active session limit reached. Revoke sessions or log out all devices before signing in again.',429);
 const id=randomUUID(),expiresAt=new Date(Date.now()+12*3600000);
 await tx.$executeRaw`INSERT INTO "AuthSession"(id,"userId",kind,label,"expiresAt") VALUES (${id},${uid},'MANAGED',${label.replace(/[\x00-\x1f\x7f]/g,'').slice(0,120)||'Browser'},${expiresAt})`;
 return jwt.sign({userId:uid,sid:id,ver:1},env.jwtSecret,{algorithm:'HS256',expiresIn:'12h',issuer:'tradepilot',audience:'tradepilot-web'});
}
export async function authenticate(payload:JwtPayload,token:string):Promise<string|undefined>{
 const ready=await available();
 if(payload.sid!==undefined){
  if(!ready)fail('Managed session storage unavailable',503);
  if(payload.ver!==1||payload.iss!=='tradepilot'||payload.aud!=='tradepilot-web'||typeof payload.sid!=='string'||!payload.exp)fail('Invalid or expired token',401);
  const row=(await prisma.$queryRaw<Session[]>`SELECT * FROM "AuthSession" WHERE id=${payload.sid} AND "userId"=${payload.userId}`)[0];
  if(!row||row.kind!=='MANAGED'||row.revokedAt||+row.expiresAt<=Date.now())fail('Invalid or expired token',401);
  return row.id;
 }
 if(!ready)return undefined; // Explicit original-schema transition; no existing token invalidation.
 const id=hash(token),expiry=new Date((payload.exp??((payload.iat??0)+7*86400))*1000);
 if(+expiry<=Date.now())fail('Invalid or expired token',401);
 return withUserLock(payload.userId,async tx=>{
  if(await denied(tx,payload.userId))fail('Session revoked. Sign in again.',401);
  if(!await tx.user.findUnique({where:{id:payload.userId},select:{id:true}}))fail('Invalid or expired token',401);
  await tx.$executeRaw`INSERT INTO "AuthSession"(id,"userId",kind,label,"expiresAt") VALUES (${id},${payload.userId},'LEGACY','Existing bearer session',${expiry}) ON CONFLICT(id) DO NOTHING`;
  const row=(await tx.$queryRaw<Session[]>`SELECT * FROM "AuthSession" WHERE id=${id} AND "userId"=${payload.userId}`)[0];
  if(!row||row.revokedAt||+row.expiresAt<=Date.now())fail('Invalid or expired token',401);
  return id;
 });
}
export async function loginSession(uid:string,passwordHash:string,label?:string){
 if(!await available())return jwt.sign({userId:uid},env.jwtSecret,{expiresIn:env.jwtExpiresIn} as jwt.SignOptions);
 return withUserLock(uid,async tx=>{
  const u=await tx.user.findUnique({where:{id:uid},select:{password:true}});
  if(!u||u.password!==passwordHash)fail('Credentials changed. Sign in again.',401);
  return issue(tx,uid,label);
 });
}
async function revokeAll(tx:Prisma.TransactionClient,uid:string){
 await tx.$executeRaw`INSERT INTO "AuthSecurityState"("userId","denyLegacy") VALUES (${uid},true) ON CONFLICT("userId") DO UPDATE SET "denyLegacy"=true`;
 await tx.$executeRaw`UPDATE "AuthSession" SET "revokedAt"=now() WHERE "userId"=${uid} AND "revokedAt" IS NULL`;
 await tx.$executeRaw`UPDATE "PasswordResetToken" SET "consumedAt"=now() WHERE "userId"=${uid} AND "consumedAt" IS NULL`;
}
async function checkPassword(tx:Prisma.TransactionClient,uid:string,password:string){const u=await tx.user.findUnique({where:{id:uid}});if(!u||!await bcrypt.compare(password,u.password))fail('Current password is incorrect',403);return u!;}
export async function changePassword(uid:string,input:z.infer<typeof passwordChange>){
 await requireStorage();const p=passwordChange.parse(input),replacement=await bcrypt.hash(p.newPassword,12);
 return withUserLock(uid,async tx=>{const u=await checkPassword(tx,uid,p.currentPassword);if(await bcrypt.compare(p.newPassword,u.password))fail('Choose a different password');await tx.user.update({where:{id:uid},data:{password:replacement}});await revokeAll(tx,uid);return {changed:true,signedOutAllDevices:true};});
}
export async function list(uid:string,current?:string){await requireStorage();const items=await prisma.$queryRaw<Session[]>`SELECT * FROM "AuthSession" WHERE "userId"=${uid} AND "revokedAt" IS NULL AND "expiresAt">now() ORDER BY "createdAt" DESC,id LIMIT 101`;return {items:items.slice(0,100).map(s=>({id:s.id,label:s.label,kind:s.kind,createdAt:s.createdAt,expiresAt:s.expiresAt,current:s.id===current})),limited:items.length>100,legacyNotice:'Only observed legacy sessions are listed. Log out all devices also revokes unobserved existing tokens.'};}
export async function revoke(uid:string,id:string,currentPassword:string){await requireStorage();return withUserLock(uid,async tx=>{await checkPassword(tx,uid,currentPassword);const n=await tx.$executeRaw`UPDATE "AuthSession" SET "revokedAt"=now() WHERE id=${id} AND "userId"=${uid}`;if(!n)fail('Session not found',404);return {revoked:true};});}
export async function logout(uid:string,id?:string){await requireStorage();if(!id)fail('Inspect this session before signing out',409);await prisma.$executeRaw`UPDATE "AuthSession" SET "revokedAt"=now() WHERE id=${id} AND "userId"=${uid}`;}
export async function logoutAll(uid:string,password:string){await requireStorage();return withUserLock(uid,async tx=>{await checkPassword(tx,uid,password);await revokeAll(tx,uid);return {signedOutAllDevices:true};});}
// Server-only preparation API. No HTTP route supplies a delivery implementation or enables it.
export async function prepareRecovery(email:string,deliver:(email:string,token:string)=>Promise<void>){
 await requireStorage();const u=await prisma.user.findUnique({where:{email}});if(!u)return;
 const token=randomBytes(32).toString('base64url'),digest=hash(token),expiresAt=new Date(Date.now()+15*60000);
 const created=await withUserLock(u.id,async tx=>{const current=await tx.user.findUniqueOrThrow({where:{id:u.id}});if(current.email!==email)return false;await tx.$executeRaw`UPDATE "PasswordResetToken" SET "consumedAt"=now() WHERE "userId"=${u.id} AND "consumedAt" IS NULL`;await tx.$executeRaw`INSERT INTO "PasswordResetToken"(hash,"userId","passwordFingerprint","expiresAt") VALUES (${digest},${u.id},${credentialFingerprint(current)},${expiresAt})`;return true;});
 if(!created)return;
 try{await deliver(email,token);}catch{await prisma.$executeRaw`UPDATE "PasswordResetToken" SET "consumedAt"=now() WHERE hash=${digest}`;throw new AppError('Recovery delivery unavailable',503);}
}
export async function consumeRecovery(token:string,password:string){
 await requireStorage();if(!/^[A-Za-z0-9_-]{43}$/.test(token))fail('Invalid or expired recovery token');const next=newPassword.parse(password),digest=hash(token),candidate=(await prisma.$queryRaw<Array<{userId:string}>>`SELECT "userId" FROM "PasswordResetToken" WHERE hash=${digest}`)[0];if(!candidate)fail('Invalid or expired recovery token');
 const replacement=await bcrypt.hash(next,12);return withUserLock(candidate!.userId,async tx=>{const row=(await tx.$queryRaw<Array<{userId:string;passwordFingerprint:string;expiresAt:Date;consumedAt:Date|null}>>`SELECT * FROM "PasswordResetToken" WHERE hash=${digest} FOR UPDATE`)[0],u=await tx.user.findUnique({where:{id:candidate!.userId}});if(!row||row.consumedAt||+row.expiresAt<=Date.now()||!u||row.passwordFingerprint!==credentialFingerprint(u))fail('Invalid or expired recovery token');await tx.user.update({where:{id:u!.id},data:{password:replacement}});await revokeAll(tx,u!.id);return {changed:true,signedOutAllDevices:true};});
}
