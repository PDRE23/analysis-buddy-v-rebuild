/**
 * Commission calculation utilities for commercial real estate deals
 */

import type { AnalysisMeta } from "@/types";

export interface CommissionStructure {
  yearOneBrokerage: number; // % of year 1 base rent
  subsequentYears: number; // % of subsequent years base rent
  renewalCommission: number; // % for renewal deals
  expansionCommission: number; // % for expansion space
  splitPercentage: number; // % split with co-broker (0-100)
  acceleratedPayment: boolean; // true = all upfront, false = over lease term
  tiOverride?: number; // Additional % of TI allowance
}

export interface CommissionBreakdown {
  year1Commission: number;
  subsequentYearsCommission: number;
  tiCommission: number;
  totalCommission: number;
  splitAmount: number;
  netCommission: number;
  acceleratedTotal?: number; // If accelerated payment
}

/**
 * Calculate commission based on analysis and commission structure
 */
export function calculateCommission(
  analysis: AnalysisMeta,
  structure: CommissionStructure
): { total: number; breakdown: CommissionBreakdown } {
  // Calculate total base rent for year 1
  const year1Rent = calculateYear1Rent(analysis);
  
  // Calculate subsequent years rent
  const subsequentRent = calculateSubsequentRent(analysis);
  
  // Calculate year 1 commission
  const year1Commission = year1Rent * (structure.yearOneBrokerage / 100);
  
  // Calculate subsequent years commission
  const subsequentYearsCommission = subsequentRent * (structure.subsequentYears / 100);
  
  // Calculate TI commission if override exists
  const tiCommission = structure.tiOverride
    ? (analysis.concessions.ti_allowance_psf || 0) * analysis.rsf * (structure.tiOverride / 100)
    : 0;
  
  // Total commission before split
  const totalCommission = year1Commission + subsequentYearsCommission + tiCommission;
  
  // Calculate split amount
  const splitAmount = totalCommission * (structure.splitPercentage / 100);
  
  // Net commission after split
  const netCommission = totalCommission - splitAmount;
  
  // Accelerated payment (all upfront, discounted)
  const acceleratedTotal = structure.acceleratedPayment
    ? totalCommission * 0.95 // Typical 5% discount for accelerated payment
    : undefined;
  
  const breakdown: CommissionBreakdown = {
    year1Commission,
    subsequentYearsCommission,
    tiCommission,
    totalCommission,
    splitAmount,
    netCommission: structure.acceleratedPayment && acceleratedTotal
      ? acceleratedTotal - splitAmount
      : netCommission,
    acceleratedTotal,
  };
  
  return {
    total: breakdown.netCommission,
    breakdown,
  };
}

/**
 * Calculate year 1 base rent
 */
function calculateYear1Rent(analysis: AnalysisMeta): number {
  if (!analysis.rent_schedule || analysis.rent_schedule.length === 0) {
    return 0;
  }
  
  const firstPeriod = analysis.rent_schedule[0];
  // Rent is always annual, first year of period
  const annualRate = firstPeriod.rent_psf;
  
  return annualRate * analysis.rsf;
}

/**
 * Calculate total subsequent years rent
 * Handles partial years correctly by using actual date ranges
 */
function calculateSubsequentRent(analysis: AnalysisMeta): number {
  if (!analysis.rent_schedule || analysis.rent_schedule.length === 0) {
    return 0;
  }
  
  const commencement = new Date(analysis.key_dates.commencement);
  const expiration = new Date(analysis.key_dates.expiration);
  const commencementYear = commencement.getFullYear();
  const expirationYear = expiration.getFullYear();
  
  // If lease is less than 1 year, there are no subsequent years
  if (commencementYear >= expirationYear) {
    return 0;
  }
  
  let total = 0;
  
  // Iterate through each year after the first year
  for (let year = commencementYear + 1; year <= expirationYear; year++) {
    const yearStart = new Date(`${year}-01-01T00:00:00`);
    const yearEnd = new Date(`${year}-12-31T23:59:59`);
    
    // Calculate overlap between lease term and this calendar year
    const overlapStart = commencement > yearStart ? commencement : yearStart;
    const overlapEnd = expiration < yearEnd ? expiration : yearEnd;
    
    if (overlapStart >= overlapEnd) continue; // No overlap
    
    // Calculate months of overlap (simplified calculation)
    const monthsDiff = (overlapEnd.getFullYear() - overlapStart.getFullYear()) * 12 +
                       (overlapEnd.getMonth() - overlapStart.getMonth());
    const monthsOverlap = Math.max(1, monthsDiff + (overlapEnd.getDate() >= overlapStart.getDate() ? 1 : 0));
    
    if (monthsOverlap <= 0) continue;
    
    // Find the rent period for this year
    for (const period of analysis.rent_schedule) {
      const periodStart = new Date(period.period_start);
      const periodEnd = new Date(period.period_end);
      
      // Check if this year overlaps with the period
      if (overlapStart <= periodEnd && overlapEnd >= periodStart) {
        // Calculate escalated rent for this year within the period
        const periodStartYear = periodStart.getFullYear();
        const yearsInPeriod = year - periodStartYear;
        const escalationRate = period.escalation_percentage ?? 0;
        const escalatedRate = period.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
        
        // Calculate annual rent, then prorate for months of overlap
        const annualRent = escalatedRate * analysis.rsf;
        const proratedRent = (annualRent * monthsOverlap) / 12;
        total += proratedRent;
        break;
      }
    }
  }
  
  return total;
}

/**
 * Default commission structure for office deals
 */
export const DEFAULT_OFFICE_COMMISSION: CommissionStructure = {
  yearOneBrokerage: 6.0, // 6% of year 1
  subsequentYears: 3.0, // 3% of subsequent years
  renewalCommission: 3.0, // 3% for renewals
  expansionCommission: 6.0, // 6% for expansion space
  splitPercentage: 0, // No split
  acceleratedPayment: false,
};

/**
 * Default commission structure for retail deals
 */
export const DEFAULT_RETAIL_COMMISSION: CommissionStructure = {
  yearOneBrokerage: 5.0,
  subsequentYears: 2.5,
  renewalCommission: 2.5,
  expansionCommission: 5.0,
  splitPercentage: 0,
  acceleratedPayment: false,
};

/**
 * Default commission structure for industrial deals
 */
export const DEFAULT_INDUSTRIAL_COMMISSION: CommissionStructure = {
  yearOneBrokerage: 4.0,
  subsequentYears: 2.0,
  renewalCommission: 2.0,
  expansionCommission: 4.0,
  splitPercentage: 0,
  acceleratedPayment: false,
};

/**
 * Format commission as currency
 */
export function formatCommission(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(1)}%`;
}

