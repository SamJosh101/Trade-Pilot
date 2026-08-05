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
  timeframe?: string;
  result?: Result;
  notes?: string;
  imageUrl?: string;
}

export type TradeUpdateInput = Partial<TradeInput>;

export interface AccountInput {
  name: string;
  broker?: string;
  accountType?: string;
  startingBalance: number;
  currency?: string;
}

export type AccountUpdateInput = Partial<AccountInput>;
