import {apiError} from '../services/financialService'
import DenominationForm from '../components/DenominationForm'
import {formatDecimal, scoreTone} from '../utils/decimal'
import {Dialog} from '../components/WorkspaceUI'
import axios from 'axios'
import { useState } from 'react'
import { useAccounts } from '../context/AccountContext'
import AccountForm from '../components/AccountForm'
import BrokerLogo from '../components/BrokerLogo'
import AccountAvatar from '../components/AccountAvatar'
import RealizedPanel from '../components/RealizedPanel'
import type { TradingAccount, AccountInput } from '../types/account'

const ACCOUNT_TYPES = ['Standard', 'Cent', 'Demo', 'Raw Spread', 'ECN', 'Other']
const CURRENCIES = ['USD', 'EUR', 'GBP', 'NGN']

// Helper to capitalize first letter for consistent display
function capitalizeFirst(str: string | null): string {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}


export default function Accounts() {
  const { accounts, isLoading, error, fetchAccounts, addAccount, updateAccount, removeAccount, setActiveAccount } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<TradingAccount | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState('')
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<TradingAccount | null>(null)
  const [replacementAccountId, setReplacementAccountId] = useState<string | null>(null)

  // Calculate overview stats
  const currentAccount = accounts.find(a => a.isCurrent)
  const totalAccounts = accounts.length
  const overallPL = accounts.reduce((sum, a) => sum + (a.netPL || 0), 0)

  const combinedEquity = 'Kept per account'

  async function handleSubmit(input: AccountInput) {
    setSaveError('')
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
      setSaveError(apiError(err))
      console.error('Failed to save account:', err)
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleDeleteClick(account: TradingAccount) {
    setAccountToDelete(account)
    setReplacementAccountId(null)
    setShowDeleteDialog(true)
  }

  async function confirmDelete() {
    if (!accountToDelete) return

    setDeleteError(null)
    const id = accountToDelete.id

    try {
      if (accountToDelete.isCurrent && accounts.length > 1) {
        if (!replacementAccountId) {
          setDeleteError('Please select a replacement current account')
          return
        }
        await removeAccount(id, replacementAccountId)
      } else {
        await removeAccount(id)
      }
      setShowDeleteDialog(false)
      setAccountToDelete(null)
    } catch (err) {
      if (axios.isAxiosError(err) && err.response?.status === 409) {
        setDeleteError('Cannot delete an account with trades')
      } else {
        setDeleteError('Failed to delete account')
      }
    }
  }

  function cancelDelete() {
    setShowDeleteDialog(false)
    setAccountToDelete(null)
    setReplacementAccountId(null)
    setDeleteError(null)
  }

  function handleEdit(account: TradingAccount) {
    setEditingAccount(account)
    setShowForm(true)
  }

  async function handleSetActive(account: TradingAccount) {
    try {
      await setActiveAccount(account.id)
    } catch (err) {
      console.error('Failed to set active account:', err)
    }
  }

  function handleCancel() {
    setShowForm(false)
    setEditingAccount(null)
  }

  if (isLoading && accounts.length === 0) {
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
        <div className="mt-4 rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-negative">
          {error}
          <button
            onClick={fetchAccounts}
            className="ml-3 rounded-chip bg-accent px-3 py-1 text-sm font-medium text-bg-base transition hover:bg-accent-hover"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (showForm) {
    return (
      <div className="max-w-2xl">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold text-text-primary">
            {editingAccount ? 'Edit Account' : 'Add Account'}
          </h1>
          <button
            onClick={handleCancel}
            className="text-sm text-text-muted hover:text-text-primary transition"
          >
            Cancel
          </button>
        </div>
        {saveError && <p role="alert" className="mb-4 text-negative">{saveError}</p>}
        <AccountForm
          initialValues={
            editingAccount
              ? {
                  name: editingAccount.name,
                  broker: editingAccount.broker ?? undefined,
                  brokerId: editingAccount.brokerId ?? undefined,
                  brokerName: editingAccount.brokerName ?? undefined,
                  brokerLogo: editingAccount.brokerLogo ?? undefined,
                  avatarUrl: editingAccount.avatarUrl ?? undefined,
                  accountType: editingAccount.accountType ?? undefined,
                  startingBalance: parseFloat(editingAccount.startingBalance),
                  currency: editingAccount.currency,
                }
              : undefined
          }
          onSubmit={handleSubmit}
          submitLabel={editingAccount ? 'Update Account' : 'Create Account'}
          isSubmitting={isSubmitting}
          accountTypes={ACCOUNT_TYPES}
          currencies={CURRENCIES}
        />
      </div>
    )
  }

  return (
    <div className="accounts-workspace">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-text-primary tracking-tight">Trading accounts</h1>
        <button
          onClick={() => setShowForm(true)}
          className="rounded-card bg-accent px-4 py-2 text-sm font-medium text-bg-base transition hover:bg-accent-hover"
        >
          Add Account
        </button>
      </div>

      {deleteError && (
        <div className="mb-4 rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-negative">
          {deleteError}
        </div>
      )}

      {accounts.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-xl font-medium text-text-primary mb-2">No trading accounts yet</p>
          <p className="text-text-muted mb-6">Add your first trading account to start journaling your trades.</p>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-card bg-accent px-6 py-3 text-sm font-medium text-bg-base transition hover:bg-accent-hover"
          >
            Create your first account
          </button>
        </div>
      ) : (
        <>
          {/* Accounts Overview Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-card border border-border bg-bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Total Accounts</p>
              <p className="text-2xl font-mono-data tabular-nums text-text-primary">{totalAccounts}</p>
            </div>
            <div className="rounded-card border border-border bg-bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Current Account</p>
              <p className="text-lg font-medium text-text-primary truncate">{currentAccount?.name || '—'}</p>
            </div>
            <div className="rounded-card border border-border bg-bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Starting Balances</p>
              <p className="text-lg font-mono-data tabular-nums text-text-primary">{combinedEquity || '—'}</p>
            </div>
            <div className="rounded-card border border-border bg-bg-surface p-4">
              <p className="text-xs text-text-muted uppercase tracking-wider mb-1">Combined Planned R Score</p>
              <p className={`text-lg font-mono-data tabular-nums ${scoreTone(overallPL)}`}>
                {overallPL > 0 ? '+' : ''}{overallPL.toFixed(2)}R
              </p>
            </div>
          </div>

          <section className="mb-6" aria-label="Selected account actual results"><RealizedPanel /></section>
          {/* Account List */}
          <div className="space-y-3">
            {accounts.map((account) => (
              <div
                key={account.id}
                className={`account-card rounded-card border bg-bg-surface p-4 transition hover:bg-bg-surface-hover ${
                  account.isCurrent
                    ? 'account-current border-border'
                    : 'border-border'
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-center gap-4">
                    <AccountAvatar
                      name={account.name}
                      avatarUrl={account.avatarUrl}
                      size="lg"
                    />
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-lg font-medium text-text-primary">{account.name}</h3>
                        {account.isCurrent && (
                          <span className="inline-flex items-center rounded-chip bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                            Current Account
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <BrokerLogo
                          name={account.brokerName || account.broker || 'Unknown'}
                          logoUrl={account.brokerLogo}
                          size="sm"
                        />
                        <span className="text-sm text-text-muted">{account.brokerName || account.broker || '—'}</span>
                        {account.accountType && (
                          <span className="text-sm text-text-muted">•</span>
                        )}
                        <span className="text-sm text-text-muted">{capitalizeFirst(account.accountType)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    {!account.isCurrent && (
                      <button
                        onClick={() => handleSetActive(account)}
                        className="rounded-chip bg-accent px-3 py-1.5 text-sm font-medium text-bg-base transition hover:bg-accent-hover"
                      >
                        Use Account
                      </button>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(account)}
                        className="rounded-chip border border-border px-3 py-1.5 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteClick(account)}
                        className="rounded-chip border border-border px-3 py-1.5 text-sm font-medium text-negative transition hover:bg-bg-surface-hover"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
                <DenominationForm key={account.id} account={account}/>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Starting Balance</p>
                    <p className={`font-mono-data tabular-nums text-text-primary ${
                      account.accountType?.toUpperCase() === 'CENT' ? '' : ''
                    }`}>
                      {formatDecimal(account.startingBalance)} {account.currency} · recorded raw units
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Total Trades</p>
                    <p className="font-mono-data tabular-nums text-text-primary">{account.tradeCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Planned R Score</p>
                    <p className={`font-mono-data tabular-nums ${scoreTone(account.netPL)}`}>
                      {account.netPL ? (account.netPL > 0 ? '+' : '') + account.netPL.toFixed(2) + 'R' : '0R'}
                    </p>
                  </div>
                  <div>
                    <p className="text-text-muted text-xs uppercase tracking-wider mb-1">Currency</p>
                    <p className="font-mono-data tabular-nums text-text-primary">{account.currency}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && accountToDelete && (
        <Dialog title="Delete Account" onClose={cancelDelete}>

            <p className="text-text-muted mb-4">
              Are you sure you want to delete <span className="font-medium text-text-primary">{accountToDelete.name}</span>?
            </p>
            {accountToDelete.isCurrent && accounts.length > 1 && (
              <div className="mb-4">
                <p className="text-sm text-text-muted mb-2">This is your current account. Select a replacement:</p>
                <select
                  value={replacementAccountId || ''}
                  onChange={(e) => setReplacementAccountId(e.target.value)}
                  className="w-full rounded-card border border-border bg-bg-surface px-3 py-2 text-sm text-text-primary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent"
                >
                  <option value="">Select an account...</option>
                  {accounts.filter(a => a.id !== accountToDelete.id).map((account) => (
                    <option key={account.id} value={account.id}>{account.name}</option>
                  ))}
                </select>
              </div>
            )}
            {deleteError && (
              <p className="text-sm text-negative mb-4">{deleteError}</p>
            )}
            <div className="flex justify-end gap-3">
              <button
                onClick={cancelDelete}
                className="rounded-chip border border-border px-4 py-2 text-sm font-medium text-text-muted transition hover:bg-bg-surface-hover hover:text-text-primary"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={accountToDelete.isCurrent && accounts.length > 1 && !replacementAccountId}
                className="rounded-chip bg-negative px-4 py-2 text-sm font-medium text-bg-base transition hover:bg-negative-hover disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Delete
              </button>
            </div>
        </Dialog>
      )}
    </div>
  )
}
