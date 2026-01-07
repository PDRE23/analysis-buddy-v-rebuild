/**
 * Comparison Report Export Template
 * Side-by-side proposal comparison
 */

import type { AnalysisData, CashflowLine } from "../pdf-export";
import type { ExportConfig } from "../types";
import type { Proposal } from "@/types";

import { buildAnnualCashflow } from "../../../calculations/cashflow-engine";
import { effectiveRentPSF } from "../../../calculations/metrics-engine";
import { npv } from "../../../calculations/metrics-engine";


export interface ComparisonReportData {
  proposals: Proposal[];
  analysis: AnalysisData;
  config: ExportConfig;
}

/**
 * Generate comparison report content
 */
export function generateComparisonReport(data: ComparisonReportData): {
  title: string;
  proposals: Array<{
    label: string;
    side: string;
    metrics: {
      effectiveRate: number;
      npv: number;
      totalValue: number;
      year1Cashflow: number;
    };
    rentSchedule: Array<{
      period: string;
      rent: number;
      freeRent: number;
    }>;
    concessions: {
      tiAllowance: number;
      movingAllowance: number;
      freeRentMonths: number;
    };
  }>;
  recommendation?: {
    bestOption: string;
    reasoning: string;
  };
} {
  const { proposals, analysis } = data;

  const proposalData = proposals.map((proposal) => {
    const cashflow = buildAnnualCashflow(proposal.meta);
    const years = cashflow.length;
    const effectiveRate = effectiveRentPSF(cashflow, proposal.meta.rsf, years);
    const npvValue = npv(cashflow, proposal.meta.cashflow_settings.discount_rate);
    const totalValue = cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);
    const year1Cashflow = cashflow[0]?.net_cash_flow || 0;

    return {
      label: proposal.label || proposal.side,
      side: proposal.side,
      metrics: {
        effectiveRate,
        npv: npvValue,
        totalValue,
        year1Cashflow,
      },
      rentSchedule: proposal.meta.rent_schedule.map((row, index) => ({
        period: `${index + 1}`,
        rent: row.rent_psf,
        freeRent: row.free_rent_months || 0,
      })),
      concessions: {
        tiAllowance: (proposal.meta.concessions?.ti_allowance_psf || 0) * proposal.meta.rsf,
        movingAllowance: proposal.meta.concessions?.moving_allowance || 0,
        freeRentMonths: proposal.meta.rent_schedule[0]?.free_rent_months || 0,
      },
    };
  });

  // Determine best option (highest effective rate)
  const bestOption = proposalData.reduce((best, current) =>
    current.metrics.effectiveRate > best.metrics.effectiveRate ? current : best
  );

  return {
    title: `${analysis.tenant_name} - Proposal Comparison`,
    proposals: proposalData,
    recommendation: {
      bestOption: bestOption.label,
      reasoning: `Highest effective rate at $${bestOption.metrics.effectiveRate.toFixed(2)}/SF/yr with NPV of $${bestOption.metrics.npv.toLocaleString()}`,
    },
  };
}

