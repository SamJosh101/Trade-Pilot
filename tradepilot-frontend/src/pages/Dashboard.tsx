import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { SlidersHorizontal, ArrowUp, ArrowDown, RotateCcw, ArrowUpRight, GripVertical, Minus, Plus, Filter, Hash, Percent, Activity, CircleDollarSign } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../hooks/useAuth';
import { useAccounts } from '../context/AccountContext';
import { useTrades } from '../context/TradeContext';
import { PageHeading, NewTrade, Panel, Skeleton, EmptyState, Badge } from '../components/WorkspaceUI';
import { scoreTone, winRateTone, winRateGuidance } from '../utils/decimal';
import WidgetCatalog from '../components/WidgetCatalog';
import { defaultLayout, widgetDefinitions, readLayout, emptyJournalFilter, matchesJournalFilter, summarizeJournal, type Widget, type JournalFilter } from '../utils/dashboardLayout';
import { useSummary } from '../hooks/useFinancial';
import { formatDecimal, moneyTone, unitLabel } from '../utils/decimal';
import CalendarView from '../components/CalendarView';
import TradeDetailModal from '../components/TradeDetailModal';
import * as dashboardService from '../services/dashboardService';
import * as analyticsService from '../services/analyticsService';
import type { Metrics } from '../types/dashboard';
import type { Analytics } from '../types/analytics';
import type { Trade } from '../types/trade';
import {useAccountResource} from '../hooks/useAccountResource';
async function loadDashboard(accountId:string){const [metrics,analytics]=await Promise.all([dashboardService.getMetrics(accountId),analyticsService.getAnalytics(accountId)]);return {metrics,analytics};}
export default function Dashboard() {
    const { user } = useAuth();
    const { activeAccount, activeAccountId, error:accountError, isLoading:accountLoading } = useAccounts();
    const { trades, isLoading:tradesLoading, error:tradesError, fetchTrades } = useTrades();
    const resource=useAccountResource(loadDashboard);
    const financial = useSummary();
    const [editing,setEditing]=useState(false),[catalog,setCatalog]=useState(false),[selected,setSelected]=useState<Trade|null>(null),[month,setMonth]=useState(()=>new Date().toISOString().slice(0,7));
    const [filterScope,setFilterScope]=useState<{account:string|null;value:JournalFilter}>({account:activeAccountId,value:{...emptyJournalFilter}});
    const filter=filterScope.account===activeAccountId?filterScope.value:emptyJournalFilter;
    const [filtersOpen,setFiltersOpen]=useState(false);
    const filtered=Object.values(filter).some(Boolean);
    const visibleTrades=trades.filter(t=>matchesJournalFilter(t,filter));
    const scoped=filtered?summarizeJournal(visibleTrades):null;
    const metrics:Metrics|null=scoped?.metrics??resource.data?.metrics??null, analytics:Analytics|null=scoped?.analytics??resource.data?.analytics??null;
    useEffect(()=>{setSelected(null);setFiltersOpen(false);setFilterScope({account:activeAccountId,value:{...emptyJournalFilter}});},[activeAccountId]);
    const storageKey = `tradepilot:layout:${user?.id ?? 'anonymous'}`;
    const [saved,setSaved]=useState(()=>({key:storageKey,layout:readLayout(storageKey)}));
    const [draft,setDraft]=useState<Widget[]>([]);
    const [layoutError,setLayoutError]=useState('');
    const [announcement,setAnnouncement]=useState('');
    const dragged=useRef<Widget|null>(null);
    const layout=editing?draft:saved.key===storageKey?saved.layout:readLayout(storageKey);
    useEffect(()=>{setSaved({key:storageKey,layout:readLayout(storageKey)});setEditing(false);setCatalog(false);},[storageKey]);
    function beginEdit(){setDraft([...layout]);setLayoutError('');setEditing(true);}
    function cancelEdit(){setEditing(false);setCatalog(false);setLayoutError('');}
    function saveLayout(){try{localStorage.setItem(storageKey,JSON.stringify(draft));setSaved({key:storageKey,layout:[...draft]});setEditing(false);setCatalog(false);setAnnouncement('Dashboard layout saved in this browser.');}catch{setLayoutError('Layout could not be saved in this browser. Your draft is still available.');}}
    function moveWidget(id:Widget,target:number){setDraft(current=>{const next=current.filter(w=>w!==id);next.splice(Math.max(0,Math.min(target,next.length)),0,id);return next;});setAnnouncement(`${widgetDefinitions[id].label} moved.`);}
    function setFilter(name:keyof JournalFilter,value:string){setFilterScope({account:activeAccountId,value:{...filter,[name]:value}});}
    const recent=[...visibleTrades].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).slice(0,5);
    const journalMetrics = {
      total: { label: 'Total trades', value: metrics?.totalTrades ?? 0, help: 'Logged journal entries', tone: '', icon:Hash },
      winRate: { label: 'Journal win rate', value: metrics?.totalTrades ? `${Number(metrics.winRate.toFixed(2))}%` : 'Unknown', help: 'WIN labels / logged trades', tone: winRateTone(metrics?.totalTrades ? metrics.winRate : null), icon:Percent },
      score: { label: 'Legacy journal score', value: `${metrics?.netRR ?? 0} R`, help: 'Outcome-weighted planned RR', tone:scoreTone(metrics?.netRR), icon:Activity },
      average: { label: 'Average legacy score', value: metrics?.avgRR ?? 0, help: 'Legacy score per logged trade', tone:scoreTone(metrics?.avgRR), icon:Activity },
    };
    const outcomes = analytics ? [{ name: 'WIN', value: analytics.winLossBreakdown.win, color: '#65ba91' }, { name: 'LOSS', value: analytics.winLossBreakdown.loss, color: '#e1847d' }, { name: 'BE', value: analytics.winLossBreakdown.breakEven, color: '#a7a7af' }, { name: 'Unrecorded', value: analytics.winLossBreakdown.open, color: '#444448' }] : [];
    return <>
    <div className="dashboard-heading"><PageHeading title={`Welcome back, ${user?.name?.split(' ')[0] ?? 'trader'}`} description="Your trading workspace">
    <button className="button" onClick={beginEdit}>
    <SlidersHorizontal size={14}/>Edit layout</button>
    <NewTrade />
    </PageHeading></div>
    <div className="dashboard-context">
    <span className="account-context-name">{activeAccount?.name ?? 'No trading account'}</span>
    <span className="muted">Journal overview · {filtered ? `${visibleTrades.length} matching entries` : 'All logged dates'}</span><button className="button" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(v=>!v)}><Filter size={14}/>Journal filters{filtered?' · active':''}</button>
    <Link to="/analytics" className="muted ml-auto">Explore analytics <ArrowUpRight size={12} className="inline"/>
    </Link>
    </div>
    {filtersOpen&&<div className="dashboard-filters"><label>Symbol<input value={filter.pair} onChange={e=>setFilter('pair',e.target.value)} placeholder="e.g. XAUUSD"/></label><label>Result<select value={filter.result} onChange={e=>setFilter('result',e.target.value)}><option value="">All results</option><option>WIN</option><option>LOSS</option><option>BE</option><option value="UNRECORDED">Unrecorded</option></select></label><label>Direction<select value={filter.direction} onChange={e=>setFilter('direction',e.target.value)}><option value="">Both directions</option><option>BUY</option><option>SELL</option></select></label><label>Logged from (UTC)<input type="date" value={filter.from} max={filter.to||undefined} onChange={e=>setFilter('from',e.target.value)}/></label><label>Logged through (UTC)<input type="date" value={filter.to} min={filter.from||undefined} onChange={e=>setFilter('to',e.target.value)}/></label><button className="button" onClick={()=>setFilterScope({account:activeAccountId,value:{...emptyJournalFilter}})}>Clear filters</button><p className="muted">Applies to journal cards, entries and logged calendar. Actual financial cards retain all actual closing dates.</p>{filter.from&&filter.to&&filter.from>filter.to&&<p role="alert">The start date must be on or before the end date.</p>}</div>}
    {editing&&<div className="layout-edit-toolbar"><span><GripVertical size={16}/>Drag cards to rearrange, or use their arrow buttons.</span><button className="button" onClick={()=>setCatalog(true)}><Plus size={15}/>Widget catalog</button><button className="button" onClick={()=>setDraft([...defaultLayout])}><RotateCcw size={14}/>Restore defaults</button><button className="button" onClick={cancelEdit}>Cancel layout</button><button className="button primary" onClick={saveLayout}>Save layout</button></div>}
    {layoutError&&<p role="alert" className="notice error">{layoutError}</p>}<span className="sr-only" role="status">{announcement}</span>
    {accountError ? <div className="notice error" role="alert">Account information is unavailable. Retry accounts above.</div> : resource.loading||tradesLoading||(accountLoading&&!activeAccount) ? <Skeleton /> : resource.failed||!!tradesError ? <div className="notice error" role="alert">Failed to load journal overview. No trade count has been confirmed.<button className="button" onClick={()=>{resource.retry();void fetchTrades(activeAccountId??undefined);}}>Retry</button>
        </div> : !activeAccount ? <EmptyState title="Your trading story starts here" description="Create an account to keep your journal and actual results in one place." action={<Link to="/accounts" className="button primary">Create your first account</Link>}/> : <><div className="account-empty-notice" role="status" hidden={metrics?.totalTrades!==0}>No trades in <strong>{activeAccount.name}</strong>. This account loaded successfully. Select another account to view its journal.</div>{filtered&&visibleTrades.length===0&&<div className="notice" role="status">No journal entries match these filters. Clear filters to see all entries.</div>}{layout.length===0&&<EmptyState title="Your dashboard is clear" description="Add cards from the widget catalog." action={<button className="button" onClick={()=>{beginEdit();setCatalog(true);}}>Add widgets</button>}/>}<div className={`dashboard-grid dashboard-widget-grid ${editing?'is-editing':''}`}>{layout.map((widget,index) => {
                const renderWidget = () => {
                switch (widget) {
                    case 'total': case 'winRate': case 'score': case 'average': {
                      const m=journalMetrics[widget],Icon=m.icon;
                      return <section className="panel metric-widget journal-metric"><div className="metric-card-heading"><span className="metric-label">{m.label}</span><Icon size={18} strokeWidth={1.5}/></div><strong className={`metric-value ${m.tone}`} title={widget==='winRate'?winRateGuidance:undefined}>{m.value}</strong><span className="metric-help">{m.help}</span></section>;
                    }
                    case 'open': {const known=visibleTrades.every(t=>t.performance?.status);return <section className="panel metric-widget"><div className="metric-card-heading"><span>Open positions</span><Activity size={18} strokeWidth={1.5}/></div><strong className={`metric-value ${known?'':'muted'}`}>{known?visibleTrades.filter(t=>t.performance?.status==='OPEN').length:'Unknown'}</strong><span className="metric-help">{known?'Recorded OPEN status · journal scope':'Actual status is missing. Unrecorded outcomes do not imply open positions.'}</span></section>;}
                    case 'net': case 'realizedR': case 'netWin': {
                      const field=widget==='net'?'netPnl':widget==='realizedR'?'meanRealizedR':'netWinRate';
                      return <section className="panel metric-widget financial-widget"><div className="metric-card-heading"><span>{widgetDefinitions[widget].label}</span>{widget==='net'?<CircleDollarSign size={18} strokeWidth={1.5}/>:widget==='realizedR'?<Activity size={18} strokeWidth={1.5}/>:<Percent size={18} strokeWidth={1.5}/>}</div>{financial.loading?<span className="muted" role="status">Loading actual results…</span>:financial.error?<><strong className="metric-value muted">Unavailable</strong><details><summary>Why unavailable?</summary><p>{financial.error}</p><button className="button" onClick={financial.retry}>Retry actual performance</button></details></>:financial.data?.totals.length?financial.data.totals.map(t=><div className="financial-widget-value" key={t.moneyUnitKey}><strong className={`metric-value ${widget==='netWin'?winRateTone(t[field]):moneyTone(t[field])}`} title={t[field]??'Unknown'}>{formatDecimal(t[field])}{widget==='netWin'&&t[field]!==null?'%':''}</strong><span>{unitLabel(t.moneyUnitKey)} · {widget==='realizedR'?t.knownRCount:t.knownNetCount}/{t.closedCount} known</span></div>):<strong className="metric-value muted">Unknown</strong>}<span className="metric-help">Completed results · all close dates · user reported</span><Link to="/analytics" className="metric-detail-link">Coverage & details <ArrowUpRight size={12}/></Link></section>;
                    }
                    case 'activity': return <Panel key={widget} title="Legacy score history" className="span-8 score-panel" surface="edge" action={<span className="badge">Planned journal R</span>}>{analytics?.equityCurve.length ? <>
                        <div className="chart-area">
                        <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analytics.equityCurve}>
                        <XAxis dataKey="date" tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} tick={{ fill: '#98989f', fontSize: 10 }} axisLine={false} tickLine={false} minTickGap={35}/>
                        <YAxis width={38} tick={{ fill: '#98989f', fontSize: 10 }} axisLine={false} tickLine={false}/>
                        <Tooltip contentStyle={{ background: '#202023', border: '1px solid #3c3c42', borderRadius: 8, color: '#fff' }} labelFormatter={d => new Date(String(d)).toLocaleDateString()}/>
                        <Area type="monotone" name="Legacy score (R)" dataKey="cumulativeRR" stroke="#b4b5bd" strokeWidth={2} fill="#a0a0ab0a" isAnimationActive={false}/>
                        </AreaChart>
                        </ResponsiveContainer>
                        </div>
                        <p className="muted">Legacy planned-score history. This is not monetary equity or actual realized R.</p>
                        <details>
                        <summary className="muted section-gap">Accessible data table</summary>
                        <table className="financial-table">
                        <tbody>{analytics.equityCurve.map((p, i) => <tr key={i}>
                            <th>{new Date(p.date).toLocaleDateString()}</th>
                            <td>{p.cumulativeRR} R</td>
                            </tr>)}</tbody>
                        </table>
                        </details>
                        </> : <EmptyState title="No score history yet" description="Your recorded journal outcomes will appear here."/>}</Panel>;
                    case 'direction': return <Panel key={widget} title="Journal outcomes" className="span-4" surface="wash">{(metrics?.totalTrades??0)>0 ? <>
                        <div className="outcome-donut">
                        <ResponsiveContainer width="100%" height={150}>
                        <PieChart>
                        <Pie data={outcomes.filter(o => o.value > 0)} dataKey="value" innerRadius={50} outerRadius={64} stroke="none" isAnimationActive={false}>{outcomes.filter(o => o.value > 0).map(o => <Cell key={o.name} fill={o.color}/>)}</Pie>
                        </PieChart>
                        </ResponsiveContainer>
                        <div>
                        <strong>{metrics?.totalTrades}</strong>
                        <span>trades logged</span>
                        </div>
                        </div>
                        <div className="outcome-legend">{outcomes.map(o => <div key={o.name}>
                            <span>
                            <i style={{ background: o.color }}/>{o.name}</span>
                            <strong>{o.value}</strong>
                            </div>)}</div>
                        <div className="direction-strip">
                        <span>BUY {analytics?.directionBreakdown.buy ?? 0}</span>
                        <span>SELL {analytics?.directionBreakdown.sell ?? 0}</span>
                        </div>
                        <div className="direction-strip section-gap">
                        <span>Best legacy pair: {metrics?.bestPair ?? 'Unknown'}</span>
                        <span>Worst: {metrics?.worstPair ?? 'Unknown'}</span>
                        </div>
                        </> : <EmptyState title="No outcomes recorded"/>}</Panel>;
                    case 'recent': return <Panel key={widget} title="Recent journal entries" className="span-5 recent-panel" surface="quiet" action={<Link to="/trades">View trade log →</Link>}>{tradesLoading ? <Skeleton/> : tradesError ? <div className="notice error" role="alert">Recent trades could not load.<button className="button" onClick={()=>void fetchTrades(activeAccountId??undefined)}>Retry recent trades</button></div> : recent.length ? <div className="recent-list">{recent.map(t => <button key={t.id} onClick={() => setSelected(t)}>
                            <span className="symbol-avatar">{t.pair.slice(0, 2)}</span>
                            <span>
                            <strong>{t.pair}</strong>
                            <small>{t.direction} · {t.timeframe ?? 'No timeframe'}</small>
                            </span>
                            <span className="recent-date">{new Date(t.createdAt).toLocaleDateString()}</span>
                            <span className="recent-rr">{t.rr ?? 'Unknown'}<small>planned RR</small>
                            </span>
                            <Badge tone={t.result === 'WIN' ? 'positive' : t.result === 'LOSS' ? 'negative' : 'neutral'}>{t.result ?? 'Unrecorded'}</Badge>
                            <ArrowUpRight size={15}/>
                            </button>)}</div> : <EmptyState title="No trades yet" description="Your latest journal entries will live here." action={<NewTrade />}/>}</Panel>;
                    case 'calendar': return <Panel key={widget} title="Trading calendar" className="span-7 calendar-panel" surface="edge" action={<Link to="/calendar">Open calendar →</Link>}>
                    <CalendarView journalFilter={filter} key={activeAccountId} selectedMonth={month} onMonthChange={setMonth} onTradeClick={setSelected} accountId={activeAccountId ?? undefined}/>
                    <p className="muted section-gap">Grouped by logged date. Daily R is a legacy journal score; inspect actual closing dates in Calendar.</p>
                    </Panel>;
                    default: return null;
                }
                };
                return <div key={widget} data-widget={widget} className={`dashboard-widget widget-${widgetDefinitions[widget].size}`} onDragOver={e=>{if(editing)e.preventDefault();}} onDrop={e=>{e.preventDefault();const id=dragged.current;if(editing&&id&&id!==widget)moveWidget(id,index);dragged.current=null;}}>
                  {editing&&<div className="widget-edit-controls"><button className="icon-button drag-handle" draggable aria-label={`Drag ${widgetDefinitions[widget].label}`} onDragStart={e=>{dragged.current=widget;e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',widget);}} onDragEnd={()=>{dragged.current=null;}}><GripVertical size={16}/></button><button className="icon-button" disabled={index===0} aria-label={`Move ${widgetDefinitions[widget].label} earlier`} onClick={()=>moveWidget(widget,index-1)}><ArrowUp size={14}/></button><button className="icon-button" disabled={index===layout.length-1} aria-label={`Move ${widgetDefinitions[widget].label} later`} onClick={()=>moveWidget(widget,index+1)}><ArrowDown size={14}/></button><button className="icon-button" aria-label={`Remove ${widgetDefinitions[widget].label}`} onClick={()=>setDraft(v=>v.filter(w=>w!==widget))}><Minus size={16}/></button></div>}
                  {renderWidget()}
                </div>;
            })}</div></>}{selected&&selected.accountId===activeAccountId && <TradeDetailModal trade={selected} onClose={() => setSelected(null)}/>}{catalog&&editing&&<WidgetCatalog layout={draft} onChange={setDraft} onClose={()=>setCatalog(false)}/>}</>;
}
