import {useLocation} from 'react-router-dom';
import * as queryApi from '../services/tradeQueryService';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { useAccounts } from './AccountContext'
import { useAuth } from '../hooks/useAuth'
import * as tradeService from '../services/tradeService'
import type { Trade, TradeInput } from '../types/trade'

type TradeContextValue = {
  trades: Trade[]
  isLoading: boolean
  error: string
  revision: number
  fetchTrades: (accountId?: string) => Promise<void>
  refreshAfterWrite: (accountId?: string) => Promise<void>
  addTrade: (input: TradeInput) => Promise<void>
  updateTrade: (id: string, input: Partial<TradeInput>) => Promise<void>
  removeTrade: (id:string,revision:number,confirmationToken:string) => Promise<void>
}

const TradeContext = createContext<TradeContextValue | undefined>(undefined)

type TradeProviderProps = {
  children: ReactNode
  onTradeChange?: () => Promise<void>
}

export function TradeProvider({ children, onTradeChange }: TradeProviderProps) {
  const { activeAccountId } = useAccounts()
  const { token } = useAuth()
  const {pathname}=useLocation()
  const pagedJournal=pathname==='/trades'
  const pathRef=useRef(pathname);pathRef.current=pathname
  const scope = `${token ?? ''}:${activeAccountId ?? ''}`
  const scopeRef = useRef(scope)
  scopeRef.current = scope
  const accountRef = useRef(activeAccountId)
  accountRef.current = activeAccountId
  const requestId = useRef(0)
  const loadedScope = useRef('')
  const [revision, setRevision] = useState(0)
  const [trades, setTrades] = useState<Trade[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchTrades = useCallback(async (accountId?: string) => {
    // A completed mutation from a previous account must not refresh its rows
    // under the newly selected account's scope.
    if(accountId&&accountId!==accountRef.current)return
    const request = ++requestId.current
    const requestedScope = scopeRef.current
    setTrades([])
    if (!accountId) {
      loadedScope.current = requestedScope
      setIsLoading(false)
      setError('')
      return
    }
    setIsLoading(true)
    setError('')
    if(pathRef.current==='/trades'){
      try{const capability=await queryApi.capabilities();if(capability.available){if(request===requestId.current&&requestedScope===scopeRef.current){loadedScope.current=requestedScope;setTrades([]);setIsLoading(false);}return;}}catch{if(request===requestId.current&&requestedScope===scopeRef.current){loadedScope.current=requestedScope;setIsLoading(false);setError('Trade query availability could not load. Retry.');}return;}
    }
    try {
      const data = await tradeService.getAll(accountId)
      if (request === requestId.current && requestedScope === scopeRef.current) {
        loadedScope.current = requestedScope
        setTrades(data.filter((trade) => trade.accountId === accountId))
      }
    } catch (err) {
      if (request === requestId.current && requestedScope === scopeRef.current) { loadedScope.current=requestedScope; setError('Failed to load trades') }
      console.error(err)
    } finally {
      if (request === requestId.current && requestedScope === scopeRef.current) setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void fetchTrades(token ? activeAccountId ?? undefined : undefined)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- this is a request generation counter, not a DOM ref
    return () => { ++requestId.current }
  }, [token, activeAccountId, fetchTrades,pagedJournal])

  const refreshAfterWrite = useCallback(async (accountId?:string) => {
    setRevision(value=>value+1)
    await fetchTrades(accountId??accountRef.current??undefined)
    await onTradeChange?.()
  },[fetchTrades,onTradeChange])

  const addTrade = useCallback(async (input: TradeInput) => {
    await tradeService.create(input)
    setRevision((value) => value + 1)
    await fetchTrades(accountRef.current ?? undefined)
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange])

  const updateTrade = useCallback(async (id: string, input: Partial<TradeInput>) => {
    const observed=trades.find(t=>t.id===id);
    if(!observed)throw new Error('Reload the trade before editing it.');
    await tradeService.update(id, input, observed.revision)
    setRevision((value) => value + 1)
    await fetchTrades(accountRef.current ?? undefined)
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange,trades])

  const removeTrade = useCallback(async (id:string,revision:number,confirmationToken:string) => {
    await tradeService.remove(id,revision,confirmationToken)
    setRevision((value) => value + 1)
    await fetchTrades(accountRef.current ?? undefined)
    await onTradeChange?.()
  }, [fetchTrades, onTradeChange])

  const value = {
    trades: loadedScope.current === scope ? trades : [],
    isLoading: loadedScope.current!==scope&&!!token&&!!activeAccountId?true:isLoading,
    error: loadedScope.current===scope?error:'',
    revision,
    fetchTrades,
    refreshAfterWrite,
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
