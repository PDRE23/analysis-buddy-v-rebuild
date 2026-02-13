/**
 * Cashflow calculation engine
 * Main function: buildAnnualCashflow()
 * 
 * This function builds annual cashflow lines from an AnalysisMeta object.
 * All business logic preserved exactly as-is from v1.
 */

import type { AnalysisMeta, AnnualLine, AnnualLineNumericKey } from "@/types";
import type { NormalizedBaseMeta } from "@/lib/analysis";
import { parseDateInput, parseDateOnly } from "../dateOnly";

/** Apply CPI or fixed escalation to a base value for N periods. */
function escalate(value: number, n: number, method: "fixed" | "cpi" = "fixed", rate = 0, cap?: number): number {
  if (n <= 0) return value;
  const effectiveRate = cap !== undefined ? Math.min(rate, cap) : rate;
  const r = Math.max(0, effectiveRate);
  return value * Math.pow(1 + r, n); // CPI treated as provided rate
}

/** Return number of months overlapping [start, end] within [a,b]. */
function overlappingMonths(start: Date, end: Date, a: Date, b: Date): number {
  const s = new Date(Math.max(start.getTime(), a.getTime()));
  const e = new Date(Math.min(end.getTime(), b.getTime()));
  if (e < s) return 0;
  let months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth()) + 1;
  if (e.getDate() < s.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

type EscalationPeriodLike = {
  period_start: string;
  period_end: string;
  escalation_percentage: number;
};

type CustomEscalationLookup = {
  sortedPeriods: EscalationPeriodLike[];
  termYearToPeriodIndex: Map<number, number>;
  periodFirstTermYear: Array<number | undefined>;
  periodBaseAtStart: number[];
};

type TermYearPeriod = {
  index: number; // 0-based term year index
  start: Date;
  end: Date;
  months: number;
};

function getAnniversaryDate(commencement: Date, year: number): Date {
  const month = commencement.getMonth();
  const day = commencement.getDate();
  const lastDayOfMonth = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(day, lastDayOfMonth));
}

function buildTermYearPeriods(commencement: Date, expiration: Date): TermYearPeriod[] {
  if (Number.isNaN(commencement.getTime()) || Number.isNaN(expiration.getTime()) || expiration <= commencement) {
    return [];
  }

  const periods: TermYearPeriod[] = [];
  const baseYear = commencement.getFullYear();

  for (let index = 0; ; index += 1) {
    const start = getAnniversaryDate(commencement, baseYear + index);
    if (start > expiration) break;
    const nextStart = getAnniversaryDate(commencement, baseYear + index + 1);
    const end = new Date(nextStart);
    end.setDate(end.getDate() - 1);
    if (end > expiration) {
      end.setTime(expiration.getTime());
    }
    const months = overlappingMonths(start, end, start, end);
    periods.push({ index, start, end, months });
  }

  return periods;
}

function getTermYearIndexForDate(commencement: Date, date: Date): number {
  let months = (date.getFullYear() - commencement.getFullYear()) * 12 + (date.getMonth() - commencement.getMonth());
  if (date.getDate() < commencement.getDate()) {
    months -= 1;
  }
  return Math.max(0, Math.floor(months / 12));
}

function buildCustomEscalationLookup(
  baseValue: number,
  termPeriods: TermYearPeriod[],
  periods: EscalationPeriodLike[]
): CustomEscalationLookup {
  const sortedPeriods = [...periods].sort(
    (a, b) => (parseDateInput(a.period_start)?.getTime() ?? 0) - (parseDateInput(b.period_start)?.getTime() ?? 0)
  );
  const periodDates = sortedPeriods.map((period) => ({
    start: parseDateInput(period.period_start) ?? new Date(period.period_start),
    end: parseDateInput(period.period_end) ?? new Date(period.period_end),
  }));

  const termYearToPeriodIndex = new Map<number, number>();
  for (const period of termPeriods) {
    const anniversary = period.start;
    const index = periodDates.findIndex((periodDate) => anniversary >= periodDate.start && anniversary <= periodDate.end);
    if (index >= 0) {
      termYearToPeriodIndex.set(period.index, index);
    }
  }

  const periodFirstTermYear: Array<number | undefined> = new Array(sortedPeriods.length);
  const periodYearCounts: number[] = new Array(sortedPeriods.length).fill(0);
  for (const [termYear, index] of termYearToPeriodIndex.entries()) {
    if (periodFirstTermYear[index] === undefined || termYear < (periodFirstTermYear[index] as number)) {
      periodFirstTermYear[index] = termYear;
    }
    periodYearCounts[index] += 1;
  }

  const periodBaseAtStart: number[] = new Array(sortedPeriods.length);
  let currentBase = baseValue;
  for (let i = 0; i < sortedPeriods.length; i++) {
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

export function buildAnnualCashflow(a: AnalysisMeta, normalized?: NormalizedBaseMeta): AnnualLine[] {
  const commencementInput = normalized?.dates.commencement ?? a.key_dates.commencement;
  const expirationInput = normalized?.dates.expiration ?? a.key_dates.expiration;
  const commencement = parseDateOnly(commencementInput) ?? new Date(commencementInput);
  const expiration = parseDateOnly(expirationInput) ?? new Date(expirationInput);

  if (
    Number.isNaN(commencement.getTime()) ||
    Number.isNaN(expiration.getTime()) ||
    expiration <= commencement
  ) {
    return [];
  }

  const termPeriods = buildTermYearPeriods(commencement, expiration);
  const lines: AnnualLine[] = termPeriods.map((period) => ({
    year: period.index + 1,
    base_rent: 0,
    abatement_credit: 0,
    operating: 0,
    parking: 0,
    other_recurring: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  }));

  const rsf = a.rsf;
  const addToIndex = (index: number, field: AnnualLineNumericKey, amount: number) => {
    const row = lines[index];
    if (row) row[field] = (row[field] as number) + amount;
  };

  // Base Rent & Abatement
  const escalationType = a.rent_escalation?.escalation_type || "fixed";
  const baseRent = a.rent_schedule.length > 0 ? a.rent_schedule[0].rent_psf : 0;
  const rentRates: number[] = new Array(termPeriods.length).fill(baseRent);
  const rentEscalationPeriods = normalized?.rent.escalation_periods ?? a.rent_escalation?.escalation_periods;
  
  if (escalationType === "fixed") {
    // Fixed escalation: use fixed_escalation_percentage or fall back to rent_schedule escalation_percentage
    const fixedEscalationRate = a.rent_escalation?.fixed_escalation_percentage ?? 
                                 (a.rent_schedule[0]?.escalation_percentage ?? 0);
    
    for (const period of termPeriods) {
      const escalatedRate = baseRent * Math.pow(1 + fixedEscalationRate, period.index);
      rentRates[period.index] = escalatedRate;
      const annualRentForMonths = (escalatedRate * rsf * period.months) / 12;
      addToIndex(period.index, "base_rent", annualRentForMonths);
    }
  } else if (escalationType === "custom" && rentEscalationPeriods && rentEscalationPeriods.length > 0) {
    // Custom escalation: use escalation periods to determine rate for each term year
    const rentLookup = buildCustomEscalationLookup(
      baseRent,
      termPeriods,
      rentEscalationPeriods
    );

    for (const period of termPeriods) {
      const periodIndex = rentLookup.termYearToPeriodIndex.get(period.index);
      if (periodIndex === undefined || rentLookup.periodFirstTermYear[periodIndex] === undefined) {
        const annualRentForMonths = (baseRent * rsf * period.months) / 12;
        addToIndex(period.index, "base_rent", annualRentForMonths);
        continue;
      }

      const escalationRate = rentLookup.sortedPeriods[periodIndex].escalation_percentage;
      const yearsSincePeriodStart = period.index - (rentLookup.periodFirstTermYear[periodIndex] as number);
      const baseAtStart = rentLookup.periodBaseAtStart[periodIndex];
      const escalatedRate = baseAtStart * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      rentRates[period.index] = escalatedRate;
      const annualRentForMonths = (escalatedRate * rsf * period.months) / 12;
      addToIndex(period.index, "base_rent", annualRentForMonths);
    }
  } else {
    // Fallback: use old rent_schedule structure for backward compatibility
    const schedulePeriods = a.rent_schedule.map((period) => ({
      ...period,
      start: parseDateOnly(period.period_start) ?? new Date(period.period_start),
      end: parseDateOnly(period.period_end) ?? new Date(period.period_end),
    }));

    for (const period of termPeriods) {
      const match = schedulePeriods.find((r) => period.start >= r.start && period.start <= r.end);
      if (!match) continue;
      const periodStartIndex = getTermYearIndexForDate(commencement, match.start);
      const yearsInPeriod = Math.max(0, period.index - periodStartIndex);
      const escalationRate = match.escalation_percentage ?? 0;
      const escalatedRate = match.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
      rentRates[period.index] = escalatedRate;
      const annualRentForMonths = (escalatedRate * rsf * period.months) / 12;
      addToIndex(period.index, "base_rent", annualRentForMonths);
    }
  }

  // Operating pass-throughs
  // For FS: use est_op_ex_psf if provided, otherwise use base rent rate for opex analysis
  // For NNN: use est_op_ex_psf
  let baseOp: number;
  if (a.lease_type === "FS" && !a.operating.est_op_ex_psf) {
    // If no opex specified for FS, use first period base rent as opex portion
    const firstPeriod = a.rent_schedule[0];
    baseOp = firstPeriod ? firstPeriod.rent_psf : 0;
  } else {
    baseOp = a.operating.est_op_ex_psf ?? 0;
  }
  
  const useManualPassThrough =
    a.lease_type === "FS" &&
    a.operating.use_manual_pass_through &&
    a.operating.manual_pass_through_psf !== undefined;
  const opExEscalationType = a.operating.escalation_type || "fixed";
  const method = a.operating.escalation_method ?? "fixed"; // Keep for backward compatibility
  const commencementYear = commencement.getFullYear();
  const baseYear = a.base_year ?? commencementYear;
  const baseYearIndex = Math.max(0, baseYear - commencementYear);
  const opExEscalationPeriods = normalized?.operating.escalation_periods ?? a.operating.escalation_periods;
  const opExLookup =
    opExEscalationType === "custom" && opExEscalationPeriods
      ? buildCustomEscalationLookup(baseOp, termPeriods, opExEscalationPeriods)
      : undefined;
  const manualBase = a.operating.manual_pass_through_psf ?? 0;
  const manualOpExLookup =
    useManualPassThrough && opExEscalationType === "custom" && opExEscalationPeriods
      ? buildCustomEscalationLookup(manualBase, termPeriods, opExEscalationPeriods)
      : undefined;

  const getEscalatedOp = (base: number, idx: number, lookup?: CustomEscalationLookup): number => {
    if (opExEscalationType === "fixed") {
      const value = a.operating.escalation_value ?? 0;
      const cap = a.operating.escalation_cap;
      return escalate(base, idx, method, value, cap);
    }
    if (opExEscalationType === "custom" && opExEscalationPeriods && lookup) {
      const periodIndex = lookup.termYearToPeriodIndex.get(idx);
      if (periodIndex === undefined || lookup.periodFirstTermYear[periodIndex] === undefined) {
        return base;
      }
      const escalationRate = lookup.sortedPeriods[periodIndex].escalation_percentage;
      const yearsSincePeriodStart = idx - (lookup.periodFirstTermYear[periodIndex] as number);
      const baseAtStart = lookup.periodBaseAtStart[periodIndex];
      let escalated = baseAtStart * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      if (a.operating.escalation_cap) {
        const maxEscalated = baseAtStart * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
        escalated = Math.min(escalated, maxEscalated);
      }
      return escalated;
    }
    const value = a.operating.escalation_value ?? 0;
    const cap = a.operating.escalation_cap;
    return escalate(base, idx, method, value, cap);
  };
  const escalatedOpByTermIndex: number[] = new Array(termPeriods.length).fill(baseOp);

  for (const period of termPeriods) {
    const idx = period.index;
    const escalatedOp = getEscalatedOp(baseOp, idx, opExLookup);
    const manualEscalated = useManualPassThrough ? getEscalatedOp(manualBase, idx, manualOpExLookup) : undefined;
    escalatedOpByTermIndex[idx] = useManualPassThrough ? (manualEscalated ?? baseOp) : escalatedOp;

    if (a.lease_type === "FS") {
      if (useManualPassThrough) {
        const passthrough = (manualEscalated ?? 0) * rsf;
        addToIndex(idx, "operating", passthrough);
        continue;
      }
      let baseYearOp: number;
      if (opExEscalationType === "fixed") {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, Math.max(0, idx - baseYearIndex), method, value, cap);
      } else if (opExEscalationType === "custom" && opExEscalationPeriods && opExLookup) {
        const periodIndex = opExLookup.termYearToPeriodIndex.get(baseYearIndex);
        if (periodIndex === undefined || opExLookup.periodFirstTermYear[periodIndex] === undefined) {
          baseYearOp = baseOp;
        } else {
          const escalationRate = opExLookup.sortedPeriods[periodIndex].escalation_percentage;
          const yearsSincePeriodStart = baseYearIndex - (opExLookup.periodFirstTermYear[periodIndex] as number);
          const baseAtStart = opExLookup.periodBaseAtStart[periodIndex];
          baseYearOp = baseAtStart * Math.pow(1 + escalationRate, yearsSincePeriodStart);
          if (a.operating.escalation_cap) {
            const maxEscalated = baseAtStart * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
            baseYearOp = Math.min(baseYearOp, maxEscalated);
          }
        }
      } else {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, Math.max(0, idx - baseYearIndex), method, value, cap);
      }

      // FS passthrough: tenant pays opex increases above base year
      const passthrough = Math.max(0, escalatedOp - baseYearOp) * rsf;
      addToIndex(idx, "operating", passthrough);
    } else {
      // NNN lease: tenant pays all opex
      const passthrough = escalatedOp * rsf;
      addToIndex(idx, "operating", passthrough);
    }
  }

  // Apply Abatement - handle both "at_commencement" and "custom" modes
  const abatementType = a.concessions?.abatement_type || "at_commencement";

  if (abatementType === "at_commencement") {
    const freeMonths = a.concessions?.abatement_free_rent_months ?? 0;
    const abatementAppliesTo = a.concessions?.abatement_applies_to || "base_only";

    if (freeMonths > 0) {
      let remaining = freeMonths;
      let idx = 0;
      while (remaining > 0 && idx < termPeriods.length) {
        const monthsInPeriod = Math.min(remaining, termPeriods[idx].months);
        const rentRate = rentRates[idx] ?? baseRent;
        const baseAbateAmt = (rentRate * rsf * monthsInPeriod) / 12;
        addToIndex(idx, "abatement_credit", -baseAbateAmt);

        if (abatementAppliesTo === "base_plus_nnn") {
          const opRate = escalatedOpByTermIndex[idx] ?? baseOp;
          const opAbateAmt = (opRate * rsf * monthsInPeriod) / 12;
          addToIndex(idx, "abatement_credit", -opAbateAmt);
        }

        remaining -= monthsInPeriod;
        idx += 1;
      }
    }
  } else if (abatementType === "custom" && a.concessions?.abatement_periods) {
    for (const abatementPeriod of a.concessions.abatement_periods) {
      const apStart = parseDateOnly(abatementPeriod.period_start) ?? new Date(abatementPeriod.period_start);
      const apEnd = parseDateOnly(abatementPeriod.period_end) ?? new Date(abatementPeriod.period_end);
      const freeMonths = abatementPeriod.free_rent_months;

      for (const period of termPeriods) {
        const overlapMonths = overlappingMonths(apStart, apEnd, period.start, period.end);
        if (overlapMonths <= 0 || freeMonths <= 0) continue;

        const monthsToAbate = Math.min(freeMonths, overlapMonths);
        const rentRate = rentRates[period.index] ?? baseRent;
        const baseAbateAmt = (rentRate * rsf * monthsToAbate) / 12;
        addToIndex(period.index, "abatement_credit", -baseAbateAmt);

        if (abatementPeriod.abatement_applies_to === "base_plus_nnn") {
          const opRate = escalatedOpByTermIndex[period.index] ?? baseOp;
          const opAbateAmt = (opRate * rsf * monthsToAbate) / 12;
          addToIndex(period.index, "abatement_credit", -opAbateAmt);
        }
      }
    }
  }

  // Parking costs (annualized)
  if (a.parking?.monthly_rate_per_stall && a.parking.stalls) {
    const pr = a.parking.monthly_rate_per_stall;
    const stalls = a.parking.stalls;
    const pvRaw = a.parking.escalation_value ?? 0;
    const pv = pvRaw > 1 ? pvRaw / 100 : pvRaw;
    for (let i = 0; i < termPeriods.length; i++) {
      const escalatedMonthly = escalate(pr, i, "fixed", pv);
      addToIndex(i, "parking", escalatedMonthly * termPeriods[i].months * stalls);
    }
  }

  // TI Shortfall (one-time cost in year 1)
  if (a.concessions.ti_actual_build_cost_psf !== undefined && a.concessions.ti_allowance_psf !== undefined) {
    const shortfall = Math.max(0, (a.concessions.ti_actual_build_cost_psf - (a.concessions.ti_allowance_psf || 0)) * rsf);
    if (shortfall > 0 && lines.length > 0) {
      lines[0].ti_shortfall = shortfall;
    }
  }

  // Transaction costs (one-time cost in year 1)
  if (a.transaction_costs?.total) {
    if (lines.length > 0) {
      lines[0].transaction_costs = a.transaction_costs.total;
    }
  }

  // Amortized costs (if financing settings enabled)
  if (a.financing) {
    const totalMonths = termPeriods.reduce((sum, period) => sum + period.months, 0);
    const termYears = totalMonths / 12;
    
    // Calculate amortized amounts per year
    const amortizedAmounts: number[] = [];
    let totalToAmortize = 0;
    
    if (a.financing.amortize_ti && a.concessions.ti_allowance_psf) {
      totalToAmortize += (a.concessions.ti_allowance_psf * rsf);
    }
    if (a.financing.amortize_free_rent) {
      // Calculate total free rent value from abatement
      let freeRentValue = 0;
      if (a.concessions?.abatement_type === "at_commencement") {
        const freeMonths = a.concessions.abatement_free_rent_months || 0;
        if (freeMonths > 0 && a.rent_schedule.length > 0) {
          const firstPeriod = a.rent_schedule[0];
          freeRentValue = (freeMonths / 12) * (firstPeriod.rent_psf * rsf);
        }
      } else if (a.concessions?.abatement_type === "custom" && a.concessions.abatement_periods) {
        // Sum up all free rent from custom periods
        for (const period of a.concessions.abatement_periods) {
          // Find rent rate for the period
          let rentRate = 0;
          for (const r of a.rent_schedule) {
            const rStart = parseDateOnly(r.period_start) ?? new Date(r.period_start);
            const rEnd = parseDateOnly(r.period_end) ?? new Date(r.period_end);
            const periodStart = parseDateOnly(period.period_start) ?? new Date(period.period_start);
            if (periodStart >= rStart && periodStart <= rEnd) {
              rentRate = r.rent_psf;
              break;
            }
          }
          freeRentValue += (period.free_rent_months / 12) * (rentRate * rsf);
        }
      }
      totalToAmortize += freeRentValue;
    }
    if (a.financing.amortize_transaction_costs && a.transaction_costs?.total) {
      totalToAmortize += a.transaction_costs.total;
    }
    
    if (totalToAmortize > 0 && termYears > 0) {
      if (a.financing.amortization_method === "present_value" && a.financing.interest_rate) {
        // PV-based amortization
        const rate = a.financing.interest_rate;
        const annualPayment = totalToAmortize * (rate / (1 - Math.pow(1 + rate, -termYears)));
        for (let i = 0; i < Math.min(Math.ceil(termYears), lines.length); i++) {
          amortizedAmounts.push(annualPayment);
        }
      } else {
        // Straight-line amortization
        const annualAmount = totalToAmortize / termYears;
        for (let i = 0; i < Math.min(Math.ceil(termYears), lines.length); i++) {
          amortizedAmounts.push(annualAmount);
        }
      }
      
      // Apply amortized amounts to cashflow
      for (let i = 0; i < Math.min(amortizedAmounts.length, lines.length); i++) {
        lines[i].amortized_costs = amortizedAmounts[i];
      }
    }
  }

  for (const row of lines) {
    row.subtotal = row.base_rent + row.operating + row.parking + row.other_recurring;
    row.net_cash_flow = row.subtotal + row.abatement_credit + (row.ti_shortfall || 0) + (row.transaction_costs || 0) + (row.amortized_costs || 0);
  }

  return lines;
}

