import api from '../api/apiClient';
export const PROFILE_IMAGE_CHANGED='tradepilot:profile-media-changed';
const notifyProfile=(target:string)=>{if(target==='profile')window.dispatchEvent(new Event(PROFILE_IMAGE_CHANGED));};
export type Asset={id:string;purpose:string;bytes:number;contentPath:string};
export const capabilities=async()=>(await api.get<{uploads:boolean;privateDeliveryVerified:boolean}>('/media/capabilities')).data;
export const current=async(target:string)=>(await api.get<{asset:Asset|null}>('/media/current',{params:{target}})).data.asset;
export const content=async(asset:Asset,signal?:AbortSignal)=>(await api.get<Blob>(asset.contentPath,{responseType:'blob',signal})).data;
export const upload=async(target:string,file:File,expected:Asset|null,revision?:number,key=crypto.randomUUID())=>{
 const result=await api.post<{asset:Asset;revision?:number}>('/media/uploads',file,{headers:{'Content-Type':file.type,'X-Media-Target':target,'X-Expected-Asset':expected?.id??'none','Idempotency-Key':key,...(revision===undefined?{}:{'X-Trade-Revision':String(revision)})},timeout:60000});
 notifyProfile(target);return result.data;
};
export const detach=async(target:string,asset:Asset,revision?:number)=>{
 const result=await api.delete<{revision?:number}>('/media/current',{data:{target,assetId:asset.id,...(revision===undefined?{}:{revision})}});
 notifyProfile(target);return result;
};
