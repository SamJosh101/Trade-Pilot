import { Link } from 'react-router-dom';
import { Pencil, Trash2, Image } from 'lucide-react';
import type { Trade } from '../types/trade';
import type { Performance } from '../types/financial';
import { formatDecimal, moneyTone } from '../utils/decimal';
import { Badge, EmptyState, Skeleton } from './WorkspaceUI';
type Props = {
    trades: Trade[];
    isLoading: boolean;
    error: string;
    onRetry: () => void;
    onTradeClick: (t: Trade) => void;
    onDelete: (id: string) => void;
    pairSearch?: string;
    resultFilter?: string | null;
    financial?: Record<string, Pick<Performance, 'derived'>>;
    compact?: boolean;
};
export default function TradeListView({ trades, isLoading, error, onRetry, onTradeClick, onDelete, pairSearch, resultFilter, financial = {}, compact = false }: Props) {
    const rows = trades.filter(t => (!pairSearch || t.pair.toLowerCase().includes(pairSearch.trim().toLowerCase())) && (!resultFilter || (resultFilter === 'Open' && !t.result) || t.result === resultFilter.toUpperCase()));
    if (isLoading)
        return <Skeleton />;
    if (error)
        return <div className="notice error" role="alert">{error}<button className="button" onClick={onRetry}>Retry</button>
        </div>;
    if (!trades.length)
        return <EmptyState title="No trades in this account" description="The selected account loaded successfully and has no journal entries. Use the account selector to view another account." action={<Link className="button primary" to="/trades/new">Add your first trade</Link>}/>;
    if (!rows.length)
        return <EmptyState title="No trades match your filters"/>;
    return <div className="table-scroll">
    <table className="financial-table">
    <thead>
    <tr>
    <th>Symbol / direction</th>
    <th>Logged</th>
    <th>Actual status</th>{!compact && <>
        <th>Entry</th>
        <th>SL</th>
        <th>TP</th>
        <th>Timeframe</th>
        </>}<th>Planned RR</th>
    <th>Legacy outcome</th>
    <th>Realized R</th>
    <th>Net P&amp;L</th>
    <th>Actions</th>
    </tr>
    </thead>
    <tbody>{rows.map(t => {
            const d = financial[t.id]?.derived;
            return <tr key={t.id}>
            <td>
            <button className="table-symbol" onClick={() => onTradeClick(t)} aria-label={`View ${t.pair.toUpperCase()} trade`}>
            <span className="symbol-avatar" aria-hidden="true">{t.pair.slice(0, 2)}</span>
            <span>{t.pair.toUpperCase()}<span className="block text-[11px] mt-1 text-text-muted">{t.direction}</span>
            </span>
            </button>
            </td>
            <td className="text-text-muted">{new Date(t.createdAt).toLocaleDateString()}</td>
            <td>
            <Badge tone={d?.status === 'PARTIAL' ? 'partial' : 'neutral'}>{d?.status ?? 'Unknown'}</Badge>
            </td>{!compact && <>
                <td className="data" title={t.entry}>{t.entry}</td>
                <td className="data">{t.sl}</td>
                <td className="data">{t.tp}</td>
                <td>{t.timeframe ?? '—'}</td>
                </>}<td className="data">{t.rr ?? 'Unknown'}</td>
            <td>
            <Badge tone={t.result === 'WIN' ? 'positive' : t.result === 'LOSS' ? 'negative' : 'neutral'}>{t.result ?? 'Unrecorded'}</Badge>
            </td>
            <td className={`data ${moneyTone(d?.realizedR)}`} title={d?.realizedR ?? 'Unknown'}>{formatDecimal(d?.realizedR)}</td>
            <td className={`data ${moneyTone(d?.netPnl)}`} title={d?.netPnl ?? 'Unknown'}>{formatDecimal(d?.netPnl)}{d?.moneyUnitKey && <span className="block text-[9px] text-text-muted">{d.moneyUnitKey}</span>}</td>
            <td>
            <div className="table-actions">{t.imageUrl && <button className="icon-button" onClick={() => onTradeClick(t)} aria-label={`View ${t.pair} screenshot`}>
                <Image size={15}/>
                </button>}<Link className="icon-button" to={`/trades/${t.id}/edit`} aria-label={`Edit ${t.pair.toUpperCase()} trade`}>
            <Pencil size={14}/>
            </Link>
            <button className="icon-button text-negative" onClick={() => onDelete(t.id)} aria-label={`Delete ${t.pair.toUpperCase()} trade`}>
            <Trash2 size={14}/>
            </button>
            </div>
            </td>
            </tr>;
        })}</tbody>
    </table>
    </div>;
}
