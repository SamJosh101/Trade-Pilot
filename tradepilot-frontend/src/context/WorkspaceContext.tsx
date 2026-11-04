import {createContext,useContext,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import api from '../api/apiClient';
import {useAuth} from '../hooks/useAuth';
export type Preferences={theme:'pitch'|'soft'|'light';density:'comfortable'|'compact';accent:'blue'|'green'|'ice';reduceMotion:boolean;defaultTimeframe?:string;defaultDirection?:'BUY'|'SELL'};
export const defaults:Preferences={theme:'pitch',density:'comfortable',accent:'blue',reduceMotion:false,defaultTimeframe:'15m',defaultDirection:'BUY'};
export type StrategyMeta={timeframe:string;pairs:string;conditions:string;entryRules:string;riskRules:string;exitRules:string;tags:string[]};
export type NoteMeta={pinned:boolean;tags:string[];strategyId:string|null};
export type PlanSession={session:string;pairs:string;timeframe:string;answers:Record<string,boolean>;startedAt:string|null;sessionDate:string};
type Entry={key:string;value:unknown;revision:number};
type State={preferences:Preferences;entries:Record<string,Entry>;loading:boolean;server:boolean;error:string;save:(key:string,value:unknown)=>Promise<void>;setPreferences:(patch:Partial<Preferences>)=>Promise<void>};
const Context=createContext<State|null>(null);
function apply(p:Preferences){const d=document.documentElement;d.dataset.theme=p.theme;d.dataset.density=p.density;d.dataset.accent=p.accent;d.dataset.motion=p.reduceMotion?'reduced':'system';d.style.colorScheme=p.theme==='light'?'light':'dark';}
export function WorkspaceProvider({children}:{children:ReactNode}){
 const {user,isLoading:authLoading}=useAuth(),userId=user?.id,[entries,setEntries]=useState<Record<string,Entry>>({}),[preferences,setPref]=useState<Preferences>(defaults),[loading,setLoading]=useState(true),[server,setServer]=useState(false),[error,setError]=useState('');
 const latest=useRef(entries);latest.current=entries;const owner=useRef(userId);owner.current=userId;
 useLayoutEffect(()=>{if(authLoading)return;const c=new AbortController();setEntries({});setServer(false);setLoading(true);let initial=defaults;try{initial={...defaults,...JSON.parse(localStorage.getItem(`tradepilot:preferences:${userId}`)??'{}')};}catch{/* defaults */}setPref(initial);apply(initial);if(!userId){setLoading(false);return()=>c.abort();}
 api.get<{items:Entry[]}>('/workspace/entries',{signal:c.signal}).then(r=>{if(c.signal.aborted)return;const map=Object.fromEntries(r.data.items.map(e=>[e.key,e]));setEntries(map);setServer(true);if(map.preferences){const p={...defaults,...map.preferences.value as Preferences};setPref(p);apply(p);try{localStorage.setItem(`tradepilot:preferences:${userId}`,JSON.stringify(p));localStorage.setItem('tradepilot:appearance',JSON.stringify(p));}catch{/* server persists */}}}).catch(()=>{if(!c.signal.aborted)setServer(false);}).finally(()=>{if(!c.signal.aborted)setLoading(false);});return()=>c.abort();},[userId,authLoading]);
 async function save(key:string,value:unknown){const id=userId;if(!id)throw new Error('Sign in to save preferences.');if(!server){if(key!=='preferences')throw new Error('Workspace metadata needs the additive workspace migration. Your draft is preserved.');try{localStorage.setItem(`tradepilot:preferences:${id}`,JSON.stringify(value));localStorage.setItem('tradepilot:appearance',JSON.stringify(value));}catch{throw new Error('Browser storage is unavailable; preferences could not be saved.');}return;}
 const r=await api.put<Entry>(`/workspace/entries/${encodeURIComponent(key)}`,{value,revision:latest.current[key]?.revision??-1});if(owner.current===id){latest.current={...latest.current,[key]:r.data};setEntries(latest.current);}}
 async function setPreferences(patch:Partial<Preferences>){if(loading)throw new Error('Saved preferences are still loading. Please wait.');const next={...preferences,...patch};setError('');try{await save('preferences',next);setPref(next);apply(next);try{localStorage.setItem(`tradepilot:preferences:${userId}`,JSON.stringify(next));localStorage.setItem('tradepilot:appearance',JSON.stringify(next));}catch{/* server saved */}}catch(e){setError(e instanceof Error?e.message:'Preference save failed. Reload to inspect the latest version.');throw e;}}
 return <Context.Provider value={{preferences,entries,loading,server,error,save,setPreferences}}>{children}</Context.Provider>;
}
export function useWorkspace(){const c=useContext(Context);if(!c)throw new Error('Workspace provider missing');return c;}
