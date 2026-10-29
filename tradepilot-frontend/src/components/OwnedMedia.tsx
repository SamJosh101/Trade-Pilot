import {useEffect,useRef,useState} from 'react';
import api from '../api/apiClient';
import {useAuth} from '../hooks/useAuth';
import {apiError} from '../services/financialService';
type Asset={id:string;contentPath:string;bytes:number;purpose:string};
export default function OwnedMedia({target,revision,onSaved,readOnly=false}:{target:string;revision?:number;onSaved?:(revision?:number)=>void;readOnly?:boolean}){
 const {token}=useAuth();
 const [asset,setAsset]=useState<Asset|null>(null),[source,setSource]=useState(''),[file,setFile]=useState<File|null>(null),[preview,setPreview]=useState(''),[enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState(''),[notice,setNotice]=useState(''),[reload,setReload]=useState(0),[uncertain,setUncertain]=useState(false);
 const requestKey=useRef('');
 useEffect(()=>{const controller=new AbortController();let blob='';setLoading(true);setSource('');setError('');setAsset(null);
  Promise.all([api.get<{asset:Asset|null}>('/media/current',{params:{target},signal:controller.signal}),api.get<{uploads:boolean}>('/media/capabilities',{signal:controller.signal})]).then(async([current,cap])=>{
   if(controller.signal.aborted)return;setEnabled(cap.data.uploads);setAsset(current.data.asset);
   if(current.data.asset){const result=await api.get<Blob>(current.data.asset.contentPath,{responseType:'blob',signal:controller.signal});blob=URL.createObjectURL(result.data);if(!controller.signal.aborted)setSource(blob);}
  }).catch(e=>{if(!controller.signal.aborted)setError(apiError(e));}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
  return()=>{controller.abort();if(blob)URL.revokeObjectURL(blob);};
 },[target,token,reload]);
 useEffect(()=>{if(!file){setPreview('');return;}const url=URL.createObjectURL(file);setPreview(url);return()=>URL.revokeObjectURL(url);},[file]);
 async function save(){if(!file||!enabled||busy||uncertain)return;setBusy(true);setError('');setNotice('');try{
  const result=await api.post<{revision?:number}>('/media/uploads',file,{timeout:40000,headers:{'Content-Type':file.type,'X-Media-Target':target,'X-Expected-Asset':asset?.id??'none','Idempotency-Key':requestKey.current,...(revision!==undefined?{'X-Trade-Revision':String(revision)}:{})}});
  setFile(null);setNotice('Image saved.');setReload(n=>n+1);if(target==='profile')window.dispatchEvent(new Event('tradepilot:profile-media-changed'));onSaved?.(result.data.revision);
 }catch(e){setError(apiError(e));setUncertain(true);}finally{setBusy(false);}}
 async function remove(){if(!asset||busy||!enabled)return;setBusy(true);setError('');try{const result=await api.delete<{revision?:number}>('/media/current',{data:{target,assetId:asset.id,revision}});setNotice('Image removed from this record. Remote cleanup is queued.');setReload(n=>n+1);if(target==='profile')window.dispatchEvent(new Event('tradepilot:profile-media-changed'));onSaved?.(result.data.revision);}catch(e){setError(apiError(e));setUncertain(true);}finally{setBusy(false);}}
 return <section className="section-gap" aria-label={target==='profile'?'Profile picture':'Owned trade screenshot'}>
 <h3>{target==='profile'?'Profile picture':'Trade screenshot'}</h3>
 {loading&&<p role="status">Loading image…</p>}
 {source&&<a href={source} target="_blank" rel="noopener noreferrer"><img src={source} alt={target==='profile'?'Your saved profile picture':'Your saved trade screenshot'} style={{maxWidth:'100%',maxHeight:240}}/><span>Open larger image</span></a>}
 {!readOnly&&<><p className="muted">One image per trade or profile. JPEG, PNG or WebP; 5 MB maximum. Saved images are resized and metadata is removed.</p>
 {!enabled&&!loading&&<p className="muted">New uploads are currently unavailable. Existing image links are preserved.</p>}
 <label className="field">{asset?'Choose replacement':'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={!enabled||busy||loading} onChange={e=>{const f=e.target.files?.[0];setError('');setUncertain(false);if(!f){setFile(null);return;}if(f.size>5242880||!['image/jpeg','image/png','image/webp'].includes(f.type)){setError('Choose a JPEG, PNG or WebP image of at most 5 MB.');setFile(null);return;}requestKey.current=crypto.randomUUID();setFile(f);}}/></label>
 {preview&&<><img src={preview} alt="Unsaved image preview" style={{maxWidth:'100%',maxHeight:200}}/><p className="muted">Preview only. The image is not saved until you upload it.</p><button className="button" disabled={busy||uncertain} onClick={()=>void save()}>{busy?'Saving…':'Upload selected image'}</button><button className="button ghost" disabled={busy} onClick={()=>setFile(null)}>Cancel image selection</button></>}
 {asset&&<button className="button danger" disabled={busy||!enabled||uncertain} onClick={()=>void remove()}>Remove saved image</button>}
 </>}
 {error&&<p role="alert" className="notice error">{error}</p>}{notice&&<p role="status">{notice}</p>}
 {uncertain&&<p className="notice">The request may have saved or another session may have changed the record. Your selected file is preserved. Inspect the saved image and reload the trade revision before selecting a replacement again.</p>}
 <button type="button" className="button ghost" disabled={busy} onClick={()=>setReload(n=>n+1)}>Refresh saved image</button>
 </section>;
}
