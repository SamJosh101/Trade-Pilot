import type { Trade } from '../types/trade'

// Compatibility score, NOT realized R. Preserve the backend's existing
// WIN +plannedRR / LOSS -plannedRR / BE or OPEN zero convention.
export function legacyTradeScore(trade: Pick<Trade, 'result' | 'rr'>): number {
  const rr = Number(trade.rr ?? 0)
  if (!Number.isFinite(rr)) return 0
  return trade.result === 'WIN' ? rr : trade.result === 'LOSS' ? -rr : 0
}
