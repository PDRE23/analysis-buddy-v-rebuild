/**
 * Detailed Proposal Export Template
 * Multi-page comprehensive proposal with all details
 */

import type { AnalysisData, CashflowLine } from "../pdf-export";
import type { ExportConfig } from "../types";

export interface DetailedProposalData {
  analysis: AnalysisData;
  cashflow: CashflowLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
  config: ExportConfig;
  proposalSide?: string;
  proposalLabel?: string;
}

/**
 * Generate detailed proposal content structure
 */
export function generateDetailedProposal(data: DetailedProposalData): {
  title: string;
  coverPage: {
    tenantName: string;
    propertyAddress: string;
    proposalLabel?: string;
    date: string;
  };
  sections: Array<{
    title: string;
    type: "overview" | "financial" | "schedule" | "concessions" | "terms" | "cashflow";
    content: unknown;
  }>;
} {
  const { analysis, cashflow, metrics, proposalSide, proposalLabel } = data;
  
  return {
    title: `${analysis.tenant_name} - Detailed Proposal`,
    coverPage: {
      tenantName: analysis.tenant_name,
      propertyAddress: analysis.market || "N/A",
      proposalLabel: proposalLabel || proposalSide,
      date: new Date().toLocaleDateString(),
    },
    sections: [
      {
        title: "Executive Overview",
        type: "overview",
        content: {
          metrics: {
            effectiveRate: metrics.effectiveRate,
            npv: metrics.npv,
            totalYears: metrics.totalYears,
            rsf: analysis.rsf,
          },
        },
      },
      {
        title: "Financial Summary",
        type: "financial",
        content: {
          year1Cashflow: cashflow[0],
          totalValue: cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
          npv: metrics.npv,
        },
      },
      {
        title: "Rent Schedule",
        type: "schedule",
        content: {
          rentSchedule: analysis.rent_schedule,
        },
      },
      {
        title: "Concessions & Incentives",
        type: "concessions",
        content: {
          concessions: analysis.concessions,
          rsf: analysis.rsf,
        },
      },
      {
        title: "Key Terms",
        type: "terms",
        content: {
          keyDates: analysis.key_dates,
          leaseType: analysis.lease_type,
          operating: analysis.operating,
          parking: analysis.parking,
        },
      },
      {
        title: "Annual Cashflow",
        type: "cashflow",
        content: {
          cashflow,
        },
      },
    ],
  };
}

