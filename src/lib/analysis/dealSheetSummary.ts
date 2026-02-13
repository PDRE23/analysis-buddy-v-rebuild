import { formatAssumptionsLine, type AnalysisAssumptionsSummary } from "./assumptions";
import type { MonthlyEconomics } from "./scenarioEconomics";
import { terminationFeeAtMonth } from "./earlyTermination";

export type DealSheetSummary = {
  termMonths: number;
  totalNetRent: number;
  freeRentValue: number;
  blendedRate: number;
  npvRent: number;
  totalLlCost?: number;
  unamortizedAt36?: number;
  terminationFeeAt36?: number;
  assumptionsLine: string;
};

type DealSheetSummarySource = {
  monthlyEconomics?: MonthlyEconomics;
  assumptionsSummary?: AnalysisAssumptionsSummary;
};

const resolveTotalLlCost = (monthlyEconomics?: MonthlyEconomics): number | undefined => {
  if (!monthlyEconomics) return undefined;
  const totalLlCost = monthlyEconomics.dealCosts?.totalLlCost;
  if (typeof totalLlCost !== "number" || Number.isNaN(totalLlCost)) {
    console.warn("dealSheetSummary missing dealCosts.totalLlCost on MonthlyEconomics", {
      totalLlCost,
    });
    return undefined;
  }
  return totalLlCost;
};

const resolveTargetIndex = (monthlyEconomics?: MonthlyEconomics): number | undefined => {
  if (!monthlyEconomics) return undefined;
  const months = monthlyEconomics.rentSchedule.months;
  if (months.length === 0) return undefined;
  return Math.min(months.length - 1, 35);
};

const resolveUnamortizedAt36 = (monthlyEconomics?: MonthlyEconomics): number | undefined => {
  if (!monthlyEconomics) return undefined;
  const targetIndex = resolveTargetIndex(monthlyEconomics);
  if (targetIndex === undefined) return undefined;
  const amortSchedule = monthlyEconomics.amortization?.schedule ?? [];
  const unamortized = amortSchedule[targetIndex]?.ending_balance;
  if (typeof unamortized !== "number" || Number.isNaN(unamortized)) return undefined;
  return unamortized;
};

const resolveTerminationFeeAt36 = (monthlyEconomics?: MonthlyEconomics): number | undefined => {
  if (!monthlyEconomics) return undefined;
  const targetIndex = resolveTargetIndex(monthlyEconomics);
  if (targetIndex === undefined) return undefined;
  const termination = monthlyEconomics.termination;
  const explicitFee = termination?.feeAt36;
  if (typeof explicitFee === "number" && !Number.isNaN(explicitFee)) return explicitFee;

  if (typeof termination?.feeAtMonth === "function") {
    const fee = termination.feeAtMonth(targetIndex);
    if (typeof fee === "number" && !Number.isNaN(fee)) return fee;
  }

  const feeByMonth = termination?.feesByMonth;
  if (Array.isArray(feeByMonth)) {
    const fee = feeByMonth[targetIndex];
    if (typeof fee === "number" && !Number.isNaN(fee)) return fee;
  }

  const penaltyMonths = termination?.penaltyMonths;
  if (typeof penaltyMonths !== "number" || Number.isNaN(penaltyMonths)) return undefined;

  const months = monthlyEconomics.rentSchedule.months;
  const currentMonthlyRent = months[targetIndex]?.contractual_base_rent ?? 0;
  const amortSchedule = monthlyEconomics.amortization?.schedule ?? [];
  const fee = terminationFeeAtMonth(amortSchedule, targetIndex, penaltyMonths, currentMonthlyRent);
  if (typeof fee !== "number" || Number.isNaN(fee)) return undefined;
  return fee;
};

export function buildDealSheetSummary(
  analysisResult: DealSheetSummarySource
): DealSheetSummary | undefined {
  const monthlyEconomics = analysisResult.monthlyEconomics;
  if (!monthlyEconomics) return undefined;

  const termMonths = monthlyEconomics.rentSchedule.months.length;
  const summary = monthlyEconomics.rentSchedule.summary;

  return {
    termMonths,
    totalNetRent: summary.total_net_rent,
    freeRentValue: summary.free_rent_value,
    blendedRate: monthlyEconomics.blendedRate,
    npvRent: monthlyEconomics.npv,
    totalLlCost: resolveTotalLlCost(monthlyEconomics),
    unamortizedAt36: resolveUnamortizedAt36(monthlyEconomics),
    terminationFeeAt36: resolveTerminationFeeAt36(monthlyEconomics),
    assumptionsLine: formatAssumptionsLine(analysisResult.assumptionsSummary),
  };
}
