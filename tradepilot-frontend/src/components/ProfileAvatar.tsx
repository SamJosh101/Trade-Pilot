import {useEffect,useState} from 'react';
import api from '../api/apiClient';
import {useAuth} from '../hooks/useAuth';
export default function ProfileAvatar(){
 const {user,token}=useAuth();const [reload,setReload]=useState(0),[image,setImage]=useState<{token:string|null;src:string}>({token:null,src:''});
 useEffect(()=>{const refresh=()=>setReload(n=>n+1);window.addEventListener('tradepilot:profile-media-changed',refresh);return()=>window.removeEventListener('tradepilot:profile-media-changed',refresh);},[]);
 useEffect(()=>{const c=new AbortController();let url='';setImage({token,src:''});if(token)api.get<{asset:{contentPath:string}|null}>('/media/current',{params:{target:'profile'},signal:c.signal}).then(async r=>{if(r.data.asset){const response=await api.get<Blob>(r.data.asset.contentPath,{responseType:'blob',signal:c.signal});url=URL.createObjectURL(response.data);if(!c.signal.aborted)setImage({token,src:url});}}).catch(()=>{});return()=>{c.abort();if(url)URL.revokeObjectURL(url);};},[token,reload]);
 return image.token===token&&image.src?<img src={image.src} alt="Your profile" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:'inherit'}}/>:<>{user?.name?.slice(0,1).toUpperCase()??'T'}</>;
}
