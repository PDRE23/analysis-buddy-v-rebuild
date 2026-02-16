/**
 * Metrics calculation engine — canonical NPV & effective rent functions.
 *
 * Compounding convention
 * ----------------------
 * `npv()` treats `discountRate` as an **effective annual rate** and
 * discounts each annual cash-flow line at `(1 + r)^year`.
 *
 * For sub-annual (monthly / dated) cash flows, use `npvMonthly()` from
 * `@/lib/analysis/npv` which converts the effective annual rate to an
 * equivalent monthly rate: `r_m = (1 + r)^(1/12) − 1`.
 *
 * Both functions are algebraically consistent: for annual flows at
 * integer year boundaries, `npvMonthly` reduces to the same result as
 * `npv` because `(1 + r_m)^(12·n) ≡ (1 + r)^n`.
 *
 * Rounding: no intermediate rounding is applied; callers may round the
 * final display value as needed.
 */

import type { AnnualLine } from "@/types";

/**
 * Net Present Value using monthly compounding internally.
 *
 * Converts the effective annual rate to a monthly rate, then discounts
 * each annual flow at 12-month intervals.  Algebraically equivalent to
 * `CF / (1 + r)^n` for integer-year flows, but establishes monthly
 * compounding as the single canonical convention across the system.
 *
 * @param lines   Ordered annual lines (year 1 … N)
 * @param discountRate  Effective annual discount rate (e.g. 0.08 = 8 %)
 */
export function npv(lines: AnnualLine[], discountRate: number): number {
  if (discountRate === 0) {
    return lines.reduce((acc, row) => acc + row.net_cash_flow, 0);
  }
  const monthlyRate = Math.pow(1 + discountRate, 1 / 12) - 1;
  return lines.reduce(
    (acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + monthlyRate, 12 * (i + 1)),
    0
  );
}

/**
 * NPV for any array of objects with a `net_cash_flow` property.
 * Uses the same monthly-compounding convention as `npv()`.
 */
export function npvFromFlows(
  flows: ReadonlyArray<{ net_cash_flow: number }>,
  discountRate: number
): number {
  if (discountRate === 0) {
    return flows.reduce((acc, row) => acc + row.net_cash_flow, 0);
  }
  const monthlyRate = Math.pow(1 + discountRate, 1 / 12) - 1;
  return flows.reduce(
    (acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + monthlyRate, 12 * (i + 1)),
    0
  );
}

/**
 * Effective rent per rentable square foot per year.
 *
 * @param lines   Ordered annual lines
 * @param rsf     Rentable square footage (clamped ≥ 1 to avoid division by zero)
 * @param years   Lease term in years      (clamped ≥ 1)
 */
export function effectiveRentPSF(lines: AnnualLine[], rsf: number, years: number): number {
  const totalNCF = lines.reduce((acc, r) => acc + r.net_cash_flow, 0);
  const denom = Math.max(1, rsf) * Math.max(1, years);
  return totalNCF / denom;
}

