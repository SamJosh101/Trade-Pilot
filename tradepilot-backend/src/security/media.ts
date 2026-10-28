import {AppError} from '../utils/AppError';
// No provider request is authorized until owned signing/delivery and retention are verified.
export function assertMediaChange(existing:string|null|undefined,proposed:string|null|undefined){
 if(proposed!==undefined&&proposed!==null&&proposed!==existing)throw new AppError('New image uploads and image-link replacements are disabled pending verified owned media storage. Existing links are preserved.',503);
}
