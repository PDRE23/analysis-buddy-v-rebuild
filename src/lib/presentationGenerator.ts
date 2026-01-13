/**
 * Presentation Generator
 * Slide generation logic, data transformation for slides
 */

import type { AnalysisMeta, Proposal, AnnualLine } from "@/types";

import { buildAnnualCashflow } from "./calculations/cashflow-engine";
import { effectiveRentPSF } from "./calculations/metrics-engine";
import { npv } from "./calculations/metrics-engine";
import { getFreeRentMonths } from "./utils";

export interface PresentationSlide {
  id: string;
  type: "cover" | "executive-summary" | "property-overview" | "financial-summary" | 
        "rent-schedule" | "cashflow" | "concessions" | "comparison" | "next-steps";
  title: string;
  content: Record<string, unknown>;
}

export interface PresentationData {
  slides: PresentationSlide[];
  proposal: Proposal;
  analysis: AnalysisMeta;
  cashflow: AnnualLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
}

/**
 * Generate presentation slides from proposal data
 */
export function generatePresentationSlides(
  proposal: Proposal,
  analysis: AnalysisMeta,
  cashflow: AnnualLine[]
): PresentationSlide[] {
  const slides: PresentationSlide[] = [];
  const meta = proposal.meta;
  const years = cashflow.length;
  const effectiveRate = effectiveRentPSF(cashflow, meta.rsf, years);
  const npvValue = npv(cashflow, meta.cashflow_settings.discount_rate);
  
  // Slide 1: Cover
  slides.push({
    id: "cover",
    type: "cover",
    title: meta.name,
    content: {
      tenantName: meta.tenant_name,
      propertyAddress: meta.market,
      proposalLabel: proposal.label || proposal.side,
    },
  });
  
  // Slide 2: Executive Summary
  slides.push({
    id: "executive-summary",
    type: "executive-summary",
    title: "Executive Summary",
    content: {
      effectiveRate,
      npv: npvValue,
      rsf: meta.rsf,
      term: years,
      totalValue: cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
    },
  });
  
  // Slide 3: Property Overview
  slides.push({
    id: "property-overview",
    type: "property-overview",
    title: "Property Overview",
    content: {
      market: meta.market,
      rsf: meta.rsf,
      leaseType: meta.lease_type,
      commencement: meta.key_dates.commencement,
      expiration: meta.key_dates.expiration,
    },
  });
  
  // Slide 4: Financial Summary
  const year1Cashflow = cashflow[0] || { net_cash_flow: 0, subtotal: 0 };
  slides.push({
    id: "financial-summary",
    type: "financial-summary",
    title: "Financial Summary",
    content: {
      year1Total: year1Cashflow.subtotal,
      year1NetCashFlow: year1Cashflow.net_cash_flow,
      totalValue: cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
      npv: npvValue,
      effectiveRate,
    },
  });
  
  // Slide 5: Rent Schedule Visual
  slides.push({
    id: "rent-schedule",
    type: "rent-schedule",
    title: "Rent Schedule",
    content: {
      rentSchedule: meta.rent_schedule,
      rsf: meta.rsf,
    },
  });
  
  // Slide 6: Cashflow Chart
  slides.push({
    id: "cashflow",
    type: "cashflow",
    title: "Annual Cashflow",
    content: {
      cashflow,
      effectiveRate,
    },
  });
  
  // Slide 7: Concessions Breakdown
  const totalConcessions = 
    (meta.concessions.ti_allowance_psf || 0) * meta.rsf +
    (meta.concessions.moving_allowance || 0) +
    (meta.concessions.other_credits || 0);
    
  slides.push({
    id: "concessions",
    type: "concessions",
    title: "Concessions & Incentives",
    content: {
      tiAllowance: meta.concessions.ti_allowance_psf || 0,
      tiAllowanceTotal: (meta.concessions.ti_allowance_psf || 0) * meta.rsf,
      movingAllowance: meta.concessions.moving_allowance || 0,
      otherCredits: meta.concessions.other_credits || 0,
      totalConcessions,
    },
  });
  
  // Slide 8: Next Steps
  slides.push({
    id: "next-steps",
    type: "next-steps",
    title: "Next Steps",
    content: {
      keyDates: meta.key_dates,
      actionItems: [
        "Review proposal terms",
        "Schedule follow-up meeting",
        "Provide feedback",
      ],
    },
  });
  
  return slides;
}

/**
 * Generate comparison slides when multiple proposals exist
 */
export function generateComparisonSlides(
  proposals: Proposal[],
  analysis: AnalysisMeta
): PresentationSlide[] {
  const slides: PresentationSlide[] = [];
  
  // Calculate metrics for each proposal
  const proposalMetrics = proposals.map(proposal => {
    const cashflow = buildAnnualCashflow(proposal.meta);
    const years = cashflow.length;
    const effectiveRate = effectiveRentPSF(cashflow, proposal.meta.rsf, years);
    const npvValue = npv(cashflow, proposal.meta.cashflow_settings.discount_rate);
    
    return {
      proposal,
      cashflow,
      effectiveRate,
      npv: npvValue,
      totalValue: cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
    };
  });
  
  // Comparison slide
  slides.push({
    id: "comparison",
    type: "comparison",
    title: "Proposal Comparison",
    content: {
      proposals: proposalMetrics.map(pm => ({
        label: pm.proposal.label || pm.proposal.side,
        side: pm.proposal.side,
        effectiveRate: pm.effectiveRate,
        npv: pm.npv,
        totalValue: pm.totalValue,
        tiAllowance: pm.proposal.meta.concessions.ti_allowance_psf || 0,
        freeRentMonths: getFreeRentMonths(pm.proposal.meta.concessions),
      })),
    },
  });
  
  return slides;
}

