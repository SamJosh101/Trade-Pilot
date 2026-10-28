import {Link} from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { useAccounts } from '../context/AccountContext';
import { PageHeading, Panel, Skeleton, EmptyState } from '../components/WorkspaceUI';
import { scoreTone, winRateTone, winRateGuidance } from '../utils/decimal';
import RealizedPanel from '../components/RealizedPanel';
import * as service from '../services/analyticsService';
import {useAccountResource} from '../hooks/useAccountResource';
export default function Analytics() {
    const {activeAccount,error:accountError,isLoading:accountLoading}=useAccounts();
    const {data,loading,failed,retry}=useAccountResource(service.getAnalytics);
    const tooltip = { background: '#202023', border: '1px solid #3c3c42', borderRadius: 8, color: '#fff' };
    return <>
    <PageHeading title="Performance analytics" description={`${activeAccount?.name ?? 'Choose an account'} · Evidence, with the right context.`}/>
    <p className="section-gap"><Link className="button" to="/strategy-performance">Strategy performance reports</Link></p>
    <RealizedPanel dateFilter/>
    <div className="section-heading">
    <div>
    <h2>Legacy journal analysis</h2>
    <p>All logged history. Wins add planned RR, losses subtract planned RR. This score is independent of actual realized R.</p>
    </div>
    <span className="badge">All logged dates</span>
    </div>{accountError ? <div className="notice error" role="alert">Account information is unavailable. Retry accounts above.</div> : loading||(accountLoading&&!activeAccount) ? <Skeleton /> : failed ? <div role="alert" className="notice error">Failed to load analytics. This is not an empty-account result.<button className="button" onClick={retry}>Retry</button>
        </div> : !data || (!data.equityCurve.length && !data.pairBreakdown.length) ? <EmptyState title={activeAccount?"No trades in this account":"Select a trading account"} description={activeAccount?`${activeAccount.name} loaded successfully and has no journal entries. Select another account to view its analytics.`:"Choose an account to load its journal analytics."}/> : <>
        <div className="dashboard-grid">
        <Panel title="Cumulative planned R score" className="span-7">
        <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data.equityCurve}>
        <XAxis dataKey="date" tick={{ fill: '#98989f', fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={d => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}/>
        <YAxis width={40} tick={{ fill: '#98989f', fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltip} labelFormatter={d => new Date(String(d)).toLocaleDateString()}/>
        <Line dataKey="cumulativeRR" name="Legacy score (R)" stroke="#b4b5bd" dot={data.equityCurve.length === 1} strokeWidth={2} isAnimationActive={false}/>
        </LineChart>
        </ResponsiveContainer>
        </div>
        <p className="muted">Historical planned journal score. Not account equity or actual realized P&L.</p>
        <details className="section-gap">
        <summary className="muted">View score history data</summary>
        <table className="financial-table">
        <thead>
        <tr>
        <th>Logged date</th>
        <th>Legacy score (R)</th>
        </tr>
        </thead>
        <tbody>{data.equityCurve.map((p, i) => <tr key={i}>
            <td>{new Date(p.date).toLocaleString()}</td>
            <td className={scoreTone(p.cumulativeRR)}>{p.cumulativeRR}</td>
            </tr>)}</tbody>
        </table>
        </details>
        </Panel>
        <Panel title="Legacy score by symbol" className="span-5">
        <div className="chart-area">
        <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.pairBreakdown}>
        <XAxis dataKey="pair" tick={{ fill: '#98989f', fontSize: 10 }} tickLine={false} axisLine={false}/>
        <YAxis width={40} tick={{ fill: '#98989f', fontSize: 10 }} axisLine={false} tickLine={false}/>
        <Tooltip contentStyle={tooltip}/>
        <Bar dataKey="avgRR" name="Average legacy score" fill="#8d909a" maxBarSize={32} radius={[4, 4, 0, 0]} isAnimationActive={false}/>
        </BarChart>
        </ResponsiveContainer>
        </div>
        <p className="muted">Outcome-weighted planned journal score per logged trade, grouped by symbol. Not an average target ratio or realized return.</p>
        </Panel>
        </div>
        <div className="outcome-cards section-gap">{[{ label: 'Legacy wins', value: data.winLossBreakdown.win, tone: 'text-positive' }, { label: 'Legacy losses', value: data.winLossBreakdown.loss, tone: 'text-negative' }, { label: 'Legacy break-even', value: data.winLossBreakdown.breakEven, tone: '' }, { label: 'Unrecorded legacy outcome', value: data.winLossBreakdown.open, tone: '' }, { label: 'BUY entries', value: data.directionBreakdown.buy, tone: '' }, { label: 'SELL entries', value: data.directionBreakdown.sell, tone: '' }].map(m => <div className="panel metric" key={m.label}>
            <span className="metric-label">{m.label}</span>
            <strong className={`metric-value ${m.value === 0 ? 'performance-neutral' : m.tone}`}>{m.value}</strong>
            </div>)}</div>
        <Panel title="Symbol breakdown" className="section-gap">
        <div className="table-scroll">
        <table className="financial-table">
        <thead>
        <tr>
        <th>Symbol</th>
        <th>Logged trades</th>
        <th>Legacy win rate</th>
        <th>Average legacy score</th>
        </tr>
        </thead>
        <tbody>{data.pairBreakdown.map(p => <tr key={p.pair}>
            <td>{p.pair}</td>
            <td>{p.totalTrades}</td>
            <td className={winRateTone(p.totalTrades ? p.winRate : null)} title={winRateGuidance}>{p.winRate}%</td>
            <td className={scoreTone(p.avgRR)}>{p.avgRR}</td>
            </tr>)}</tbody>
        </table>
        </div>
        </Panel>
        </>}</>;
}
