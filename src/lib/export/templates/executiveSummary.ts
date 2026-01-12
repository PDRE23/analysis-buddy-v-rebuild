/**
 * Executive Summary Export Template
 * 1-page summary with key metrics only
 */

import type { AnalysisData, CashflowLine } from "../pdf-export";
import type { ExportConfig } from "../types";

export interface ExecutiveSummaryData {
  analysis: AnalysisData;
  cashflow: CashflowLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
  config: ExportConfig;
}

/**
 * Generate executive summary content
 */
export function generateExecutiveSummary(data: ExecutiveSummaryData): {
  title: string;
  sections: Array<{
    title: string;
    content: string | Array<{ label: string; value: string }>;
  }>;
} {
  const { analysis, cashflow, metrics, config } = data;
  
  const year1Cashflow = cashflow[0] || { net_cash_flow: 0, subtotal: 0 };
  const totalValue = cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);

  return {
    title: `${analysis.tenant_name} - Executive Summary`,
    sections: [
      {
        title: "Key Metrics",
        content: [
          { label: "Effective Rate", value: `$${metrics.effectiveRate.toFixed(2)}/SF/yr` },
          { label: "Net Present Value", value: `$${metrics.npv.toLocaleString()}` },
          { label: "Total Lease Value", value: `$${totalValue.toLocaleString()}` },
          { label: "RSF", value: `${analysis.rsf.toLocaleString()}` },
          { label: "Lease Term", value: `${metrics.totalYears} years` },
        ],
      },
      {
        title: "Year 1 Summary",
        content: [
          { label: "Year 1 Total", value: `$${year1Cashflow.subtotal.toLocaleString()}` },
          { label: "Year 1 Net Cash Flow", value: `$${year1Cashflow.net_cash_flow.toLocaleString()}` },
        ],
      },
      {
        title: "Property Details",
        content: [
          { label: "Market", value: analysis.market || "N/A" },
          { label: "Lease Type", value: analysis.lease_type },
          { label: "Commencement", value: new Date(analysis.key_dates.commencement).toLocaleDateString() },
          { label: "Expiration", value: new Date(analysis.key_dates.expiration).toLocaleDateString() },
        ],
      },
      {
        title: "Concessions",
        content: [
          { 
            label: "TI Allowance", 
            value: analysis.concessions?.ti_allowance_psf 
              ? `$${analysis.concessions.ti_allowance_psf.toFixed(2)}/SF ($${((analysis.concessions.ti_allowance_psf * analysis.rsf)).toLocaleString()} total)`
              : "None"
          },
          { 
            label: "Moving Allowance", 
            value: analysis.concessions?.moving_allowance 
              ? `$${analysis.concessions.moving_allowance.toLocaleString()}`
              : "None"
          },
          { 
            label: "Free Rent", 
            // Calculate free rent months from concessions/abatement
            value: (() => {
              const freeRentMonths = analysis.concessions?.abatement_type === "at_commencement"
                ? (analysis.concessions?.abatement_free_rent_months || 0)
                : (analysis.concessions?.abatement_periods?.reduce((sum, p) => sum + p.free_rent_months, 0) || 0);
              return freeRentMonths > 0 ? `${freeRentMonths} months` : "None";
            })()
          },
        ],
      },
    ],
  };
}

