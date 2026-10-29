import {v2 as cloudinary} from 'cloudinary';
import {AppError} from '../utils/AppError';
function configured(){
 const cloud=process.env.CLOUDINARY_CLOUD_NAME,key=process.env.CLOUDINARY_API_KEY,secret=process.env.CLOUDINARY_API_SECRET;
 if(!cloud||!key||!secret||!/^[a-z0-9-]+$/.test(cloud))throw new AppError('Media provider is not configured',503);
 return{cloud_name:cloud,api_key:key,api_secret:secret,secure:true};
}
export const mediaProvider={
 async put(publicId:string,bytes:Buffer){
  const config=configured();
  await new Promise<void>((resolve,reject)=>{const stream=cloudinary.uploader.upload_stream({...config,public_id:publicId,resource_type:'image',type:'private',overwrite:false,unique_filename:false,format:'webp',timeout:20000},(error,result)=>{
   if(error||result?.public_id!==publicId||result.type!=='private'||result.resource_type!=='image'||result.format!=='webp')reject(new AppError('Media upload could not be verified',502));else resolve();
  });stream.end(bytes);});
 },
 async get(publicId:string){
  const config=configured();
  const url=cloudinary.utils.private_download_url(publicId,'webp',{...config,type:'private',resource_type:'image',expires_at:Math.floor(Date.now()/1000)+30});
  // URL is used only server-to-server; it is never returned to the browser or logs.
  const response=await fetch(url,{signal:AbortSignal.timeout(15000),redirect:'error'});
  if(!response.ok||!response.body)throw new AppError('Image delivery unavailable',502);
  const chunks:Uint8Array[]=[];let size=0;
  for await(const chunk of response.body){size+=chunk.length;if(size>4*1024*1024){await response.body.cancel().catch(()=>{});throw new AppError('Image delivery limit exceeded',502);}chunks.push(chunk);}
  const result=Buffer.concat(chunks);if(result.subarray(0,4).toString()!=='RIFF'||result.subarray(8,12).toString()!=='WEBP')throw new AppError('Image delivery could not be verified',502);
  return result;
 },
 async remove(publicId:string){const options={...configured(),resource_type:'image' as const,type:'private' as const,invalidate:true,timeout:15000};const result=await cloudinary.uploader.destroy(publicId,options);if(!['ok','not found'].includes(result.result))throw new AppError('Media cleanup unavailable',502);}
};
