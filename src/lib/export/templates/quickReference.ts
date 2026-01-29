/**
 * Quick Reference Card Export Template
 * Wallet-sized summary card
 */

import type { AnalysisMeta } from "@/types/analysis";
import type { AnalysisData, CashflowLine } from "../pdf-export";
import type { ExportConfig } from "../types";
import { getDerivedRentStartDate } from "../../utils";

export interface QuickReferenceData {
  analysis: AnalysisData;
  cashflow: CashflowLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
  config: ExportConfig;
  contactInfo?: {
    brokerName?: string;
    brokerEmail?: string;
    phone?: string;
  };
}

/**
 * Generate quick reference card content
 */
export function generateQuickReference(data: QuickReferenceData): {
  title: string;
  tenantName: string;
  propertyAddress: string;
  keyNumbers: Array<{ label: string; value: string }>;
  keyDates: Array<{ label: string; value: string }>;
  contactInfo?: {
    brokerName?: string;
    brokerEmail?: string;
    phone?: string;
  };
} {
  const { analysis, cashflow, metrics, contactInfo } = data;
  const derivedRentStart = getDerivedRentStartDate(analysis as AnalysisMeta);
  
  const year1Total = cashflow[0]?.subtotal || 0;
  const totalValue = cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);

  return {
    title: "Quick Reference",
    tenantName: analysis.tenant_name,
    propertyAddress: analysis.market || "N/A",
    keyNumbers: [
      { label: "Effective Rate", value: `$${metrics.effectiveRate.toFixed(2)}/SF/yr` },
      { label: "RSF", value: `${analysis.rsf.toLocaleString()}` },
      { label: "Year 1 Total", value: `$${year1Total.toLocaleString()}` },
      { label: "Total Value", value: `$${totalValue.toLocaleString()}` },
      { label: "NPV", value: `$${metrics.npv.toLocaleString()}` },
    ],
    keyDates: [
      { label: "Commencement", value: new Date(analysis.key_dates.commencement).toLocaleDateString() },
      { label: "Rent Start", value: derivedRentStart ? new Date(derivedRentStart).toLocaleDateString() : "N/A" },
      { label: "Expiration", value: new Date(analysis.key_dates.expiration).toLocaleDateString() },
    ],
    contactInfo,
  };
}

