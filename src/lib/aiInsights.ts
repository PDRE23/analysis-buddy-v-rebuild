/**
 * AI-Powered Insights
 * Deal health scoring, proposal recommendations, missing information alerts
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import { daysSinceUpdate } from "./types/deal";

export type DealHealthStatus = "healthy" | "needs_attention" | "at_risk";

export interface DealHealthScore {
  score: number; // 0-100
  status: DealHealthStatus;
  factors: Array<{
    factor: string;
    impact: number; // -10 to +10
    description: string;
  }>;
  recommendations: string[];
}

/**
 * Calculate deal health score
 */
export function calculateDealHealthScore(deal: Deal): DealHealthScore {
  const factors: DealHealthScore["factors"] = [];
  let score = 100;

  // Factor 1: Days since last update
  const daysStale = daysSinceUpdate(deal);
  if (daysStale > 14) {
    const impact = -Math.min(20, daysStale - 14);
    score += impact;
    factors.push({
      factor: "Update Frequency",
      impact,
      description: `No updates in ${daysStale} days`,
    });
  } else if (daysStale <= 3) {
    score += 5;
    factors.push({
      factor: "Update Frequency",
      impact: 5,
      description: "Recently updated",
    });
  }

  // Factor 2: Stage progression speed
  const createdAt = new Date(deal.createdAt);
  const updatedAt = new Date(deal.updatedAt);
  const daysInPipeline = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  
  // Expected progression: Lead -> Qualification (3 days), Qualification -> Proposal (7 days), etc.
  const stageWeights: Record<string, number> = {
    "Lead": 0,
    "Qualification": 1,
    "Proposal": 2,
    "Negotiation": 3,
    "Closing": 4,
    "Closed Won": 5,
    "Closed Lost": 5,
  };
  
  const currentStageWeight = stageWeights[deal.stage] || 0;
  const expectedDays = currentStageWeight * 7; // 7 days per stage on average
  
  if (daysInPipeline > expectedDays * 1.5) {
    const impact = -10;
    score += impact;
    factors.push({
      factor: "Stage Progression",
      impact,
      description: `Slower than expected progression`,
    });
  } else if (daysInPipeline < expectedDays * 0.7 && currentStageWeight > 0) {
    score += 5;
    factors.push({
      factor: "Stage Progression",
      impact: 5,
      description: "Faster than expected progression",
    });
  }

  // Factor 3: Data completeness
  const missingFields: string[] = [];
  if (!deal.expectedCloseDate) missingFields.push("Expected close date");
  if (!deal.estimatedValue) missingFields.push("Estimated value");
  if (deal.analysisIds.length === 0) missingFields.push("Analysis/proposal");
  
  if (missingFields.length > 0) {
    const impact = -missingFields.length * 5;
    score += impact;
    factors.push({
      factor: "Data Completeness",
      impact,
      description: `Missing: ${missingFields.join(", ")}`,
    });
  } else {
    score += 10;
    factors.push({
      factor: "Data Completeness",
      impact: 10,
      description: "All key fields completed",
    });
  }

  // Factor 4: Client engagement (based on activities)
  const recentActivities = deal.activities.filter(
    (activity) => {
      const activityDate = new Date(activity.timestamp);
      const daysAgo = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }
  ).length;

  if (recentActivities === 0 && deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
    const impact = -10;
    score += impact;
    factors.push({
      factor: "Client Engagement",
      impact,
      description: "No recent activity",
    });
  } else if (recentActivities >= 3) {
    score += 5;
    factors.push({
      factor: "Client Engagement",
      impact: 5,
      description: "High recent activity",
    });
  }

  // Factor 5: Priority
  if (deal.priority === "High") {
    score += 5;
    factors.push({
      factor: "Priority",
      impact: 5,
      description: "High priority deal",
    });
  } else if (deal.priority === "Low" && deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
    score -= 5;
    factors.push({
      factor: "Priority",
      impact: -5,
      description: "Low priority deal",
    });
  }

  // Clamp score to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine status
  let status: DealHealthStatus;
  if (score >= 80) {
    status = "healthy";
  } else if (score >= 50) {
    status = "needs_attention";
  } else {
    status = "at_risk";
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (daysStale > 7) {
    recommendations.push(`Update deal status - last updated ${daysStale} days ago`);
  }
  
  if (missingFields.length > 0) {
    recommendations.push(`Complete missing fields: ${missingFields.join(", ")}`);
  }
  
  if (recentActivities === 0 && deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
    recommendations.push("Schedule follow-up with client");
  }
  
  if (deal.analysisIds.length === 0 && (deal.stage === "Proposal" || deal.stage === "Negotiation")) {
    recommendations.push("Create analysis/proposal for this deal");
  }

  return {
    score: Math.round(score),
    status,
    factors,
    recommendations,
  };
}

/**
 * Get proposal recommendations based on market data
 */
export interface ProposalRecommendation {
  type: "rent_rate" | "free_rent" | "ti_allowance" | "term" | "concessions";
  message: string;
  currentValue?: string;
  suggestedValue?: string;
  reasoning: string;
}

export function getProposalRecommendations(
  analysis: AnalysisMeta,
  marketData?: {
    avgRentPSF?: number;
    avgFreeRentMonths?: number;
    avgTIAllowance?: number;
    avgTerm?: number;
  }
): ProposalRecommendation[] {
  const recommendations: ProposalRecommendation[] = [];

  if (!marketData) {
    return recommendations;
  }

  // Check rent rate
  const firstYearRent = analysis.rent_schedule[0]?.rent_psf || 0;
  if (marketData.avgRentPSF && firstYearRent > 0) {
    const diff = ((firstYearRent - marketData.avgRentPSF) / marketData.avgRentPSF) * 100;
    
    if (diff > 10) {
      recommendations.push({
        type: "rent_rate",
        message: "Rent is significantly above market average",
        currentValue: `$${firstYearRent.toFixed(2)}/SF/yr`,
        suggestedValue: `$${marketData.avgRentPSF.toFixed(2)}/SF/yr`,
        reasoning: `Market average is $${marketData.avgRentPSF.toFixed(2)}/SF/yr. Consider ${diff > 20 ? "reducing" : "adjusting"} rent rate for better competitiveness.`,
      });
    } else if (diff < -10) {
      recommendations.push({
        type: "rent_rate",
        message: "Rent is below market average",
        currentValue: `$${firstYearRent.toFixed(2)}/SF/yr`,
        suggestedValue: `$${marketData.avgRentPSF.toFixed(2)}/SF/yr`,
        reasoning: `Market average is $${marketData.avgRentPSF.toFixed(2)}/SF/yr. You may be leaving money on the table.`,
      });
    }
  }

  // Check free rent
  const freeRentMonths = analysis.rent_schedule[0]?.free_rent_months || 0;
  if (marketData.avgFreeRentMonths !== undefined) {
    if (freeRentMonths > marketData.avgFreeRentMonths * 1.5) {
      recommendations.push({
        type: "free_rent",
        message: "Free rent is above market average",
        currentValue: `${freeRentMonths} months`,
        suggestedValue: `${marketData.avgFreeRentMonths} months`,
        reasoning: `Market average is ${marketData.avgFreeRentMonths} months free rent. Consider reducing if needed.`,
      });
    }
  }

  // Check TI allowance
  const tiAllowance = analysis.concessions?.ti_allowance_psf || 0;
  if (marketData.avgTIAllowance && tiAllowance > 0) {
    const diff = ((tiAllowance - marketData.avgTIAllowance) / marketData.avgTIAllowance) * 100;
    
    if (diff > 20) {
      recommendations.push({
        type: "ti_allowance",
        message: "TI allowance is above market average",
        currentValue: `$${tiAllowance.toFixed(2)}/SF`,
        suggestedValue: `$${marketData.avgTIAllowance.toFixed(2)}/SF`,
        reasoning: `Market average is $${marketData.avgTIAllowance.toFixed(2)}/SF. Consider reducing if needed.`,
      });
    }
  }

  return recommendations;
}

/**
 * Detect missing information in analysis
 */
export interface MissingInformationAlert {
  field: string;
  severity: "error" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export function detectMissingInformation(analysis: AnalysisMeta): MissingInformationAlert[] {
  const alerts: MissingInformationAlert[] = [];

  // Critical missing fields
  if (!analysis.tenant_name || analysis.tenant_name.trim() === "") {
    alerts.push({
      field: "tenant_name",
      severity: "error",
      message: "Tenant name is required",
    });
  }

  if (!analysis.market || analysis.market.trim() === "") {
    alerts.push({
      field: "market",
      severity: "error",
      message: "Market is required",
    });
  }

  if (analysis.rsf <= 0) {
    alerts.push({
      field: "rsf",
      severity: "error",
      message: "RSF must be greater than 0",
    });
  }

  if (analysis.rent_schedule.length === 0) {
    alerts.push({
      field: "rent_schedule",
      severity: "error",
      message: "At least one rent schedule period is required",
    });
  }

  // Warning-level missing fields
  if (!analysis.concessions?.ti_allowance_psf && !analysis.concessions?.moving_allowance) {
    alerts.push({
      field: "concessions",
      severity: "warning",
      message: "No concessions specified",
      suggestion: "Consider adding TI allowance or moving allowance if applicable",
    });
  }

  if (!analysis.operating.est_op_ex_psf || analysis.operating.est_op_ex_psf <= 0) {
    alerts.push({
      field: "operating",
      severity: "warning",
      message: "Operating expenses not specified",
      suggestion: "Estimate operating expenses for accurate cashflow analysis",
    });
  }

  // Info-level suggestions
  if (!analysis.rent_schedule[0]?.free_rent_months) {
    alerts.push({
      field: "free_rent",
      severity: "info",
      message: "No free rent period specified",
      suggestion: "Consider adding free rent months if negotiating concessions",
    });
  }

  return alerts;
}

/**
 * Detect timeline conflicts
 */
export interface TimelineWarning {
  type: "conflict" | "warning" | "info";
  message: string;
  suggestion?: string;
}

export function detectTimelineConflicts(analysis: AnalysisMeta): TimelineWarning[] {
  const warnings: TimelineWarning[] = [];
  
  const commencement = new Date(analysis.key_dates.commencement);
  const rentStart = new Date(analysis.key_dates.rent_start);
  const expiration = new Date(analysis.key_dates.expiration);

  // Check if rent start is before commencement
  if (rentStart < commencement) {
    warnings.push({
      type: "conflict",
      message: "Rent start date is before commencement date",
      suggestion: "Rent start should be on or after commencement date",
    });
  }

  // Check if expiration is before commencement
  if (expiration < commencement) {
    warnings.push({
      type: "conflict",
      message: "Expiration date is before commencement date",
      suggestion: "Expiration must be after commencement",
    });
  }

  // Check if rent start is more than 6 months after commencement
  const monthsDiff = (rentStart.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 30);
  if (monthsDiff > 6) {
    warnings.push({
      type: "warning",
      message: `Rent start is ${Math.round(monthsDiff)} months after commencement`,
      suggestion: "Consider if this delay is intentional",
    });
  }

  // Check if lease term is unusually short or long
  const termYears = (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
  if (termYears < 1) {
    warnings.push({
      type: "warning",
      message: "Lease term is less than 1 year",
      suggestion: "Verify this is correct",
    });
  } else if (termYears > 20) {
    warnings.push({
      type: "info",
      message: "Lease term is over 20 years",
      suggestion: "Very long-term lease - ensure all terms are properly documented",
    });
  }

  // Check if commencement is in the past
  const now = new Date();
  if (commencement < now) {
    warnings.push({
      type: "info",
      message: "Commencement date is in the past",
      suggestion: "Update dates if this is a new proposal",
    });
  }

  // Check if commencement is soon (within 30 days)
  const daysUntilCommencement = (commencement.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (daysUntilCommencement > 0 && daysUntilCommencement <= 30) {
    warnings.push({
      type: "warning",
      message: `Commencement date is in ${Math.round(daysUntilCommencement)} days`,
      suggestion: "Ensure all documents and preparations are ready",
    });
  }

  return warnings;
}

