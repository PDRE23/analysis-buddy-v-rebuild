import type { AmortizationRow } from "./amortization";

/**
 * Calculate termination fee using an unamortized balance + penalty months model.
 *
 * Assumptions:
 * - monthIndex is 0-based, representing the schedule row for the termination month.
 * - If currentMonthlyRent is omitted, only unamortized balance is used.
 */
export function terminationFeeAtMonth(
  amortSchedule: AmortizationRow[],
  monthIndex: number,
  penaltyMonths: number,
  currentMonthlyRent?: number
): number {
  if (amortSchedule.length === 0) {
    return Math.max(0, penaltyMonths) * (currentMonthlyRent ?? 0);
  }

  const clampedIndex = Math.min(Math.max(0, monthIndex), amortSchedule.length - 1);
  const balance = amortSchedule[clampedIndex]?.ending_balance ?? 0;
  const penalty = Math.max(0, penaltyMonths) * (currentMonthlyRent ?? 0);
  return balance + penalty;
}
