import type { MonthlyRentScheduleResult, MonthlyRentScheduleRow } from "./monthlyRentSchedule";
import { npvMonthly } from "./npv";
import { parseDateInput } from "@/lib/dateOnly";

/**
 * Negotiation Equivalency Helpers
 *
 * Assumptions:
 * - Advance billing: cashflows occur at schedule start dates.
 * - TI is paid at commencement (PV = nominal).
 * - Free rent applies to earliest rent-paying months by default.
 * - Term extensions use last escalated contractual rent unless schedule extends.
 */

const MAX_FREE_RENT_MONTHS = 18;

const resolveNumber = (value: number | undefined, fallback = 0): number => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
};

const resolveDiscountRate = (value: number | undefined): number => resolveNumber(value, 0);

const resolveRentPayingMonths = (months: MonthlyRentScheduleRow[]): MonthlyRentScheduleRow[] => {
  return months.filter((month) => month.net_rent_due > 0);
};

const addMonthsAnchored = (anchor: Date, months: number): Date => {
  const anchorDay = anchor.getDate();
  const baseMonth = anchor.getMonth() + months;
  const baseYear = anchor.getFullYear() + Math.floor(baseMonth / 12);
  const monthIndex = ((baseMonth % 12) + 12) % 12;
  const lastDay = new Date(baseYear, monthIndex + 1, 0).getDate();
  return new Date(baseYear, monthIndex, Math.min(anchorDay, lastDay));
};

const resolveAnchorDate = (months: MonthlyRentScheduleRow[]): Date | undefined => {
  return parseDateInput(months[0]?.start_date);
};

const resolveMonthlyRent = (month: MonthlyRentScheduleRow): number => {
  const contractual = resolveNumber(month.contractual_base_rent);
  if (contractual !== 0) return contractual;
  return resolveNumber(month.net_rent_due);
};

export function pvOfRateDelta({
  rateDeltaPsfYr,
  rsf,
  rentScheduleMonths,
  discountRateAnnual,
}: {
  rateDeltaPsfYr: number;
  rsf: number;
  rentScheduleMonths: MonthlyRentScheduleRow[];
  discountRateAnnual: number;
}): number {
  const delta = resolveNumber(rateDeltaPsfYr);
  const rsfValue = resolveNumber(rsf);
  if (delta === 0 || rsfValue <= 0) return 0;

  const rentPayingMonths = resolveRentPayingMonths(rentScheduleMonths);
  if (rentPayingMonths.length === 0) return 0;

  const monthlyDelta = (delta * rsfValue) / 12;
  const cashflows = rentPayingMonths.map((month) => ({
    date: month.start_date,
    amount: monthlyDelta,
  }));

  return npvMonthly(cashflows, resolveDiscountRate(discountRateAnnual));
}

export function pvOfTi({
  tiPsf,
  rsf,
}: {
  tiPsf: number;
  rsf: number;
}): number {
  const tiValue = resolveNumber(tiPsf);
  const rsfValue = resolveNumber(rsf);
  if (tiValue === 0 || rsfValue <= 0) return 0;
  return tiValue * rsfValue;
}

export function pvOfFreeRentMonths({
  freeRentMonths,
  rentScheduleMonths,
  rsf,
  discountRateAnnual,
}: {
  freeRentMonths: number;
  rentScheduleMonths: MonthlyRentScheduleRow[];
  rsf: number;
  discountRateAnnual: number;
}): number {
  const monthsRequested = resolveNumber(freeRentMonths);
  const rsfValue = resolveNumber(rsf);
  if (monthsRequested === 0 || rsfValue <= 0) return 0;

  const rentPayingMonths = resolveRentPayingMonths(rentScheduleMonths);
  if (rentPayingMonths.length === 0) return 0;

  const sign = monthsRequested >= 0 ? 1 : -1;
  const targetMonths = Math.min(Math.abs(monthsRequested), rentPayingMonths.length);
  const fullMonths = Math.floor(targetMonths);
  const remainder = targetMonths - fullMonths;
  const selected = rentPayingMonths.slice(0, fullMonths + (remainder > 0 ? 1 : 0));

  const cashflows = selected.map((month, index) => {
    const baseAmount = resolveNumber(month.net_rent_due);
    const multiplier = index === fullMonths && remainder > 0 ? remainder : 1;
    return {
      date: month.start_date,
      amount: baseAmount * multiplier * sign,
    };
  });

  return npvMonthly(cashflows, resolveDiscountRate(discountRateAnnual));
}

export function pvOfTermExtension({
  extensionMonths,
  rentScheduleTailMonths,
  rsf,
  discountRateAnnual,
}: {
  extensionMonths: number;
  rentScheduleTailMonths: MonthlyRentScheduleRow[];
  rsf: number;
  discountRateAnnual: number;
}): number {
  const extension = resolveNumber(extensionMonths);
  const rsfValue = resolveNumber(rsf);
  if (extension === 0 || rsfValue <= 0) return 0;
  if (rentScheduleTailMonths.length === 0) return 0;

  const lastMonth = rentScheduleTailMonths[rentScheduleTailMonths.length - 1];
  const lastMonthlyRent = resolveMonthlyRent(lastMonth);
  if (lastMonthlyRent === 0) return 0;

  const lastStartDate = parseDateInput(lastMonth.start_date);
  if (!lastStartDate) return 0;

  const anchorDate = resolveAnchorDate(rentScheduleTailMonths);
  const sign = extension >= 0 ? 1 : -1;
  const totalMonths = Math.abs(extension);
  const fullMonths = Math.floor(totalMonths);
  const remainder = totalMonths - fullMonths;

  const cashflows = [];
  for (let i = 1; i <= fullMonths; i += 1) {
    cashflows.push({
      date: addMonthsAnchored(lastStartDate, i),
      amount: lastMonthlyRent * sign,
    });
  }
  if (remainder > 0) {
    cashflows.push({
      date: addMonthsAnchored(lastStartDate, fullMonths + 1),
      amount: lastMonthlyRent * remainder * sign,
    });
  }

  if (cashflows.length === 0) return 0;
  const discountRate = resolveDiscountRate(discountRateAnnual);
  return anchorDate
    ? npvMonthly(cashflows, discountRate, anchorDate)
    : npvMonthly(cashflows, discountRate);
}

export function tiToRateEquivalentPsfYr({
  tiPsf,
  rsf,
  rentSchedule,
  discountRateAnnual,
}: {
  tiPsf: number;
  rsf: number;
  rentSchedule: MonthlyRentScheduleResult;
  discountRateAnnual: number;
}): number {
  const pvTi = pvOfTi({ tiPsf, rsf });
  if (pvTi === 0) return 0;

  const pvPerRate = pvOfRateDelta({
    rateDeltaPsfYr: 1,
    rsf,
    rentScheduleMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (pvPerRate === 0) return 0;
  return pvTi / pvPerRate;
}

export function rateToTiEquivalentPsf({
  rateDeltaPsfYr,
  rsf,
  rentSchedule,
  discountRateAnnual,
}: {
  rateDeltaPsfYr: number;
  rsf: number;
  rentSchedule: MonthlyRentScheduleResult;
  discountRateAnnual: number;
}): number {
  const rsfValue = resolveNumber(rsf);
  if (rsfValue <= 0) return 0;

  const pvRate = pvOfRateDelta({
    rateDeltaPsfYr,
    rsf,
    rentScheduleMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (pvRate === 0) return 0;
  return pvRate / rsfValue;
}

export function freeRentToRateEquivalentPsfYr({
  freeRentMonths,
  rsf,
  rentSchedule,
  discountRateAnnual,
}: {
  freeRentMonths: number;
  rsf: number;
  rentSchedule: MonthlyRentScheduleResult;
  discountRateAnnual: number;
}): number {
  const pvFreeRent = pvOfFreeRentMonths({
    freeRentMonths,
    rsf,
    rentScheduleMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (pvFreeRent === 0) return 0;

  const pvPerRate = pvOfRateDelta({
    rateDeltaPsfYr: 1,
    rsf,
    rentScheduleMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (pvPerRate === 0) return 0;
  return pvFreeRent / pvPerRate;
}

export function rateToFreeRentMonths({
  rateDeltaPsfYr,
  rsf,
  rentSchedule,
  discountRateAnnual,
  maxMonths = MAX_FREE_RENT_MONTHS,
}: {
  rateDeltaPsfYr: number;
  rsf: number;
  rentSchedule: MonthlyRentScheduleResult;
  discountRateAnnual: number;
  maxMonths?: number;
}): number {
  const targetPv = pvOfRateDelta({
    rateDeltaPsfYr,
    rsf,
    rentScheduleMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (targetPv === 0) return 0;

  const sign = targetPv >= 0 ? 1 : -1;
  const rentPayingMonths = resolveRentPayingMonths(rentSchedule.months);
  const cappedMax = Math.min(maxMonths, rentPayingMonths.length);
  const targetAbs = Math.abs(targetPv);

  let bestMonths = 0;
  let bestDiff = Number.POSITIVE_INFINITY;
  for (let months = 0; months <= cappedMax; months += 1) {
    const pv = Math.abs(
      pvOfFreeRentMonths({
        freeRentMonths: months,
        rsf,
        rentScheduleMonths: rentSchedule.months,
        discountRateAnnual,
      })
    );
    const diff = Math.abs(targetAbs - pv);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestMonths = months;
    }
  }

  return bestMonths * sign;
}

export function termExtensionToAdditionalTiPsf({
  extensionMonths,
  rsf,
  rentSchedule,
  discountRateAnnual,
}: {
  extensionMonths: number;
  rsf: number;
  rentSchedule: MonthlyRentScheduleResult;
  discountRateAnnual: number;
}): number {
  const rsfValue = resolveNumber(rsf);
  if (rsfValue <= 0) return 0;
  const pvExtension = pvOfTermExtension({
    extensionMonths,
    rsf,
    rentScheduleTailMonths: rentSchedule.months,
    discountRateAnnual,
  });
  if (pvExtension === 0) return 0;
  return pvExtension / rsfValue;
}
