import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrades } from '../context/TradeContext'
import CalendarView from '../components/CalendarView'
import TradeListView from '../components/TradeListView'
import TradeDetailModal from '../components/TradeDetailModal'
import type { Trade } from '../types/trade'

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function Trades() {
  const { trades, isLoading, error, fetchTrades, removeTrade } = useTrades()
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const stored = sessionStorage.getItem('calendar-month')
    return stored || formatMonth(new Date())
  })
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null)

  useEffect(() => {
    sessionStorage.setItem('calendar-month', selectedMonth)
  }, [selectedMonth])

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this trade?')) {
      removeTrade(id)
    }
  }

  function handleTradeClick(trade: Trade) {
    setSelectedTrade(trade)
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-text-primary">Trades</h1>
          <p className="mt-2 text-sm text-text-muted">
            {viewMode === 'list' ? 'View all trades in a list' : 'View trades grouped by day'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-md border border-border-subtle bg-bg-surface p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'list'
                  ? 'bg-accent text-text-primary'
                  : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
              }`}
            >
              List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                viewMode === 'calendar'
                  ? 'bg-accent text-text-primary'
                  : 'text-text-muted hover:bg-bg-surface-hover hover:text-text-primary'
              }`}
            >
              Calendar
            </button>
          </div>

          <Link
            to="/trades/new"
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
          >
            Add Trade
          </Link>
        </div>
      </div>

      {viewMode === 'list' ? (
        <TradeListView
          trades={trades}
          isLoading={isLoading}
          error={error}
          onRetry={fetchTrades}
          onTradeClick={handleTradeClick}
          onDelete={handleDelete}
        />
      ) : (
        <CalendarView
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onTradeClick={handleTradeClick}
        />
      )}

      {selectedTrade && (
        <TradeDetailModal
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
        />
      )}
    </div>
  )
}
