/**
 * Analysis Engine - Orchestration Layer
 * 
 * This module provides a unified interface for lease analysis by orchestrating
 * the cashflow and metrics calculation engines.
 * 
 * This is a read-only orchestration layer - no calculation logic here.
 * All calculations are delegated to the respective engines.
 */

import type { AnalysisMeta, AnnualLine } from "@/types";
import type { AnalysisAssumptionsSummary, ScenarioEconomicsAssumptions } from "./analysis/assumptions";
import type { MonthlyEconomics, ScenarioEconomicsInputs } from "./analysis/scenarioEconomics";
import type { NormalizedBaseMeta } from "./analysis";
import type { DealSheetSummary } from "./analysis/dealSheetSummary";
import type { TenantStrategySummary } from "./analysis/tenantStrategy";

import { buildAssumptionsSummary } from "./analysis/assumptions";
import { buildDealSheetSummary } from "./analysis/dealSheetSummary";
import { buildAnnualCashflow } from "./calculations/cashflow-engine";
import { npv, effectiveRentPSF } from "./calculations/metrics-engine";
import { normalizeAnalysis } from "./analysis";
import { buildScenarioEconomics } from "./analysis/scenarioEconomics";
import { buildTenantStrategySummary } from "./analysis/tenantStrategy";
import { calculateLeaseTermYears } from "./leaseTermCalculations";

export interface AnalysisResult {
  cashflow: AnnualLine[];
  years: number;
  metrics: {
    npv: number;
    effectiveRentPSF: number;
  };
  monthlyEconomics?: MonthlyEconomics;
  assumptionsSummary?: AnalysisAssumptionsSummary;
  dealSheetSummary?: DealSheetSummary;
  tenantStrategySummary?: TenantStrategySummary;
}

/**
 * Analyze a lease by computing cashflow and key metrics
 * 
 * @param input - The analysis metadata containing lease terms and settings
 * @returns Analysis result with cashflow lines and computed metrics
 */
export function analyzeLease(input: AnalysisMeta, normalized?: NormalizedBaseMeta): AnalysisResult {
  // Build annual cashflow
  const cashflow = buildAnnualCashflow(input, normalized);
  
  // Calculate lease term years for effective rent calculation
  const normalizedTermMonths = normalized?.dates.term_months_total;
  const years = normalizedTermMonths ? normalizedTermMonths / 12 : calculateLeaseTermYears(input);
  
  // Compute key metrics
  const discountRate = input.cashflow_settings.discount_rate;
  const npvValue = npv(cashflow, discountRate);
  const effectiveRentPSFValue = effectiveRentPSF(cashflow, input.rsf, years);

  const normalizedBaseMeta = normalized ?? normalizeAnalysis(input).normalized;
  const assumptions: ScenarioEconomicsAssumptions = {
    discountRateAnnual: input.cashflow_settings.discount_rate,
    amortRateAnnual: input.financing?.interest_rate,
    billingTiming: "advance",
    escalationMode: resolveEscalationMode(input),
    rounding: "none",
  };
  const scenarioInputs: ScenarioEconomicsInputs = {
    rsf: input.rsf,
    rentSchedule: input.rent_schedule,
    rentEscalation: input.rent_escalation,
    concessions: input.concessions,
    transactionCosts: input.transaction_costs,
    financing: input.financing,
    options: input.options,
  };
  const monthlyEconomics = buildScenarioEconomics({
    normalizedBaseMeta,
    scenarioInputs,
    assumptions,
  });
  const assumptionsSummary = buildAssumptionsSummary({ normalized: normalizedBaseMeta, assumptions });
  const dealSheetSummary = buildDealSheetSummary({ monthlyEconomics, assumptionsSummary });
  const tenantStrategySummary = buildTenantStrategySummary(
    { monthlyEconomics, dealSheetSummary },
    { monthlyEconomics, dealSheetSummary }
  );

  // Return structured result
  return {
    cashflow,
    years,
    metrics: {
      npv: npvValue,
      effectiveRentPSF: effectiveRentPSFValue,
    },
    monthlyEconomics,
    assumptionsSummary,
    dealSheetSummary,
    tenantStrategySummary,
  };
}

function resolveEscalationMode(input: AnalysisMeta): ScenarioEconomicsAssumptions["escalationMode"] | undefined {
  if (input.rent_escalation?.escalation_type === "custom") {
    return "custom";
  }
  if (
    input.rent_escalation?.escalation_mode === "amount" ||
    input.rent_escalation?.fixed_escalation_amount !== undefined
  ) {
    return "fixed_amount";
  }
  if (input.rent_escalation?.fixed_escalation_percentage !== undefined) {
    return "fixed_percent";
  }
  return undefined;
}

