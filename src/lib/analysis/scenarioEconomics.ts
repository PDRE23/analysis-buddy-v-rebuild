import type { AnalysisMeta } from "@/types";
import type { AmortizationRow } from "./amortization";
import type { ScenarioEconomicsAssumptions } from "./assumptions";
import type { MonthlyRentScheduleResult } from "./monthlyRentSchedule";
import type { NormalizedBaseMeta } from "./normalized/types";
import { buildAmortizationSchedule } from "./amortization";
import { blendedRate } from "./effectiveRent";
import { buildMonthlyRentSchedule } from "./monthlyRentSchedule";
import { npvMonthly } from "./npv";

export type ScenarioEconomicsInputs = {
  rsf?: number;
  rentSchedule: AnalysisMeta["rent_schedule"];
  rentEscalation?: AnalysisMeta["rent_escalation"];
  concessions?: AnalysisMeta["concessions"];
  transactionCosts?: AnalysisMeta["transaction_costs"];
  financing?: AnalysisMeta["financing"];
};

export type MonthlyEconomics = {
  rentSchedule: MonthlyRentScheduleResult;
  npv: number;
  blendedRate: number;
  amortization?: {
    schedule: AmortizationRow[];
    totalToAmortize: number;
    rateAnnual: number;
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

  const cashflows = rentSchedule.months.map((month) => ({
    date: paymentTiming === "arrears" ? month.end_date : month.start_date,
    amount: month.net_rent_due,
  }));

  const npv = npvMonthly(cashflows, assumptions.discountRateAnnual);
  const termMonths = rentSchedule.months.length;
  const blended = blendedRate(rentSchedule.summary.total_net_rent, scenarioInputs.rsf ?? 0, termMonths);
  const amortization = buildAmortizationSummary(scenarioInputs, rentSchedule, assumptions);

  return {
    rentSchedule,
    npv,
    blendedRate: blended,
    amortization,
    assumptions,
  };
}
