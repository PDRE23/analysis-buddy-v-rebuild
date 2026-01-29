/**
 * Shared utility functions for lease term calculations
 * Ensures consistency across all components that calculate lease terms
 */

import type { AnalysisMeta } from "@/types";

/**
 * Calculate lease term in years (decimal) from dates or lease_term
 * Prefers lease_term if available for accuracy
 */
export function calculateLeaseTermYears(meta: AnalysisMeta): number {
  // Prefer lease_term if available (most accurate)
  if (meta.lease_term) {
    return meta.lease_term.years + (meta.lease_term.months / 12);
  }
  
  // Fallback to date calculation
  if (meta.key_dates.commencement && meta.key_dates.expiration) {
    const start = new Date(meta.key_dates.commencement);
    const end = new Date(meta.key_dates.expiration);
    const diffTime = end.getTime() - start.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return diffDays / 365.25; // Account for leap years
  }
  
  return 0;
}

