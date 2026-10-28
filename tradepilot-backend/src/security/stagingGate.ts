import {createHash,timingSafeEqual} from 'node:crypto';
import type {Request,Response,NextFunction} from 'express';

type StagingConfig={stagingEnabled?:boolean;stagingAccessKey?:string;nodeEnv:string;databaseUrl:string;authSecurityRequired?:boolean;financialWritesEnabled?:boolean};
export function assertStagingConfig(c:StagingConfig){
 if(!c.stagingEnabled)return;
 if(c.nodeEnv!=='production'||!c.authSecurityRequired||c.financialWritesEnabled)throw Error('Staging requires production mode, required security storage and disabled financial writes');
 if(Buffer.byteLength(c.stagingAccessKey||'','utf8')<32)throw Error('Staging access key must be at least 32 bytes');
 let u:URL;try{u=new URL(c.databaseUrl);}catch{throw Error('Invalid staging database configuration');}
 if(u.protocol!=='postgresql:'||!['ep-small-shape-b9rgwhrl.c-7.eu-central-1.aws.neon.tech','ep-small-shape-b9rgwhrl-pooler.c-7.eu-central-1.aws.neon.tech'].includes(u.hostname)||u.pathname!=='/neondb')throw Error('Staging must use only the approved fresh database');
}
export function stagingGate(c:StagingConfig){
 const digest=c.stagingAccessKey?createHash('sha256').update(c.stagingAccessKey).digest():null;
 return (req:Request,res:Response,next:NextFunction)=>{
  if(!c.stagingEnabled)return next();
  if((req.method==='GET'||req.method==='HEAD')&&req.path==='/health')return next();
  const supplied=req.headers['x-tradepilot-staging-key'];
  if(!digest||typeof supplied!=='string'||!timingSafeEqual(digest,createHash('sha256').update(supplied).digest())){
   res.setHeader('Cache-Control','no-store');res.status(403).json({error:'Staging access restricted',code:'STAGING_ACCESS_REQUIRED'});return;
  }
  next();
 };
}
