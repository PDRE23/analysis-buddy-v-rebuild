/**
 * Deal-Analysis Synchronization Utilities
 * Handles bidirectional sync between deals and lease analyses
 */

import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "@/types";
import { calculateCommission } from "./commission";

/**
 * Create a new Analysis from Deal data (auto-populate fields)
 */
export function createAnalysisFromDeal(
  deal: Deal,
  analysisTemplate: Partial<AnalysisMeta>
): Partial<AnalysisMeta> {
  return {
    ...analysisTemplate,
    tenant_name: deal.clientName,
    market: `${deal.property.address}, ${deal.property.city}, ${deal.property.state}`,
    rsf: deal.rsf,
    key_dates: {
      commencement: deal.expectedCloseDate || new Date().toISOString(),
      rent_start: deal.expectedCloseDate || new Date().toISOString(),
      expiration: deal.expectedCloseDate 
        ? calculateExpiration(deal.expectedCloseDate, deal.leaseTerm)
        : calculateExpiration(new Date().toISOString(), deal.leaseTerm),
      ...(analysisTemplate.key_dates || {}),
    },
  };
}

/**
 * Create a new Deal from Analysis data (auto-populate fields)
 */
export function createDealFromAnalysis(
  analysis: AnalysisMeta,
  dealTemplate: Partial<Deal>
): Partial<Deal> {
  // Parse market string to extract address components
  const marketParts = (analysis.market || "").split(",").map(s => s.trim());
  const address = marketParts[0] || "";
  const city = marketParts[1] || "";
  const state = marketParts[2] || "";
  
  return {
    ...dealTemplate,
    clientName: analysis.tenant_name || "New Client",
    clientCompany: analysis.tenant_name || "",
    property: {
      address: address,
      city: city,
      state: state,
      zipCode: "",
      ...(dealTemplate.property || {}),
    },
    rsf: analysis.rsf,
    leaseTerm: calculateLeaseTerm(
      analysis.key_dates.commencement, 
      analysis.key_dates.expiration
    ),
    expectedCloseDate: analysis.key_dates.commencement,
    // Link this analysis
    analysisIds: [analysis.id],
  };
}

/**
 * Sync Analysis data to Deal (update deal with analysis info)
 */
export function syncAnalysisToDeal(
  deal: Deal, 
  analyses: AnalysisMeta[]
): Deal {
  const updatedDeal = { ...deal };
  
  // Get all analyses linked to this deal
  const linkedAnalyses = analyses.filter(a => 
    deal.analysisIds.includes(a.id)
  );
  
  if (linkedAnalyses.length === 0) {
    return updatedDeal;
  }
  
  // Calculate total commission from all linked analyses
  let totalCommission = 0;
  linkedAnalyses.forEach(analysis => {
    if (analysis.commissionStructure) {
      const { total } = calculateCommission(analysis, analysis.commissionStructure);
      totalCommission += total;
    }
  });
  
  updatedDeal.estimatedValue = totalCommission;
  
  // Use the first analysis as the primary source for shared fields
  const primaryAnalysis = linkedAnalyses[0];
  
  // Sync shared fields
  updatedDeal.clientName = primaryAnalysis.tenant_name || updatedDeal.clientName;
  updatedDeal.clientCompany = primaryAnalysis.tenant_name || updatedDeal.clientCompany;
  updatedDeal.rsf = primaryAnalysis.rsf || updatedDeal.rsf;
  
  // Parse market to update property info
  if (primaryAnalysis.market) {
    const marketParts = primaryAnalysis.market.split(",").map(s => s.trim());
    updatedDeal.property = {
      ...updatedDeal.property,
      address: marketParts[0] || updatedDeal.property.address,
      city: marketParts[1] || updatedDeal.property.city,
      state: marketParts[2] || updatedDeal.property.state,
    };
  }
  
  // Update lease term from primary analysis
  const termMonths = calculateLeaseTerm(
    primaryAnalysis.key_dates.commencement,
    primaryAnalysis.key_dates.expiration
  );
  updatedDeal.leaseTerm = termMonths;
  updatedDeal.expectedCloseDate = primaryAnalysis.key_dates.commencement;
  
  return updatedDeal;
}

/**
 * Sync Deal data to Analysis (update analysis with deal info)
 */
export function syncDealToAnalysis(
  analysis: AnalysisMeta, 
  deal: Deal
): AnalysisMeta {
  return {
    ...analysis,
    tenant_name: deal.clientName,
    market: `${deal.property.address}, ${deal.property.city}, ${deal.property.state}`,
    rsf: deal.rsf,
    key_dates: {
      ...analysis.key_dates,
      commencement: deal.expectedCloseDate || analysis.key_dates.commencement,
      expiration: deal.expectedCloseDate
        ? calculateExpiration(deal.expectedCloseDate, deal.leaseTerm)
        : analysis.key_dates.expiration,
    },
  };
}

/**
 * Calculate lease term in months from start and end dates
 */
function calculateLeaseTerm(start: string, end: string): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = endDate.getTime() - startDate.getTime();
  const diffMonths = Math.round(diffTime / (1000 * 60 * 60 * 24 * 30.44)); // Average days per month
  return Math.max(0, diffMonths);
}

/**
 * Calculate expiration date from commencement and term
 */
function calculateExpiration(commencement: string, termMonths: number): string {
  const date = new Date(commencement);
  date.setMonth(date.getMonth() + termMonths);
  return date.toISOString();
}

/**
 * Check if analysis is linked to a deal
 */
export function isAnalysisLinkedToDeal(
  analysisId: string, 
  deals: Deal[]
): Deal | undefined {
  return deals.find(deal => deal.analysisIds.includes(analysisId));
}

/**
 * Get all analyses for a deal
 */
export function getAnalysesForDeal(
  deal: Deal,
  allAnalyses: AnalysisMeta[]
): AnalysisMeta[] {
  return allAnalyses.filter(a => deal.analysisIds.includes(a.id));
}

/**
 * Link an analysis to a deal
 */
export function linkAnalysisToDeal(deal: Deal, analysisId: string): Deal {
  if (deal.analysisIds.includes(analysisId)) {
    return deal; // Already linked
  }
  
  return {
    ...deal,
    analysisIds: [...deal.analysisIds, analysisId],
  };
}

/**
 * Unlink an analysis from a deal
 */
export function unlinkAnalysisFromDeal(deal: Deal, analysisId: string): Deal {
  return {
    ...deal,
    analysisIds: deal.analysisIds.filter(id => id !== analysisId),
  };
}

