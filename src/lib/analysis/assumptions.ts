import type { NormalizedBaseMeta } from "./normalized/types";

export type AnalysisAssumptions = {
  discounting: {
    compounding: "monthly";
    basis: "period_index";
    day_count_basis?: "30/360" | "actual/365";
  };
  rounding: "none" | "cents";
};

export type ScenarioEconomicsAssumptions = {
  discountRateAnnual: number;
  amortRateAnnual?: number;
  billingTiming?: "advance" | "arrears";
  escalationMode?: "fixed_percent" | "fixed_amount" | "custom";
  rounding?: "none" | "cents";
};

export type AnalysisAssumptionsSummary = {
  discountRateAnnual: number;
  amortRateAnnual?: number;
  billingTiming: "advance" | "arrears";
  escalationMode?: "fixed_amount";
  rounding?: "none" | "cents";
};

export function buildAssumptionsSummary({
  normalized,
  assumptions,
}: {
  normalized: NormalizedBaseMeta;
  assumptions: ScenarioEconomicsAssumptions;
}): AnalysisAssumptionsSummary {
  const billingTiming = assumptions.billingTiming ?? "advance";
  const rounding = assumptions.rounding && assumptions.rounding !== "none" ? assumptions.rounding : undefined;
  const escalationMode = assumptions.escalationMode === "fixed_amount" ? "fixed_amount" : undefined;

  return {
    discountRateAnnual: assumptions.discountRateAnnual,
    amortRateAnnual: assumptions.amortRateAnnual,
    billingTiming,
    escalationMode,
    rounding,
  };
}
