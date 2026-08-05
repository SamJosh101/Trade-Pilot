import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTrades } from '../context/TradeContext'

export default function TradeHistory() {
  const { trades, isLoading, error, fetchTrades, removeTrade } = useTrades()

  useEffect(() => {
    fetchTrades()
  }, [fetchTrades])

  function handleDelete(id: string) {
    if (confirm('Are you sure you want to delete this trade?')) {
      removeTrade(id)
    }
  }

  function formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Trade History</h1>
        <p className="mt-2 text-slate-600">Loading trades...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-950">Trade History</h1>
        <div className="mt-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
          <button
            onClick={fetchTrades}
            className="ml-3 rounded-md bg-red-700 px-3 py-1 text-sm font-medium text-white transition hover:bg-red-800"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (trades.length === 0) {
    return (
      <div>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-950">Trade History</h1>
          <Link
            to="/trades/new"
            className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Add Trade
          </Link>
        </div>
        <p className="mt-2 text-slate-600">No trades yet</p>
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-950">Trade History</h1>
        <Link
          to="/trades/new"
          className="rounded-md bg-slate-950 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Add Trade
        </Link>
      </div>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-slate-200 text-left text-sm font-medium text-slate-600">
              <th className="pb-3 pr-4">Pair</th>
              <th className="pb-3 pr-4">Direction</th>
              <th className="pb-3 pr-4">Entry</th>
              <th className="pb-3 pr-4">SL</th>
              <th className="pb-3 pr-4">TP</th>
              <th className="pb-3 pr-4">Timeframe</th>
              <th className="pb-3 pr-4">RR</th>
              <th className="pb-3 pr-4">Result</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trades.map((trade) => (
              <tr key={trade.id} className="border-b border-slate-100 text-sm text-slate-950">
                <td className="py-3 pr-4">{trade.pair}</td>
                <td className="py-3 pr-4">{trade.direction}</td>
                <td className="py-3 pr-4">{trade.entry}</td>
                <td className="py-3 pr-4">{trade.sl}</td>
                <td className="py-3 pr-4">{trade.tp}</td>
                <td className="py-3 pr-4">{trade.timeframe ?? '—'}</td>
                <td className="py-3 pr-4">{trade.rr ?? '—'}</td>
                <td className="py-3 pr-4">{trade.result ?? '—'}</td>
                <td className="py-3 pr-4">{formatDate(trade.createdAt)}</td>
                <td className="py-3">
                  <Link
                    to={`/trades/${trade.id}/edit`}
                    className="mr-3 text-sm font-medium text-emerald-700 hover:text-emerald-800"
                  >
                    Edit
                  </Link>
                  <button
                    onClick={() => handleDelete(trade.id)}
                    className="text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
