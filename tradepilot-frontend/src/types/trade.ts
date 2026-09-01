export type Direction = 'BUY' | 'SELL'
export type TradeResult = 'WIN' | 'LOSS' | 'BE'

export type Trade = {
  id: string
  accountId: string
  pair: string
  direction: Direction
  entry: string
  sl: string
  tp: string
  rr: string | null
  timeframe: string | null
  result: TradeResult | null
  notes: string | null
  imageUrl: string | null
  createdAt: string
}

export type TradeInput = {
  accountId: string
  pair: string
  direction: Direction
  entry: number
  sl: number
  tp: number
  timeframe?: string
  result?: TradeResult
  notes?: string
  imageUrl?: string | null
}

export type CalendarDay = {
  date: string
  netRR: number
  tradeCount: number
  trades: Trade[]
}

export type CalendarResponse = {
  month: string
  days: CalendarDay[]
}
