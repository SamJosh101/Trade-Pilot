import api from '../api/apiClient';
import type {Performance} from '../types/financial';
import type {Trade} from '../types/trade';
export type TradeQuery={accountId:string;q?:string;direction?:string;result?:string;status?:string;timeframe?:string;timeframeMissing?:string;strategyId?:string;dateBasis?:string;dateState?:string;timezone?:string;from?:string;through?:string;sort?:string;limit?:number;cursor?:string};
export type TradePage={items:Trade[];financial?:Record<string,Pick<Performance,'tradeId'|'revision'|'derived'>>;total:number;unknownDateCount:number;nextCursor:string|null;bounds:{from:string|null;to:string|null}};
export async function list(q:TradeQuery,signal?:AbortSignal){return(await api.get<TradePage>('/trade-query',{params:q,signal})).data;}
export async function capabilities(signal?:AbortSignal){return(await api.get<{available:boolean;protocol:string}>('/trade-query/capabilities',{signal})).data;}
export async function download(q:TradeQuery,scope:'ACCOUNT'|'MATCHING',signal?:AbortSignal){const {cursor:_cursor,...filters}=q;const r=await api.get('/trade-query/export',{params:scope==='ACCOUNT'?{accountId:q.accountId,scope}:{...filters,scope},responseType:'blob',signal,timeout:45000});return r.data as Blob;}
export function message(e:unknown){const v=e as {response?:{data?:{error?:unknown}};message?:string};const error=v.response?.data?.error;if(typeof error==='string')return error;if(error&&typeof error==='object'&&'message' in error&&typeof error.message==='string')return error.message;return v.message||'Request failed. Retry.';}
