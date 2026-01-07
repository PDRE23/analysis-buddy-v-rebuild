/**
 * Core calculation functions for lease analysis
 */

export interface AnnualLine {
  year: number;
  base_rent: number;
  operating: number;
  parking?: number;
  abatement_credit: number;
  ti_shortfall?: number;
  transaction_costs?: number;
  amortized_costs?: number;
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

/**
 * Calculate load factor from RSF and USF
 * Load factor = RSF / USF (e.g., 1.15 = 15% load)
 */
export const calculateLoadFactor = (rsf: number, usf?: number): number | undefined => {
  if (!usf || usf <= 0) return undefined;
  if (rsf <= 0) return undefined;
  return rsf / usf;
};

/**
 * TI Shortfall Calculation Result
 */
export interface TIShortfallResult {
  allowanceTotal: number;
  actualCostTotal: number;
  benchmarkCostTotal: number;
  shortfallVsAllowance: number; // actual - allowance (positive = tenant pays)
  shortfallVsBenchmark: number; // actual - benchmark
  tenantContribution: number; // amount tenant must pay
}

/**
 * Calculate TI shortfall vs allowance and benchmark
 */
export const calculateTIShortfall = (
  rsf: number,
  tiAllowancePSF?: number,
  tiActualBuildCostPSF?: number,
  tiBenchmarkCostPSF?: number
): TIShortfallResult => {
  const allowanceTotal = (tiAllowancePSF || 0) * rsf;
  const actualCostTotal = (tiActualBuildCostPSF || 0) * rsf;
  const benchmarkCostTotal = (tiBenchmarkCostPSF || 0) * rsf;
  
  const shortfallVsAllowance = actualCostTotal - allowanceTotal; // positive = tenant pays
  const shortfallVsBenchmark = actualCostTotal - benchmarkCostTotal;
  const tenantContribution = Math.max(0, shortfallVsAllowance); // tenant only pays if actual > allowance

  return {
    allowanceTotal,
    actualCostTotal,
    benchmarkCostTotal,
    shortfallVsAllowance,
    shortfallVsBenchmark,
    tenantContribution,
  };
};

/**
 * Calculate remaining balance from PV amortization schedule at a given month
 */
export const calculatePVAmortizationBalance = (
  principal: number,
  annualRate: number,
  totalMonths: number,
  monthsElapsed: number
): number => {
  if (principal <= 0 || totalMonths <= 0 || monthsElapsed < 0) return 0;
  if (monthsElapsed >= totalMonths) return 0;
  if (!isFinite(principal) || !isFinite(annualRate) || !isFinite(totalMonths) || !isFinite(monthsElapsed)) return 0;
  
  const monthlyRate = annualRate / 12;
  const remainingMonths = totalMonths - monthsElapsed;
  
  // Calculate monthly payment using PMT formula
  if (monthlyRate === 0) {
    // Simple case: no interest
    return principal * (remainingMonths / totalMonths);
  }
  
  // Avoid division by zero and invalid calculations
  const discountFactor = 1 - Math.pow(1 + monthlyRate, -totalMonths);
  if (discountFactor === 0 || !isFinite(discountFactor)) {
    return principal * (remainingMonths / totalMonths);
  }
  
  const monthlyPayment = principal * (monthlyRate / discountFactor);
  
  // Calculate remaining balance using PV of remaining payments
  const remainingDiscountFactor = 1 - Math.pow(1 + monthlyRate, -remainingMonths);
  if (remainingDiscountFactor === 0 || !isFinite(remainingDiscountFactor)) {
    return 0;
  }
  
  // PV of remaining payments = payment * (1 - (1 + r)^-n) / r
  const pvOfRemaining = monthlyPayment * (remainingDiscountFactor / monthlyRate);
  
  return Math.max(0, isFinite(pvOfRemaining) ? pvOfRemaining : 0);
};

/**
 * Unamortized Costs Result
 */
export interface UnamortizedCosts {
  unamortizedTI: number;
  unamortizedTIOverage: number;
  unamortizedFreeRent: number;
  unamortizedBrokerage: number;
  unamortizedOtherCosts: number;
  totalUnamortized: number;
}

/**
 * Calculate unamortized costs at termination date using PV amortization
 */
export const calculateUnamortizedCosts = (
  rsf: number,
  tiAllowancePSF: number | undefined,
  tiActualBuildCostPSF: number | undefined,
  freeRentMonths: number | undefined,
  freeRentRatePSF: number | undefined,
  brokerageCommission: number | undefined,
  otherTransactionCosts: number | undefined,
  commencementDate: string,
  expirationDate: string,
  terminationDate: string,
  interestRate: number = 0.08 // Default 8% annual
): UnamortizedCosts => {
  try {
    const commencement = new Date(commencementDate);
    const expiration = new Date(expirationDate);
    const termination = new Date(terminationDate);
    
    // Validate dates
    if (isNaN(commencement.getTime()) || isNaN(expiration.getTime()) || isNaN(termination.getTime())) {
      return {
        unamortizedTI: 0,
        unamortizedTIOverage: 0,
        unamortizedFreeRent: 0,
        unamortizedBrokerage: 0,
        unamortizedOtherCosts: 0,
        totalUnamortized: 0,
      };
    }
    
    const totalTermMonths = Math.round((expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    const monthsElapsed = Math.round((termination.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 30.44));
    
    if (totalTermMonths <= 0 || monthsElapsed < 0 || !isFinite(totalTermMonths) || !isFinite(monthsElapsed)) {
      return {
        unamortizedTI: 0,
        unamortizedTIOverage: 0,
        unamortizedFreeRent: 0,
        unamortizedBrokerage: 0,
        unamortizedOtherCosts: 0,
        totalUnamortized: 0,
      };
    }
  
    // Calculate each component separately
    let unamortizedTI = 0;
    if (tiAllowancePSF && tiAllowancePSF > 0) {
      const totalTI = tiAllowancePSF * rsf;
      unamortizedTI = calculatePVAmortizationBalance(totalTI, interestRate, totalTermMonths, monthsElapsed);
    }
    
    let unamortizedTIOverage = 0;
    if (tiActualBuildCostPSF !== undefined && tiAllowancePSF !== undefined) {
      const tiOverage = Math.max(0, (tiActualBuildCostPSF - tiAllowancePSF) * rsf);
      if (tiOverage > 0) {
        unamortizedTIOverage = calculatePVAmortizationBalance(tiOverage, interestRate, totalTermMonths, monthsElapsed);
      }
    }
    
    let unamortizedFreeRent = 0;
    if (freeRentMonths && freeRentMonths > 0 && freeRentRatePSF && freeRentRatePSF > 0) {
      const totalFreeRent = (freeRentMonths / 12) * (freeRentRatePSF * rsf);
      unamortizedFreeRent = calculatePVAmortizationBalance(totalFreeRent, interestRate, totalTermMonths, monthsElapsed);
    }
    
    let unamortizedBrokerage = 0;
    if (brokerageCommission && brokerageCommission > 0) {
      unamortizedBrokerage = calculatePVAmortizationBalance(brokerageCommission, interestRate, totalTermMonths, monthsElapsed);
    }
    
    let unamortizedOtherCosts = 0;
    if (otherTransactionCosts && otherTransactionCosts > 0) {
      unamortizedOtherCosts = calculatePVAmortizationBalance(otherTransactionCosts, interestRate, totalTermMonths, monthsElapsed);
    }
    
    return {
      unamortizedTI,
      unamortizedTIOverage,
      unamortizedFreeRent,
      unamortizedBrokerage,
      unamortizedOtherCosts,
      totalUnamortized: unamortizedTI + unamortizedTIOverage + unamortizedFreeRent + unamortizedBrokerage + unamortizedOtherCosts,
    };
  } catch (error) {
    console.error("Error calculating unamortized costs:", error);
    return {
      unamortizedTI: 0,
      unamortizedTIOverage: 0,
      unamortizedFreeRent: 0,
      unamortizedBrokerage: 0,
      unamortizedOtherCosts: 0,
      totalUnamortized: 0,
    };
  }
};

/**
 * Termination Fee Result
 */
export interface TerminationFeeResult {
  rentFee: number; // fee based on months of rent
  baseRentPenalty: number; // additional penalty
  unamortizedCosts: number; // unamortized TI and free rent
  totalFee: number; // total termination fee
}

/**
 * Calculate early termination fee
 */
export const calculateEarlyTerminationFee = (
  analysis: {
    rsf: number;
    rent_schedule: Array<{
      period_start: string;
      period_end: string;
      rent_psf: number;
      escalation_percentage?: number;
      free_rent_months?: number;
    }>;
    concessions: {
      ti_allowance_psf?: number;
      ti_actual_build_cost_psf?: number;
    };
    transaction_costs?: {
      brokerage_fees?: number;
      legal_fees?: number;
      due_diligence?: number;
      environmental?: number;
      other?: number;
      total?: number;
    };
    key_dates: {
      commencement: string;
      expiration: string;
    };
  },
  terminationDate: string,
  option: {
    fee_months_of_rent?: number;
    base_rent_penalty?: number;
    unamortized_costs_included?: boolean;
    termination_interest_rate?: number; // Optional override, defaults to 8%
  }
): TerminationFeeResult => {
  // Find rent period active at termination date
  const termination = new Date(terminationDate);
  let activeRentPeriod = analysis.rent_schedule.find(r => {
    const start = new Date(r.period_start);
    const end = new Date(r.period_end);
    return termination >= start && termination <= end;
  });
  
  if (!activeRentPeriod && analysis.rent_schedule.length > 0) {
    activeRentPeriod = analysis.rent_schedule[0]; // fallback to first period
  }
  
  if (!activeRentPeriod) {
    return { rentFee: 0, baseRentPenalty: 0, unamortizedCosts: 0, totalFee: 0 };
  }
  
  // Calculate then-current rent (with escalations)
  const periodStart = new Date(activeRentPeriod.period_start);
  const yearsInPeriod = (termination.getFullYear() - periodStart.getFullYear()) + 
    (termination.getMonth() - periodStart.getMonth()) / 12;
  const escalationRate = activeRentPeriod.escalation_percentage || 0;
  const thenCurrentRate = activeRentPeriod.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
  const monthlyRent = (thenCurrentRate * analysis.rsf) / 12;
  
  // Calculate fee based on months of rent
  const rentFee = (option.fee_months_of_rent || 0) * monthlyRent;
  
  // Calculate base rent penalty
  const baseRentPenalty = (option.base_rent_penalty || 0) * analysis.rsf;
  
  // Calculate unamortized costs if included
  let unamortizedCosts = 0;
  if (option.unamortized_costs_included) {
    // Calculate brokerage commission (use brokerage_fees or estimate from total)
    const brokerageCommission = analysis.transaction_costs?.brokerage_fees || 0;
    
    // Calculate other transaction costs (excluding brokerage)
    const otherCosts = (analysis.transaction_costs?.total || 0) - brokerageCommission;
    
    const interestRate = option.termination_interest_rate ?? 0.08; // Default 8%
    
    const unamortized = calculateUnamortizedCosts(
      analysis.rsf,
      analysis.concessions.ti_allowance_psf,
      analysis.concessions.ti_actual_build_cost_psf,
      activeRentPeriod.free_rent_months,
      thenCurrentRate,
      brokerageCommission,
      otherCosts,
      analysis.key_dates.commencement,
      analysis.key_dates.expiration,
      terminationDate,
      interestRate
    );
    unamortizedCosts = unamortized.totalUnamortized;
  }
  
  return {
    rentFee,
    baseRentPenalty,
    unamortizedCosts,
    totalFee: rentFee + baseRentPenalty + unamortizedCosts,
  };
};

/**
 * Build termination scenario for comparison
 */
export const buildTerminationScenario = (
  analysis: {
    id: string;
    name: string;
    status: "Draft" | "Active" | "Final";
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: "FS" | "NNN";
    rep_type?: "Occupier" | "Landlord";
    base_year?: number;
    key_dates: {
      commencement: string;
      rent_start: string;
      expiration: string;
      early_access?: string;
    };
    operating: {
      est_op_ex_psf?: number;
      escalation_method?: "fixed" | "cpi";
      escalation_value?: number;
      escalation_cap?: number;
    };
    rent_schedule: Array<{
      period_start: string;
      period_end: string;
      rent_psf: number;
      escalation_percentage?: number;
      free_rent_months?: number;
      abatement_applies_to?: "base_only" | "base_plus_nnn";
    }>;
    concessions: {
      ti_allowance_psf?: number;
      ti_actual_build_cost_psf?: number;
      ti_benchmark_cost_psf?: number;
      moving_allowance?: number;
      other_credits?: number;
    };
    parking?: {
      monthly_rate_per_stall?: number;
      stalls?: number;
      escalation_method?: "fixed" | "cpi";
      escalation_value?: number;
    };
    transaction_costs?: {
      legal_fees?: number;
      brokerage_fees?: number;
      due_diligence?: number;
      environmental?: number;
      other?: number;
      total?: number;
    };
    options: Array<{
      type: "Renewal" | "Expansion" | "Termination" | "ROFR" | "ROFO";
      window_open: string;
      window_close: string;
      terms?: string;
      notice_months?: number;
      fee_months_of_rent?: number;
      base_rent_penalty?: number;
      unamortized_costs_included?: boolean;
      termination_interest_rate?: number;
    }>;
    cashflow_settings: {
      discount_rate: number;
      granularity: "annual" | "monthly";
    };
    notes?: string;
    commissionStructure?: any;
    proposals: any[];
  },
  terminationDate: string,
  option: {
    fee_months_of_rent?: number;
    base_rent_penalty?: number;
    unamortized_costs_included?: boolean;
    termination_interest_rate?: number;
  }
): any => {
  // Clone analysis
  const scenario = JSON.parse(JSON.stringify(analysis));
  
  // Update expiration to termination date
  scenario.key_dates.expiration = terminationDate;
  
  // Calculate termination fee
  const terminationFee = calculateEarlyTerminationFee(analysis, terminationDate, option);
  
  // Add termination fee as a one-time cost in the year of termination
  // This would be handled in the cashflow calculation
  
  return {
    ...scenario,
    name: `${scenario.name} - Early Termination`,
    terminationFee,
  };
};