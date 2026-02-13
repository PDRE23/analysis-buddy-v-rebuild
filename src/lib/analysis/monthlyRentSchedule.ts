import type { NormalizedAbatementPeriod, NormalizedBaseMeta, NormalizedEscalationPeriod } from "./normalized/types";
import { formatDateOnly, parseDateInput, parseDateOnly } from "@/lib/dateOnly";

export type MonthlyRentScheduleInput = {
  normalized: NormalizedBaseMeta;
  rent: {
    base_rent_psf?: number;
    base_rent_monthly?: number;
    escalation?: {
      type: "fixed_percent" | "fixed_amount" | "custom";
      fixed_percent?: number;
      fixed_amount?: number;
      periods?: NormalizedEscalationPeriod[];
    };
  };
  rsf?: number;
  payment_timing?: "advance" | "arrears";
  rounding?: "none" | "cents";
};

export type MonthlyRentScheduleRow = {
  period_index: number;
  start_date: string;
  end_date: string;
  contractual_base_rent: number;
  free_rent_amount: number;
  net_rent_due: number;
  effective_rent_running?: number;
};

export type MonthlyRentScheduleSummary = {
  total_contract_rent: number;
  total_net_rent: number;
  free_rent_value: number;
};

export type MonthlyRentScheduleResult = {
  months: MonthlyRentScheduleRow[];
  summary: MonthlyRentScheduleSummary;
  assumptions: {
    payment_timing: "advance" | "arrears";
    rounding: "none" | "cents";
    term_source: "term_months" | "expiration" | "none";
  };
};

type TermMonthPeriod = {
  index: number;
  start: Date;
  end: Date;
};

type CustomEscalationLookup = {
  sortedPeriods: NormalizedEscalationPeriod[];
  termYearToPeriodIndex: Map<number, number>;
  periodFirstTermYear: Array<number | undefined>;
  periodBaseAtStart: number[];
};

function calculateTermMonthsFromDates(commencement: Date, expiration: Date): number | null {
  if (expiration <= commencement) return null;
  let years = expiration.getFullYear() - commencement.getFullYear();
  let months = expiration.getMonth() - commencement.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const lastDay = new Date(expiration.getFullYear(), expiration.getMonth() + 1, 0).getDate();
  if (expiration.getDate() === lastDay) {
    months += 1;
    if (months >= 12) {
      years += 1;
      months -= 12;
    }
  }

  return years * 12 + months;
}

function addMonthsAnchored(anchor: Date, months: number): Date {
  const anchorDay = anchor.getDate();
  const baseMonth = anchor.getMonth() + months;
  const baseYear = anchor.getFullYear() + Math.floor(baseMonth / 12);
  const monthIndex = ((baseMonth % 12) + 12) % 12;
  const lastDay = new Date(baseYear, monthIndex + 1, 0).getDate();
  return new Date(baseYear, monthIndex, Math.min(anchorDay, lastDay));
}

function buildTermMonthPeriods(
  commencement: Date,
  options: { termMonths?: number; expiration?: Date }
): TermMonthPeriod[] {
  const periods: TermMonthPeriod[] = [];
  const { termMonths, expiration } = options;

  if (termMonths !== undefined) {
    for (let index = 0; index < termMonths; index += 1) {
      const start = addMonthsAnchored(commencement, index);
      const nextStart = addMonthsAnchored(commencement, index + 1);
      const end = new Date(nextStart);
      end.setDate(end.getDate() - 1);
      if (expiration && end > expiration) {
        end.setTime(expiration.getTime());
      }
      periods.push({ index, start, end });
    }
    return periods;
  }

  if (!expiration) return periods;

  for (let index = 0; ; index += 1) {
    const start = addMonthsAnchored(commencement, index);
    if (start > expiration) break;
    const nextStart = addMonthsAnchored(commencement, index + 1);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);
    if (end > expiration) {
      end.setTime(expiration.getTime());
    }
    periods.push({ index, start, end });
  }

  return periods;
}

function resolveBaseAnnualRent(input: MonthlyRentScheduleInput): number {
  if (input.rent.base_rent_monthly !== undefined) {
    return input.rent.base_rent_monthly * 12;
  }
  if (input.rent.base_rent_psf !== undefined) {
    const rsf = input.rsf ?? 0;
    return input.rent.base_rent_psf * rsf;
  }
  return 0;
}

function getTermYearStarts(commencement: Date, termMonths: number): Date[] {
  const years = Math.max(1, Math.ceil(termMonths / 12));
  return Array.from({ length: years }, (_, index) => addMonthsAnchored(commencement, index * 12));
}

function buildCustomEscalationLookup(
  baseAnnual: number,
  termYearStarts: Date[],
  periods: NormalizedEscalationPeriod[]
): CustomEscalationLookup {
  const sortedPeriods = [...periods].sort(
    (a, b) => (parseDateInput(a.period_start)?.getTime() ?? 0) - (parseDateInput(b.period_start)?.getTime() ?? 0)
  );
  const periodDates = sortedPeriods.map((period) => ({
    start: parseDateInput(period.period_start) ?? new Date(period.period_start),
    end: parseDateInput(period.period_end) ?? new Date(period.period_end),
  }));

  const termYearToPeriodIndex = new Map<number, number>();
  termYearStarts.forEach((yearStart, index) => {
    const periodIndex = periodDates.findIndex((period) => yearStart >= period.start && yearStart <= period.end);
    if (periodIndex >= 0) {
      termYearToPeriodIndex.set(index, periodIndex);
    }
  });

  const periodFirstTermYear: Array<number | undefined> = new Array(sortedPeriods.length);
  const periodYearCounts: number[] = new Array(sortedPeriods.length).fill(0);
  for (const [termYear, periodIndex] of termYearToPeriodIndex.entries()) {
    if (periodFirstTermYear[periodIndex] === undefined || termYear < (periodFirstTermYear[periodIndex] as number)) {
      periodFirstTermYear[periodIndex] = termYear;
    }
    periodYearCounts[periodIndex] += 1;
  }

  const periodBaseAtStart: number[] = new Array(sortedPeriods.length);
  let currentBase = baseAnnual;
  for (let i = 0; i < sortedPeriods.length; i += 1) {
    periodBaseAtStart[i] = currentBase;
    const yearsInPeriod = periodYearCounts[i];
    if (yearsInPeriod > 0) {
      currentBase = currentBase * Math.pow(1 + sortedPeriods[i].escalation_percentage, yearsInPeriod);
    }
  }

  return {
    sortedPeriods,
    termYearToPeriodIndex,
    periodFirstTermYear,
    periodBaseAtStart,
  };
}

function resolveAnnualRentByYear(
  input: MonthlyRentScheduleInput,
  baseAnnual: number,
  termYearStarts: Date[]
): number[] {
  const escalation = input.rent.escalation;
  const fallbackRate = input.normalized.rent.escalation_periods[0]?.escalation_percentage ?? 0;

  if (!escalation || escalation.type === "fixed_percent") {
    const rate = escalation?.fixed_percent ?? fallbackRate;
    return termYearStarts.map((_, index) => baseAnnual * Math.pow(1 + rate, index));
  }

  if (escalation.type === "fixed_amount") {
    const annualIncrease = escalation.fixed_amount ?? 0;
    return termYearStarts.map((_, index) => baseAnnual + annualIncrease * index);
  }

  const periods = escalation.periods ?? input.normalized.rent.escalation_periods;
  if (!periods || periods.length === 0) {
    return termYearStarts.map(() => baseAnnual);
  }

  const lookup = buildCustomEscalationLookup(baseAnnual, termYearStarts, periods);
  return termYearStarts.map((_, termYear) => {
    const periodIndex = lookup.termYearToPeriodIndex.get(termYear);
    if (periodIndex === undefined || lookup.periodFirstTermYear[periodIndex] === undefined) {
      return baseAnnual;
    }
    const escalationRate = lookup.sortedPeriods[periodIndex].escalation_percentage;
    const yearsSinceStart = termYear - (lookup.periodFirstTermYear[periodIndex] as number);
    const baseAtStart = lookup.periodBaseAtStart[periodIndex];
    return baseAtStart * Math.pow(1 + escalationRate, yearsSinceStart);
  });
}

function buildFreeRentMap(
  months: TermMonthPeriod[],
  abatement: NormalizedAbatementPeriod[]
): boolean[] {
  const freeRent: boolean[] = new Array(months.length).fill(false);

  for (const period of abatement) {
    const start = parseDateInput(period.period_start);
    const end = parseDateInput(period.period_end);
    if (!start || !end) continue;
    let remaining = period.free_rent_months;
    if (remaining <= 0) continue;

    for (const month of months) {
      if (remaining <= 0) break;
      const overlaps = month.start <= end && month.end >= start;
      if (!overlaps) continue;
      if (freeRent[month.index]) continue;
      freeRent[month.index] = true;
      remaining -= 1;
    }
  }

  return freeRent;
}

function applyRounding(value: number, mode: "none" | "cents"): number {
  if (mode === "cents") {
    return Math.round(value * 100) / 100;
  }
  return value;
}

/**
 * Build a deterministic monthly base rent schedule.
 *
 * Assumptions:
 * - Rent is billed in advance by default; arrears is accepted but does not shift
 *   month boundaries (used only as metadata for downstream timing logic).
 * - Month boundaries are anchored to commencement day-of-month; if a month does
 *   not contain that day, the last day of the month is used.
 * - When term_months_total diverges from the date-derived term, it defines
 *   schedule length to respect include_abatement_in_term; otherwise expiration
 *   anchors the schedule.
 * - Abatement applies to whole lease months; overlapping periods apply to the
 *   earliest months first, without double-counting.
 * - Values are unrounded by default; set rounding to "cents" for currency output.
 */
export function buildMonthlyRentSchedule(input: MonthlyRentScheduleInput): MonthlyRentScheduleResult {
  const commencementValue = input.normalized.dates.commencement;
  const commencement = parseDateOnly(commencementValue);
  const paymentTiming = input.payment_timing ?? "advance";
  const rounding = input.rounding ?? "none";

  if (!commencement) {
    return {
      months: [],
      summary: { total_contract_rent: 0, total_net_rent: 0, free_rent_value: 0 },
      assumptions: { payment_timing: paymentTiming, rounding, term_source: "none" },
    };
  }

  const termMonths = input.normalized.dates.term_months_total;
  const normalizedExpiration = parseDateOnly(input.normalized.dates.expiration);
  let termSource: "term_months" | "expiration" | "none" = "none";
  let resolvedExpiration = normalizedExpiration;
  let resolvedTermMonths: number | undefined;
  const derivedTermMonths =
    normalizedExpiration ? calculateTermMonthsFromDates(commencement, normalizedExpiration) : null;

  if (termMonths && termMonths > 0) {
    if (derivedTermMonths !== null && derivedTermMonths === termMonths && normalizedExpiration) {
      termSource = "expiration";
      resolvedTermMonths = termMonths;
      resolvedExpiration = normalizedExpiration;
    } else {
      const derivedEnd = addMonthsAnchored(commencement, termMonths);
      derivedEnd.setDate(derivedEnd.getDate() - 1);
      resolvedExpiration = derivedEnd;
      resolvedTermMonths = termMonths;
      termSource = "term_months";
    }
  } else if (normalizedExpiration) {
    termSource = "expiration";
    resolvedExpiration = normalizedExpiration;
    resolvedTermMonths = derivedTermMonths ?? undefined;
  }

  const monthPeriods = buildTermMonthPeriods(commencement, {
    termMonths: termSource === "term_months" ? resolvedTermMonths : undefined,
    expiration: resolvedExpiration,
  });

  const baseAnnual = resolveBaseAnnualRent(input);
  const termYearStarts = getTermYearStarts(commencement, monthPeriods.length);
  const annualRentByYear = resolveAnnualRentByYear(input, baseAnnual, termYearStarts);
  const freeRentMap = buildFreeRentMap(monthPeriods, input.normalized.abatement);

  let runningTotal = 0;
  const months: MonthlyRentScheduleRow[] = monthPeriods.map((period) => {
    const yearIndex = Math.floor(period.index / 12);
    const annualRent = annualRentByYear[yearIndex] ?? baseAnnual;
    const monthlyRent = annualRent / 12;
    const contractual = applyRounding(monthlyRent, rounding);
    const freeRentAmount = freeRentMap[period.index] ? applyRounding(-contractual, rounding) : 0;
    const netRent = applyRounding(contractual + freeRentAmount, rounding);
    runningTotal += netRent;

    return {
      period_index: period.index,
      start_date: formatDateOnly(period.start),
      end_date: formatDateOnly(period.end),
      contractual_base_rent: contractual,
      free_rent_amount: freeRentAmount,
      net_rent_due: netRent,
      effective_rent_running: applyRounding(runningTotal / (period.index + 1), rounding),
    };
  });

  const totalContract = months.reduce((sum, row) => sum + row.contractual_base_rent, 0);
  const totalNet = months.reduce((sum, row) => sum + row.net_rent_due, 0);
  const freeRentValue = months.reduce((sum, row) => sum + Math.abs(Math.min(0, row.free_rent_amount)), 0);

  return {
    months,
    summary: {
      total_contract_rent: applyRounding(totalContract, rounding),
      total_net_rent: applyRounding(totalNet, rounding),
      free_rent_value: applyRounding(freeRentValue, rounding),
    },
    assumptions: {
      payment_timing: paymentTiming,
      rounding,
      term_source: termSource,
    },
  };
}
