/**
 * Deal Scoring & Probability
 * Calculate deal quality score and win probability
 */

import type { Deal } from "./types/deal";
import { daysSinceUpdate } from "./types/deal";
import { calculateDealHealthScore } from "./aiInsights";
import { cache, cacheKeys } from "./cache";

export interface DealScore {
  overallScore: number; // 0-100
  winProbability: number; // 0-100
  riskLevel: "low" | "medium" | "high";
  factors: Array<{
    name: string;
    score: number;
    weight: number;
    impact: number;
  }>;
}

/**
 * Calculate comprehensive deal score
 */
export function calculateDealScore(deal: Deal, allDeals: Deal[]): DealScore {
  const cacheKey = cacheKeys.dealScore(
    deal.id,
    deal.updatedAt || deal.activities[deal.activities.length - 1]?.timestamp || "unknown"
  );
  const cachedScore = cache.get<DealScore>(cacheKey);
  if (cachedScore) {
    return cachedScore;
  }

  const factors: DealScore["factors"] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // Factor 1: Health Score (weight: 30%)
  const healthScore = calculateDealHealthScore(deal);
  const healthWeight = 0.3;
  factors.push({
    name: "Deal Health",
    score: healthScore.score,
    weight: healthWeight,
    impact: healthScore.score * healthWeight,
  });
  weightedSum += healthScore.score * healthWeight;
  totalWeight += healthWeight;

  // Factor 2: Stage Progression (weight: 20%)
  const stageWeights: Record<string, number> = {
    "Lead": 20,
    "Qualification": 30,
    "Proposal": 50,
    "Negotiation": 70,
    "Closing": 90,
    "Closed Won": 100,
    "Closed Lost": 0,
  };
  const stageScore = stageWeights[deal.stage] || 0;
  const stageWeight = 0.2;
  factors.push({
    name: "Stage Progression",
    score: stageScore,
    weight: stageWeight,
    impact: stageScore * stageWeight,
  });
  weightedSum += stageScore * stageWeight;
  totalWeight += stageWeight;

  // Factor 3: Data Completeness (weight: 15%)
  let completenessScore = 0;
  if (deal.clientName) completenessScore += 20;
  if (deal.clientCompany) completenessScore += 10;
  if (deal.propertyAddress) completenessScore += 10;
  if (deal.rsf) completenessScore += 15;
  if (deal.estimatedValue) completenessScore += 15;
  if (deal.expectedCloseDate) completenessScore += 10;
  if (deal.analysisIds.length > 0) completenessScore += 20;
  const completenessWeight = 0.15;
  factors.push({
    name: "Data Completeness",
    score: completenessScore,
    weight: completenessWeight,
    impact: completenessScore * completenessWeight,
  });
  weightedSum += completenessScore * completenessWeight;
  totalWeight += completenessWeight;

  // Factor 4: Client Engagement (weight: 15%)
  const recentActivities = deal.activities.filter(
    (activity) => {
      const activityDate = new Date(activity.timestamp);
      const daysAgo = (Date.now() - activityDate.getTime()) / (1000 * 60 * 60 * 24);
      return daysAgo <= 7;
    }
  ).length;
  const engagementScore = Math.min(100, recentActivities * 25);
  const engagementWeight = 0.15;
  factors.push({
    name: "Client Engagement",
    score: engagementScore,
    weight: engagementWeight,
    impact: engagementScore * engagementWeight,
  });
  weightedSum += engagementScore * engagementWeight;
  totalWeight += engagementWeight;

  // Factor 5: Historical Win Rate (weight: 10%)
  const similarDeals = allDeals.filter(d => {
    if (d.stage === "Closed Won" || d.stage === "Closed Lost") {
      // Match by client company or similar RSF
      if (deal.clientCompany && d.clientCompany) {
        return d.clientCompany.toLowerCase() === deal.clientCompany.toLowerCase();
      }
      if (deal.rsf && d.rsf) {
        const rsfDiff = Math.abs(d.rsf - deal.rsf) / deal.rsf;
        return rsfDiff < 0.2; // Within 20%
      }
    }
    return false;
  });
  const winRate = similarDeals.length > 0
    ? (similarDeals.filter(d => d.stage === "Closed Won").length / similarDeals.length) * 100
    : 50; // Default to 50% if no history
  const historicalWeight = 0.1;
  factors.push({
    name: "Historical Win Rate",
    score: winRate,
    weight: historicalWeight,
    impact: winRate * historicalWeight,
  });
  weightedSum += winRate * historicalWeight;
  totalWeight += historicalWeight;

  // Factor 6: Deal Value (weight: 10%)
  const valueScore = deal.estimatedValue
    ? Math.min(100, (deal.estimatedValue / 1000000) * 10) // Scale: $10M = 100
    : 50; // Default if no value
  const valueWeight = 0.1;
  factors.push({
    name: "Deal Value",
    score: valueScore,
    weight: valueWeight,
    impact: valueScore * valueWeight,
  });
  weightedSum += valueScore * valueWeight;
  totalWeight += valueWeight;

  // Calculate overall score
  const overallScore = totalWeight > 0 ? weightedSum / totalWeight : 0;

  // Calculate win probability
  const winProbability = calculateWinProbability(deal, overallScore, allDeals);

  // Determine risk level
  let riskLevel: "low" | "medium" | "high";
  if (overallScore >= 70 && winProbability >= 60) {
    riskLevel = "low";
  } else if (overallScore >= 40 && winProbability >= 30) {
    riskLevel = "medium";
  } else {
    riskLevel = "high";
  }

  const score: DealScore = {
    overallScore: Math.round(overallScore),
    winProbability: Math.round(winProbability),
    riskLevel,
    factors,
  };
  cache.set(cacheKey, score, 2 * 60 * 1000);
  return score;
}

/**
 * Calculate deal score with caching support
 */
export function getDealScore(deal: Deal, allDeals: Deal[]): DealScore {
  const cacheKey = cacheKeys.dealScore(
    deal.id,
    deal.updatedAt || deal.activities[deal.activities.length - 1]?.timestamp || "unknown"
  );
  const cachedScore = cache.get<DealScore>(cacheKey);
  if (cachedScore) {
    return cachedScore;
  }

  const score = calculateDealScore(deal, allDeals);
  cache.set(cacheKey, score, 2 * 60 * 1000); // cache for 2 minutes
  return score;
}

/**
 * Calculate win probability
 */
function calculateWinProbability(
  deal: Deal,
  dealScore: number,
  allDeals: Deal[]
): number {
  // Base probability from deal score
  let probability = dealScore * 0.6; // 60% weight from score

  // Adjust based on stage
  const stageMultipliers: Record<string, number> = {
    "Lead": 0.1,
    "Qualification": 0.2,
    "Proposal": 0.4,
    "Negotiation": 0.7,
    "Closing": 0.9,
    "Closed Won": 1.0,
    "Closed Lost": 0.0,
  };
  const stageMultiplier = stageMultipliers[deal.stage] || 0.1;
  probability = probability * 0.4 + (stageMultiplier * 100 * 0.6);

  // Adjust based on historical win rate for similar deals
  const similarWon = allDeals.filter(d => {
    if (d.stage !== "Closed Won") return false;
    if (deal.clientCompany && d.clientCompany) {
      return d.clientCompany.toLowerCase() === deal.clientCompany.toLowerCase();
    }
    return false;
  }).length;
  const similarTotal = allDeals.filter(d => {
    if (d.stage === "Closed Won" || d.stage === "Closed Lost") {
      if (deal.clientCompany && d.clientCompany) {
        return d.clientCompany.toLowerCase() === deal.clientCompany.toLowerCase();
      }
    }
    return false;
  }).length;
  
  if (similarTotal > 0) {
    const historicalWinRate = (similarWon / similarTotal) * 100;
    probability = probability * 0.7 + historicalWinRate * 0.3;
  }

  // Adjust based on days since update
  const daysStale = daysSinceUpdate(deal);
  if (daysStale > 14) {
    probability *= 0.8; // Reduce by 20% if stale
  } else if (daysStale <= 3) {
    probability *= 1.1; // Increase by 10% if recent
  }

  return Math.max(0, Math.min(100, probability));
}

/**
 * Get risk assessment
 */
export interface RiskAssessment {
  level: "low" | "medium" | "high";
  factors: Array<{
    factor: string;
    severity: "low" | "medium" | "high";
    description: string;
    recommendation: string;
  }>;
}

export function assessDealRisk(deal: Deal, dealScore: DealScore): RiskAssessment {
  const factors: RiskAssessment["factors"] = [];

  // Check days since update
  const daysStale = daysSinceUpdate(deal);
  if (daysStale > 14) {
    factors.push({
      factor: "Stale Deal",
      severity: "high",
      description: `Deal hasn't been updated in ${daysStale} days`,
      recommendation: "Schedule follow-up with client immediately",
    });
  }

  // Check data completeness
  if (!deal.estimatedValue) {
    factors.push({
      factor: "Missing Value",
      severity: "medium",
      description: "Estimated value not set",
      recommendation: "Set estimated value for better tracking",
    });
  }

  if (deal.analysisIds.length === 0 && deal.stage === "Proposal") {
    factors.push({
      factor: "Missing Analysis",
      severity: "high",
      description: "No analysis/proposal created",
      recommendation: "Create analysis for this deal",
    });
  }

  // Check win probability
  if (dealScore.winProbability < 30) {
    factors.push({
      factor: "Low Win Probability",
      severity: "high",
      description: `Win probability is only ${dealScore.winProbability}%`,
      recommendation: "Review deal strategy and client engagement",
    });
  }

  // Check stage progression speed
  const createdAt = new Date(deal.createdAt);
  const updatedAt = new Date(deal.updatedAt);
  const daysInPipeline = (updatedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
  const expectedDays = getExpectedDaysForStage(deal.stage);
  
  if (daysInPipeline > expectedDays * 1.5) {
    factors.push({
      factor: "Slow Progression",
      severity: "medium",
      description: `Deal has been in ${deal.stage} for longer than expected`,
      recommendation: "Review blockers and accelerate timeline",
    });
  }

  // Determine overall risk level
  const highRiskCount = factors.filter(f => f.severity === "high").length;
  const mediumRiskCount = factors.filter(f => f.severity === "medium").length;
  
  let level: "low" | "medium" | "high";
  if (highRiskCount > 0) {
    level = "high";
  } else if (mediumRiskCount > 1 || dealScore.winProbability < 40) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    level,
    factors,
  };
}

function getExpectedDaysForStage(stage: string): number {
  const expected: Record<string, number> = {
    "Lead": 3,
    "Qualification": 7,
    "Proposal": 14,
    "Negotiation": 21,
    "Closing": 14,
  };
  return expected[stage] || 30;
}

