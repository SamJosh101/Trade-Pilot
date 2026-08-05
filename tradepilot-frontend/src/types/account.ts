export type TradingAccount = {
  id: string;
  name: string;
  broker: string | null;
  accountType: string | null;
  startingBalance: string;
  currency: string;
  createdAt: string;
};

export type AccountInput = {
  name: string;
  broker?: string;
  accountType?: string;
  startingBalance: number;
  currency?: string;
};
