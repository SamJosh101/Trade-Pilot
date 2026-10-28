import AdvancedTradeList from '../components/AdvancedTradeList';
import * as tradeQuery from '../services/tradeQueryService';
import StrategyTradeList from '../components/StrategyTradeList';
import TradeDeletionDialog from '../components/TradeDeletionDialog';
import { useEffect, useState } from 'react';
import { useTrades } from '../context/TradeContext';
import { useAccounts } from '../context/AccountContext';
import { useCapability } from '../hooks/useFinancial';
import { useTradePerformance } from '../hooks/useTradePerformance';
import { PageHeading, NewTrade, EmptyState } from '../components/WorkspaceUI';
import TradeListView from '../components/TradeListView';
import TradeDetailModal from '../components/TradeDetailModal';
import CalendarView from '../components/CalendarView';
import { exportTradesToCSV } from '../utils/csvExport';
import type { Trade } from '../types/trade';
export default function Trades() {
    const { trades, isLoading, error, fetchTrades, refreshAfterWrite } = useTrades();
    const { activeAccountId, activeAccount } = useAccounts();
    const capability = useCapability();
    const [advanced,setAdvanced]=useState<boolean|null>(null),[queryError,setQueryError]=useState(''),[queryAttempt,setQueryAttempt]=useState(0);
    useEffect(()=>{const c=new AbortController();setQueryError('');tradeQuery.capabilities(c.signal).then(r=>{if(!c.signal.aborted)setAdvanced(r.available);}).catch(e=>{if(!c.signal.aborted){setAdvanced(null);setQueryError(tradeQuery.message(e));}});return()=>c.abort();},[queryAttempt]);
    const {error:accountError,isLoading:accountLoading}=useAccounts();
    const [selected, setSelected] = useState<Trade | null>(null), [deleting, setDeleting] = useState<Pick<Trade,'id'> | null>(null), [deleteError, setDeleteError] = useState(''), [search, setSearch] = useState(''), [result, setResult] = useState<string | null>(null), [direction, setDirection] = useState(''), [status, setStatus] = useState(''), [timeframe, setTimeframe] = useState(''), [from, setFrom] = useState(''), [to, setTo] = useState(''), [sort, setSort] = useState('newest'), [compact, setCompact] = useState(false), [page, setPage] = useState(1), [view, setView] = useState('list'), [month, setMonth] = useState(() => sessionStorage.getItem('calendar-month') ?? new Date().toISOString().slice(0, 7));
    useEffect(() => { setSelected(null); setDeleting(null); setPage(1); setSearch(''); setResult(null); setDirection(''); setStatus(''); setTimeframe(''); setFrom(''); setTo(''); }, [activeAccountId]);
    useEffect(() => { setPage(1); }, [search, result, direction, status, timeframe, from, to, sort]);
    const filtered = trades.filter(t => (!search || t.pair.toLowerCase().includes(search.trim().toLowerCase())) && (!result || (result === 'Open' && !t.result) || t.result === result.toUpperCase()) && (!direction || t.direction === direction) && (!status || (status === 'UNKNOWN' ? !t.performance?.status : t.performance?.status === status)) && (!timeframe || t.timeframe === timeframe) && (!from || t.createdAt >= `${from}T00:00:00.000Z`) && (!to || t.createdAt < new Date(new Date(`${to}T00:00:00Z`).getTime() + 86400000).toISOString())).sort((a, b) => sort === 'symbol' ? a.pair.localeCompare(b.pair) : (sort === 'oldest' ? 1 : -1) * a.createdAt.localeCompare(b.createdAt));
    const pages = Math.max(1, Math.ceil(filtered.length / 10));
    const visible = filtered.slice((Math.min(page, pages) - 1) * 10, Math.min(page, pages) * 10);
    const { records, errors } = useTradePerformance(visible.map(t => t.id), !!capability.data && capability.data.schemaReady !== false && view === 'list');
    function askDelete(id:string){setDeleteError('');setDeleting({id});}
    return <>
    <PageHeading title="Trade log" description={`${activeAccount?.name ?? 'Choose an account'} · Every decision, in perspective.`}>
    {advanced===false&&<button className="button" disabled={!trades.length} onClick={() => exportTradesToCSV(trades)}>Export All Account Trades</button>}
    <NewTrade />
    </PageHeading>
    {advanced===false&&<p className="notice">Advanced filters and server CSV export require a separately approved compatible database upgrade. Existing journal controls remain available.</p>}
    <div className="journal-toolbar">
    <div className="segmented">
    <button className={view === 'list' ? 'active' : ''} onClick={() => setView('list')}>List</button>
    <button className={view === 'calendar' ? 'active' : ''} onClick={() => setView('calendar')}>Calendar</button>
    <button className={view==='strategy'?'active':''} onClick={()=>setView('strategy')}>By strategy</button></div>
    <span className="muted">{advanced?'Server-paginated journal':`${trades.length} logged`} · Legacy outcome and actual status are independent</span>
    <label className="check-field ml-auto">
    <input type="checkbox" checked={compact} onChange={e => setCompact(e.target.checked)}/>Compact columns</label>
    </div>{deleteError && !deleting && <p role="alert" className="notice error">Could not prepare trade deletion. {deleteError} Try the trade's Delete action again.</p>}{view==='strategy'?activeAccountId?<StrategyTradeList key={activeAccountId} accountId={activeAccountId} onTradeClick={setSelected} onDelete={askDelete}/>:<p className="notice">Choose a trading account.</p>:view === 'list' ? advanced===null?queryError?<p role="alert" className="notice error">Trade query availability could not load: {queryError}<button className="button" onClick={()=>setQueryAttempt(v=>v+1)}>Retry query availability</button></p>:<p role="status">Checking trade query availability…</p>:advanced&&activeAccountId?<AdvancedTradeList key={activeAccountId} accountId={activeAccountId} onTradeClick={setSelected} onDelete={askDelete} compact={compact}/>:<>
        <div className="filter-toolbar">
        <input type="search" aria-label="Search pair" placeholder="Search symbol…" value={search} onChange={e => setSearch(e.target.value)}/>
        <div className="segmented">{['All', 'Win', 'Loss', 'BE', 'Open'].map(r => <button key={r} className={(result === r || (!result && r === 'All')) ? 'active' : ''} onClick={() => setResult(r === 'All' ? null : r)}>{r==='Open'?'Unrecorded':r}</button>)}</div>
        <details className="filter-popover">
        <summary className="button">Filters</summary>
        <div className="filter-popover-content">
        <label className="field">Direction<select value={direction} onChange={e => setDirection(e.target.value)}>
        <option value="">All directions</option>
        <option>BUY</option>
        <option>SELL</option>
        </select>
        </label>
        <label className="field">Recorded actual status<select value={status} onChange={e => setStatus(e.target.value)}>
        <option value="">Any actual status</option>
        <option>OPEN</option>
        <option>PARTIAL</option>
        <option>CLOSED</option>
        <option value="UNKNOWN">Unknown</option>
        </select>
        </label>
        <label className="field">Timeframe<select value={timeframe} onChange={e => setTimeframe(e.target.value)}>
        <option value="">All timeframes</option>{[...new Set(trades.map(t => t.timeframe).filter(Boolean))].map(t => <option key={t} value={t!}>{t}</option>)}</select>
        </label>
        <label className="field">Logged from (UTC)<input type="date" value={from} onChange={e => setFrom(e.target.value)}/>
        </label>
        <label className="field">Logged through (UTC)<input type="date" value={to} onChange={e => setTo(e.target.value)}/>
        </label>
        <button className="button" onClick={() => { setDirection(''); setStatus(''); setTimeframe(''); setFrom(''); setTo(''); setResult(null); setSearch(''); }}>Reset filters</button>
        </div>
        </details>
        <select aria-label="Sort trades" value={sort} onChange={e => setSort(e.target.value)}>
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
        <option value="symbol">Symbol A–Z</option>
        </select>
        </div>{accountError && <p className="notice error" role="alert">Trading accounts could not load. Retry accounts above before viewing trades.</p>}{capability.data?.schemaReady === false && <p className="notice">Actual financial results are unavailable on this database. Your existing journal entries remain available.</p>}{errors.length > 0 && <p className="notice">Some actual results could not load (possibly rate limited). Unknown is shown; no totals have been inferred. Open trade details to retry an individual record.</p>}{!error && !accountError && !isLoading && !accountLoading && trades.length > 0 && filtered.length === 0 ? <EmptyState title="No trades match your filters" description="This account has journal entries. Clear the search or reset filters to show them."/> : <TradeListView trades={visible} isLoading={isLoading||(accountLoading&&!activeAccount)} error={error||(accountError?'Account information is unavailable. Retry accounts above.':'')} onRetry={() => fetchTrades(activeAccountId ?? undefined)} onTradeClick={setSelected} onDelete={askDelete} financial={records} compact={compact}/>}<div className="pagination">
        <span>{filtered.length} matching trades · Page {Math.min(page, pages)} of {pages}</span>
        <div className="flex gap-2">
        <button className="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</button>
        <button className="button" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</button>
        </div>
        </div>
        </> : <CalendarView key={activeAccountId} selectedMonth={month} onMonthChange={m => { setMonth(m); sessionStorage.setItem('calendar-month', m); }} onTradeClick={setSelected} accountId={activeAccountId ?? undefined}/>}<p className="muted section-gap">Filters reset when you switch accounts. Planned RR is a target. Legacy score adds planned RR for WIN and subtracts it for LOSS. Actual P&L and realized R come only from recorded financial evidence.</p>{selected && <TradeDetailModal trade={selected} onClose={() => setSelected(null)}/>}{deleting&&<TradeDeletionDialog id={deleting.id} accountId={activeAccountId} onClose={()=>setDeleting(null)} onDeleted={refreshAfterWrite}/>}</>;
}
