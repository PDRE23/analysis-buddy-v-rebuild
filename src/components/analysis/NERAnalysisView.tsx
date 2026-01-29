"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisMeta } from "@/types";
import type { NERAnalysis } from "@/lib/types/ner";
import { performNERAnalysis } from "@/lib/nerCalculations";
import { NERSummary } from "./NERSummary";
import { NERYearlyBreakdown } from "./NERYearlyBreakdown";
import { NERDealTerms } from "./NERDealTerms";
import { NERStartingCalculation } from "./NERStartingCalculation";
import { calculateLeaseTermYears } from "@/lib/leaseTermCalculations";

interface NERAnalysisViewProps {
  analysis: AnalysisMeta;
  onSave?: (nerAnalysis: NERAnalysis) => void;
}

export function NERAnalysisView({ analysis, onSave }: NERAnalysisViewProps) {
  // Initialize NER analysis from analysis data
  const [nerData, setNerData] = useState<NERAnalysis>(() => {
    // Try to extract from analysis or use defaults
    const baseRent = analysis.rent_schedule[0]?.rent_psf || 120;
    const termYears = analysis.key_dates.expiration && analysis.key_dates.commencement
      ? calculateLeaseTermYears(analysis)
      : 5;
    
    return {
      id: `ner_${analysis.id}`,
      analysisId: analysis.id,
      baseRentYears1to5: baseRent,
      baseRentYears6toLXD: baseRent * 1.08, // Default escalation
      monthsFree: 0,
      tiNbiValue: analysis.concessions?.ti_allowance_psf || 0,
      rsf: analysis.rsf,
      termYears,
      discountRate: analysis.cashflow_settings?.discount_rate || 0.07,
    };
  });

  // Perform calculations
  const calculatedNER = useMemo(() => {
    return performNERAnalysis(nerData);
  }, [nerData]);

  const handleUpdate = (updates: Partial<NERAnalysis>) => {
    const updated = { ...nerData, ...updates };
    setNerData(updated);
    const calculated = performNERAnalysis(updated);
    if (onSave) {
      onSave(calculated);
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Section */}
      {calculatedNER.summary && (
        <NERSummary summary={calculatedNER.summary} />
      )}

      {/* Deal Terms Input */}
      <NERDealTerms
        nerData={nerData}
        onUpdate={handleUpdate}
      />

      {/* Year-by-Year Breakdown */}
      {calculatedNER.yearlyBreakdown && (
        <NERYearlyBreakdown
          breakdown={calculatedNER.yearlyBreakdown}
          calculations={calculatedNER.calculations}
        />
      )}

      {/* Starting NER Calculation */}
      {calculatedNER.startingNERCalc && (
        <NERStartingCalculation
          calc={calculatedNER.startingNERCalc}
          startingRent={calculatedNER.baseRentYears1to5 * calculatedNER.rsf}
        />
      )}
    </div>
  );
}

