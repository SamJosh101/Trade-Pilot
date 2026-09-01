import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import * as accountService from '../services/accountService'
import { useAuth } from '../hooks/useAuth'
import type { TradingAccount, AccountInput } from '../types/account'

type AccountContextValue = {
  accounts: TradingAccount[]
  isLoading: boolean
  error: string
  fetchAccounts: () => Promise<void>
  addAccount: (input: AccountInput) => Promise<void>
  updateAccount: (id: string, input: Partial<AccountInput>) => Promise<void>
  removeAccount: (id: string) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

type AccountProviderProps = {
  children: ReactNode
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { token, isLoading: authLoading } = useAuth()
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true)
    setError('')
    try {
      const data = await accountService.getAll()
      setAccounts(data)
    } catch (err) {
      setError('Failed to load accounts')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

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
    isLoading,
    error,
    fetchAccounts,
    addAccount,
    updateAccount,
    removeAccount,
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