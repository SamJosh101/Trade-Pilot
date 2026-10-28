import {useEffect,useState} from 'react';
import {useAuth} from './useAuth';
import * as notes from '../services/notesService';
export function useNotesCapability(){
 const {token}=useAuth();const [attempt,setAttempt]=useState(0),[state,setState]=useState({token:null as string|null,loading:true,available:false,error:''});
 useEffect(()=>{const controller=new AbortController();setState({token,loading:!!token,available:false,error:''});if(token)notes.capabilities(controller.signal).then(result=>{if(!controller.signal.aborted)setState({token,loading:false,available:result.protocol==='notes-v1'&&result.available,error:''});}).catch(error=>{if(!controller.signal.aborted)setState({token,loading:false,available:false,error:notes.errorMessage(error)});});return()=>controller.abort();},[token,attempt]);
 return {...(state.token===token?state:{loading:!!token,available:false,error:''}),retry:()=>setAttempt(n=>n+1)};
}
