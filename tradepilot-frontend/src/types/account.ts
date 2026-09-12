export type TradingAccount = {
  id: string;
  name: string;
  broker: string | null;
  accountType: string | null;
  startingBalance: string;
  currency: string;
  createdAt: string;
  tradeCount?: number;
  netPL?: number;
};

export type AccountInput = {
  name: string;
  broker?: string;
  accountType?: string;
  startingBalance: number;
  currency?: string;
};
