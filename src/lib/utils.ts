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
