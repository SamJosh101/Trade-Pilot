import { Direction, Prisma } from "@prisma/client";
import { AppError } from "./AppError";

/**
 * Risk/Reward ratio.
 * BUY:  risk = entry - sl,  reward = tp - entry
 * SELL: risk = sl - entry,  reward = entry - tp
 * Planned ratio only; actual realized performance requires exit/fill data.
 * Reject invalid new/edited prices instead of storing misleading ratios.
 */
export function calculateRR(
  direction: Direction,
  entry: number,
  sl: number,
  tp: number
): number {
  if (![entry, sl, tp].every((value) => Number.isFinite(value) && value > 0)) {
    throw new AppError("Prices must be finite positive numbers", 400);
  }
  const price = new Prisma.Decimal(entry);
  const risk = direction === "BUY" ? price.minus(sl) : new Prisma.Decimal(sl).minus(price);
  const reward = direction === "BUY" ? new Prisma.Decimal(tp).minus(price) : price.minus(tp);

  if (risk.lte(0)) throw new AppError("Stop loss must be below entry for BUY and above entry for SELL", 400);
  if (reward.lte(0)) throw new AppError("Take profit must be above entry for BUY and below entry for SELL", 400);
  const ratio = reward.div(risk).toDecimalPlaces(2);
  if (ratio.gt(999.99) || ratio.lte(0)) throw new AppError("Planned RR cannot be represented with the current storage precision", 400);
  return ratio.toNumber();
}
