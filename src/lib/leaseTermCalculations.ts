/**
 * Shared utility functions for lease term calculations
 * Ensures consistency across all components that calculate lease terms
 */

import type { AnalysisMeta } from "@/types";
import { parseDateOnly } from "@/lib/dateOnly";

function getAbatementMonths(concessions?: AnalysisMeta["concessions"]): number {
  if (!concessions) return 0;
  if (concessions.abatement_type === "at_commencement") {
    return concessions.abatement_free_rent_months || 0;
  }
  if (concessions.abatement_type === "custom" && concessions.abatement_periods) {
    return concessions.abatement_periods.reduce((sum, period) => sum + period.free_rent_months, 0);
  }
  return 0;
}

export function calculateLeaseTermParts(
  meta: AnalysisMeta
): { years: number; months: number } | null {
  if (meta.lease_term) {
    const baseMonths = meta.lease_term.years * 12 + meta.lease_term.months;
    const includeAbatement = meta.lease_term.include_abatement_in_term ?? false;
    const abatementMonths = includeAbatement ? getAbatementMonths(meta.concessions) : 0;
    const totalMonths = baseMonths + abatementMonths;
    if (totalMonths <= 0) return null;
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }

  if (meta.key_dates.commencement && meta.key_dates.expiration) {
    const start = parseDateOnly(meta.key_dates.commencement);
    const end = parseDateOnly(meta.key_dates.expiration);
    if (!start || !end || end <= start) return null;
    const totalMonths =
      (end.getFullYear() - start.getFullYear()) * 12 +
      (end.getMonth() - start.getMonth());
    if (totalMonths <= 0) return null;
    return {
      years: Math.floor(totalMonths / 12),
      months: totalMonths % 12,
    };
  }

  return null;
}

export function formatLeaseTerm(meta: AnalysisMeta, fallback = "Not set"): string {
  const parts = calculateLeaseTermParts(meta);
  if (!parts) return fallback;
  const { years, months } = parts;
  if (years > 0 && months > 0) {
    return `${years} year${years !== 1 ? "s" : ""}, ${months} month${months !== 1 ? "s" : ""}`;
  }
  if (years > 0) {
    return `${years} year${years !== 1 ? "s" : ""}`;
  }
  if (months > 0) {
    return `${months} month${months !== 1 ? "s" : ""}`;
  }
  return fallback;
}

/**
 * Calculate lease term in years (decimal) from dates or lease_term
 * Prefers lease_term if available for accuracy
 */
export function calculateLeaseTermYears(meta: AnalysisMeta): number {
  const parts = calculateLeaseTermParts(meta);
  if (!parts) return 0;
  return parts.years + (parts.months / 12);
}

