import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, CalendarDays, BarChart3, List, NotebookPen, Save } from 'lucide-react';
import ServerDayNotes from './ServerDayNotes';
import { Dialog } from './WorkspaceUI';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../context/AccountContext';
import { useTrades } from '../context/TradeContext';
import { useSummary } from '../hooks/useFinancial';
import { formatDecimal, moneyTone, unitLabel, scoreTone } from '../utils/decimal';
import { legacyTradeScore } from '../utils/tradePerformance';
import { matchesJournalFilter, type JournalFilter } from '../utils/dashboardLayout';
import CalendarPopoverRow from './CalendarPopoverRow';
import type { Trade } from '../types/trade';

function offsetDay(date:string, amount:number){const d=new Date(`${date}T00:00:00Z`);d.setUTCDate(d.getUTCDate()+amount);return d.toISOString().slice(0,10);}
export default function TradeDayDrawer({initialDate,onClose,onTradeClick,filter}: {initialDate:string;onClose:()=>void;onTradeClick:(trade:Trade)=>void;filter?:JournalFilter}) {
  const { user }=useAuth(); const {activeAccount,activeAccountId}=useAccounts();
  const [date,setDate]=useState(initialDate),[tab,setTab]=useState<'stats'|'trades'|'notes'>('stats');
  const {trades,isLoading,error,fetchTrades}=useTrades();
  const entries=trades.filter(t=>t.accountId===activeAccountId&&t.createdAt.slice(0,10)===date&&(!filter||matchesJournalFilter(t,filter)));
  const summary=useSummary({from:`${date}T00:00:00.000Z`,to:`${offsetDay(date,1)}T00:00:00.000Z`});
  const key=`tradepilot:day-note:${user?.id}:${activeAccountId}:${date}`;
  const [noteState,setNoteState]=useState<{key:string;value:string;saved:string;error:string}|null>(null);
  function readNote(){try{return {key,value:localStorage.getItem(key)??'',saved:localStorage.getItem(key)??'',error:''};}catch{return {key,value:'',saved:'',error:'Browser storage is unavailable. Notes cannot be saved.'};}}
  const note=noteState?.key===key?noteState:readNote();
  const [message,setMessage]=useState('');
  const dirty=note.value!==note.saved;
  useEffect(()=>{if(!dirty)return;const protect=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue='';};window.addEventListener('beforeunload',protect);return()=>window.removeEventListener('beforeunload',protect);},[dirty]);
  function canLeave(){return note.value===note.saved||window.confirm('Discard unsaved changes to this day note?');}
  function close(){if(canLeave())onClose();}
  function move(next:string){if(/^\d{4}-\d{2}-\d{2}$/.test(next)&&Number.isFinite(Date.parse(next))&&canLeave()){setDate(next);setMessage('');}}
  function saveNote(){try{localStorage.setItem(key,note.value);setNoteState({...note,saved:note.value,error:''});setMessage('Day note saved in this browser.');}catch{setNoteState({...note,error:'Could not save. Your note is still here; copy it before leaving.'});}}
  const score=entries.reduce((sum,t)=>sum+legacyTradeScore(t),0);
  const tabs=[{id:'stats',label:'Stats',icon:BarChart3},{id:'trades',label:'Trades',icon:List},{id:'notes',label:'Day Note',icon:NotebookPen}] as const;
  return <Dialog title="Trade day" className="trade-day-drawer" onClose={close}>
    <div className="day-drawer-context"><span>{activeAccount?.name} · UTC</span><h3>{new Date(`${date}T00:00:00Z`).toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</h3></div>
    <div className="day-date-controls"><button className="icon-button" aria-label="Previous day" onClick={()=>move(offsetDay(date,-1))}><ChevronLeft size={18}/></button><label><CalendarDays size={16} aria-hidden="true"/><input aria-label="Trade day date" type="date" value={date} onChange={e=>move(e.target.value)}/></label><button className="icon-button" aria-label="Next day" onClick={()=>move(offsetDay(date,1))}><ChevronRight size={18}/></button></div>
    <section className="day-actual"><span className="metric-label">Actual net P&amp;L · closed this day</span>{summary.loading?<p role="status" className="muted">Loading actual closing results…</p>:summary.error?<><strong className="muted">Unavailable</strong><details><summary>Why unavailable?</summary><p>{summary.error}</p><button className="button" onClick={summary.retry}>Retry actual results</button></details></>:summary.data?.totals.length?summary.data.totals.map(t=><div key={t.moneyUnitKey}><strong className={moneyTone(t.netPnl)} title={t.netPnl??'Unknown'}>{formatDecimal(t.netPnl)}</strong><span>{unitLabel(t.moneyUnitKey)} · {t.knownNetCount}/{t.closedCount} known</span></div>):<><strong className="muted">Unknown</strong><p className="muted">No eligible completed results for this closing date.</p></>}<small>Actual close dates; journal filters do not apply.</small></section>
    <div className="tabs day-tabs" onKeyDown={e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();const index=tabs.findIndex(t=>t.id===tab);const next=e.key==='Home'?0:e.key==='End'?2:(index+(e.key==='ArrowRight'?1:2))%3;setTab(tabs[next].id);document.getElementById(`day-tab-${tabs[next].id}`)?.focus();}} role="tablist" aria-label="Trade day sections">{tabs.map(({id,label,icon:Icon})=><button key={id} role="tab" id={`day-tab-${id}`} aria-controls={`day-panel-${id}`} aria-selected={tab===id} tabIndex={tab===id?0:-1} className={tab===id?'active':''} onClick={()=>setTab(id)}><Icon size={15} aria-hidden="true"/>{label}</button>)}</div>
    <div role="tabpanel" id={`day-panel-${tab}`} aria-labelledby={`day-tab-${tab}`} className="day-tab-content">
    {tab==='notes'?<><ServerDayNotes accountId={activeAccountId} dayDate={date} canLeave={canLeave}/><h3>Browser-only day note</h3><p className="muted">Private to this browser, profile and trading account. Not synced or backed up to your account.</p><label className="day-note-label">Your reflection<textarea rows={10} maxLength={30000} value={note.value} onChange={e=>{setNoteState({...note,value:e.target.value});setMessage('');}} placeholder="What went well? What will you change?"/></label>{note.error&&<p role="alert" className="notice error">{note.error}</p>}<div className="day-note-actions"><button className="button primary" onClick={saveNote}><Save size={15}/>Save day note</button><button className="button" disabled={note.value===note.saved} onClick={()=>{setNoteState({...note,value:note.saved});setMessage('Changes discarded.');}}>Discard changes</button></div><p role="status" className="muted">{message|| (note.value!==note.saved?'Unsaved changes':'')}</p></>:isLoading?<p role="status">Loading journal entries…</p>:error?<div role="alert" className="notice error">Journal entries could not load.<button className="button" onClick={()=>void fetchTrades(activeAccountId??undefined)}>Retry entries</button></div>:tab==='trades'?<><p className="muted">{entries.length} journal entries logged on this UTC day{filter&&Object.values(filter).some(Boolean)?' matching dashboard filters':''}.</p><div className="day-trades">{entries.map(t=><CalendarPopoverRow key={t.id} trade={t} onClick={()=>{if(canLeave()){onClose();onTradeClick(t);}}}/>)}</div>{!entries.length&&<p className="day-empty">No journal entries in this day's selected scope.</p>}</>:<><p className="muted">Journal statistics · logged date{filter&&Object.values(filter).some(Boolean)?' · filtered':''}</p><dl className="day-stat-grid"><div><dt>Total trades</dt><dd>{entries.length}</dd></div><div><dt>Legacy journal score</dt><dd className={scoreTone(score)}>{score.toFixed(2)} R</dd></div><div><dt>Wins / losses</dt><dd>{entries.filter(t=>t.result==='WIN').length} / {entries.filter(t=>t.result==='LOSS').length}</dd></div><div><dt>Break-even / unrecorded</dt><dd>{entries.filter(t=>t.result==='BE').length} / {entries.filter(t=>!t.result).length}</dd></div></dl><p className="muted">Legacy score uses planned RR and journal labels. It is separate from actual net P&amp;L.</p></>}
    </div>
  </Dialog>;
}
