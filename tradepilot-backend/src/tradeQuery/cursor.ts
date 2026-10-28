import {createHmac,timingSafeEqual} from 'node:crypto';
import {env} from '../config/env';
import {FinancialError} from '../financial/errors';
const sign=(s:string)=>createHmac('sha256',env.jwtSecret).update('trade-query-v1:'+s).digest('base64url');
export function encode(scope:string,id:string,value:string){const p=Buffer.from(JSON.stringify({scope,id,value,expires:Date.now()+3600000})).toString('base64url');return p+'.'+sign(p);}
export function decode(token:string|undefined,scope:string){if(!token)return null;try{const [p,s,...rest]=token.split('.'),m=sign(p);if(rest.length||!s||s.length!==m.length||!timingSafeEqual(Buffer.from(s),Buffer.from(m)))throw Error();const v=JSON.parse(Buffer.from(p,'base64url').toString());if(v.scope!==scope||typeof v.id!=='string'||typeof v.value!=='string'||!Number.isFinite(v.expires)||v.expires<Date.now())throw Error();return v as {id:string;value:string};}catch{throw new FinancialError('INVALID_CURSOR','Pagination expired or does not match this account/filter. Return to the first page.',400);}}
