import {useEffect,useState} from 'react';
import {useAuth} from './useAuth';
import * as api from '../services/strategyService';
export function useStrategyCapability(){
 const {token}=useAuth();const [attempt,setAttempt]=useState(0),[state,setState]=useState({token:null as string|null,loading:true,available:false,error:''});
 useEffect(()=>{const c=new AbortController();setState({token,loading:!!token,available:false,error:''});if(token)api.capabilities(c.signal).then(r=>{if(!c.signal.aborted)setState({token,loading:false,available:r.protocol==='strategies-v1'&&r.available,error:''});}).catch(e=>{if(!c.signal.aborted)setState({token,loading:false,available:false,error:api.errorMessage(e)});});return()=>c.abort();},[token,attempt]);
 return {...(state.token===token?state:{loading:!!token,available:false,error:''}),retry:()=>setAttempt(v=>v+1)};
}
