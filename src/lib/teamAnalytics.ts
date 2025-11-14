/**
 * Team Analytics
 * Calculate team performance metrics
 */

import type { Deal } from "./types/deal";
import { daysSinceUpdate } from "./types/deal";

export interface TeamMetrics {
  totalPipelineValue: number;
  activeDeals: number;
  winRate: number;
  wins: number;
  losses: number;
  totalClosed: number;
  avgDealCycleDays: number;
  conversionRate: number;
  stageDistribution: Record<string, number>;
}

/**
 * Calculate team-wide metrics
 */
export function calculateTeamMetrics(
  deals: Deal[],
  teamMembers: Array<{ id: string; name: string }> = []
): TeamMetrics {
  const activeDeals = deals.filter(
    d => d.status === "Active" && d.stage !== "Closed Won" && d.stage !== "Closed Lost"
  );

  const closedDeals = deals.filter(
    d => d.stage === "Closed Won" || d.stage === "Closed Lost"
  );

  const wonDeals = deals.filter(d => d.stage === "Closed Won");
  const lostDeals = deals.filter(d => d.stage === "Closed Lost");

  // Calculate total pipeline value
  const totalPipelineValue = activeDeals.reduce((sum, deal) => {
    return sum + (deal.estimatedValue || 0);
  }, 0);

  // Calculate win rate
  const totalClosed = wonDeals.length + lostDeals.length;
  const winRate = totalClosed > 0 ? (wonDeals.length / totalClosed) * 100 : 0;

  // Calculate average deal cycle time
  const cycleTimes = closedDeals.map(deal => {
    const created = new Date(deal.createdAt);
    const updated = new Date(deal.updatedAt);
    return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  const avgDealCycleDays = cycleTimes.length > 0
    ? cycleTimes.reduce((sum, days) => sum + days, 0) / cycleTimes.length
    : 0;

  // Calculate conversion rate (Lead -> Proposal)
  const leads = deals.filter(d => d.stage === "Lead").length;
  const proposals = deals.filter(d => d.stage === "Proposal").length;
  const conversionRate = leads > 0 ? (proposals / leads) * 100 : 0;

  // Stage distribution
  const stageDistribution: Record<string, number> = {};
  deals.forEach(deal => {
    stageDistribution[deal.stage] = (stageDistribution[deal.stage] || 0) + 1;
  });

  return {
    totalPipelineValue,
    activeDeals: activeDeals.length,
    winRate,
    wins: wonDeals.length,
    losses: lostDeals.length,
    totalClosed,
    avgDealCycleDays: Math.round(avgDealCycleDays),
    conversionRate,
    stageDistribution,
  };
}

/**
 * Calculate individual broker metrics
 */
export interface BrokerMetrics {
  brokerId: string;
  brokerName: string;
  totalDeals: number;
  activeDeals: number;
  closedDeals: number;
  wins: number;
  losses: number;
  totalValue: number;
  avgDealSize: number;
  winRate: number;
  avgCycleDays: number;
  responseTimeHours: number; // Average response time
}

export function calculateBrokerMetrics(
  deals: Deal[],
  brokerId: string,
  brokerName: string
): BrokerMetrics {
  const brokerDeals = deals.filter(d => d.assignedTo === brokerId);
  const activeDeals = brokerDeals.filter(
    d => d.status === "Active" && d.stage !== "Closed Won" && d.stage !== "Closed Lost"
  );
  const closedDeals = brokerDeals.filter(
    d => d.stage === "Closed Won" || d.stage === "Closed Lost"
  );
  const wins = brokerDeals.filter(d => d.stage === "Closed Won").length;
  const losses = brokerDeals.filter(d => d.stage === "Closed Lost").length;

  const totalValue = brokerDeals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);
  const avgDealSize = brokerDeals.length > 0 ? totalValue / brokerDeals.length : 0;

  const winRate = closedDeals.length > 0 ? (wins / closedDeals.length) * 100 : 0;

  const cycleTimes = closedDeals.map(deal => {
    const created = new Date(deal.createdAt);
    const updated = new Date(deal.updatedAt);
    return (updated.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
  });
  const avgCycleDays = cycleTimes.length > 0
    ? cycleTimes.reduce((sum, days) => sum + days, 0) / cycleTimes.length
    : 0;

  // Calculate average response time (simplified - would use actual activity timestamps)
  const responseTimeHours = 24; // Placeholder

  return {
    brokerId,
    brokerName,
    totalDeals: brokerDeals.length,
    activeDeals: activeDeals.length,
    closedDeals: closedDeals.length,
    wins,
    losses,
    totalValue,
    avgDealSize,
    winRate,
    avgCycleDays: Math.round(avgCycleDays),
    responseTimeHours,
  };
}

