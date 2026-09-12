import axios from 'axios'
import { useState } from 'react'
import { useAccounts } from '../context/AccountContext'
import AccountForm from '../components/AccountForm'
import type { TradingAccount, AccountInput } from '../types/account'

export default function Accounts() {
  const { accounts, activeAccountId, isLoading, error, fetchAccounts, addAccount, updateAccount, removeAccount, setActiveAccount } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleSubmit(input: AccountInput) {
    setIsSubmitting(true)
    try {
      if (editingAccount) {
        await updateAccount(editingAccount.id, input)
        setEditingAccount(null)
      } else {
        await addAccount(input)
      }
      setShowForm(false)
    } catch (err) {
      console.error('Failed to save account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleDelete(id: string) {
    setDeleteError(null)
    if (confirm('Are you sure you want to delete this account?')) {
      try {
        await removeAccount(id)
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 409) {
          setDeleteError('Cannot delete an account with trades')
        } else {
          setDeleteError('Failed to delete account')
        }
      }
    }
  }

  function handleEdit(account: TradingAccount) {
    setEditingAccount(account)
    setShowForm(true)
  }

  function handleSetActive(account: TradingAccount) {
    setActiveAccount(account.id)
  }

  function handleCancel() {
    setShowForm(false)
    setEditingAccount(null)
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Accounts</h1>
        <p className="mt-2 text-text-muted">Loading accounts...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Accounts</h1>
        <div className="mt-4 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {error}
          <button
            onClick={fetchAccounts}
            className="ml-3 rounded-md bg-accent px-3 py-1 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">
          {editingAccount ? 'Edit Account' : 'Add Account'}
        </h1>
        <div className="mt-6 max-w-md">
          <AccountForm
            initialValues={
              editingAccount
                ? {
                    name: editingAccount.name,
                    broker: editingAccount.broker ?? undefined,
                    accountType: editingAccount.accountType ?? undefined,
                    startingBalance: parseFloat(editingAccount.startingBalance),
                    currency: editingAccount.currency,
                  }
                : undefined
            }
            onSubmit={handleSubmit}
            submitLabel={editingAccount ? 'Update Account' : 'Create Account'}
            isSubmitting={isSubmitting}
          />
          <button
            onClick={handleCancel}
            className="mt-4 w-full rounded-md border border-border-subtle px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-text-primary">Accounts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-text-primary transition hover:bg-accent-hover"
        >
          Add Account
        </button>
      </div>

      {deleteError && (
        <div className="mt-4 rounded-md border border-negative/30 bg-negative/10 px-3 py-2 text-sm text-negative">
          {deleteError}
        </div>
      )}

      {accounts.length === 0 ? (
        <p className="mt-2 text-text-muted">No accounts yet</p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((account) => (
            <div
              key={account.id}
              className={`rounded-md border bg-bg-surface p-4 cursor-pointer transition hover:bg-bg-surface-hover ${
                activeAccountId === account.id
                  ? 'border-accent ring-1 ring-accent'
                  : 'border-border-subtle'
              }`}
              onClick={() => handleSetActive(account)}
            >
              <div className="flex items-start justify-between">
                <h3 className="text-lg font-medium text-text-primary">{account.name}</h3>
                {activeAccountId === account.id && (
                  <span className="inline-flex items-center rounded-full bg-accent/10 px-2 py-1 text-xs font-medium text-accent">
                    Active
                  </span>
                )}
              </div>
              <div className="mt-2 space-y-1 text-sm text-text-muted">
                <p>
                  <span className="font-medium">Broker:</span> {account.broker || '—'}
                </p>
                <p>
                  <span className="font-medium">Type:</span> {account.accountType || '—'}
                </p>
                <p>
                  <span className="font-medium">Starting Balance:</span>{' '}
                  {account.accountType?.toUpperCase() === 'CENT'
                    ? `${Number(account.startingBalance).toLocaleString()} cents`
                    : `$${Number(account.startingBalance).toLocaleString()} ${account.currency}`}
                </p>
                <p>
                  <span className="font-medium">Trades:</span> {account.tradeCount ?? 0}
                </p>
                <p>
                  <span className="font-medium">Net P/L:</span>{' '}
                  <span className={account.netPL && account.netPL > 0 ? 'text-positive' : account.netPL && account.netPL < 0 ? 'text-negative' : ''}>
                    {account.netPL ? (account.netPL > 0 ? '+' : '') + account.netPL.toFixed(2) + 'R' : '0R'}
                  </span>
                </p>
              </div>
              <div className="mt-4 flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  onClick={() => handleEdit(account)}
                  className="rounded-md border border-border-subtle px-3 py-1.5 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(account.id)}
                  className="rounded-md border border-negative/40 px-3 py-1.5 text-sm font-medium text-negative transition hover:bg-negative/10"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}