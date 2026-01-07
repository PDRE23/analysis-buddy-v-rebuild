/**
 * Financial Modeling Enhancements
 * Advanced financial calculations: IRR, sensitivity analysis, break-even
 */

import type { AnnualLine } from "@/types";
import { npv } from "./calculations/metrics-engine";

/**
 * Calculate Internal Rate of Return (IRR)
 * Uses Newton-Raphson method for approximation
 */
export function calculateIRR(cashflows: number[], initialGuess: number = 0.1): number | null {
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  let rate = initialGuess;
  
  for (let i = 0; i < maxIterations; i++) {
    const npvValue = calculateNPVForIRR(cashflows, rate);
    const npvDerivative = calculateNPVDerivative(cashflows, rate);
    
    if (Math.abs(npvValue) < tolerance) {
      return rate;
    }
    
    if (Math.abs(npvDerivative) < tolerance) {
      break;
    }
    
    rate = rate - npvValue / npvDerivative;
    
    // Constrain rate between -99% and 99%
    rate = Math.max(-0.99, Math.min(0.99, rate));
  }
  
  // If convergence failed, try bisection method
  return bisectionIRR(cashflows, -0.99, 0.99);
}

function calculateNPVForIRR(cashflows: number[], rate: number): number {
  return cashflows.reduce((sum, cf, index) => {
    return sum + cf / Math.pow(1 + rate, index);
  }, 0);
}

function calculateNPVDerivative(cashflows: number[], rate: number): number {
  return cashflows.reduce((sum, cf, index) => {
    return sum - (index * cf) / Math.pow(1 + rate, index + 1);
  }, 0);
}

function bisectionIRR(cashflows: number[], low: number, high: number): number | null {
  const maxIterations = 100;
  const tolerance = 0.0001;
  
  for (let i = 0; i < maxIterations; i++) {
    const mid = (low + high) / 2;
    const npvMid = calculateNPVForIRR(cashflows, mid);
    
    if (Math.abs(npvMid) < tolerance) {
      return mid;
    }
    
    const npvLow = calculateNPVForIRR(cashflows, low);
    
    if (npvLow * npvMid < 0) {
      high = mid;
    } else {
      low = mid;
    }
    
    if (high - low < tolerance) {
      return (low + high) / 2;
    }
  }
  
  return null;
}

/**
 * Sensitivity Analysis
 * Test how changes in variables affect NPV
 */
export interface SensitivityAnalysis {
  variable: string;
  baseValue: number;
  scenarios: Array<{
    label: string;
    value: number;
    npv: number;
    percentChange: number;
  }>;
}

export function performSensitivityAnalysis(
  cashflows: AnnualLine[],
  baseNPV: number,
  variables: Array<{
    name: string;
    baseValue: number;
    modifyCashflow: (cf: AnnualLine[], value: number) => AnnualLine[];
  }>,
  discountRate: number,
  variations: number[] = [-0.2, -0.1, 0, 0.1, 0.2] // -20%, -10%, 0%, +10%, +20%
): SensitivityAnalysis[] {
  return variables.map(variable => {
    const scenarios = variations.map(variation => {
      const adjustedValue = variable.baseValue * (1 + variation);
      const adjustedCashflows = variable.modifyCashflow([...cashflows], adjustedValue);
      const adjustedNPV = npv(adjustedCashflows, discountRate);
      const percentChange = ((adjustedNPV - baseNPV) / Math.abs(baseNPV)) * 100;

      return {
        label: `${(variation * 100).toFixed(0)}%`,
        value: adjustedValue,
        npv: adjustedNPV,
        percentChange,
      };
    });

    return {
      variable: variable.name,
      baseValue: variable.baseValue,
      scenarios,
    };
  });
}

/**
 * Calculate Break-Even Point
 * When does the cumulative cashflow become positive?
 */
export function calculateBreakEven(cashflows: AnnualLine[]): {
  breakEvenYear: number | null;
  breakEvenMonth: number | null;
  cumulativeCashflow: Array<{ year: number; cumulative: number }>;
} {
  let cumulative = 0;
  const cumulativeCashflow: Array<{ year: number; cumulative: number }> = [];
  let breakEvenYear: number | null = null;
  let breakEvenMonth: number | null = null;

  cashflows.forEach((line, index) => {
    cumulative += line.net_cash_flow;
    cumulativeCashflow.push({
      year: line.year,
      cumulative,
    });

    // Find break-even point
    if (breakEvenYear === null && cumulative >= 0) {
      breakEvenYear = line.year;
      
      // Estimate month (simplified - assumes linear progression)
      if (index > 0) {
        const prevCumulative = cumulative - line.net_cash_flow;
        const monthlyCashflow = line.net_cash_flow / 12;
        const monthsToBreakEven = Math.abs(prevCumulative / monthlyCashflow);
        breakEvenMonth = Math.ceil(monthsToBreakEven);
      } else {
        breakEvenMonth = 1;
      }
    }
  });

  return {
    breakEvenYear,
    breakEvenMonth,
    cumulativeCashflow,
  };
}

/**
 * Option Valuation
 * Value renewal options, expansion rights, etc.
 */
export interface LeaseOption {
  type: "renewal" | "expansion" | "termination" | "rofr" | "rofo";
  exerciseDate: string;
  exercisePrice?: number;
  probability: number; // 0-1
  value: number;
}

export function valueLeaseOption(
  option: Omit<LeaseOption, "value">,
  currentCashflow: AnnualLine[],
  futureCashflow: AnnualLine[],
  discountRate: number
): LeaseOption {
  // Calculate NPV of future cashflow if option is exercised
  const futureNPV = npv(futureCashflow, discountRate);
  
  // Apply probability and discount to exercise date
  const exerciseDate = new Date(option.exerciseDate);
  const today = new Date();
  const yearsToExercise = (exerciseDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  
  const discountedValue = futureNPV / Math.pow(1 + discountRate, yearsToExercise);
  const probabilityAdjustedValue = discountedValue * option.probability;
  
  // Subtract exercise price if applicable
  const exercisePriceNPV = option.exercisePrice
    ? option.exercisePrice / Math.pow(1 + discountRate, yearsToExercise)
    : 0;
  
  const optionValue = probabilityAdjustedValue - exercisePriceNPV;

  return {
    ...option,
    value: Math.max(0, optionValue), // Options can't have negative value
  };
}

/**
 * Calculate multiple IRRs for comparison
 */
export function calculateIRRComparison(
  proposals: Array<{
    label: string;
    cashflows: number[];
  }>
): Array<{
  label: string;
  irr: number | null;
  npv: number;
}> {
  return proposals.map(proposal => {
    const irr = calculateIRR(proposal.cashflows);
    // Calculate NPV at 8% for comparison
    const npvValue = proposal.cashflows.reduce((sum, cf, index) => {
      return sum + cf / Math.pow(1.08, index);
    }, 0);

    return {
      label: proposal.label,
      irr: irr ? irr * 100 : null, // Convert to percentage
      npv: npvValue,
    };
  });
}

/**
 * Landlord Yield Metrics
 */
export interface LandlordYieldMetrics {
  npv: number;
  irr: number;
  cashOnCashReturn: number;
  yieldOnCost: number; // annual cashflow / initial investment
  equityMultiple: number; // total return / initial investment
  paybackPeriod: number;
  netYield: number; // average annual return / initial investment
}

/**
 * Calculate comprehensive landlord yield metrics
 */
export function calculateLandlordYield(
  cashflows: AnnualLine[],
  initialInvestment: number,
  discountRate: number = 0.08
): LandlordYieldMetrics {
  const cashflowArray = cashflows.map(cf => cf.net_cash_flow);
  const irrValue = calculateIRR(cashflowArray);
  const npvValue = npv(cashflows, discountRate);
  
  const totalCashFlow = cashflows.reduce((acc, line) => acc + line.net_cash_flow, 0);
  const averageAnnualCashflow = cashflows.length > 0 ? totalCashFlow / cashflows.length : 0;
  
  // Calculate payback period
  let cumulative = 0;
  let paybackYear = cashflows.length;
  for (let i = 0; i < cashflows.length; i++) {
    cumulative += cashflows[i].net_cash_flow;
    if (cumulative >= 0) {
      paybackYear = i + 1;
      break;
    }
  }
  
  const cashOnCashReturn = initialInvestment !== 0 ? totalCashFlow / Math.abs(initialInvestment) : 0;
  const yieldOnCost = initialInvestment !== 0 ? averageAnnualCashflow / Math.abs(initialInvestment) : 0;
  const equityMultiple = initialInvestment !== 0 ? totalCashFlow / Math.abs(initialInvestment) : 0;
  const netYield = initialInvestment !== 0 ? averageAnnualCashflow / Math.abs(initialInvestment) : 0;
  
  return {
    npv: npvValue,
    irr: irrValue ? irrValue * 100 : 0, // Convert to percentage
    cashOnCashReturn: cashOnCashReturn * 100, // Convert to percentage
    yieldOnCost: yieldOnCost * 100, // Convert to percentage
    equityMultiple,
    paybackPeriod: paybackYear,
    netYield: netYield * 100, // Convert to percentage
  };
}

