import {useEffect,useState} from 'react';
import {useAuth} from './useAuth';
import {useAccounts} from '../context/AccountContext';
import {useTrades} from '../context/TradeContext';

// Tag both successful and failed responses with their scope. A changed account
// immediately renders loading instead of briefly showing the previous account.
export function useAccountResource<T>(load:(accountId:string)=>Promise<T>) {
 const {token}=useAuth(),{activeAccountId}=useAccounts(),{revision}=useTrades();
 const [reload,setReload]=useState(0);
 const key=JSON.stringify([token,activeAccountId,revision,reload]);
 const [state,setState]=useState<{key:string;data:T|null;failed:boolean;loading:boolean}>({key:'',data:null,failed:false,loading:true});
 useEffect(()=>{
  let current=true;
  setState({key,data:null,failed:false,loading:!!activeAccountId});
  if(activeAccountId)load(activeAccountId).then(data=>{
   if(current)setState({key,data,failed:false,loading:false});
  }).catch(()=>{if(current)setState({key,data:null,failed:true,loading:false})});
  return()=>{current=false};
 },[key,activeAccountId,load]);
 return {...(state.key===key?state:{data:null,failed:false,loading:!!activeAccountId}),retry:()=>setReload(n=>n+1)};
}
