export type TradingAccount = {
  id: string;
  name: string;
  broker: string | null;
  accountType: string | null;
  startingBalance: string;
  currency: string;
  isCurrent: boolean;
  avatarUrl: string | null;
  brokerId: string | null;
  brokerName: string | null;
  brokerLogo: string | null;
  createdAt: string;
  tradeCount?: number;
  settlementUnitKey?: string | null;
  unitsPerMajor?: string | null;
  denominationLabel?: string | null;
  denominationEvidence?: Record<string, unknown> | null;
  netPL?: number;
};

export type AccountInput = {
  name: string;
  broker?: string | null;
  brokerId?: string | null;
  brokerName?: string | null;
  brokerLogo?: string | null;
  avatarUrl?: string | null;
  accountType?: string | null;
  startingBalance: number;
  currency?: string;
};
