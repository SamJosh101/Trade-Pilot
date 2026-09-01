import { Link } from 'react-router-dom'
import type { Trade } from '../types/trade'

type TradeListViewProps = {
  trades: Trade[]
  isLoading: boolean
  error: string
  onRetry: () => void
  onTradeClick: (trade: Trade) => void
  onDelete: (id: string) => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

function resultClass(result: string | null): string {
  if (result === 'WIN') return 'text-positive'
  if (result === 'LOSS') return 'text-negative'
  return 'text-text-muted'
}

export default function TradeListView({ trades, isLoading, error, onRetry, onTradeClick, onDelete }: TradeListViewProps) {
  if (isLoading) {
    return (
      <div>
        <p className="text-text-muted">Loading trades...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="mt-4 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
        {error}
        <button
          onClick={onRetry}
          className="ml-3 rounded-md bg-accent px-3 py-1 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
        >
          Retry
        </button>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div>
        <p className="mt-2 text-text-muted">No trades yet</p>
        <Link
          to="/trades/new"
          className="mt-4 inline-block rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          Add your first trade
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-6 overflow-x-auto rounded-lg border border-border-subtle bg-bg-surface">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border-subtle text-left text-xs uppercase text-text-muted">
            <th className="px-4 py-3">Pair</th>
            <th className="px-4 py-3">Direction</th>
            <th className="px-4 py-3">Entry</th>
            <th className="px-4 py-3">SL</th>
            <th className="px-4 py-3">TP</th>
            <th className="px-4 py-3">Timeframe</th>
            <th className="px-4 py-3">RR</th>
            <th className="px-4 py-3">Result</th>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Screenshot</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade, index) => (
            <tr
              key={trade.id}
              className={`text-sm text-text-primary hover:bg-bg-surface-hover ${
                index !== trades.length - 1 ? 'border-b border-border-subtle' : ''
              }`}
            >
              <td className="px-4 py-3">{trade.pair.toUpperCase()}</td>
              <td className="px-4 py-3">{trade.direction}</td>
              <td className="px-4 py-3 font-mono-data tabular-nums">{trade.entry}</td>
              <td className="px-4 py-3 font-mono-data tabular-nums">{trade.sl}</td>
              <td className="px-4 py-3 font-mono-data tabular-nums">{trade.tp}</td>
              <td className="px-4 py-3">{trade.timeframe ?? '—'}</td>
              <td className="px-4 py-3 font-mono-data tabular-nums">{trade.rr ?? '—'}</td>
              <td className={`px-4 py-3 ${resultClass(trade.result)}`}>{trade.result ?? '—'}</td>
              <td className="px-4 py-3 text-text-muted">{formatDate(trade.createdAt)}</td>
              <td className="px-4 py-3">
                {trade.imageUrl ? (
                  <button
                    onClick={() => onTradeClick(trade)}
                    className="text-accent hover:text-accent-hover"
                    title="View screenshot"
                  >
                    📷
                  </button>
                ) : (
                  <span className="text-text-muted opacity-40">📷</span>
                )}
              </td>
              <td className="px-4 py-3">
                <Link
                  to={`/trades/${trade.id}/edit`}
                  className="mr-3 text-sm font-medium text-accent hover:text-accent-hover"
                >
                  Edit
                </Link>
                <button
                  onClick={() => onDelete(trade.id)}
                  className="text-sm font-medium text-negative hover:opacity-80"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
