import { X } from 'lucide-react'
import type { Trade } from '../types/trade'

type TradeDetailModalProps = {
  trade: Trade | null
  onClose: () => void
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString()
}

function resultClass(result: string | null): string {
  if (result === 'WIN') return 'text-positive'
  if (result === 'LOSS') return 'text-negative'
  return 'text-text-muted'
}

export default function TradeDetailModal({ trade, onClose }: TradeDetailModalProps) {
  if (!trade) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-full max-w-2xl overflow-y-auto rounded-lg border border-border-subtle bg-bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-text-primary">{trade.pair.toUpperCase()}</h2>
            <p className="mt-1 text-sm text-text-muted">
              {trade.direction} • {trade.timeframe ?? '—'} • {formatDate(trade.createdAt)}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 text-text-muted hover:text-text-primary"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-sm text-text-muted">Entry</p>
            <p className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-text-primary">
              {trade.entry}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Stop Loss</p>
            <p className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-text-primary">
              {trade.sl}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Take Profit</p>
            <p className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-text-primary">
              {trade.tp}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Risk/Reward</p>
            <p className="mt-1 font-mono-data text-lg font-semibold tabular-nums text-text-primary">
              {trade.rr ?? '—'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Result</p>
            <p className={`mt-1 text-lg font-semibold ${resultClass(trade.result)}`}>
              {trade.result ?? 'OPEN'}
            </p>
          </div>
          <div>
            <p className="text-sm text-text-muted">Realized RR</p>
            <p className={`mt-1 font-mono-data text-lg font-semibold tabular-nums ${resultClass(trade.result)}`}>
              {!trade.result ? '—' : (trade.rr ? (trade.result === 'LOSS' ? `-${trade.rr}` : `+${trade.rr}`) : '—')}
            </p>
          </div>
        </div>

        {trade.notes && (
          <div className="mt-6">
            <p className="text-sm text-text-muted">Notes</p>
            <p className="mt-1 text-sm text-text-primary">{trade.notes}</p>
          </div>
        )}

        {trade.imageUrl && (
          <div className="mt-6">
            <p className="text-sm text-text-muted">Screenshot</p>
            <div className="mt-2">
              <img
                src={trade.imageUrl}
                alt="Trade screenshot"
                className="max-h-96 w-full rounded-lg border border-border-subtle"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
