import { Direction } from "@prisma/client";

/**
 * Risk/Reward ratio.
 * BUY:  risk = entry - sl,  reward = tp - entry
 * SELL: risk = sl - entry,  reward = entry - tp
 * Returns 0 if risk is non-positive (bad/inverted stop) rather than throwing,
 * so a single malformed trade never breaks metrics for the whole account.
 */
export function calculateRR(
  direction: Direction,
  entry: number,
  sl: number,
  tp: number
): number {
  const risk = direction === "BUY" ? entry - sl : sl - entry;
  const reward = direction === "BUY" ? tp - entry : entry - tp;

  if (risk <= 0) return 0;
  return Number((reward / risk).toFixed(2));
}
