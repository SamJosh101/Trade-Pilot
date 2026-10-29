import sharp from 'sharp';
import {AppError} from '../utils/AppError';
sharp.cache({memory:16,files:0,items:20});
sharp.concurrency(1);
let active=0;
export async function validatedImage(input:Buffer,mime:string,avatar=false){
 if(!Buffer.isBuffer(input)||input.length===0||input.length>5*1024*1024)throw new AppError('Select an image of at most 5 MB',413);
 const formats:Record<string,string>={'image/jpeg':'jpeg','image/png':'png','image/webp':'webp'};
 if(!formats[mime])throw new AppError('Only JPEG, PNG and WebP images are supported',415);
 if(active>=2)throw new AppError('Image processing is busy. Try again shortly.',429);
 active++;
 try{
  const image=sharp(input,{limitInputPixels:24000000,animated:true,failOn:'warning'}),meta=await image.metadata();
  if(meta.format!==formats[mime]||(meta.pages??1)!==1||!meta.width||!meta.height)throw Error();
  // Decode and re-encode; never retain EXIF, GPS, embedded scripts or the original file.
  const output=await image.rotate().resize({width:avatar?512:2560,height:avatar?512:2560,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
  if(output.length>4*1024*1024)throw new AppError('Processed image is too large',413);
  return output;
 }catch(e){if(e instanceof AppError)throw e;throw new AppError('Invalid, animated or excessively large image',422);}finally{active--;}
}
