import axios from 'axios'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTrades } from '../context/TradeContext'
import { useAccounts } from '../context/AccountContext'
import TradeForm from '../components/TradeForm'

export default function AddTrade() {
  const navigate = useNavigate()
  const { addTrade } = useTrades()
  const { accounts, isLoading: accountsLoading } = useAccounts()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(input: Parameters<typeof addTrade>[0]) {
    setIsSubmitting(true)
    setError('')

    try {
      await addTrade(input)
      navigate('/trades')
    } catch (caughtError) {
      if (axios.isAxiosError<{ error?: string }>(caughtError)) {
        setError(caughtError.response?.data?.error ?? 'Failed to add trade')
      } else {
        setError('Failed to add trade')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (accountsLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Add Trade</h1>
        <p className="mt-2 text-slate-600">Loading accounts...</p>
      </div>
    )
  }

  if (accounts.length === 0) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Add Trade</h1>
        <p className="mt-2 text-slate-600">No accounts available. Please create an account first.</p>
      </div>
    )
  }

  const availableAccounts = accounts.map((a) => ({ id: a.id, name: a.name }))
  const defaultAccountId = accounts[0].id

  return (
    <div>
      <h1 className="text-2xl font-semibold text-text-primary">Add Trade</h1>
      <div className="mt-6 max-w-2xl">
        {error && (
          <div className="mb-4 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <TradeForm
          initialValues={{ accountId: defaultAccountId }}
          onSubmit={handleSubmit}
          submitLabel="Add Trade"
          isSubmitting={isSubmitting}
          availableAccounts={availableAccounts}
        />
      </div>
    </div>
  )
}