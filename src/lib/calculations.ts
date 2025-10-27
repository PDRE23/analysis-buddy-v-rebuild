/**
 * Core calculation functions for lease analysis
 */

export interface AnnualLine {
  year: number;
  base_rent: number;
  operating: number;
  parking?: number;
  abatement_credit: number;
  net_cash_flow: number;
}

/**
 * Format number as currency
 */
export const fmtMoney = (v: number | undefined): string =>
  (v ?? 0).toLocaleString(undefined, { 
    style: "currency", 
    currency: "USD", 
    maximumFractionDigits: 0 
  });

/**
 * Format number as rate per SF per year
 */
export const fmtRate = (v: number | undefined): string => 
  `$${(v ?? 0).toFixed(2)}/SF/yr`;

/**
 * Clamp value between min and max
 */
export const clamp = (v: number, min: number, max: number): number => 
  Math.min(max, Math.max(min, v));

/**
 * Apply escalation to a base value for N periods
 */
export const escalate = (
  value: number, 
  n: number, 
  method: "fixed" | "cpi" = "fixed", 
  rate = 0
): number => {
  if (n <= 0) return value;
  const r = Math.max(0, rate);
  return value * Math.pow(1 + r, n);
};

/**
 * Calculate overlapping months between two date ranges
 */
export const overlappingMonths = (
  start: Date, 
  end: Date, 
  a: Date, 
  b: Date
): number => {
  const s = new Date(Math.max(start.getTime(), a.getTime()));
  const e = new Date(Math.min(end.getTime(), b.getTime()));
  if (s >= e) return 0;
  return (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
};

/**
 * Calculate Net Present Value of cash flows
 */
export const npv = (lines: AnnualLine[], discountRate: number): number => {
  return lines.reduce(
    (acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + discountRate, i + 1), 
    0
  );
};

/**
 * Calculate effective rent per square foot
 */
export const effectiveRentPSF = (
  lines: AnnualLine[], 
  rsf: number, 
  years: number
): number => {
  const totalNCF = lines.reduce((acc, r) => acc + r.net_cash_flow, 0);
  const denom = Math.max(1, rsf) * Math.max(1, years);
  return totalNCF / denom;
};

/**
 * Calculate internal rate of return (IRR) approximation
 */
export const irr = (lines: AnnualLine[], guess = 0.1): number => {
  const maxIterations = 100;
  const tolerance = 1e-6;
  
  let rate = guess;
  
  for (let i = 0; i < maxIterations; i++) {
    const npvValue = npv(lines, rate);
    const derivative = lines.reduce(
      (acc, row, j) => acc - (j + 1) * row.net_cash_flow / Math.pow(1 + rate, j + 2),
      0
    );
    
    if (Math.abs(npvValue) < tolerance) break;
    if (Math.abs(derivative) < tolerance) break;
    
    rate = rate - npvValue / derivative;
  }
  
  return rate;
};

/**
 * Calculate payback period in years
 */
export const paybackPeriod = (lines: AnnualLine[]): number => {
  let cumulative = 0;
  let year = 0;
  
  for (const line of lines) {
    cumulative += line.net_cash_flow;
    year++;
    if (cumulative >= 0) break;
  }
  
  if (cumulative < 0) return lines.length; // Never pays back
  
  // Interpolate for partial year
  const prevCumulative = cumulative - lines[year - 1].net_cash_flow;
  const fraction = Math.abs(prevCumulative) / Math.abs(lines[year - 1].net_cash_flow);
  
  return year - 1 + fraction;
};

/**
 * Calculate cash-on-cash return
 */
export const cashOnCashReturn = (
  lines: AnnualLine[], 
  initialInvestment: number
): number => {
  const totalCashFlow = lines.reduce((acc, line) => acc + line.net_cash_flow, 0);
  return initialInvestment !== 0 ? totalCashFlow / Math.abs(initialInvestment) : 0;
};

/**
 * Calculate average annual return
 */
export const averageAnnualReturn = (lines: AnnualLine[]): number => {
  const totalReturn = lines.reduce((acc, line) => acc + line.net_cash_flow, 0);
  return lines.length > 0 ? totalReturn / lines.length : 0;
};

/**
 * Calculate return on investment (ROI)
 */
export const roi = (lines: AnnualLine[], initialInvestment: number): number => {
  const totalReturn = lines.reduce((acc, line) => acc + line.net_cash_flow, 0);
  return initialInvestment !== 0 ? (totalReturn - initialInvestment) / Math.abs(initialInvestment) : 0;
};
