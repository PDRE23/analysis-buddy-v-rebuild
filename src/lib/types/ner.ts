/**
 * NER (Net Effective Rent) Analysis Types
 */

export interface NERYear {
  year: number;
  baseRent: number;
  freeRent: number;
  ti: number;
  total: number;
}

export interface NERAnalysis {
  id: string;
  analysisId?: string; // Link to AnalysisMeta
  dealId?: string; // Optional link to deal
  
  // Deal Terms
  baseRentYears1to5: number; // $/RSF
  baseRentYears6toLXD: number; // $/RSF
  monthsFree: number;
  tiNbiValue: number; // $/RSF
  tenantWorkOrder?: number;
  rsf: number;
  termYears: number; // e.g., 11.25
  
  // Discount Rate
  discountRate: number; // e.g., 0.07 for 7%
  
  // Calculated Results (populated by calculations)
  summary?: {
    ner: number;
    nerWithInterest: number;
    startingNER: number;
  };
  yearlyBreakdown?: NERYear[];
  calculations?: {
    total: number;
    average: number;
    npv: number;
    pmt: number;
  };
  startingNERCalc?: {
    amortizedFreeRent: number;
    amortizedTI: number;
    startingRent: number;
    startingNER: number;
  };
}

