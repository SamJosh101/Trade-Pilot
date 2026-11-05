import {useEffect,useState} from 'react';
import api from '../api/apiClient';
import {useAuth} from '../hooks/useAuth';
import {PROFILE_IMAGE_CHANGED} from '../services/ownedMediaService';

export default function ProfileAvatar(){
 const {user,token}=useAuth();
 const [revision,setRevision]=useState(0);
 const [image,setImage]=useState<{token:string|null;src:string}>({token:null,src:''});
 useEffect(()=>{
  const refresh=()=>setRevision(n=>n+1);
  window.addEventListener(PROFILE_IMAGE_CHANGED,refresh);
  return()=>window.removeEventListener(PROFILE_IMAGE_CHANGED,refresh);
 },[]);
 useEffect(()=>{
  const controller=new AbortController();let url='';
  setImage({token,src:''});
  if(token)api.get<{asset:{contentPath:string}|null}>('/media/current',{params:{target:'profile'},signal:controller.signal})
   .then(async response=>{
    if(controller.signal.aborted||!response.data.asset)return;
    const content=await api.get<Blob>(response.data.asset.contentPath,{responseType:'blob',signal:controller.signal});
    if(controller.signal.aborted)return;
    url=URL.createObjectURL(content.data);setImage({token,src:url});
   }).catch(()=>{/* Keep the initial when no private image can be loaded. */});
  return()=>{controller.abort();if(url)URL.revokeObjectURL(url);};
 },[token,revision]);
 return image.token===token&&image.src
  ?<img src={image.src} alt="Your profile"/>
  :<>{user?.name?.slice(0,1).toUpperCase()??'T'}</>;
}
