import type { AnalysisMeta, AnnualLine } from "@/types";
import type { AmortizationRow } from "./amortization";
import type { ScenarioEconomicsAssumptions } from "./assumptions";
import type { MonthlyRentScheduleResult } from "./monthlyRentSchedule";
import type { NormalizedBaseMeta, NormalizedEscalationPeriod } from "./normalized/types";
import { buildAmortizationSchedule } from "./amortization";
import { blendedRate } from "./effectiveRent";
import { buildMonthlyRentSchedule } from "./monthlyRentSchedule";
import { npvMonthly } from "./npv";
import { parseDateOnly, parseDateInput } from "@/lib/dateOnly";

export type ScenarioEconomicsInputs = {
  rsf?: number;
  lease_type?: "FS" | "NNN";
  base_year?: number;
  operating?: AnalysisMeta["operating"];
  rentSchedule: AnalysisMeta["rent_schedule"];
  rentEscalation?: AnalysisMeta["rent_escalation"];
  concessions?: AnalysisMeta["concessions"];
  transactionCosts?: AnalysisMeta["transaction_costs"];
  financing?: AnalysisMeta["financing"];
  options?: AnalysisMeta["options"];
  terminationPenaltyMonths?: number;
};

export type MonthlyCashflowLine = {
  monthIndex: number;
  start_date: string;
  end_date: string;
  payment_date: string;
  base_rent: number;
  operating: number;
  parking: number;
  other_recurring: number;
  abatement_credit: number;
  ti_shortfall: number;
  transaction_costs: number;
  amortized_costs: number;
  subtotal: number;
  net_cash_flow: number;
};

export type MonthlyEconomics = {
  rentSchedule: MonthlyRentScheduleResult;
  monthlyCashflow: MonthlyCashflowLine[];
  annualFromMonthly: AnnualLine[];
  npv: number;
  blendedRate: number;
  amortization?: {
    schedule: AmortizationRow[];
    totalToAmortize: number;
    rateAnnual: number;
  };
  dealCosts: {
    tiAllowance: number;
    leasingCommission: number;
    otherCosts: number;
    totalLlCost: number;
  };
  termination?: {
    penaltyMonths?: number;
    feeAt36?: number;
    feeAtMonth?: (monthIndex: number) => number;
    feesByMonth?: number[];
  };
  assumptions: ScenarioEconomicsAssumptions;
};

type MonthlyRentEscalation = {
  type: "fixed_percent" | "fixed_amount" | "custom";
  fixed_percent?: number;
  fixed_amount?: number;
  periods?: NormalizedBaseMeta["rent"]["escalation_periods"];
};

function resolveRentEscalation(
  scenarioInputs: ScenarioEconomicsInputs,
  normalizedBaseMeta: NormalizedBaseMeta
): MonthlyRentEscalation | undefined {
  const rentEscalation = scenarioInputs.rentEscalation;
  if (!rentEscalation) return undefined;

  if (rentEscalation.escalation_type === "custom") {
    return {
      type: "custom",
      periods: normalizedBaseMeta.rent.escalation_periods,
    };
  }

  const fixedAmount = rentEscalation.fixed_escalation_amount;
  if (rentEscalation.escalation_mode === "amount" || fixedAmount !== undefined) {
    return {
      type: "fixed_amount",
      fixed_amount: fixedAmount ?? 0,
    };
  }

  const fixedPercent =
    rentEscalation.fixed_escalation_percentage ?? scenarioInputs.rentSchedule[0]?.escalation_percentage;

  if (fixedPercent === undefined) return undefined;
  return {
    type: "fixed_percent",
    fixed_percent: fixedPercent,
  };
}

function buildAmortizationSummary(
  scenarioInputs: ScenarioEconomicsInputs,
  rentSchedule: MonthlyRentScheduleResult,
  assumptions: ScenarioEconomicsAssumptions
): MonthlyEconomics["amortization"] | undefined {
  const financing = scenarioInputs.financing;
  if (!financing) return undefined;

  const termMonths = rentSchedule.months.length;
  if (termMonths <= 0) return undefined;

  const rsf = scenarioInputs.rsf ?? 0;
  let totalToAmortize = 0;
  if (financing.amortize_ti && scenarioInputs.concessions?.ti_allowance_psf) {
    totalToAmortize += scenarioInputs.concessions.ti_allowance_psf * rsf;
  }
  if (financing.amortize_free_rent) {
    totalToAmortize += rentSchedule.summary.free_rent_value;
  }
  if (financing.amortize_transaction_costs && scenarioInputs.transactionCosts?.total) {
    totalToAmortize += scenarioInputs.transactionCosts.total;
  }

  if (totalToAmortize <= 0) return undefined;

  const rateAnnual =
    financing.amortization_method === "present_value" ? assumptions.amortRateAnnual ?? 0 : 0;
  const schedule = buildAmortizationSchedule(totalToAmortize, rateAnnual, termMonths);
  return { schedule, totalToAmortize, rateAnnual };
}

function buildDealCosts(scenarioInputs: ScenarioEconomicsInputs): MonthlyEconomics["dealCosts"] {
  const rsf = scenarioInputs.rsf ?? 0;
  const concessions = scenarioInputs.concessions ?? {};
  const transactionCosts = scenarioInputs.transactionCosts ?? {};

  const tiAllowance = (concessions.ti_allowance_psf ?? 0) * rsf;
  const transactionPartsTotal =
    (transactionCosts.legal_fees ?? 0) +
    (transactionCosts.brokerage_fees ?? 0) +
    (transactionCosts.due_diligence ?? 0) +
    (transactionCosts.environmental ?? 0) +
    (transactionCosts.other ?? 0);
  const transactionTotal = transactionCosts.total ?? transactionPartsTotal;
  const leasingCommission = transactionCosts.brokerage_fees ?? 0;
  const otherConcessions = (concessions.moving_allowance ?? 0) + (concessions.other_credits ?? 0);
  const otherTransaction = Math.max(0, transactionTotal - leasingCommission);
  const otherCosts = otherConcessions + otherTransaction;
  const totalLlCost = tiAllowance + leasingCommission + otherCosts;

  return {
    tiAllowance,
    leasingCommission,
    otherCosts,
    totalLlCost,
  };
}

function resolveTerminationPenaltyMonths(scenarioInputs: ScenarioEconomicsInputs): number {
  const explicitPenalty = scenarioInputs.terminationPenaltyMonths;
  if (typeof explicitPenalty === "number" && !Number.isNaN(explicitPenalty)) {
    return explicitPenalty;
  }

  const terminationOption = scenarioInputs.options?.find((option) => option.type === "Termination");
  if (!terminationOption) return 0;

  const optionPenalty = terminationOption.fee_months_of_rent ?? 6;
  if (typeof optionPenalty !== "number" || Number.isNaN(optionPenalty)) {
    return 6;
  }

  return optionPenalty;
}

function rollupMonthlyToAnnual(monthlyCashflow: MonthlyCashflowLine[]): AnnualLine[] {
  const groups = new Map<number, MonthlyCashflowLine[]>();
  for (const m of monthlyCashflow) {
    const groupIdx = Math.floor(m.monthIndex / 12);
    let arr = groups.get(groupIdx);
    if (!arr) {
      arr = [];
      groups.set(groupIdx, arr);
    }
    arr.push(m);
  }

  const sortedKeys = Array.from(groups.keys()).sort((a, b) => a - b);
  return sortedKeys.map((groupIdx) => {
    const months = groups.get(groupIdx)!;
    const line: AnnualLine = {
      year: groupIdx + 1,
      base_rent: 0,
      operating: 0,
      parking: 0,
      other_recurring: 0,
      abatement_credit: 0,
      ti_shortfall: 0,
      transaction_costs: 0,
      amortized_costs: 0,
      subtotal: 0,
      net_cash_flow: 0,
    };
    for (const m of months) {
      line.base_rent += m.base_rent;
      line.operating += m.operating;
      line.parking += m.parking;
      line.other_recurring += m.other_recurring;
      line.abatement_credit += m.abatement_credit;
      line.ti_shortfall = (line.ti_shortfall ?? 0) + m.ti_shortfall;
      line.transaction_costs = (line.transaction_costs ?? 0) + m.transaction_costs;
      line.amortized_costs = (line.amortized_costs ?? 0) + m.amortized_costs;
      line.subtotal += m.subtotal;
      line.net_cash_flow += m.net_cash_flow;
    }
    return line;
  });
}

function buildMonthlyOperating(
  scenarioInputs: ScenarioEconomicsInputs,
  normalizedBaseMeta: NormalizedBaseMeta,
  termMonths: number,
  commencement: Date
): number[] {
  const opMeta = scenarioInputs.operating;
  const rsf = scenarioInputs.rsf ?? 0;
  const baseOpPsf = opMeta?.est_op_ex_psf ?? 0;
  if (baseOpPsf === 0 || rsf === 0) return new Array(termMonths).fill(0);

  const escalationType = opMeta?.escalation_type ?? "fixed";
  const escalationValue = opMeta?.escalation_value ?? 0;
  const escalationCap = opMeta?.escalation_cap;
  const opExPeriods = normalizedBaseMeta.operating.escalation_periods;

  const escalateFixed = (base: number, yearIdx: number): number => {
    let escalated = base * Math.pow(1 + escalationValue, yearIdx);
    if (escalationCap !== undefined) {
      const capped = base * Math.pow(1 + escalationCap, yearIdx);
      escalated = Math.min(escalated, capped);
    }
    return escalated;
  };

  const escalateCustom = (base: number, yearIdx: number): number => {
    if (!opExPeriods || opExPeriods.length === 0) return base;
    const yearStart = new Date(commencement);
    yearStart.setFullYear(yearStart.getFullYear() + yearIdx);

    for (const period of opExPeriods) {
      const pStart = parseDateInput(period.period_start);
      const pEnd = parseDateInput(period.period_end);
      if (!pStart || !pEnd) continue;
      if (yearStart >= pStart && yearStart <= pEnd) {
        const periodStartYear = pStart.getFullYear();
        const commYear = commencement.getFullYear();
        const periodStartIdx = Math.max(0, periodStartYear - commYear);
        const yearsSinceStart = yearIdx - periodStartIdx;
        let basePsf = base * Math.pow(1 + period.escalation_percentage, periodStartIdx);
        let escalated = basePsf * Math.pow(1 + period.escalation_percentage, yearsSinceStart);
        if (escalationCap !== undefined) {
          const capped = basePsf * Math.pow(1 + escalationCap, yearsSinceStart);
          escalated = Math.min(escalated, capped);
        }
        return escalated;
      }
    }
    return base;
  };

  const getEscalatedPsf = (yearIdx: number): number => {
    if (escalationType === "custom") return escalateCustom(baseOpPsf, yearIdx);
    return escalateFixed(baseOpPsf, yearIdx);
  };

  const leaseType = scenarioInputs.lease_type ?? "FS";
  const commYear = commencement.getFullYear();
  const baseYear = scenarioInputs.base_year ?? commYear;
  const baseYearIdx = Math.max(0, baseYear - commYear);
  const baseYearOpPsf = getEscalatedPsf(baseYearIdx);

  const result: number[] = [];
  for (let m = 0; m < termMonths; m++) {
    const yearIdx = Math.floor(m / 12);
    const escalatedPsf = getEscalatedPsf(yearIdx);
    let monthlyOp: number;
    if (leaseType === "NNN") {
      monthlyOp = (escalatedPsf * rsf) / 12;
    } else {
      monthlyOp = Math.max(0, (escalatedPsf - baseYearOpPsf) * rsf) / 12;
    }
    result.push(monthlyOp);
  }
  return result;
}

export function buildScenarioEconomics({
  normalizedBaseMeta,
  scenarioInputs,
  assumptions,
}: {
  normalizedBaseMeta: NormalizedBaseMeta;
  scenarioInputs: ScenarioEconomicsInputs;
  assumptions: ScenarioEconomicsAssumptions;
}): MonthlyEconomics {
  const rentEscalation = resolveRentEscalation(scenarioInputs, normalizedBaseMeta);
  const paymentTiming = assumptions.billingTiming ?? "advance";
  const rounding = assumptions.rounding ?? "none";

  const rentSchedule = buildMonthlyRentSchedule({
    normalized: normalizedBaseMeta,
    rent: {
      base_rent_psf: scenarioInputs.rentSchedule[0]?.rent_psf,
      escalation: rentEscalation,
    },
    rsf: scenarioInputs.rsf,
    payment_timing: paymentTiming,
    rounding,
  });

  const amortization = buildAmortizationSummary(scenarioInputs, rentSchedule, assumptions);

  const rsf = scenarioInputs.rsf ?? 0;
  const commencement = parseDateOnly(normalizedBaseMeta.dates.commencement ?? "");
  const monthlyOperatingArr = commencement
    ? buildMonthlyOperating(scenarioInputs, normalizedBaseMeta, rentSchedule.months.length, commencement)
    : new Array(rentSchedule.months.length).fill(0);

  const monthlyCashflow: MonthlyCashflowLine[] = rentSchedule.months.map((month) => {
    const base_rent = month.contractual_base_rent;
    const abatement_credit = month.free_rent_amount;
    const operating = monthlyOperatingArr[month.period_index] ?? 0;
    const parking = 0;
    const other_recurring = 0;
    const isFirstMonth = month.period_index === 0;
    const ti_shortfall = isFirstMonth
      ? Math.max(0, ((scenarioInputs.concessions?.ti_actual_build_cost_psf ?? 0) - (scenarioInputs.concessions?.ti_allowance_psf ?? 0)) * rsf)
      : 0;
    const transaction_costs = isFirstMonth
      ? (scenarioInputs.transactionCosts?.total ?? 0)
      : 0;
    const amortRow = amortization?.schedule[month.period_index];
    const amortized_costs = amortRow ? amortRow.interest + amortRow.principal : 0;
    const subtotal = base_rent + operating + parking + other_recurring;
    const net_cash_flow =
      subtotal +
      abatement_credit +
      ti_shortfall +
      transaction_costs +
      amortized_costs;

    return {
      monthIndex: month.period_index,
      start_date: month.start_date,
      end_date: month.end_date,
      payment_date:
        paymentTiming === "arrears"
          ? month.end_date
          : month.start_date,
      base_rent,
      operating,
      parking,
      other_recurring,
      abatement_credit,
      ti_shortfall,
      transaction_costs,
      amortized_costs,
      subtotal,
      net_cash_flow,
    };
  });

  const cashflows = monthlyCashflow.map((m) => ({
    date: m.payment_date,
    amount: m.net_cash_flow,
  }));

  const npv = npvMonthly(cashflows, assumptions.discountRateAnnual);
  const termMonths = rentSchedule.months.length;
  const blended = blendedRate(rentSchedule.summary.total_net_rent, scenarioInputs.rsf ?? 0, termMonths);
  const dealCosts = buildDealCosts(scenarioInputs);
  const terminationPenaltyMonths = resolveTerminationPenaltyMonths(scenarioInputs);

  const annualFromMonthly = rollupMonthlyToAnnual(monthlyCashflow);

  return {
    rentSchedule,
    monthlyCashflow,
    annualFromMonthly,
    npv,
    blendedRate: blended,
    amortization,
    dealCosts,
    termination: {
      penaltyMonths: terminationPenaltyMonths,
    },
    assumptions,
  };
}
