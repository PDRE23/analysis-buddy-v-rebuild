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

  const monthlyCashflow: MonthlyCashflowLine[] = rentSchedule.months.map((month) => {
    const base_rent = month.contractual_base_rent;
    const abatement_credit = month.free_rent_amount;
    const operating = 0;
    const parking = 0;
    const other_recurring = 0;
    const ti_shortfall = 0;
    const transaction_costs = 0;
    const amortized_costs = 0;
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
  const amortization = buildAmortizationSummary(scenarioInputs, rentSchedule, assumptions);
  const dealCosts = buildDealCosts(scenarioInputs);
  const terminationPenaltyMonths = resolveTerminationPenaltyMonths(scenarioInputs);

  return {
    rentSchedule,
    monthlyCashflow,
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
