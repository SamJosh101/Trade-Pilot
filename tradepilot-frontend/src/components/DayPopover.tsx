import { useEffect, useRef } from 'react'
import type { Trade } from '../types/trade'
import CalendarPopoverRow from './CalendarPopoverRow'

type DayPopoverProps = {
  trades: Trade[]
  date: string
  position: { x: number; y: number }
  onClose: () => void
  onTradeClick: (trade: Trade) => void
}

export default function DayPopover({ trades, date, position, onClose, onTradeClick }: DayPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [onClose])

  function formatDayLabel(dateString: string): string {
    const today = new Date()
    const todayKey = today.toISOString().slice(0, 10)
    const yesterday = new Date(today)
    yesterday.setDate(today.getDate() - 1)
    const yesterdayKey = yesterday.toISOString().slice(0, 10)

    if (dateString === todayKey) return 'Today'
    if (dateString === yesterdayKey) return 'Yesterday'

    return new Date(`${dateString}T00:00:00Z`).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    })
  }

  function calculateNetRR(): number {
    return trades.reduce((sum, trade) => {
      const signedRR = trade.result === 'LOSS' && trade.rr ? -Number(trade.rr) : (trade.rr ? Number(trade.rr) : 0)
      return sum + signedRR
    }, 0)
  }

  const netRR = calculateNetRR()
  const netRRColor = netRR > 0 ? 'text-positive' : netRR < 0 ? 'text-negative' : 'text-text-muted'

  return (
    <div
      ref={popoverRef}
      className="fixed z-50 w-80 rounded-lg border border-border-subtle bg-bg-surface p-4 shadow-lg"
      style={{
        left: `${Math.min(position.x, window.innerWidth - 340)}px`,
        top: `${Math.min(position.y, window.innerHeight - 400)}px`,
      }}
    >
      <div className="flex items-center justify-between border-b border-border-subtle pb-3">
        <div>
          <h3 className="text-base font-semibold text-text-primary">{formatDayLabel(date)}</h3>
          <p className="text-xs text-text-muted">{trades.length} {trades.length === 1 ? 'trade' : 'trades'}</p>
        </div>
        <p className={`font-mono-data text-lg font-semibold tabular-nums ${netRRColor}`}>
          {netRR > 0 ? `+${netRR.toFixed(2)}` : netRR < 0 ? netRR.toFixed(2) : '0.00'} R
        </p>
      </div>

      <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
        {trades.map((trade) => (
          <CalendarPopoverRow
            key={trade.id}
            trade={trade}
            onClick={() => onTradeClick(trade)}
          />
        ))}
      </div>
    </div>
  )
}
