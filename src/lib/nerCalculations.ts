/**
 * NER (Net Effective Rent) Calculation Logic
 */

import type { NERAnalysis, NERYear } from "./types/ner";

/**
 * Calculate NPV (Net Present Value) using discount rate
 */
export function calculateNPV(cashflows: number[], discountRate: number): number {
  if (cashflows.length === 0) return 0;
  
  return cashflows.reduce((npv, cashflow, year) => {
    const presentValue = cashflow / Math.pow(1 + discountRate, year);
    return npv + presentValue;
  }, 0);
}

/**
 * Calculate PMT (Payment) - equivalent annual payment
 */
export function calculatePMT(npv: number, termYears: number, discountRate: number): number {
  if (termYears === 0 || discountRate === 0) {
    return npv / termYears;
  }
  
  const factor = (1 - Math.pow(1 + discountRate, -termYears)) / discountRate;
  return npv / factor;
}

/**
 * Calculate year-by-year breakdown
 */
export function calculateYearlyBreakdown(analysis: NERAnalysis): NERYear[] {
  const years: NERYear[] = [];
  const totalYears = Math.ceil(analysis.termYears);
  const partialYearMonths = (analysis.termYears % 1) * 12;
  
  // Calculate base rent per year
  const baseRentYear1to5 = analysis.baseRentYears1to5 * analysis.rsf;
  const baseRentYear6toLXD = analysis.baseRentYears6toLXD * analysis.rsf;
  
  // Calculate free rent per year (total free rent / term years)
  const totalFreeRent = (analysis.monthsFree / 12) * baseRentYear1to5;
  const freeRentPerYear = totalFreeRent / analysis.termYears;
  
  // Calculate TI per year (total TI / term years)
  const totalTI = analysis.tiNbiValue * analysis.rsf;
  const tiPerYear = totalTI / analysis.termYears;
  
  for (let year = 1; year <= totalYears; year++) {
    // Determine base rent for this year
    let baseRent = year <= 5 ? baseRentYear1to5 : baseRentYear6toLXD;
    
    // Handle partial final year
    if (year === totalYears && partialYearMonths > 0) {
      baseRent = baseRent * (partialYearMonths / 12);
    }
    
    // Calculate free rent for this year
    let freeRent = freeRentPerYear;
    if (year === totalYears && partialYearMonths > 0) {
      freeRent = freeRentPerYear * (partialYearMonths / 12);
    }
    
    // Apply free rent (negative value)
    const actualFreeRent = Math.min(freeRent, baseRent);
    
    // Calculate TI for this year
    let ti = tiPerYear;
    if (year === totalYears && partialYearMonths > 0) {
      ti = tiPerYear * (partialYearMonths / 12);
    }
    
    // Total = base rent - free rent - TI
    const total = baseRent - actualFreeRent - ti;
    
    years.push({
      year,
      baseRent,
      freeRent: -actualFreeRent,
      ti: -ti,
      total,
    });
  }
  
  return years;
}

/**
 * Calculate amortized free rent over lease term
 */
export function calculateAmortizedFreeRent(
  monthsFree: number,
  baseRent: number,
  termYears: number
): number {
  if (termYears === 0) return 0;
  
  const totalFreeRent = (monthsFree / 12) * baseRent;
  return totalFreeRent / termYears;
}

/**
 * Calculate amortized TI over lease term
 */
export function calculateAmortizedTI(tiValue: number, rsf: number, termYears: number): number {
  if (termYears === 0) return 0;
  
  const totalTI = tiValue * rsf;
  return totalTI / termYears;
}

/**
 * Calculate starting NER
 */
export function calculateStartingNER(analysis: NERAnalysis): {
  amortizedFreeRent: number;
  amortizedTI: number;
  startingRent: number;
  startingNER: number;
} {
  const startingRent = analysis.baseRentYears1to5 * analysis.rsf;
  const amortizedFreeRent = calculateAmortizedFreeRent(
    analysis.monthsFree,
    startingRent,
    analysis.termYears
  );
  const amortizedTI = calculateAmortizedTI(
    analysis.tiNbiValue,
    analysis.rsf,
    analysis.termYears
  );
  
  const startingNER = startingRent - amortizedFreeRent - amortizedTI;
  
  return {
    amortizedFreeRent: -amortizedFreeRent,
    amortizedTI: -amortizedTI,
    startingRent,
    startingNER,
  };
}

/**
 * Calculate total rent over term
 */
export function calculateTotalRent(yearlyBreakdown: NERYear[]): number {
  return yearlyBreakdown.reduce((sum, year) => sum + year.total, 0);
}

/**
 * Calculate average rent per year
 */
export function calculateAverageRent(yearlyBreakdown: NERYear[]): number {
  if (yearlyBreakdown.length === 0) return 0;
  const total = calculateTotalRent(yearlyBreakdown);
  return total / yearlyBreakdown.length;
}

/**
 * Calculate NER (Net Effective Rent) - simple average
 */
export function calculateNER(yearlyBreakdown: NERYear[], rsf: number): number {
  if (yearlyBreakdown.length === 0 || rsf === 0) return 0;
  const average = calculateAverageRent(yearlyBreakdown);
  return average / rsf;
}

/**
 * Calculate NER with interest (discounted)
 */
export function calculateNERWithInterest(
  yearlyBreakdown: NERYear[],
  discountRate: number,
  rsf: number
): number {
  if (yearlyBreakdown.length === 0 || rsf === 0) return 0;
  
  const cashflows = yearlyBreakdown.map(year => year.total);
  const npv = calculateNPV(cashflows, discountRate);
  const pmt = calculatePMT(npv, yearlyBreakdown.length, discountRate);
  
  return pmt / rsf;
}

/**
 * Perform complete NER analysis
 */
export function performNERAnalysis(analysis: NERAnalysis): NERAnalysis {
  // Calculate yearly breakdown
  const yearlyBreakdown = calculateYearlyBreakdown(analysis);
  
  // Calculate totals and averages
  const total = calculateTotalRent(yearlyBreakdown);
  const average = calculateAverageRent(yearlyBreakdown);
  
  // Calculate NPV and PMT
  const cashflows = yearlyBreakdown.map(year => year.total);
  const npv = calculateNPV(cashflows, analysis.discountRate);
  const pmt = calculatePMT(npv, analysis.termYears, analysis.discountRate);
  
  // Calculate NER values
  const ner = calculateNER(yearlyBreakdown, analysis.rsf);
  const nerWithInterest = calculateNERWithInterest(
    yearlyBreakdown,
    analysis.discountRate,
    analysis.rsf
  );
  
  // Calculate starting NER
  const startingNERCalc = calculateStartingNER(analysis);
  
  // Return updated analysis with calculated values
  return {
    ...analysis,
    summary: {
      ner,
      nerWithInterest,
      startingNER: startingNERCalc.startingNER / analysis.rsf,
    },
    yearlyBreakdown,
    calculations: {
      total,
      average,
      npv,
      pmt,
    },
    startingNERCalc,
  };
}

