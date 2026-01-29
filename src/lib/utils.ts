import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import type { AnalysisMeta } from "@/types/analysis"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Get total free rent months from concessions
 */
export function getFreeRentMonths(concessions: AnalysisMeta["concessions"]): number {
  if (!concessions) return 0;
  
  if (concessions.abatement_type === "at_commencement") {
    return concessions.abatement_free_rent_months || 0;
  } else if (concessions.abatement_type === "custom" && concessions.abatement_periods) {
    return concessions.abatement_periods.reduce((sum, p) => sum + p.free_rent_months, 0);
  }
  return 0;
}

/**
 * Derive rent start date from commencement + total free rent months.
 * Falls back to explicit key_dates.rent_start when provided.
 */
export function getDerivedRentStartDate(analysis: AnalysisMeta): string | undefined {
  if (analysis.key_dates?.rent_start) {
    return analysis.key_dates.rent_start;
  }
  if (!analysis.key_dates?.commencement) return undefined;
  const commencementDate = new Date(analysis.key_dates.commencement);
  if (isNaN(commencementDate.getTime())) return undefined;
  const freeRentMonths = getFreeRentMonths(analysis.concessions);
  if (freeRentMonths <= 0) {
    return analysis.key_dates.commencement;
  }
  const rentStartDate = new Date(commencementDate);
  rentStartDate.setMonth(rentStartDate.getMonth() + freeRentMonths);
  return rentStartDate.toISOString().split("T")[0];
}
