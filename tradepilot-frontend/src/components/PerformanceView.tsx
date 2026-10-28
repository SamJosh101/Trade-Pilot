import type { Performance } from '../types/financial';
import { formatDecimal, moneyTone, unitLabel } from '../utils/decimal';
import { Badge } from './WorkspaceUI';
export default function PerformanceView({ record }: {
    record: Performance;
}) {
    const { derived: d, performance: p } = record;
    return <>
    <div className="flex flex-wrap items-center gap-2">
    <Badge tone={d.status === 'PARTIAL' ? 'partial' : 'neutral'}>{d.status ?? 'Actual status unknown'}</Badge>
    <Badge>User reported</Badge>
    <span className="muted">{unitLabel(d.moneyUnitKey)} · revision {record.revision}</span>
    </div>
    <dl className="definition-grid">{[['Gross P&L', d.grossPnl], ['Actual net P&L', d.netPnl], ['Realized R', d.realizedR], ['Initial risk', p?.initialRiskAmount], ['Recognized costs', d.recognizedCosts], ['Remaining quantity', d.remainingQuantity], ['Weighted entry', d.weightedAverageEntry]].map(([label, value]) => <div key={label}>
        <dt>{label}</dt>
        <dd className={['Gross P&L', 'Actual net P&L', 'Realized R'].includes(label!) ? moneyTone(value) : value == null ? 'performance-unknown' : ''} title={value ?? 'Unknown'}>{formatDecimal(value)}</dd>
        </div>)}</dl>{d.scope === 'PARTIAL' && <p className="notice">Realized to date against full original risk. Separate from completed-trade statistics.</p>}{d.reasons.length > 0 && <p className="notice">Missing or limited information: {d.reasons.map(r => r.toLowerCase().replaceAll('_', ' ')).join(' · ')}</p>}{p && <p className="muted">Source: {p.source.toLowerCase()} · Actual close: {p.closedAt ? new Date(p.closedAt).toLocaleString() : 'Unknown'} · {d.calculationVersion}</p>}</>;
}
