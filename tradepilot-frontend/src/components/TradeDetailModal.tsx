import TradeStrategy from './TradeStrategy';
import TradeChecklist from './TradeChecklist';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Dialog, Badge } from './WorkspaceUI';
import PerformanceView from './PerformanceView';
import { legacyTradeScore } from '../utils/tradePerformance';
import { formatDecimal, unitLabel, scoreTone } from '../utils/decimal';
import * as api from '../services/financialService';
import type { Trade } from '../types/trade';
import type { Performance } from '../types/financial';
export default function TradeDetailModal({ trade, onClose }: {
    trade: Trade | null;
    onClose: () => void;
}) {
    const tradeId = trade?.id;
    const [tab, setTab] = useState('Overview'), [record, setRecord] = useState<Performance | null>(null), [error, setError] = useState(''), [reload, setReload] = useState(0);
    useEffect(() => { const c = new AbortController(); setRecord(null); setError(''); if (tradeId)
        api.performance(tradeId, c.signal).then(r => { if (!c.signal.aborted)
            setRecord(r); }).catch(e => { if (!c.signal.aborted)
            setError(api.apiError(e)); }); return () => c.abort(); }, [tradeId, reload]);
    if (!trade)
        return null;
    const actual = record?.performance;
    return <Dialog title={`${trade.pair.toUpperCase()} trade details`} onClose={onClose} className="trade-detail-dialog">
    <div className="detail-title">
    <div>
    <h1>{trade.pair.toUpperCase()}</h1>
    <p className="muted section-gap">{trade.direction} · {trade.timeframe ?? 'No timeframe'} · Logged {new Date(trade.createdAt).toLocaleString()}</p>
    </div>
    <Link className="button" to={`/trades/${trade.id}/edit`}>Edit trade</Link>
    </div>
    <div className="tabs section-gap">{['Overview', 'Actual performance', 'Executions', 'Trading costs', 'Notes & screenshot', 'Checklist', 'Strategy'].map(t => <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{t}</button>)}</div>{tab === 'Overview' && <>
        <h2>Trade plan</h2>
        <dl className="definition-grid">{[['Entry', trade.entry], ['Stop Loss', trade.sl], ['Take Profit', trade.tp], ['Planned RR', trade.rr], ['Legacy journal score', `${legacyTradeScore(trade).toFixed(2)} R`], ['Legacy outcome', trade.result ?? 'Unrecorded']].map(([label, value]) => <div key={label}>
            <dt>{label}</dt>
            <dd className={label === 'Legacy journal score' ? scoreTone(legacyTradeScore(trade)) : value == null ? 'performance-unknown' : ''}>{value ?? 'Unknown'}</dd>
            </div>)}</dl>
        <p className="muted">Planned RR and legacy score do not establish actual monetary performance.</p>{trade.notes && <div className="section-gap">
            <h2>Notes</h2>
            <p className="detail-notes">{trade.notes}</p>
            </div>}</>}{(tab === 'Overview' || tab === 'Actual performance') && <div className="section-gap">
        <h2 className="mb-4">Actual result</h2>{record ? <PerformanceView record={record}/> : error ? <div className="notice">Actual performance unavailable. {error}<button className="button" onClick={() => setReload(v => v + 1)}>Retry</button>
            </div> : <p className="muted">Loading actual record…</p>}</div>}{tab === 'Executions' && <>{actual?.executions.length ? <div className="table-scroll">
            <table className="financial-table">
            <thead>
            <tr>
            <th>Kind</th>
            <th>Price</th>
            <th>Quantity</th>
            <th>Actual time</th>
            <th>FX evidence</th>
            </tr>
            </thead>
            <tbody>{actual.executions.map((f, i) => <tr key={f.id ?? i}>
                <td>
                <Badge tone={f.kind === 'ENTRY' ? 'blue' : 'neutral'}>{f.kind}</Badge>
                </td>
                <td>{f.price ?? 'Unknown'}</td>
                <td>{f.quantity ?? 'Unknown'}</td>
                <td>{f.executedAt ? new Date(f.executedAt).toLocaleString() : 'Unknown'}</td>
                <td>{f.fxEvidence ? `${f.fxEvidence.basis} · ${f.fxRateToAccount}` : 'Unknown'}</td>
                </tr>)}</tbody>
            </table>
            </div> : <p className="notice">No executions recorded.</p>}</>}{tab === 'Trading costs' && <>{actual?.charges.length ? <div className="table-scroll">
            <table className="financial-table">
            <thead>
            <tr>
            <th>Cost</th>
            <th>Native amount</th>
            <th>Native unit</th>
            <th>Actual time</th>
            <th>FX</th>
            </tr>
            </thead>
            <tbody>{actual.charges.map((c, i) => <tr key={c.id ?? i}>
                <td>{c.kind}</td>
                <td title={c.amount ?? 'Unknown'}>{formatDecimal(c.amount)}</td>
                <td>{unitLabel(c.unitKey)}</td>
                <td>{c.occurredAt ? new Date(c.occurredAt).toLocaleString() : 'Unknown'}</td>
                <td>{c.fxRateToAccount ?? 'Unknown'}</td>
                </tr>)}</tbody>
            </table>
            </div> : <p className="notice">No charge details recorded; absence alone does not mean costs are zero.</p>}</>}{tab === 'Notes & screenshot' && <>
        <p className="detail-notes">{trade.notes ?? 'No notes recorded.'}</p>{trade.imageUrl ? <a href={trade.imageUrl} target="_blank" rel="noopener noreferrer">
            <img className="detail-image" src={trade.imageUrl} alt={`${trade.pair} recorded chart screenshot`}/>
            </a> : <p className="notice">No screenshot recorded.</p>}</>}{tab==='Checklist'&&<TradeChecklist key={trade.id} tradeId={trade.id} accountId={trade.accountId} readOnly/>}{tab==='Strategy'&&<TradeStrategy key={trade.id} tradeId={trade.id} accountId={trade.accountId} readOnly/>}</Dialog>;
}
