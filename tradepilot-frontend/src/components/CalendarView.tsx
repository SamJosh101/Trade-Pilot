import { useEffect, useState, useRef } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import * as calendarService from '../services/calendarService'
import type { CalendarResponse, Trade } from '../types/trade'
import DayPopover from './DayPopover'

type CalendarViewProps = {
  selectedMonth: string
  onMonthChange: (month: string) => void
  onTradeClick: (trade: Trade) => void
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

export default function CalendarView({ selectedMonth, onMonthChange, onTradeClick }: CalendarViewProps) {
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [refreshCount, setRefreshCount] = useState(0)
  const [selectedDay, setSelectedDay] = useState<{ date: string; trades: Trade[]; position: { x: number; y: number } } | null>(null)
  const gridRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let isCurrent = true

    async function fetchCalendar() {
      setIsLoading(true)
      setError('')

      try {
        const data = await calendarService.getCalendar(selectedMonth)
        if (isCurrent) {
          setCalendar(data)
        }
      } catch (err) {
        console.error(err)
        if (isCurrent) {
          setError('Failed to load calendar')
        }
      } finally {
        if (isCurrent) {
          setIsLoading(false)
        }
      }
    }

    fetchCalendar()

    return () => {
      isCurrent = false
    }
  }, [selectedMonth, refreshCount])

  function handleRetry() {
    setRefreshCount((count) => count + 1)
  }

  function handleDayClick(date: string, trades: Trade[], event: React.MouseEvent) {
    if (trades.length === 0) return
    
    const rect = (event.target as HTMLElement).getBoundingClientRect()
    setSelectedDay({
      date,
      trades,
      position: { x: rect.left, y: rect.bottom + 8 }
    })
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
      tradesByDate.set(day.date, day.trades)
    })
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateString = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const trades = tradesByDate.get(dateString) || []
      const netRR = trades.reduce((sum, trade) => {
        const signedRR = trade.result === 'LOSS' && trade.rr ? -Number(trade.rr) : (trade.rr ? Number(trade.rr) : 0)
        return sum + signedRR
      }, 0)
      days.push({ date: dateString, trades, netRR })
    }
    
    return days
  }

  const calendarDays = getCalendarDays()

  return (
    <div>
      <div className="flex w-full items-center justify-between rounded-md border border-border-subtle bg-bg-surface p-1 sm:w-auto">
        <button
          aria-label="Previous month"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
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
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
          onClick={() => onMonthChange(addMonths(selectedMonth, 1))}
          type="button"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {isLoading && (
        <div className="mt-6">
          <p className="text-text-muted">Loading calendar...</p>
        </div>
      )}

      {!isLoading && error && (
        <div className="mt-6 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
          <button
            onClick={handleRetry}
            className="ml-3 rounded-md bg-accent px-3 py-1 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
            type="button"
          >
            Retry
          </button>
        </div>
      )}

      {!isLoading && !error && (
        <div ref={gridRef} className="mt-6">
          <div className="grid grid-cols-7 gap-1">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
              <div key={day} className="py-2 text-center text-xs font-semibold text-text-muted">
                {day}
              </div>
            ))}
            {calendarDays.map((day, index) => (
              <div
                key={index}
                className={`min-h-24 cursor-pointer rounded-md border border-border-subtle p-2 transition hover:bg-bg-surface-hover ${
                  day.date ? 'bg-bg-surface' : 'bg-transparent'
                }`}
                onClick={(e) => day.date && handleDayClick(day.date, day.trades, e)}
              >
                {day.date && (
                  <>
                    <div className="text-sm font-semibold text-text-primary">
                      {new Date(day.date).getDate()}
                    </div>
                    {day.trades.length > 0 && (
                      <div className="mt-2 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-text-muted">{day.trades.length}</span>
                          <span className={`text-xs font-semibold ${rrColor(day.netRR)}`}>
                            {formatRR(day.netRR)}
                          </span>
                        </div>
                        <div className={`h-1 rounded-full ${day.netRR > 0 ? 'bg-positive' : day.netRR < 0 ? 'bg-negative' : 'bg-text-muted'}`} />
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {selectedDay && (
        <DayPopover
          trades={selectedDay.trades}
          date={selectedDay.date}
          position={selectedDay.position}
          onClose={closePopover}
          onTradeClick={onTradeClick}
        />
      )}
    </div>
  )
}
