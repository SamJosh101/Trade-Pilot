import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
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
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <p className="mt-2 text-text-muted">Loading analytics...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <div className="mt-4 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
          <button
            onClick={handleRetry}
            className="ml-3 rounded-md bg-accent px-3 py-1 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
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
        <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>
        <p className="mt-2 text-text-muted">No trade data yet</p>
        <Link
          to="/trades/new"
          className="mt-4 inline-block rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
        >
          Add your first trade
        </Link>
      </div>
    )
  }

  const isSinglePair = analytics.pairBreakdown.length === 1
  const winCount = analytics.winLossBreakdown.win
  const lossCount = analytics.winLossBreakdown.loss

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Analytics</h1>

      {/* Equity Curve */}
      {analytics.equityCurve.length > 0 && (
        <div className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Equity Curve</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.equityCurve}>
                <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  tick={{ fontSize: 12, fill: '#8B92A5' }}
                  axisLine={{ stroke: '#232733' }}
                  tickLine={{ stroke: '#232733' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8B92A5' }}
                  axisLine={{ stroke: '#232733' }}
                  tickLine={{ stroke: '#232733' }}
                />
                <Tooltip
                  labelFormatter={(label) => typeof label === 'string' ? formatDate(label) : ''}
                  formatter={(value) => typeof value === 'number' ? value.toFixed(2) : ''}
                  contentStyle={{
                    backgroundColor: '#12151C',
                    border: '1px solid #232733',
                    borderRadius: '6px',
                  }}
                  labelStyle={{ color: '#8B92A5' }}
                  itemStyle={{ color: '#E7E9EE' }}
                />
                <Line
                  type="monotone"
                  dataKey="cumulativeRR"
                  stroke="#6C5CE7"
                  strokeWidth={2}
                  dot={{ fill: '#6C5CE7' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Pair Breakdown */}
      {analytics.pairBreakdown.length > 0 && (
        <div className="mt-6 rounded-lg border border-border-subtle bg-bg-surface p-6">
          <h2 className="text-lg font-semibold text-text-primary">Pair Breakdown</h2>
          <div className="mt-4 h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics.pairBreakdown}
                margin={{ left: 60, right: 60, top: 20, bottom: 20 }}
                barCategoryGap={isSinglePair ? '60%' : '20%'}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#232733" />
                <XAxis
                  dataKey="pair"
                  tickFormatter={(pair: string) => pair.toUpperCase()}
                  tick={{ fontSize: 12, fill: '#8B92A5' }}
                  axisLine={{ stroke: '#232733' }}
                  tickLine={{ stroke: '#232733' }}
                />
                <YAxis
                  tick={{ fontSize: 12, fill: '#8B92A5' }}
                  axisLine={{ stroke: '#232733' }}
                  tickLine={{ stroke: '#232733' }}
                />
                <Tooltip
                  formatter={(value) => typeof value === 'number' ? value.toFixed(2) : ''}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload
                      return (
                        <div className="rounded-md border border-border-subtle bg-bg-surface p-3">
                          <p className="font-medium text-text-primary">{data.pair.toUpperCase()}</p>
                          <p className="text-sm text-text-muted">Avg RR: {data.avgRR.toFixed(2)}</p>
                          <p className="text-sm text-text-muted">Total Trades: {data.totalTrades}</p>
                          <p className="text-sm text-text-muted">Win Rate: {data.winRate.toFixed(1)}%</p>
                        </div>
                      )
                    }
                    return null
                  }}
                />
                <Bar dataKey="avgRR" fill="#6C5CE7" background={false} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Win/Loss Breakdown */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary">Win/Loss Breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Wins"
            value={winCount}
            tone={winCount > 0 ? 'positive' : 'neutral'}
          />
          <MetricCard
            label="Losses"
            value={lossCount}
            tone={lossCount > 0 ? 'negative' : 'neutral'}
          />
          <MetricCard label="Break-Even" value={analytics.winLossBreakdown.breakEven} tone="neutral" />
          <MetricCard label="Open" value={analytics.winLossBreakdown.open} tone="neutral" />
        </div>
      </div>

      {/* Direction Breakdown */}
      <div className="mt-6">
        <h2 className="text-lg font-semibold text-text-primary">Direction Breakdown</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <MetricCard label="Buy Trades" value={analytics.directionBreakdown.buy} tone="neutral" />
          <MetricCard label="Sell Trades" value={analytics.directionBreakdown.sell} tone="neutral" />
        </div>
      </div>
    </div>
  )
}