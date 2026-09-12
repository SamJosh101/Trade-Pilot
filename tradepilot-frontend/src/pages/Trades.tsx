import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTrades } from '../context/TradeContext'
import { useAccounts } from '../context/AccountContext'
import CalendarView from '../components/CalendarView'
import TradeListView from '../components/TradeListView'
import TradeDetailModal from '../components/TradeDetailModal'
import { exportTradesToCSV } from '../utils/csvExport'
import type { Trade } from '../types/trade'

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export default function Trades() {
  const { trades, isLoading, error, fetchTrades, removeTrade } = useTrades()
  const { activeAccountId, activeAccount } = useAccounts()
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
    fetchTrades(activeAccountId ?? undefined)
  }, [fetchTrades, activeAccountId])

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
          <div className="mt-2 flex items-center gap-4">
            <p className="text-sm text-text-muted">
              {viewMode === 'list' ? 'View all trades in a list' : 'View trades grouped by day'}
            </p>
            {activeAccount && (
              <div className="text-sm text-text-muted">
                Active Account: <span className="font-medium text-text-primary">{activeAccount.name}</span>
              </div>
            )}
          </div>
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

          <button
            onClick={() => exportTradesToCSV(trades)}
            disabled={trades.length === 0}
            className="rounded-md bg-bg-surface border border-border-subtle px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            title={trades.length === 0 ? 'No trades to export' : 'Export trades to CSV'}
          >
            Export CSV
          </button>

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
          onRetry={() => fetchTrades(activeAccountId ?? undefined)}
          onTradeClick={handleTradeClick}
          onDelete={handleDelete}
        />
      ) : (
        <CalendarView
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onTradeClick={handleTradeClick}
          accountId={activeAccountId ?? undefined}
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
