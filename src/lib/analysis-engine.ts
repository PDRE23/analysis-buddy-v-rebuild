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

import { buildAnnualCashflow } from "./calculations/cashflow-engine";
import { npv, effectiveRentPSF } from "./calculations/metrics-engine";
import { calculateLeaseTermYears } from "./leaseTermCalculations";

export interface AnalysisResult {
  cashflow: AnnualLine[];
  years: number;
  metrics: {
    npv: number;
    effectiveRentPSF: number;
  };
}

/**
 * Analyze a lease by computing cashflow and key metrics
 * 
 * @param input - The analysis metadata containing lease terms and settings
 * @returns Analysis result with cashflow lines and computed metrics
 */
export function analyzeLease(input: AnalysisMeta): AnalysisResult {
  // Build annual cashflow
  const cashflow = buildAnnualCashflow(input);
  
  // Calculate lease term years for effective rent calculation
  const years = calculateLeaseTermYears(input);
  
  // Compute key metrics
  const discountRate = input.cashflow_settings.discount_rate;
  const npvValue = npv(cashflow, discountRate);
  const effectiveRentPSFValue = effectiveRentPSF(cashflow, input.rsf, years);
  
  // Return structured result
  return {
    cashflow,
    years,
    metrics: {
      npv: npvValue,
      effectiveRentPSF: effectiveRentPSFValue,
    },
  };
}

