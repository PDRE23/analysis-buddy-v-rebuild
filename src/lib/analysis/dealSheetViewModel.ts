import type { DealSheetSummary } from "./dealSheetSummary";

export type DealSheetViewModel = {
  termMonthsLabel: string;
  totalNetRentFormatted: string;
  freeRentValueFormatted: string;
  blendedRateFormatted: string;
  npvRentFormatted: string;
  totalLlCostFormatted: string;
  unamortizedAt36Formatted: string;
  terminationFeeAt36Formatted: string;
  assumptionsLine: string;
  footnote: string;
};

const EMPTY_DISPLAY = "—";
export const DEAL_SHEET_FOOTNOTE = "Month 36 or last month if shorter term";

const formatCurrency = (value: number | undefined, fractionDigits = 0): string => {
  if (value === undefined || Number.isNaN(value)) return EMPTY_DISPLAY;
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });
};

const formatRate = (value: number | undefined): string => {
  if (value === undefined || Number.isNaN(value)) return EMPTY_DISPLAY;
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}/RSF/Yr`;
};

const formatTermMonths = (value: number | undefined): string => {
  if (value === undefined || Number.isNaN(value) || value <= 0) return EMPTY_DISPLAY;
  const formatted = value.toLocaleString();
  const suffix = value === 1 ? "month" : "months";
  return `${formatted} ${suffix}`;
};

export function buildDealSheetViewModel(summary: DealSheetSummary): DealSheetViewModel {
  return {
    termMonthsLabel: formatTermMonths(summary.termMonths),
    totalNetRentFormatted: formatCurrency(summary.totalNetRent),
    freeRentValueFormatted: formatCurrency(summary.freeRentValue),
    blendedRateFormatted: formatRate(summary.blendedRate),
    npvRentFormatted: formatCurrency(summary.npvRent),
    totalLlCostFormatted: formatCurrency(summary.totalLlCost),
    unamortizedAt36Formatted: formatCurrency(summary.unamortizedAt36),
    terminationFeeAt36Formatted: formatCurrency(summary.terminationFeeAt36),
    assumptionsLine: summary.assumptionsLine,
    footnote: DEAL_SHEET_FOOTNOTE,
  };
}
