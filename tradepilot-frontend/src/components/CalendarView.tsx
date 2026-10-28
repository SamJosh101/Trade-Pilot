import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as calendarService from '../services/calendarService'
import type { CalendarResponse, Trade } from '../types/trade'
import TradeDayDrawer from './TradeDayDrawer'
import { matchesJournalFilter, type JournalFilter } from '../utils/dashboardLayout'
import { legacyTradeScore } from '../utils/tradePerformance'
import { useTrades } from '../context/TradeContext'
import { useAuth } from '../hooks/useAuth'

type CalendarViewProps = {
  selectedMonth: string
  onMonthChange: (month: string) => void
  onTradeClick: (trade: Trade) => void
  journalFilter?: JournalFilter
  accountId?: string
}

function formatMonth(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function parseMonth(month: string): Date {
  const [year, monthNumber] = month.split('-').map(Number)
  return new Date(year, monthNumber - 1, 1)
}

function addMonths(month: string, offset: number): string {
  const date = parseMonth(month)
  date.setMonth(date.getMonth() + offset)
  return formatMonth(date)
}

function formatMonthLabel(month: string): string {
  return parseMonth(month).toLocaleDateString(undefined, {
    month: 'long',
    year: 'numeric',
  })
}

function formatRR(value: number): string {
  if (value > 0) return `+${value.toFixed(2)}`
  if (value < 0) return `${value.toFixed(2)}`
  return '0.00'
}

function rrColor(value: number): string {
  if (value > 0) return 'text-positive'
  if (value < 0) return 'text-negative'
  return 'text-text-muted'
}

export default function CalendarView({ selectedMonth, onMonthChange, onTradeClick, accountId, journalFilter }: CalendarViewProps) {
  const { revision } = useTrades()
  const { token } = useAuth()
  const requestKey = JSON.stringify([token, accountId, selectedMonth, revision])
  const cache = useRef(new Map<string, { data: CalendarResponse; time: number }>())
  const [state, setState] = useState<{ key: string; data: CalendarResponse | null; error: string; loading: boolean }>({key: '', data: null, error: '', loading: true})
  const [refreshCount, setRefreshCount] = useState(0)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const current = state.key === requestKey ? state : {data: null, error: '', loading: !!accountId}
  const calendar = current.data, error = current.error, isLoading = current.loading
  useEffect(() => {
    const controller = new AbortController()
    setSelectedDay(null)
    if (!accountId) { setState({key: requestKey, data: null, error: '', loading: false}); return }
    const cached = cache.current.get(requestKey)
    // Component-local, bounded, short-lived cache; account/session/revision are part of the identity.
    if (cached && Date.now() - cached.time < 30000) {
      setState({key: requestKey, data: cached.data, error: '', loading: false})
      return
    }
    setState({key: requestKey, data: null, error: '', loading: true})
    calendarService.getCalendar(selectedMonth, accountId, controller.signal).then(data => {
      if (controller.signal.aborted) return
      cache.current.set(requestKey, {data, time: Date.now()})
      while (cache.current.size > 6) cache.current.delete(cache.current.keys().next().value!)
      setState({key: requestKey, data, error: '', loading: false})
    }).catch(() => {
      if (!controller.signal.aborted) setState({key: requestKey, data: null, error: 'Failed to load calendar', loading: false})
    })
    return () => controller.abort()
  }, [requestKey, selectedMonth, accountId, refreshCount])

  function handleRetry() {
    cache.current.delete(requestKey)
    setRefreshCount((count) => count + 1)
  }

  function closePopover() {
    setSelectedDay(null)
  }

  function getDaysInMonth(year: number, month: number): number {
    return new Date(year, month + 1, 0).getDate()
  }

  function getFirstDayOfMonth(year: number, month: number): number {
    return new Date(year, month, 1).getDay()
  }

  function getCalendarDays(): Array<{ date: string | null; trades: Trade[]; netRR: number }> {
    const [year, month] = selectedMonth.split('-').map(Number)
    const daysInMonth = getDaysInMonth(year, month - 1)
    const firstDay = getFirstDayOfMonth(year, month - 1)
    
    const days: Array<{ date: string | null; trades: Trade[]; netRR: number }> = []
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push({ date: null, trades: [], netRR: 0 })
    }
    
    // Add days of the month
    const tradesByDate = new Map<string, Trade[]>()
    calendar?.days.forEach(day => {
      tradesByDate.set(day.date, journalFilter ? day.trades.filter(t=>matchesJournalFilter(t,journalFilter)) : day.trades)
    })
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const trades = tradesByDate.get(dateString) || []
      const netRR = journalFilter && Object.values(journalFilter).some(Boolean) ? trades.reduce((sum,t)=>sum+legacyTradeScore(t),0) : calendar?.days.find((item) => item.date === dateString)?.netRR ?? 0
      days.push({ date: dateString, trades, netRR })
    }
    
    while (days.length < 42) days.push({ date: null, trades: [], netRR: 0 })
    return days
  }

  const calendarDays = getCalendarDays()

  return (
    <div>
      <p className="my-3 text-xs text-text-muted">Calendar dates use UTC and the date the trade was logged.</p>
      <div className="flex w-full items-center justify-between rounded-card border border-border bg-bg-surface p-1 sm:w-auto">
        <button
          aria-label="Previous month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-chip text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
          onClick={() => onMonthChange(addMonths(selectedMonth, -1))}
          type="button"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <div className="min-w-40 px-3 text-center text-sm font-semibold text-text-primary">
          {formatMonthLabel(selectedMonth)}
        </div>
        <button
          aria-label="Next month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-chip text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
          onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      <div className="calendar-feedback" aria-live="polite">
        {isLoading ? <span role="status">Loading {formatMonthLabel(selectedMonth)}…</span> : error ? <div role="alert">{error}<button className="button" onClick={handleRetry}>Retry</button></div> : !accountId ? <span>Select a trading account to load its calendar.</span> : calendar && calendar.days.every(day=>day.trades.length===0) ? <span role="status">No trades logged in this account during {formatMonthLabel(selectedMonth)}. Try another month or select another account.</span> : <span>Choose any day to view statistics, trades and your day note.</span>}
      </div>
      <div className="calendar-grid-shell" aria-busy={isLoading}>
          <div className="calendar-month-grid grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold uppercase tracking-wider text-text-muted">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => (
              <button
                key={index}
                type="button"
                disabled={isLoading || !!error || !day.date || !accountId}
                aria-current={day.date === new Date().toISOString().slice(0, 10) ? 'date' : undefined}
                aria-label={day.date ? isLoading || error || !accountId ? `${day.date}, results unavailable` : `${day.date}, ${day.trades.length} trades, ${formatRR(day.netRR)} R` : 'Empty day'}
                className={`min-h-24 cursor-pointer rounded-card border border-border p-2 transition hover:bg-bg-surface-hover ${
                  day.date ? 'bg-bg-surface' : 'bg-transparent'
                }`}
                onClick={() => day.date && setSelectedDay(day.date)}
              >
                {day.date && (
                  <>
                    <div className="text-sm font-semibold text-text-primary"><span className="calendar-day-number">
                      {Number(day.date.slice(-2))}</span>
                    </div>
                    {day.trades.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">{day.trades.length}</span>
                          <span className={`text-xs font-semibold font-mono-data tabular-nums ${rrColor(day.netRR)}`}>
                            {formatRR(day.netRR)}
                          </span>
                        </div>
                        <div className={`h-1 rounded-full ${day.netRR > 0 ? 'bg-positive' : day.netRR < 0 ? 'bg-negative' : 'bg-text-muted'}`} />
                      </div>
                    )}
                  </>
                )}
              </button>
            ))}
          </div>
        </div>

      {selectedDay && (
        <TradeDayDrawer
          initialDate={selectedDay}
          filter={journalFilter}
          onClose={closePopover}
          onTradeClick={onTradeClick}
        />
      )}
    </div>
  )
}
