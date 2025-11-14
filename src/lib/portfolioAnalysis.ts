/**
 * Portfolio Analysis
 * Analyze multiple deals together
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";

export interface PortfolioMetrics {
  totalPipelineValue: number;
  totalDeals: number;
  activeDeals: number;
  averageDealSize: number;
  medianDealSize: number;
  totalRSF: number;
  averageRSF: number;
  marketDistribution: Record<string, number>;
  propertyTypeDistribution: Record<string, number>;
  stageDistribution: Record<string, number>;
  clientDistribution: Record<string, number>;
  geographicDistribution: Record<string, number>;
  concentrationRisk: {
    topClientPercent: number;
    topMarketPercent: number;
    herfindahlIndex: number; // Market concentration (0-1, higher = more concentrated)
  };
}

/**
 * Calculate portfolio metrics
 */
export function calculatePortfolioMetrics(
  deals: Deal[],
  analyses?: Map<string, AnalysisMeta>
): PortfolioMetrics {
  const activeDeals = deals.filter(
    d => d.status === "Active" && d.stage !== "Closed Won" && d.stage !== "Closed Lost"
  );

  const totalPipelineValue = activeDeals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);
  const dealSizes = activeDeals.map(d => d.estimatedValue || 0).filter(v => v > 0);
  const averageDealSize = dealSizes.length > 0
    ? dealSizes.reduce((sum, v) => sum + v, 0) / dealSizes.length
    : 0;
  
  const sortedSizes = [...dealSizes].sort((a, b) => a - b);
  const medianDealSize = sortedSizes.length > 0
    ? sortedSizes[Math.floor(sortedSizes.length / 2)]
    : 0;

  // Calculate RSF totals
  let totalRSF = 0;
  if (analyses) {
    activeDeals.forEach(deal => {
      deal.analysisIds.forEach(analysisId => {
        const analysis = analyses.get(analysisId);
        if (analysis) {
          totalRSF += analysis.rsf;
        }
      });
    });
  } else {
    totalRSF = activeDeals.reduce((sum, deal) => sum + (deal.rsf || 0), 0);
  }
  const averageRSF = activeDeals.length > 0 ? totalRSF / activeDeals.length : 0;

  // Distribution calculations
  const marketDistribution: Record<string, number> = {};
  const propertyTypeDistribution: Record<string, number> = {};
  const stageDistribution: Record<string, number> = {};
  const clientDistribution: Record<string, number> = {};
  const geographicDistribution: Record<string, number> = {};

  activeDeals.forEach(deal => {
    // Market
    if (deal.propertyCity && deal.propertyState) {
      const market = `${deal.propertyCity}, ${deal.propertyState}`;
      marketDistribution[market] = (marketDistribution[market] || 0) + (deal.estimatedValue || 0);
    }

    // Property type (from analyses if available)
    if (analyses) {
      deal.analysisIds.forEach(analysisId => {
        const analysis = analyses.get(analysisId);
        if (analysis?.market) {
          // Property type would need to be stored in deal or analysis
          // For now, we'll use a placeholder
        }
      });
    }

    // Stage
    stageDistribution[deal.stage] = (stageDistribution[deal.stage] || 0) + (deal.estimatedValue || 0);

    // Client
    if (deal.clientCompany) {
      clientDistribution[deal.clientCompany] = (clientDistribution[deal.clientCompany] || 0) + (deal.estimatedValue || 0);
    }

    // Geographic
    if (deal.propertyState) {
      geographicDistribution[deal.propertyState] = (geographicDistribution[deal.propertyState] || 0) + (deal.estimatedValue || 0);
    }
  });

  // Concentration risk
  const clientValues = Object.values(clientDistribution).sort((a, b) => b - a);
  const topClientPercent = totalPipelineValue > 0 && clientValues.length > 0
    ? (clientValues[0] / totalPipelineValue) * 100
    : 0;

  const marketValues = Object.values(marketDistribution).sort((a, b) => b - a);
  const topMarketPercent = totalPipelineValue > 0 && marketValues.length > 0
    ? (marketValues[0] / totalPipelineValue) * 100
    : 0;

  // Herfindahl Index (sum of squared market shares)
  const herfindahlIndex = totalPipelineValue > 0
    ? Object.values(marketDistribution).reduce((sum, value) => {
        const share = value / totalPipelineValue;
        return sum + (share * share);
      }, 0)
    : 0;

  return {
    totalPipelineValue,
    totalDeals: deals.length,
    activeDeals: activeDeals.length,
    averageDealSize,
    medianDealSize,
    totalRSF,
    averageRSF,
    marketDistribution,
    propertyTypeDistribution,
    stageDistribution,
    clientDistribution,
    geographicDistribution,
    concentrationRisk: {
      topClientPercent,
      topMarketPercent,
      herfindahlIndex,
    },
  };
}

/**
 * Portfolio trends over time
 */
export interface PortfolioTrend {
  date: string;
  totalValue: number;
  dealCount: number;
  winRate: number;
  averageDealSize: number;
}

export function calculatePortfolioTrends(
  deals: Deal[],
  months: number = 12
): PortfolioTrend[] {
  const trends: PortfolioTrend[] = [];
  const now = new Date();

  for (let i = months - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

    // Get deals created before this month
    const dealsUpToMonth = deals.filter(d => {
      const created = new Date(d.createdAt);
      return created <= date;
    });

    // Get deals closed this month
    const closedThisMonth = deals.filter(d => {
      if (d.stage !== "Closed Won" && d.stage !== "Closed Lost") return false;
      const updated = new Date(d.updatedAt);
      return (
        updated.getFullYear() === date.getFullYear() &&
        updated.getMonth() === date.getMonth()
      );
    });

    const wonThisMonth = closedThisMonth.filter(d => d.stage === "Closed Won").length;
    const winRate = closedThisMonth.length > 0
      ? (wonThisMonth / closedThisMonth.length) * 100
      : 0;

    const activeDeals = dealsUpToMonth.filter(
      d => d.status === "Active" && d.stage !== "Closed Won" && d.stage !== "Closed Lost"
    );
    const totalValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
    const averageDealSize = activeDeals.length > 0
      ? totalValue / activeDeals.length
      : 0;

    trends.push({
      date: dateStr,
      totalValue,
      dealCount: activeDeals.length,
      winRate,
      averageDealSize,
    });
  }

  return trends;
}

/**
 * Diversification analysis
 */
export interface DiversificationAnalysis {
  marketDiversification: {
    score: number; // 0-100, higher = more diversified
    concentration: string; // "Highly concentrated", "Moderate", "Well diversified"
    recommendations: string[];
  };
  clientDiversification: {
    score: number;
    concentration: string;
    recommendations: string[];
  };
  geographicDiversification: {
    score: number;
    concentration: string;
    recommendations: string[];
  };
}

export function analyzeDiversification(metrics: PortfolioMetrics): DiversificationAnalysis {
  // Market diversification
  const marketCount = Object.keys(metrics.marketDistribution).length;
  const marketScore = Math.min(100, marketCount * 10); // 10 points per market, max 100
  const marketConcentration = metrics.concentrationRisk.herfindahlIndex > 0.25
    ? "Highly concentrated"
    : metrics.concentrationRisk.herfindahlIndex > 0.15
    ? "Moderate"
    : "Well diversified";

  const marketRecommendations: string[] = [];
  if (metrics.concentrationRisk.topMarketPercent > 40) {
    marketRecommendations.push(`Top market represents ${metrics.concentrationRisk.topMarketPercent.toFixed(1)}% of portfolio. Consider diversifying.`);
  }
  if (marketCount < 3) {
    marketRecommendations.push("Consider expanding to additional markets for better diversification.");
  }

  // Client diversification
  const clientCount = Object.keys(metrics.clientDistribution).length;
  const clientScore = Math.min(100, clientCount * 5); // 5 points per client, max 100
  const clientConcentration = metrics.concentrationRisk.topClientPercent > 30
    ? "Highly concentrated"
    : metrics.concentrationRisk.topClientPercent > 15
    ? "Moderate"
    : "Well diversified";

  const clientRecommendations: string[] = [];
  if (metrics.concentrationRisk.topClientPercent > 30) {
    clientRecommendations.push(`Top client represents ${metrics.concentrationRisk.topClientPercent.toFixed(1)}% of portfolio. Consider diversifying client base.`);
  }

  // Geographic diversification
  const stateCount = Object.keys(metrics.geographicDistribution).length;
  const geographicScore = Math.min(100, stateCount * 15); // 15 points per state, max 100
  const geographicConcentration = stateCount < 2
    ? "Highly concentrated"
    : stateCount < 4
    ? "Moderate"
    : "Well diversified";

  const geographicRecommendations: string[] = [];
  if (stateCount < 2) {
    geographicRecommendations.push("Portfolio is concentrated in one state. Consider geographic expansion.");
  }

  return {
    marketDiversification: {
      score: Math.round(marketScore),
      concentration: marketConcentration,
      recommendations: marketRecommendations,
    },
    clientDiversification: {
      score: Math.round(clientScore),
      concentration: clientConcentration,
      recommendations: clientRecommendations,
    },
    geographicDiversification: {
      score: Math.round(geographicScore),
      concentration: geographicConcentration,
      recommendations: geographicRecommendations,
    },
  };
}

