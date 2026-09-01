import type { Trade } from '../types/trade'

type CalendarPopoverRowProps = {
  trade: Trade
  onClick: () => void
}

function formatRR(value: number): string {
  if (value > 0) return `+${value.toFixed(2)} R`
  if (value < 0) return `${value.toFixed(2)} R`
  return '0.00 R'
}

function formatTradeRR(rr: string | null, result: Trade['result']): string {
  if (!rr) return '0.00 R'
  const signedRR = result === 'LOSS' ? -Number(rr) : Number(rr)
  return formatRR(signedRR)
}

function tradeRRColor(rr: string | null, result: Trade['result']): string {
  const signedRR = result === 'LOSS' && rr ? -Number(rr) : (rr ? Number(rr) : 0)
  if (signedRR > 0) return 'text-positive'
  if (signedRR < 0) return 'text-negative'
  return 'text-text-muted'
}

function resultColor(result: Trade['result']): string {
  if (result === 'WIN') return 'border-positive/30 bg-positive/10 text-positive'
  if (result === 'LOSS') return 'border-negative/30 bg-negative/10 text-negative'
  return 'border-border-subtle bg-bg-surface-hover text-text-muted'
}

function directionColor(direction: Trade['direction']): string {
  return direction === 'BUY' ? 'text-positive' : 'text-negative'
}

function formatEntry(entry: string): string {
  const value = Number(entry)
  return Number.isFinite(value) ? value.toString() : entry
}

export default function CalendarPopoverRow({ trade, onClick }: CalendarPopoverRowProps) {
  return (
    <article
      className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-surface p-3 transition hover:bg-bg-surface-hover"
      onClick={onClick}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-accent/30 bg-accent/10 text-[10px] font-semibold uppercase text-accent-hover">
          {trade.pair.slice(0, 3)}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-sm font-semibold uppercase text-text-primary">
              {trade.pair}
            </h3>
            <span className={`text-xs font-semibold ${directionColor(trade.direction)}`}>
              {trade.direction === 'BUY' ? 'Buy' : 'Sell'}
            </span>
          </div>
          <p className="mt-1 truncate text-xs text-text-muted">
            <span className="font-mono-data tabular-nums">{formatEntry(trade.entry)}</span>
            {trade.timeframe ? ` - ${trade.timeframe}` : ''}
          </p>
        </div>
      </div>

      <div className="shrink-0 text-right">
        <p className={`font-mono-data text-sm font-semibold tabular-nums ${tradeRRColor(trade.rr, trade.result)}`}>
          {formatTradeRR(trade.rr, trade.result)}
        </p>
        <span className={`mt-1 inline-flex rounded border px-2 py-0.5 text-[11px] font-semibold ${resultColor(trade.result)}`}>
          {trade.result ?? 'OPEN'}
        </span>
      </div>
    </article>
  )
}
