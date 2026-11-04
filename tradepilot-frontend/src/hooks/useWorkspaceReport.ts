import {useEffect,useState} from 'react';
import api from '../api/apiClient';
import {useAccounts} from '../context/AccountContext';
import {useTrades} from '../context/TradeContext';
import type {Calculation} from '../types/financial';
export type ReportRecord=Calculation&{id:string;pair:string;direction:string;createdAt:string;closedAt:string|null;initialRisk:string|null};
export type ReportGroup={unit:string;net:string|null;meanR:string|null;winRate:string|null;profitFactor:string|null;profitFactorReason:string|null;wins:number;losses:number;breakeven:number;closed:number;known:number;knownR:number;daily:{date:string;net:string;cumulative:string;count:number}[];pairs:{pair:string;count:number;known:number;net:string|null}[]};
export type Report={groups:ReportGroup[];records:ReportRecord[];coverage:{total:number;eligible:number;unknown:number;undated:number;open:number;partial:number}};
export function dateRange(period:string){if(period==='all')return {};const now=new Date(),from=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()));if(period==='month')from.setUTCDate(1);else from.setUTCDate(from.getUTCDate()-Number(period)+1);return {from:from.toISOString(),to:new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth(),now.getUTCDate()+1)).toISOString()};}
export function useWorkspaceReport(period='all'){
 const {activeAccountId}=useAccounts(),{revision}=useTrades(),[attempt,setAttempt]=useState(0),filter=dateRange(period),key=JSON.stringify([activeAccountId,revision,filter,attempt]);
 const [state,setState]=useState<{key:string;data:Report|null;error:string;loading:boolean}>({key:'',data:null,error:'',loading:true});
 useEffect(()=>{const [accountId,,range]=JSON.parse(key);const c=new AbortController();if(!accountId){setState({key,data:null,error:'',loading:false});return()=>c.abort();}api.get<Report>('/workspace/report',{params:{accountId,...range},signal:c.signal}).then(r=>{if(!c.signal.aborted)setState({key,data:r.data,error:'',loading:false});}).catch(()=>{if(!c.signal.aborted)setState({key,data:null,error:'Actual results could not load. No financial totals have been inferred.',loading:false});});return()=>c.abort();},[key]);
 return {...(state.key===key?state:{data:null,error:'',loading:true}),retry:()=>setAttempt(v=>v+1)};
}
