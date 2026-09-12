import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as accountService from '../services/accountService'
import { useAuth } from '../hooks/useAuth'
import type { TradingAccount, AccountInput } from '../types/account'

type AccountContextValue = {
  accounts: TradingAccount[]
  activeAccountId: string | null
  activeAccount: TradingAccount | null
  isLoading: boolean
  error: string
  fetchAccounts: () => Promise<void>
  addAccount: (input: AccountInput) => Promise<void>
  updateAccount: (id: string, input: Partial<AccountInput>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
  setActiveAccount: (id: string | null) => void
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

type AccountProviderProps = {
  children: ReactNode
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { token, isLoading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(() => {
    const stored = localStorage.getItem('activeAccountId')
    return stored || null
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null

  const setActiveAccount = useCallback((id: string | null) => {
    setActiveAccountIdState(id)
    if (id) {
      localStorage.setItem('activeAccountId', id)
    } else {
      localStorage.removeItem('activeAccountId')
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await accountService.getAll()
      setAccounts(data)
      
      // If no active account is set, or the stored one no longer exists, default to first account
      if (data.length > 0 && (!activeAccountId || !data.find((a) => a.id === activeAccountId))) {
        setActiveAccount(data[0].id)
      }
    } catch (err) {
      setError('Failed to load accounts')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [activeAccountId, setActiveAccount])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!token) {
      setAccounts([])
      setError('')
      setIsLoading(false)
      return
    }

    fetchAccounts()
  }, [authLoading, fetchAccounts, token])

  const addAccount = useCallback(async (input: AccountInput) => {
    await accountService.create(input)
    await fetchAccounts()
  }, [fetchAccounts])

  const updateAccount = useCallback(async (id: string, input: Partial<AccountInput>) => {
    await accountService.update(id, input)
    await fetchAccounts()
  }, [fetchAccounts])

  const removeAccount = useCallback(async (id: string) => {
    await accountService.remove(id)
    await fetchAccounts()
  }, [fetchAccounts])

  const value = {
    accounts,
    activeAccountId,
    activeAccount,
    isLoading,
    error,
    fetchAccounts,
    addAccount,
    updateAccount,
    removeAccount,
    setActiveAccount,
  }

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>
}

export function useAccounts() {
  const context = useContext(AccountContext)
  if (context === undefined) {
    throw new Error('useAccounts must be used within an AccountProvider')
  }
  return context
}