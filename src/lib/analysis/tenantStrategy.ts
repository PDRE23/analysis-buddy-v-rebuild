import type { DealSheetSummary } from "./dealSheetSummary";
import type { MonthlyEconomics } from "./scenarioEconomics";

export type TenantStrategySummary = {
  totalOccupancyCostNPV: number;
  freeRentValue: number;
  llContribution: number;
  terminationFlexibilityScore: number;
  deltaVsBase: {
    npvChange: number;
    freeRentChange: number;
    llContributionChange: number;
    terminationFeeChange: number;
  };
  tenantScore: number;
  leverageFlags: string[];
  talkingPoint: string;
  watchOut?: string;
};

type TenantStrategySource = {
  monthlyEconomics?: MonthlyEconomics;
  dealSheetSummary?: DealSheetSummary;
};

const resolveNumber = (value: number | undefined, fallback = 0) => {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return value;
};

const resolveOptionalNumber = (value: number | undefined): number | undefined => {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return value;
};

const resolveTotalOccupancyCostNPV = (source: TenantStrategySource): number => {
  return resolveNumber(source.dealSheetSummary?.npvRent, resolveNumber(source.monthlyEconomics?.npv));
};

const resolveFreeRentValue = (source: TenantStrategySource): number => {
  const summaryValue = source.dealSheetSummary?.freeRentValue;
  if (typeof summaryValue === "number" && !Number.isNaN(summaryValue)) return summaryValue;
  return resolveNumber(source.monthlyEconomics?.rentSchedule.summary.free_rent_value);
};

const resolveLlContribution = (source: TenantStrategySource): number => {
  return resolveNumber(
    source.dealSheetSummary?.totalLlCost,
    resolveNumber(source.monthlyEconomics?.dealCosts.totalLlCost)
  );
};

const resolveTerminationFeeAt36 = (source: TenantStrategySource): number => {
  const summaryFee = source.dealSheetSummary?.terminationFeeAt36;
  if (typeof summaryFee === "number" && !Number.isNaN(summaryFee)) return summaryFee;

  const monthlyEconomics = source.monthlyEconomics;
  if (!monthlyEconomics) return 0;
  const termination = monthlyEconomics.termination;
  if (!termination) return 0;

  const feeAt36 = termination.feeAt36;
  if (typeof feeAt36 === "number" && !Number.isNaN(feeAt36)) return feeAt36;

  const months = monthlyEconomics.rentSchedule.months;
  if (months.length === 0) return 0;
  const targetIndex = Math.min(months.length - 1, 35);

  if (typeof termination.feeAtMonth === "function") {
    const fee = termination.feeAtMonth(targetIndex);
    if (typeof fee === "number" && !Number.isNaN(fee)) return fee;
  }

  const feeByMonth = termination.feesByMonth?.[targetIndex];
  if (typeof feeByMonth === "number" && !Number.isNaN(feeByMonth)) return feeByMonth;

  return 0;
};

const resolveTotalNetRent = (source: TenantStrategySource): number | undefined => {
  const summaryValue = source.dealSheetSummary?.totalNetRent;
  if (typeof summaryValue === "number" && !Number.isNaN(summaryValue)) return summaryValue;
  return resolveOptionalNumber(source.monthlyEconomics?.rentSchedule.summary.total_net_rent);
};

const resolveBlendedRate = (source: TenantStrategySource): number | undefined => {
  const summaryValue = source.dealSheetSummary?.blendedRate;
  if (typeof summaryValue === "number" && !Number.isNaN(summaryValue)) return summaryValue;
  return resolveOptionalNumber(source.monthlyEconomics?.blendedRate);
};

const resolveUnamortizedAt36 = (source: TenantStrategySource): number | undefined => {
  const summaryValue = source.dealSheetSummary?.unamortizedAt36;
  if (typeof summaryValue === "number" && !Number.isNaN(summaryValue)) return summaryValue;

  const monthlyEconomics = source.monthlyEconomics;
  if (!monthlyEconomics) return undefined;
  const months = monthlyEconomics.rentSchedule.months;
  if (months.length === 0) return undefined;
  const targetIndex = Math.min(months.length - 1, 35);
  const schedule = monthlyEconomics.amortization?.schedule ?? [];
  const unamortized = schedule[targetIndex]?.ending_balance;
  return resolveOptionalNumber(unamortized);
};

const resolveAssumptionsLine = (source: TenantStrategySource): string => {
  return source.dealSheetSummary?.assumptionsLine ?? "";
};

const hasTerminationInputs = (source: TenantStrategySource): boolean => {
  const summaryFee = source.dealSheetSummary?.terminationFeeAt36;
  if (typeof summaryFee === "number" && !Number.isNaN(summaryFee)) return true;

  const termination = source.monthlyEconomics?.termination;
  if (!termination) return false;
  if (typeof termination.feeAt36 === "number" && !Number.isNaN(termination.feeAt36)) return true;
  if (typeof termination.feeAtMonth === "function") return true;
  if (
    Array.isArray(termination.feesByMonth) &&
    termination.feesByMonth.some((fee) => typeof fee === "number" && !Number.isNaN(fee))
  ) {
    return true;
  }
  if (typeof termination.penaltyMonths === "number" && !Number.isNaN(termination.penaltyMonths)) return true;
  return false;
};

const TENANT_SCORE_WEIGHTS = {
  npv: 0.7,
  freeRent: 0.15,
  llContribution: 0.1,
  termination: 0.05,
};

const LEVERAGE_THRESHOLDS = {
  concessionHeavyRatio: 0.12,
  rateHeavyDelta: 0.25,
  flexFriendlyRatio: 0.5,
  llOverexposedRatio: 0.1,
  strongTenantPositiveRatio: 0.03,
  strongTenantPositiveMin: 25000,
  concessionValueMin: 25000,
  concessionImpactRatio: 0.6,
};

const MAX_LEVERAGE_FLAGS = 4;

const formatCurrency = (value: number, fractionDigits = 0) => {
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatSignedCurrency = (value: number, fractionDigits = 0) => {
  const sign = value > 0 ? "+" : value < 0 ? "-" : "";
  const formatted = Math.abs(value).toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
  return `${sign}${formatted}`;
};

export function buildTenantStrategySummary(
  analysisResult: TenantStrategySource,
  baseCaseResult: TenantStrategySource
): TenantStrategySummary {
  const totalOccupancyCostNPV = resolveTotalOccupancyCostNPV(analysisResult);
  const freeRentValue = resolveFreeRentValue(analysisResult);
  const llContribution = resolveLlContribution(analysisResult);
  const terminationFee = resolveTerminationFeeAt36(analysisResult);

  const baseTotalOccupancyCostNPV = resolveTotalOccupancyCostNPV(baseCaseResult);
  const baseFreeRentValue = resolveFreeRentValue(baseCaseResult);
  const baseLlContribution = resolveLlContribution(baseCaseResult);
  const baseTerminationFee = resolveTerminationFeeAt36(baseCaseResult);

  const npvChange = totalOccupancyCostNPV - baseTotalOccupancyCostNPV;
  const freeRentChange = freeRentValue - baseFreeRentValue;
  const llContributionChange = llContribution - baseLlContribution;
  const terminationFeeChange = terminationFee - baseTerminationFee;

  const terminationFlexibilityScore =
    totalOccupancyCostNPV > 0
      ? Math.max(0, (1 - terminationFee / totalOccupancyCostNPV) * 100)
      : 0;

  const tenantScore =
    (baseTotalOccupancyCostNPV - totalOccupancyCostNPV) * TENANT_SCORE_WEIGHTS.npv +
    freeRentChange * TENANT_SCORE_WEIGHTS.freeRent +
    llContributionChange * TENANT_SCORE_WEIGHTS.llContribution +
    (baseTerminationFee - terminationFee) * TENANT_SCORE_WEIGHTS.termination;

  const totalNetRent = resolveTotalNetRent(analysisResult);
  const blendedRate = resolveBlendedRate(analysisResult);
  const baseBlendedRate = resolveBlendedRate(baseCaseResult);
  const unamortizedAt36 = resolveUnamortizedAt36(analysisResult);
  const hasAssumptions = resolveAssumptionsLine(analysisResult).trim().length > 0;
  const hasTermination = hasTerminationInputs(analysisResult);

  const concessionHeavy =
    typeof totalNetRent === "number" &&
    totalNetRent > 0 &&
    (freeRentValue + llContribution) / totalNetRent >= LEVERAGE_THRESHOLDS.concessionHeavyRatio;

  const rateHeavy =
    typeof blendedRate === "number" &&
    typeof baseBlendedRate === "number" &&
    blendedRate - baseBlendedRate >= LEVERAGE_THRESHOLDS.rateHeavyDelta &&
    npvChange > 0;

  const flexReference =
    typeof unamortizedAt36 === "number" && unamortizedAt36 > 0
      ? unamortizedAt36
      : llContribution > 0
        ? llContribution
        : undefined;
  const flexFriendly =
    typeof flexReference === "number" &&
    terminationFee <= flexReference * LEVERAGE_THRESHOLDS.flexFriendlyRatio;

  const llOverexposed =
    typeof totalNetRent === "number" &&
    totalNetRent > 0 &&
    llContribution / totalNetRent >= LEVERAGE_THRESHOLDS.llOverexposedRatio;

  const lowTransparency = !hasAssumptions || !hasTermination;

  const leverageFlags = [
    lowTransparency ? "Low Transparency" : undefined,
    concessionHeavy ? "Concession Heavy" : undefined,
    rateHeavy ? "Rate Heavy" : undefined,
    flexFriendly ? "Flex Friendly" : undefined,
    llOverexposed ? "LL Overexposed" : undefined,
  ].filter(Boolean) as string[];

  const strongTenantPositive =
    npvChange < 0 &&
    (Math.abs(npvChange) >= LEVERAGE_THRESHOLDS.strongTenantPositiveMin ||
      (baseTotalOccupancyCostNPV > 0 &&
        Math.abs(npvChange) / baseTotalOccupancyCostNPV >=
          LEVERAGE_THRESHOLDS.strongTenantPositiveRatio));

  const concessionValue = freeRentValue + llContribution;
  const concessionValueDelta = freeRentChange + llContributionChange;
  const concessionsDriveValue =
    concessionHeavy ||
    (concessionValueDelta >= LEVERAGE_THRESHOLDS.concessionValueMin &&
      Math.abs(npvChange) <= concessionValueDelta * LEVERAGE_THRESHOLDS.concessionImpactRatio);

  const talkingPoint = strongTenantPositive
    ? `Cuts tenant NPV by ${formatCurrency(Math.abs(npvChange))} vs base while keeping LL cost change to ${formatSignedCurrency(llContributionChange)}.`
    : concessionsDriveValue
      ? `Front-loads ${formatCurrency(concessionValue)} of value (TI/free rent) with only ${formatCurrency(Math.abs(npvChange))} impact on tenant NPV.`
      : `Improves flexibility: termination at month 36 modeled at ${formatCurrency(terminationFee)} (vs ${formatCurrency(baseTerminationFee)} base).`;

  const watchOut = lowTransparency
    ? "Assumptions or termination inputs missing; validate before negotiating."
    : undefined;

  return {
    totalOccupancyCostNPV,
    freeRentValue,
    llContribution,
    terminationFlexibilityScore,
    deltaVsBase: {
      npvChange,
      freeRentChange,
      llContributionChange,
      terminationFeeChange,
    },
    tenantScore,
    leverageFlags: leverageFlags.slice(0, MAX_LEVERAGE_FLAGS),
    talkingPoint,
    watchOut,
  };
}
