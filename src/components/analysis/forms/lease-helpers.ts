import { parseDateOnly, formatDateOnly } from "@/lib/dateOnly";
import type { AnalysisMeta, RentRow } from "@/types";

export function getAbatementMonths(concessions: AnalysisMeta["concessions"]): number {
  if (!concessions) return 0;
  
  if (concessions.abatement_type === "at_commencement") {
    return concessions.abatement_free_rent_months || 0;
  } else if (concessions.abatement_type === "custom" && concessions.abatement_periods) {
    return concessions.abatement_periods.reduce((sum, p) => sum + p.free_rent_months, 0);
  }
  return 0;
}

export function calculateExpiration(
  commencement: string,
  years: number,
  months: number,
  includeAbatement: boolean,
  abatementMonths: number
): string {
  if (!commencement) return "";
  const start = parseDateOnly(commencement);
  if (!start) return "";
  start.setFullYear(start.getFullYear() + years);
  start.setMonth(start.getMonth() + months);
  
  if (includeAbatement && abatementMonths > 0) {
    start.setMonth(start.getMonth() + abatementMonths);
  }
  
  start.setDate(start.getDate() - 1);
  
  return formatDateOnly(start);
}

export function calculateLeaseTermFromDates(
  commencement: string,
  expiration: string
): { years: number; months: number } | null {
  if (!commencement || !expiration) return null;
  const start = parseDateOnly(commencement);
  const end = parseDateOnly(expiration);
  if (!start || !end) return null;
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  if (end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    months++;
    if (months >= 12) {
      years++;
      months -= 12;
    }
  }
  
  return { years, months };
}

export function syncRentScheduleToExpiration(
  rentSchedule: RentRow[],
  expiration: string
): RentRow[] {
  if (!rentSchedule || rentSchedule.length === 0) return rentSchedule;
  
  const updated = [...rentSchedule];
  if (updated.length > 0) {
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      period_end: expiration,
    };
  }
  
  return updated;
}
