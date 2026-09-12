import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useAccounts } from '../context/AccountContext'
import * as dashboardService from '../services/dashboardService'
import type { Metrics } from '../types/dashboard'
import MetricCard from '../components/MetricCard'

export default function Dashboard() {
  const { user } = useAuth()
  const { activeAccountId, activeAccount } = useAccounts()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const noPairValue = '\u2014'
  const hasTrades = (metrics?.totalTrades ?? 0) > 0

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await dashboardService.getMetrics(activeAccountId ?? undefined)
        setMetrics(data)
        setError('')
      } catch (err) {
        setError('Failed to load dashboard metrics')
        console.error(err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchMetrics()
  }, [activeAccountId])

  function handleRetry() {
    setIsLoading(true)
    setError('')
    dashboardService
      .getMetrics(activeAccountId ?? undefined)
      .then((data) => {
        setMetrics(data)
        setError('')
      })
      .catch((err) => {
        setError('Failed to load dashboard metrics')
        console.error(err)
      })
      .finally(() => {
        setIsLoading(false)
      })
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome, {user?.name}</h1>
        <p className="mt-2 text-text-muted">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Welcome, {user?.name}</h1>
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

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Welcome, {user?.name}</h1>
        {activeAccount && (
          <div className="text-sm text-text-muted">
            Active Account: <span className="font-medium text-text-primary">{activeAccount.name}</span>
          </div>
        )}
      </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total Trades" value={metrics?.totalTrades ?? 0} tone="neutral" />
        <MetricCard
          label="Win Rate"
          value={`${metrics?.winRate ?? 0}%`}
          tone={!hasTrades ? 'neutral' : (metrics?.winRate ?? 0) >= 50 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Avg RR"
          value={metrics?.avgRR ?? 0}
          tone={!hasTrades ? 'neutral' : (metrics?.avgRR ?? 0) >= 1 ? 'positive' : 'negative'}
        />
        <MetricCard
          label="Best Pair"
          value={metrics?.bestPair ? metrics.bestPair.toUpperCase() : noPairValue}
          tone={metrics?.bestPair ? 'positive' : 'neutral'}
        />
        <MetricCard
          label="Worst Pair"
          value={metrics?.worstPair ? metrics.worstPair.toUpperCase() : noPairValue}
          tone={metrics?.worstPair ? 'negative' : 'neutral'}
        />
      </div>
    </div>
  )
}