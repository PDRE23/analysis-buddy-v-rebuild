/**
 * Metrics calculation engine
 * Key financial metrics: NPV, effective rent, etc.
 * 
 * All business logic preserved exactly as-is from v1.
 */

import type { AnnualLine } from "@/types";

/**
 * Calculate Net Present Value of cash flows
 */
export function npv(lines: AnnualLine[], discountRate: number): number {
  return lines.reduce((acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + discountRate, i + 1), 0);
}

/**
 * Calculate effective rent per square foot
 */
export function effectiveRentPSF(lines: AnnualLine[], rsf: number, years: number): number {
  const totalNCF = lines.reduce((acc, r) => acc + r.net_cash_flow, 0);
  const denom = Math.max(1, rsf) * Math.max(1, years);
  return totalNCF / denom;
}

