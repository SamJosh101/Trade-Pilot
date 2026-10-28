import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeading, NewTrade, Panel } from '../components/WorkspaceUI';
import CalendarView from '../components/CalendarView';
import TradeDetailModal from '../components/TradeDetailModal';
import RealizedPanel from '../components/RealizedPanel';
import TradeDayDrawer from '../components/TradeDayDrawer';
import { useAccounts } from '../context/AccountContext';
import type { Trade } from '../types/trade';
export default function Calendar() {
    const { activeAccountId } = useAccounts();
    const [mode, setMode] = useState('logged'), [month, setMonth] = useState(() => sessionStorage.getItem('calendar-month') ?? new Date().toISOString().slice(0, 7)), [selected, setSelected] = useState<Trade | null>(null), [daySelection,setDaySelection] = useState<{accountId:string|null;date:string}|null>(null);
    const [drawer,setDrawer]=useState<{accountId:string|null;date:string}|null>(null);
    const day=daySelection?.accountId===activeAccountId?daySelection.date:null;
    useEffect(()=>setSelected(null),[activeAccountId]);
    const start = new Date(`${month}-01T00:00:00Z`), count = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    function move(n: number) { const d = new Date(`${month}-01T00:00:00Z`); d.setUTCMonth(d.getUTCMonth() + n); setMonth(d.toISOString().slice(0, 7)); sessionStorage.setItem('calendar-month', d.toISOString().slice(0, 7)); setDaySelection(null); }
    return <>
    <PageHeading title="Trading calendar" description="One record, two date perspectives. Never inferred.">
    <NewTrade />
    </PageHeading>
    <div className="tabs">
    <button className={mode === 'logged' ? 'active' : ''} onClick={() => setMode('logged')}>Logged dates · legacy score</button>
    <button className={mode === 'closed' ? 'active' : ''} onClick={() => setMode('closed')}>Actual close dates · realized results</button>
    </div>{mode === 'logged' ? <Panel title="Journal activity">
        <CalendarView key={activeAccountId} selectedMonth={month} onMonthChange={m => { setMonth(m); sessionStorage.setItem('calendar-month', m); }} accountId={activeAccountId ?? undefined} onTradeClick={setSelected}/>
        </Panel> : <>
        <Panel title="Select an actual closing date (UTC)">
        <div className="flex items-center justify-between">
        <button className="icon-button" aria-label="Previous month" onClick={() => move(-1)}>
        <ChevronLeft size={18}/>
        </button>
        <strong>{start.toLocaleDateString(undefined, { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
        <button className="icon-button" aria-label="Next month" onClick={() => move(1)}>
        <ChevronRight size={18}/>
        </button>
        </div>
        <p className="muted section-gap">Choose a day to load authoritative completed results. Empty cells do not imply zero; missing close dates remain in coverage.</p>
        <div className="actual-calendar section-gap">{['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <span className="muted" key={d}>{d}</span>)}{Array.from({ length: start.getUTCDay() }, (_, i) => <span key={`space-${i}`}/>)}{Array.from({ length: count }, (_, i) => { const date = `${month}-${String(i + 1).padStart(2, '0')}`; return <button key={date} aria-label={`Actual results for ${date}`} aria-pressed={day === date} className={day === date ? 'selected' : ''} onClick={() => {setDaySelection({accountId:activeAccountId,date});setDrawer({accountId:activeAccountId,date});}}>{i + 1}</button>; })}{Array.from({length:42-start.getUTCDay()-count},(_,i)=><span aria-hidden="true" key={`end-${i}`}/>)}</div>
        </Panel>
        <div className="section-gap">
        <RealizedPanel fixedFilter={{ from: `${day ?? `${month}-01`}T00:00:00.000Z`, to: day ? new Date(new Date(`${day}T00:00:00Z`).getTime() + 86400000).toISOString() : new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1)).toISOString() }}/>
        </div>
        </>}{drawer&&drawer.accountId===activeAccountId&&<TradeDayDrawer initialDate={drawer.date} onClose={()=>setDrawer(null)} onTradeClick={setSelected}/>} {selected&&selected.accountId===activeAccountId && <TradeDetailModal trade={selected} onClose={() => setSelected(null)}/>}</>;
}
