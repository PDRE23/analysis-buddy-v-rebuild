/**
 * Scenario Analysis Engine
 * 
 * Supports multiple what-if scenarios using analyzeLease() without duplicating any math.
 * This module handles merging base analysis with scenario overrides to create
 * alternative lease scenarios for comparison.
 */

import type { AnalysisMeta } from "@/types";
import type { AnalysisResult } from "./analysis-engine";
import { analyzeLease } from "./analysis-engine";
import { buildTenantStrategySummary, normalizeAnalysis } from "./analysis";

/**
 * Partial overrides for creating scenario variations
 * All fields are optional - only specified fields will override the base
 */
export type ScenarioOverrides = Partial<AnalysisMeta>;

/**
 * Merge base analysis with scenario overrides
 * Handles nested objects explicitly for safe merging
 * Ensures immutability by copying arrays when not overridden
 */
function mergeAnalysisMeta(
  base: AnalysisMeta,
  overrides: ScenarioOverrides
): AnalysisMeta {
  // Start with a shallow copy of base
  const merged: AnalysisMeta = { ...base };

  // Handle top-level primitive overrides
  if (overrides.id !== undefined) merged.id = overrides.id;
  if (overrides.name !== undefined) merged.name = overrides.name;
  if (overrides.status !== undefined) merged.status = overrides.status;
  if (overrides.tenant_name !== undefined) merged.tenant_name = overrides.tenant_name;
  if (overrides.market !== undefined) merged.market = overrides.market;
  if (overrides.rsf !== undefined) merged.rsf = overrides.rsf;
  if (overrides.usf !== undefined) merged.usf = overrides.usf;
  if (overrides.load_factor !== undefined) merged.load_factor = overrides.load_factor;
  if (overrides.lease_type !== undefined) merged.lease_type = overrides.lease_type;
  if (overrides.rep_type !== undefined) merged.rep_type = overrides.rep_type;
  if (overrides.base_year !== undefined) merged.base_year = overrides.base_year;
  if (overrides.notes !== undefined) merged.notes = overrides.notes;
  if (overrides.commissionStructure !== undefined) merged.commissionStructure = overrides.commissionStructure;

  // Handle arrays - copy base arrays to ensure immutability when not overridden
  if (overrides.attachedFiles !== undefined) {
    merged.attachedFiles = overrides.attachedFiles;
  } else {
    merged.attachedFiles = base.attachedFiles ? [...base.attachedFiles] : base.attachedFiles;
  }

  if (overrides.proposals !== undefined) {
    merged.proposals = overrides.proposals;
  } else {
    merged.proposals = base.proposals ? [...base.proposals] : base.proposals;
  }

  // Handle nested objects with explicit merging
  if (overrides.key_dates !== undefined) {
    merged.key_dates = {
      ...base.key_dates,
      ...overrides.key_dates,
    };
  }

  if (overrides.lease_term !== undefined) {
    merged.lease_term = {
      ...base.lease_term,
      ...overrides.lease_term,
    };
  }

  if (overrides.operating !== undefined) {
    merged.operating = {
      ...base.operating,
      ...overrides.operating,
      // Merge escalation_periods array if both exist
      escalation_periods: overrides.operating.escalation_periods !== undefined
        ? overrides.operating.escalation_periods
        : base.operating.escalation_periods,
    };
  }

  if (overrides.rent_schedule !== undefined) {
    // Rent schedule is an array - replace entirely if overridden
    merged.rent_schedule = overrides.rent_schedule;
  } else {
    // Copy base array to ensure immutability
    merged.rent_schedule = [...base.rent_schedule];
  }

  if (overrides.rent_escalation !== undefined) {
    merged.rent_escalation = {
      ...base.rent_escalation,
      ...overrides.rent_escalation,
      // Merge escalation_periods array if both exist
      escalation_periods: overrides.rent_escalation.escalation_periods !== undefined
        ? overrides.rent_escalation.escalation_periods
        : base.rent_escalation?.escalation_periods,
    };
  }

  if (overrides.concessions !== undefined) {
    merged.concessions = {
      ...base.concessions,
      ...overrides.concessions,
      // Merge abatement_periods array if both exist
      abatement_periods: overrides.concessions.abatement_periods !== undefined
        ? overrides.concessions.abatement_periods
        : base.concessions.abatement_periods,
    };
  }

  if (overrides.parking !== undefined) {
    merged.parking = {
      ...base.parking,
      ...overrides.parking,
    };
  }

  if (overrides.transaction_costs !== undefined) {
    merged.transaction_costs = {
      ...base.transaction_costs,
      ...overrides.transaction_costs,
    };
  }

  if (overrides.cashflow_settings !== undefined) {
    merged.cashflow_settings = {
      ...base.cashflow_settings,
      ...overrides.cashflow_settings,
    };
  }

  if (overrides.financing !== undefined) {
    merged.financing = {
      ...base.financing,
      ...overrides.financing,
    };
  }

  if (overrides.options !== undefined) {
    // Options is an array - replace entirely if overridden
    merged.options = overrides.options;
  } else {
    // Copy base array to ensure immutability
    merged.options = base.options ? [...base.options] : base.options;
  }

  return merged;
}

/**
 * Analyze a single scenario by merging base analysis with overrides
 * 
 * @param base - The base analysis metadata
 * @param overrides - Partial overrides to apply for this scenario
 * @returns Analysis result for the scenario
 */
export function analyzeScenario(
  base: AnalysisMeta,
  overrides: ScenarioOverrides
): AnalysisResult {
  // Create merged AnalysisMeta WITHOUT mutating base
  const merged = mergeAnalysisMeta(base, overrides);

  // Call analyzeLease with the merged metadata
  const { normalized } = normalizeAnalysis(merged);
  return analyzeLease(merged, normalized);
}

/**
 * Analyze multiple scenarios from a base analysis
 * 
 * @param base - The base analysis metadata
 * @param scenarios - Array of scenario definitions with name and overrides
 * @returns Array of scenario results with names
 */
export function analyzeScenarios(
  base: AnalysisMeta,
  scenarios: { name: string; overrides: ScenarioOverrides }[]
): { name: string; result: AnalysisResult }[] {
  const results = scenarios.map((scenario) => ({
    name: scenario.name,
    result: analyzeScenario(base, scenario.overrides),
  }));

  if (results.length === 0) return results;
  const baseScenario = results.find(({ name }) => name === "Base Case") ?? results[0];

  return results.map((entry) => ({
    ...entry,
    result: {
      ...entry.result,
      tenantStrategySummary: buildTenantStrategySummary(entry.result, baseScenario.result),
    },
  }));
}
