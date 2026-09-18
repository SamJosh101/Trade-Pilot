import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import * as tradeService from '../services/tradeService'
import type { Trade, TradeInput } from '../types/trade'

type TradeContextValue = {
  trades: Trade[]
  isLoading: boolean
  error: string
  fetchTrades: (accountId?: string) => Promise<void>
  addTrade: (input: TradeInput) => Promise<void>
  updateTrade: (id: string, input: Partial<TradeInput>) => Promise<void>
  removeTrade: (id: string) => Promise<void>
}

const TradeContext = createContext<TradeContextValue | undefined>(undefined)

type TradeProviderProps = {
  children: ReactNode
  onTradeChange?: () => Promise<void>
}

export function TradeProvider({ children, onTradeChange }: TradeProviderProps) {
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTrades = useCallback(async (accountId?: string) => {
    setIsLoading(true)
    setError('')
    try {
      const data = await tradeService.getAll(accountId)
      setTrades(data)
    } catch (err) {
      setError('Failed to load trades')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const addTrade = useCallback(async (input: TradeInput) => {
    await tradeService.create(input)
    await fetchTrades()
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange])

  const updateTrade = useCallback(async (id: string, input: Partial<TradeInput>) => {
    await tradeService.update(id, input)
    await fetchTrades()
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange])

  const removeTrade = useCallback(async (id: string) => {
    await tradeService.remove(id)
    await fetchTrades()
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange])

  const value = {
    trades,
    isLoading,
    error,
    fetchTrades,
    addTrade,
    updateTrade,
    removeTrade,
  }

  return <TradeContext.Provider value={value}>{children}</TradeContext.Provider>
}

export function useTrades() {
  const context = useContext(TradeContext)
  if (context === undefined) {
    throw new Error('useTrades must be used within a TradeProvider')
  }
  return context
}
