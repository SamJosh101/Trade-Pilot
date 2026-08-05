import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts'
import * as analyticsService from '../services/analyticsService'
import type { Analytics } from '../types/analytics'
import MetricCard from '../components/MetricCard'

export default function Analytics() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchAnalytics() {
      try {
        const data = await analyticsService.getAnalytics()
        setAnalytics(data)
        setError('')
      } catch (err) {
        setError('Failed to load analytics')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAnalytics()
  }, [])

  function handleRetry() {
    setIsLoading(true)
    setError('')
    analyticsService
      .getAnalytics()
      .then((data) => {
        setAnalytics(data)
        setError('')
      })
      .catch((err) => {
        setError('Failed to load analytics')
        console.error(err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
        <p className="mt-2 text-slate-600">Loading analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button
            onClick={handleRetry}
            className="ml-3 rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  // Empty state check - must happen before any chart renders
  if (!analytics || (analytics.equityCurve.length === 0 && analytics.pairBreakdown.length === 0)) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
        <p className="mt-2 text-slate-600">No trade data yet</p>
        <Link
          to="/trades/new"
          className="mt-4 inline-block rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Add your first trade
        </Link>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-950">Analytics</h1>
      
      {/* Equity Curve */}
      {analytics.equityCurve.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Equity Curve</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12 }}
                />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={formatDate}
                  formatter={(value: number) => value.toFixed(2)}
                />
                <Line 
                  type="monotone" 
                  dataKey="cumulativeRR" 
                  stroke="#10b981" 
                  strokeWidth={2}
                  dot={{ fill: '#10b981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pair Breakdown */}
      {analytics.pairBreakdown.length > 0 && (
        <div className="mt-6 rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Pair Breakdown</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.pairBreakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="pair" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip 
                  formatter={(value: number) => value.toFixed(2)}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-md border border-slate-200 bg-white p-3 shadow-sm">
                          <p className="font-medium text-slate-950">{data.pair}</p>
                          <p className="text-sm text-slate-600">Avg RR: {data.avgRR.toFixed(2)}</p>
                          <p className="text-sm text-slate-600">Total Trades: {data.totalTrades}</p>
                          <p className="text-sm text-slate-600">Win Rate: {data.winRate.toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="avgRR" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Win/Loss Breakdown */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-950">Win/Loss Breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Wins" value={analytics.winLossBreakdown.win} />
          <MetricCard label="Losses" value={analytics.winLossBreakdown.loss} />
          <MetricCard label="Break-Even" value={analytics.winLossBreakdown.breakEven} />
          <MetricCard label="Open" value={analytics.winLossBreakdown.open} />
        </div>
      </div>

      {/* Direction Breakdown */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-slate-950">Direction Breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetricCard label="Buy Trades" value={analytics.directionBreakdown.buy} />
          <MetricCard label="Sell Trades" value={analytics.directionBreakdown.sell} />
        </div>
      </div>
    </div>
  )
}
