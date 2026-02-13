import type { AnalysisMeta } from "@/types";
import type { NormalizedDates } from "../normalized/types";
import { parseDateOnly } from "@/lib/dateOnly";
import { getDerivedRentStartDate } from "@/lib/utils";
import { getFreeRentMonths } from "@/lib/utils";

function calculateLeaseTermFromDates(
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
    years -= 1;
    months += 12;
  }

  if (end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    months += 1;
    if (months >= 12) {
      years += 1;
      months -= 12;
    }
  }

  return { years, months };
}

export function normalizeDates(meta: AnalysisMeta): NormalizedDates {
  const commencement = meta.key_dates?.commencement || undefined;
  const expiration = meta.key_dates?.expiration || undefined;
  const abatementMonthsTotal = getFreeRentMonths(meta.concessions);
  const includeAbatementInTerm = meta.lease_term?.include_abatement_in_term ?? false;
  const rentStart = getDerivedRentStartDate(meta);

  let termMonthsTotal: number | undefined;
  let termYears: number | undefined;
  let termMonthsRemainder: number | undefined;

  if (meta.lease_term) {
    const baseMonths = meta.lease_term.years * 12 + meta.lease_term.months;
    const totalMonths = baseMonths + (includeAbatementInTerm ? abatementMonthsTotal : 0);
    if (totalMonths > 0) {
      termMonthsTotal = totalMonths;
      termYears = Math.floor(totalMonths / 12);
      termMonthsRemainder = totalMonths % 12;
    }
  } else if (commencement && expiration) {
    const derived = calculateLeaseTermFromDates(commencement, expiration);
    if (derived) {
      termYears = derived.years;
      termMonthsRemainder = derived.months;
      termMonthsTotal = derived.years * 12 + derived.months;
    }
  }

  return {
    commencement,
    expiration,
    rent_start: rentStart,
    term_months_total: termMonthsTotal,
    term_years: termYears,
    term_months_remainder: termMonthsRemainder,
    include_abatement_in_term: includeAbatementInTerm,
    abatement_months_total: abatementMonthsTotal,
  };
}
