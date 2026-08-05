export interface EquityCurvePoint {
  date: string;
  cumulativeRR: number;
}

export interface PairBreakdown {
  pair: string;
  totalTrades: number;
  winRate: number;
  avgRR: number;
}

export interface WinLossBreakdown {
  win: number;
  loss: number;
  breakEven: number;
  open: number;
}

export interface DirectionBreakdown {
  buy: number;
  sell: number;
}

export interface Analytics {
  equityCurve: EquityCurvePoint[];
  pairBreakdown: PairBreakdown[];
  winLossBreakdown: WinLossBreakdown;
  directionBreakdown: DirectionBreakdown;
}
