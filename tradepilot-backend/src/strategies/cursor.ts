import {createHmac,timingSafeEqual} from 'node:crypto';
import {env} from '../config/env';
import {FinancialError} from '../financial/errors';
const mac=(value:string)=>createHmac('sha256',env.jwtSecret).update(`strategies-v1:${value}`).digest('base64url');
export function encode(scope:string,id:string,value:string){const data=Buffer.from(JSON.stringify({scope,id,value})).toString('base64url');return `${data}.${mac(data)}`;}
export function decode(cursor:string|undefined,scope:string):{id:string;value:string}|null{if(!cursor)return null;try{const [data,sig,...extra]=cursor.split('.'),expected=mac(data);if(extra.length||!sig||sig.length!==expected.length||!timingSafeEqual(Buffer.from(sig),Buffer.from(expected)))throw Error();const p=JSON.parse(Buffer.from(data,'base64url').toString());if(p.scope!==scope||typeof p.id!=='string'||typeof p.value!=='string')throw Error();return p;}catch{throw new FinancialError('INVALID_CURSOR','Refresh this Strategy query',400);}}
