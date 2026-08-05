import { useEffect, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import * as dashboardService from '../services/dashboardService'
import type { Metrics } from '../types/dashboard'
import MetricCard from '../components/MetricCard'

export default function Dashboard() {
  const { user } = useAuth()
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchMetrics() {
      try {
        const data = await dashboardService.getMetrics()
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
  }, [])

  function handleRetry() {
    setIsLoading(true)
    setError('')
    dashboardService
      .getMetrics()
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
        <h1 className="text-2xl font-semibold text-slate-950">Welcome, {user?.name}</h1>
        <p className="mt-2 text-slate-600">Loading dashboard...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Welcome, {user?.name}</h1>
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

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-950">Welcome, {user?.name}</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <MetricCard label="Total Trades" value={metrics?.totalTrades ?? 0} />
        <MetricCard label="Win Rate" value={`${metrics?.winRate ?? 0}%`} />
        <MetricCard label="Avg RR" value={metrics?.avgRR ?? 0} />
        <MetricCard
          label="Best Pair"
          value={metrics?.bestPair ?? '—'}
        />
        <MetricCard
          label="Worst Pair"
          value={metrics?.worstPair ?? '—'}
        />
      </div>
    </div>
  )
}
