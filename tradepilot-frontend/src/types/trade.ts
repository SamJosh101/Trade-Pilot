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
  revision?: number
  etag?: string
  performance?: {status: 'OPEN'|'PARTIAL'|'CLOSED'|null}|null
}

export type TradeInput = {
  accountId: string
  pair: string
  direction: Direction
  entry: string
  sl: string
  tp: string
  timeframe?: string | null
  result?: TradeResult | null
  notes?: string | null
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
