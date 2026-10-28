export function assertProductionSecurity(mode:string,secret:string,origin:string){
 if(mode!=='production')return;
 if(Buffer.byteLength(secret,'utf8')<32)throw new Error('Production JWT_SECRET must contain at least32 UTF-8 bytes; configure and review any key rotation explicitly.');
 let u:URL;try{u=new URL(origin);}catch{throw new Error('Production CORS_ORIGIN must be an exact HTTPS origin');}
 if(u.protocol!=='https:'||u.origin!==origin||u.username||u.password)throw new Error('Production CORS_ORIGIN must be an exact HTTPS origin');
}
