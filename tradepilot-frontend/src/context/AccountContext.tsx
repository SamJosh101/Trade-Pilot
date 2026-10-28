import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
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
  removeAccount: (id: string, newCurrentAccountId?: string) => Promise<void>
  setActiveAccount: (id: string | null) => Promise<void>
}

const AccountContext = createContext<AccountContextValue | undefined>(undefined)

type AccountProviderProps = {
  children: ReactNode
}

export function AccountProvider({ children }: AccountProviderProps) {
  const { token, isLoading: authLoading } = useAuth()
  const tokenRef = useRef(token)
  tokenRef.current = token
  const requests = useRef(0)
  const loadedToken = useRef<string | null>(null)
  const switchQueue = useRef<Promise<unknown>>(Promise.resolve())
  const [accounts, setAccounts] = useState<TradingAccount[]>([])
  const [activeAccountId, setActiveAccountIdState] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const activeAccount = accounts.find((a) => a.id === activeAccountId) ?? null

  const setActiveAccount = useCallback(async (id: string | null) => {
    if (id) {
      const request = ++requests.current
      const requestedToken = tokenRef.current
      setIsLoading(true)
      setError('')
      // Call backend to set current account
      try {
        // Preserve click order at the server as well as ignoring stale responses.
        const operation = switchQueue.current.catch(() => undefined).then(() => {
          if (requestedToken !== tokenRef.current) return
          return accountService.setCurrent(id)
        })
        switchQueue.current = operation
        await operation
        if (request !== requests.current || requestedToken !== tokenRef.current) return
        setActiveAccountIdState(id)
        localStorage.setItem('activeAccountId', id)
        // Refresh accounts to get updated isCurrent flags
        const data = await accountService.getAll()
        if (request !== requests.current || requestedToken !== tokenRef.current) return
        loadedToken.current = requestedToken
        setAccounts(data)
      } catch (err) {
        if (request === requests.current && requestedToken === tokenRef.current) setError('Failed to switch account. Please retry.')
        console.error('Failed to set current account:', err)
        throw err
      } finally {
        if (request === requests.current && requestedToken === tokenRef.current) setIsLoading(false)
      }
    } else {
      ++requests.current
      setIsLoading(false)
      setActiveAccountIdState(null)
      localStorage.removeItem('activeAccountId')
    }
  }, [])

  const fetchAccounts = useCallback(async () => {
    const request = ++requests.current
    const requestedToken = tokenRef.current
    setIsLoading(true)
    setError('')
    try {
      const data = await accountService.getAll()
      if (request !== requests.current || requestedToken !== tokenRef.current) return
      loadedToken.current = requestedToken
      setAccounts(data)

      // Find the account with isCurrent === true from backend
      const currentAccount = data.find((a) => a.isCurrent === true)

      if (currentAccount) {
        // Reconcile with backend value
        setActiveAccountIdState(currentAccount.id)
        localStorage.setItem('activeAccountId', currentAccount.id)
      } else if (data.length > 0) {
        // Fallback to first account if no current account set (shouldn't happen with backend logic)
        setActiveAccountIdState(data[0].id)
        localStorage.setItem('activeAccountId', data[0].id)
      } else {
        setActiveAccountIdState(null)
        localStorage.removeItem('activeAccountId')
      }
    } catch (err) {
      if (request === requests.current && requestedToken === tokenRef.current) setError('Failed to load accounts')
      console.error(err)
    } finally {
      if (request === requests.current && requestedToken === tokenRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) {
      return
    }

    if (!token) {
      ++requests.current
      loadedToken.current = null
      setActiveAccountIdState(null)
      localStorage.removeItem('activeAccountId')
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

  const removeAccount = useCallback(async (id: string, newCurrentAccountId?: string) => {
    await accountService.remove(id, newCurrentAccountId)
    await fetchAccounts()
  }, [fetchAccounts])

  const value = {
    accounts: loadedToken.current === token ? accounts : [],
    activeAccountId: loadedToken.current === token ? activeAccountId : null,
    activeAccount: loadedToken.current === token ? activeAccount : null,
    isLoading: isLoading||authLoading||(!!token&&loadedToken.current!==token&&!error),
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
