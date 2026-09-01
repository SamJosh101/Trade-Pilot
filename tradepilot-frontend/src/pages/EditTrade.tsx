import axios from 'axios'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTrades } from '../context/TradeContext'
import { useAccounts } from '../context/AccountContext'
import TradeForm from '../components/TradeForm'
import * as tradeService from '../services/tradeService'

export default function EditTrade() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { updateTrade } = useTrades()
  const { accounts, isLoading: accountsLoading } = useAccounts()
  const [isLoading, setIsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [initialValues, setInitialValues] = useState<Partial<Parameters<typeof updateTrade>[1]> | undefined>()

  useEffect(() => {
    async function fetchTrade() {
      if (!id) {
        setNotFound(true)
        setIsLoading(false)
        return
      }

      try {
        const trade = await tradeService.getOne(id)
        setInitialValues({
          accountId: trade.accountId,
          pair: trade.pair,
          direction: trade.direction,
          entry: parseFloat(trade.entry),
          sl: parseFloat(trade.sl),
          tp: parseFloat(trade.tp),
          timeframe: trade.timeframe ?? undefined,
          result: trade.result ?? undefined,
          notes: trade.notes ?? undefined,
          imageUrl: trade.imageUrl ?? undefined,
        })
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          setNotFound(true)
        } else {
          setError('Failed to load trade')
        }
      } finally {
        setIsLoading(false)
      }
    }

    fetchTrade()
  }, [id])

  async function handleSubmit(input: Parameters<typeof updateTrade>[1]) {
    if (!id) return

    setIsSubmitting(true)
    setError('')

    try {
      await updateTrade(id, input)
      navigate('/trades')
    } catch (caughtError) {
      if (axios.isAxiosError<{ error?: string }>(caughtError)) {
        setError(caughtError.response?.data?.error ?? 'Failed to update trade')
      } else {
        setError('Failed to update trade')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Edit Trade</h1>
        <p className="mt-2 text-slate-600">Loading trade...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Edit Trade</h1>
        <p className="mt-2 text-slate-600">Trade not found</p>
      </div>
    )
  }

  if (accountsLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Edit Trade</h1>
        <p className="mt-2 text-slate-600">Loading accounts...</p>
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Edit Trade</h1>
      <div className="mt-6 max-w-2xl">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        {initialValues && (
          <TradeForm
            initialValues={initialValues}
            onSubmit={handleSubmit}
            submitLabel="Save Changes"
            isSubmitting={isSubmitting}
            availableAccounts={accounts.map((a) => ({ id: a.id, name: a.name }))}
          />
        )}
      </div>
    </div>
  )
}