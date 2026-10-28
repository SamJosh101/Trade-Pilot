import { Direction, Result } from "@prisma/client";

export interface RegisterInput {
  name: string;
  email: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TradeInput {
  accountId: string;
  pair: string;
  direction: Direction;
  entry: number;
  sl: number;
  tp: number;
  timeframe?: string | null;
  result?: Result | null;
  notes?: string | null;
  imageUrl?: string | null;
}

export type TradeUpdateInput = Partial<TradeInput>;

export interface AccountInput {
  name: string;
  broker?: string | null;
  brokerId?: string | null;
  brokerName?: string | null;
  brokerLogo?: string | null;
  avatarUrl?: string | null;
  accountType?: string | null;
  startingBalance: number;
  currency?: string;
}

export type AccountUpdateInput = Partial<AccountInput>;
