"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, FileDown, Download, Copy, Save, Trash2, ArrowLeft, ChevronRight, AlertCircle, Presentation, Printer } from "lucide-react";
import { nanoid } from "nanoid";
import { storage } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { listAnalysesForUser, upsertAnalysesForUser } from "@/lib/api/analyses";
import { listDealsForUser, upsertDealForUser } from "@/lib/api/deals";
import { dealStorage } from "@/lib/dealStorage";
import { useFormValidation } from "@/hooks/useFormValidation";
import { validateAnalysisMeta, getSmartValidationSummary } from "@/lib/analysisValidation";
import { ConfirmationDialog, ConfirmationRequest } from "@/components/ui/confirmation-dialog";
import { ValidatedInput } from "@/components/ui/validated-input";
import { SectionIndicator, SectionProgressBar } from "@/components/ui/section-indicator";
import { getAllSectionStatuses, getOverallCompletionStatus } from "@/lib/sectionCompletion";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import { ErrorBoundary, useErrorHandler } from "@/components/ErrorBoundary";
import { AsyncErrorBoundary } from "@/components/AsyncErrorBoundary";
import { ClientOnly } from "@/components/ClientOnly";
import { ExportDialog } from "@/components/export/ExportDialog";
import { analyzeLease } from "@/lib/analysis-engine";
import { Textarea } from "@/components/ui/textarea";
import { File, X } from "lucide-react";
import { DuplicateDialog, applyDuplicateOptions } from "@/components/ui/duplicate-dialog";
import type { DuplicateOptions } from "@/components/ui/duplicate-dialog";
import { CommissionCalculator } from "@/components/deals/CommissionCalculator";
import type { CommissionStructure } from "@/lib/commission";
import { exportAnalysis } from "@/lib/export";
import { calculateTIShortfall, calculateEarlyTerminationFee, buildTerminationScenario } from "@/lib/calculations";
import { calculateLandlordYield } from "@/lib/financialModeling";
import type { ExportConfig } from "@/lib/export/types";
import type { AnalysisData, CashflowLine } from "@/lib/export/pdf-export";
import type { Deal } from "@/lib/types/deal";
import { DealLinkDropdown } from "@/components/ui/deal-link-dropdown";
import { 
  syncDealToAnalysis, 
  isAnalysisLinkedToDeal,
  linkAnalysisToDeal,
  unlinkAnalysisFromDeal,
  createDealFromAnalysis,
  syncAnalysisToDeal
} from "@/lib/dealAnalysisSync";
import { NERAnalysisView } from "@/components/analysis/NERAnalysisView";
import { DealTermsSummaryCard } from "@/components/analysis/DealTermsSummaryCard";
import { DetailedCashflowTable } from "@/components/analysis/DetailedCashflowTable";
import { ScenarioComparisonTable } from "@/components/analysis/ScenarioComparisonTable";
import type { NERAnalysis } from "@/lib/types/ner";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { 
  getProposalRecommendations, 
  detectMissingInformation, 
  detectTimelineConflicts 
} from "@/lib/aiInsights";
import { InsightPanel } from "@/components/ui/insight-badge";
import { getMarketBasedSuggestions } from "@/lib/intelligentDefaults";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

/*************************************************
 * Types & Data Model
 *************************************************/

type LeaseType = "FS" | "NNN";

type ProposalSide = "Landlord" | "Tenant";

interface RentRow {
  period_start: string; // ISO date
  period_end: string;   // ISO date
  rent_psf: number;     // Base rent $/RSF/year
  escalation_percentage?: number; // Annual escalation (e.g., 0.03 for 3%)
}

interface AbatementPeriod {
  period_start: string; // ISO date - when abatement starts
  period_end: string;   // ISO date - when abatement ends
  free_rent_months: number; // Number of free rent months in this period
  abatement_applies_to: "base_only" | "base_plus_nnn"; // What the free rent abates
}

interface EscalationPeriod {
  period_start: string; // ISO date - when escalation period starts
  period_end: string;   // ISO date - when escalation period ends
  escalation_percentage: number; // Escalation rate for this period (e.g., 0.03 for 3%)
}

interface OpExEscalationPeriod {
  period_start: string; // ISO date - when escalation period starts
  period_end: string;   // ISO date - when escalation period ends
  escalation_percentage: number; // Escalation rate for this period (e.g., 0.03 for 3%)
}

interface OptionRow {
  type: "Renewal" | "Expansion" | "Termination" | "ROFR" | "ROFO";
  window_open: string; // ISO
  window_close: string; // ISO
  terms?: string;
  // New fields for termination options:
  notice_months?: number; // required notice period
  fee_months_of_rent?: number; // fee = X months of then-current rent
  base_rent_penalty?: number; // additional penalty as $/RSF
  unamortized_costs_included?: boolean; // whether to include unamortized TI/free rent
  termination_interest_rate?: number; // interest rate for PV amortization (default 8%)
}

export interface AnalysisMeta extends Record<string, unknown> {
  id: string;
  name: string;
  status: "Draft" | "Active" | "Final";
  tenant_name: string;
  market: string;
  rsf: number; // rentable square feet
  usf?: number; // usable square feet
  load_factor?: number; // RSF/USF ratio (e.g., 1.15 for 15% load)
  lease_type: LeaseType;
  rep_type?: "Occupier" | "Landlord"; // Rep type for lease analysis
  base_year?: number; // for FS
  key_dates: {
    commencement: string; // ISO date
    rent_start?: string; // ISO date (optional, can be auto-calculated)
    expiration: string; // ISO date (auto-calculated from lease_term)
    early_access?: string; // ISO date
  };
  lease_term?: {
    years: number;
    months: number; // Base months (not including abatement)
    include_abatement_in_term?: boolean; // Toggle to include/exclude abatement months
  };
  operating: {
    est_op_ex_psf?: number;
    escalation_method?: "fixed" | "cpi"; // Keep for backward compatibility
    escalation_value?: number; // e.g., 0.03 for 3% or CPI base
    escalation_cap?: number; // optional cap (e.g., 0.05)
    // New escalation configuration
    escalation_type?: "fixed" | "custom";
    escalation_periods?: OpExEscalationPeriod[]; // For "custom" mode
  };
  rent_schedule: RentRow[];
  // Rent escalation configuration
  rent_escalation?: {
    escalation_type?: "fixed" | "custom";
    fixed_escalation_percentage?: number; // For "fixed" mode
    escalation_periods?: EscalationPeriod[]; // For "custom" mode
  };
  concessions: {
    ti_allowance_psf?: number;
    ti_actual_build_cost_psf?: number; // actual cost to build
    ti_benchmark_cost_psf?: number; // market benchmark
    moving_allowance?: number;
    other_credits?: number;
    // Abatement configuration
    abatement_type?: "at_commencement" | "custom";
    abatement_free_rent_months?: number; // For "at_commencement" mode
    abatement_applies_to?: "base_only" | "base_plus_nnn"; // For "at_commencement" mode
    abatement_periods?: AbatementPeriod[]; // For "custom" mode
  };
  parking?: {
    monthly_rate_per_stall?: number;
    stalls?: number;
    escalation_method?: "fixed" | "cpi";
    escalation_value?: number;
  };
  transaction_costs?: {
    legal_fees?: number;
    brokerage_fees?: number; // separate from commission structure
    due_diligence?: number;
    environmental?: number;
    other?: number;
    total?: number; // calculated sum
  };
  options: OptionRow[];
  cashflow_settings: {
    discount_rate: number; // e.g., 0.08
    granularity: "annual" | "monthly";
  };
  financing?: {
    amortize_ti: boolean; // amortize TI over lease term
    amortize_free_rent: boolean; // amortize free rent over lease term
    amortize_transaction_costs: boolean; // amortize transaction costs
    amortization_method: "straight_line" | "present_value"; // method
    interest_rate?: number; // for PV amortization
  };
  notes?: string;
  attachedFiles?: Array<{
    name: string;
    size: number;
    type: string;
    file: File;
  }>;
  commissionStructure?: CommissionStructure;
  proposals: Proposal[];
}

export interface Proposal {
  id: string;
  side: ProposalSide; // Landlord | Tenant
  label?: string; // e.g., "LL v2", "Tenant Counter 1"
  created_at: string; // ISO
  meta: AnalysisMeta; // each proposal is its own scenario snapshot
}

/*************************************************
 * Utilities
 *************************************************/

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtRate = (v: number | undefined) => `$${(v ?? 0).toFixed(2)}/SF/yr`;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/*************************************************
 * Calc Engine (clean-room)
 *************************************************/

export interface AnnualLine {
  year: number; // calendar year
  base_rent: number; // $ total (not psf)
  abatement_credit: number; // negative number (credit)
  operating: number; // passthroughs modeled
  parking: number; // annualized parking cost
  other_recurring: number; // reserved for future
  ti_shortfall?: number; // TI shortfall (one-time cost, typically year 1)
  transaction_costs?: number; // transaction costs (one-time cost, typically year 1)
  amortized_costs?: number; // amortized deal costs
  subtotal: number; // base_rent + operating + parking + other_recurring
  net_cash_flow: number; // subtotal + abatement_credit + ti_shortfall + transaction_costs + amortized_costs (TI/moving NOT netted in)
}
type AnnualLineNumericKey = Exclude<keyof AnnualLine, "year">;

/** Apply CPI or fixed escalation to a base value for N periods. */
function escalate(value: number, n: number, method: "fixed" | "cpi" = "fixed", rate = 0, cap?: number): number {
  if (n <= 0) return value;
  const effectiveRate = cap !== undefined ? Math.min(rate, cap) : rate;
  const r = Math.max(0, effectiveRate);
  return value * Math.pow(1 + r, n); // CPI treated as provided rate
}

/** Return number of months overlapping [start, end) within [a,b). */
function overlappingMonths(start: Date, end: Date, a: Date, b: Date): number {
  const s = new Date(Math.max(start.getTime(), a.getTime()));
  const e = new Date(Math.min(end.getTime(), b.getTime()));
  if (e <= s) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months + 1); // count partial months
}

export function buildAnnualCashflow(a: AnalysisMeta): AnnualLine[] {
  const commencement = new Date(a.key_dates.commencement);
  const expiration = new Date(a.key_dates.expiration);

  const years: number[] = [];
  for (let y = commencement.getFullYear(); y <= expiration.getFullYear(); y++) years.push(y);

  const lines: AnnualLine[] = years.map((y) => ({
    year: y,
    base_rent: 0,
    abatement_credit: 0,
    operating: 0,
    parking: 0,
    other_recurring: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  }));

  const rsf = a.rsf;
  const addToYear = (year: number, field: AnnualLineNumericKey, amount: number) => {
    const row = lines.find((r) => r.year === year);
    if (row) row[field] = (row[field] as number) + amount;
  };

  // Base Rent & Abatement
  const escalationType = a.rent_escalation?.escalation_type || "fixed";
  const baseRent = a.rent_schedule.length > 0 ? a.rent_schedule[0].rent_psf : 0;
  
  if (escalationType === "fixed") {
    // Fixed escalation: use fixed_escalation_percentage or fall back to rent_schedule escalation_percentage
    const fixedEscalationRate = a.rent_escalation?.fixed_escalation_percentage ?? 
                                 (a.rent_schedule[0]?.escalation_percentage ?? 0);
    
    for (const y of years) {
      const ys = new Date(`${y}-01-01T00:00:00`);
      const ye = new Date(`${y}-12-31T23:59:59`);
      const commencement = new Date(a.key_dates.commencement);
      const expiration = new Date(a.key_dates.expiration);
      
      const months = overlappingMonths(commencement, expiration, ys, ye);
      if (months === 0) continue;
      
      // Calculate escalated rent for this year
      const yearsSinceCommencement = y - commencement.getFullYear();
      const escalatedRate = baseRent * Math.pow(1 + fixedEscalationRate, yearsSinceCommencement);
      const annualRentForMonths = (escalatedRate * rsf * months) / 12;
      addToYear(y, "base_rent", annualRentForMonths);
    }
  } else if (escalationType === "custom" && a.rent_escalation?.escalation_periods) {
    // Custom escalation: use escalation periods to determine rate for each year
    for (const y of years) {
      const ys = new Date(`${y}-01-01T00:00:00`);
      const ye = new Date(`${y}-12-31T23:59:59`);
      const commencement = new Date(a.key_dates.commencement);
      const expiration = new Date(a.key_dates.expiration);
      
      const months = overlappingMonths(commencement, expiration, ys, ye);
      if (months === 0) continue;
      
      // Find the escalation period that applies to this year
      let escalationRate = 0;
      let yearsSincePeriodStart = 0;
      
      // Sort periods by start date to find the applicable one
      const sortedPeriods = [...a.rent_escalation.escalation_periods].sort((a, b) => 
        new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      );
      
      for (const period of sortedPeriods) {
        const periodStart = new Date(period.period_start);
        const periodEnd = new Date(period.period_end);
        
        if (y >= periodStart.getFullYear() && y <= periodEnd.getFullYear()) {
          escalationRate = period.escalation_percentage;
          yearsSincePeriodStart = y - periodStart.getFullYear();
          break;
        }
      }
      
      // Calculate escalated rent for this year
      const escalatedRate = baseRent * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      const annualRentForMonths = (escalatedRate * rsf * months) / 12;
      addToYear(y, "base_rent", annualRentForMonths);
    }
  } else {
    // Fallback: use old rent_schedule structure for backward compatibility
    for (const r of a.rent_schedule) {
      const ps = new Date(r.period_start);
      const pe = new Date(r.period_end);
      const periodStartYear = ps.getFullYear();
      
      for (const y of years) {
        const ys = new Date(`${y}-01-01T00:00:00`);
        const ye = new Date(`${y}-12-31T23:59:59`);
        const months = overlappingMonths(ps, pe, ys, ye);
        if (months === 0) continue;
        
        // Calculate escalated rent for this year within the period
        const yearsInPeriod = y - periodStartYear;
        const escalationRate = r.escalation_percentage ?? 0;
        const escalatedRate = r.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
        const annualRentForMonths = (escalatedRate * rsf * months) / 12;
        addToYear(y, "base_rent", annualRentForMonths);
      }
    }
  }

  // Operating pass-throughs
  // For FS: use est_op_ex_psf if provided, otherwise use base rent rate for opex analysis
  // For NNN: use est_op_ex_psf
  let baseOp: number;
  if (a.lease_type === "FS" && !a.operating.est_op_ex_psf) {
    // If no opex specified for FS, use first period base rent as opex portion
    const firstPeriod = a.rent_schedule[0];
    baseOp = firstPeriod ? firstPeriod.rent_psf : 0;
  } else {
    baseOp = a.operating.est_op_ex_psf ?? 0;
  }
  
  const opExEscalationType = a.operating.escalation_type || "fixed";
  const method = a.operating.escalation_method ?? "fixed"; // Keep for backward compatibility
  const startYear = new Date(a.key_dates.commencement).getFullYear();

  // Apply Abatement - handle both "at_commencement" and "custom" modes
  const abatementType = a.concessions?.abatement_type || "at_commencement";
  const commencementDate = new Date(a.key_dates.commencement);
  const commencementYear = commencementDate.getFullYear();
  const commencementMonth = commencementDate.getMonth(); // 0-11

  for (const y of years) {
    let escalatedOp: number;
    
    if (opExEscalationType === "fixed") {
      // Fixed escalation: use escalation_value
      const value = a.operating.escalation_value ?? 0;
      const cap = a.operating.escalation_cap;
      const yearsSinceStart = y - startYear;
      escalatedOp = escalate(baseOp, yearsSinceStart, method, value, cap);
    } else if (opExEscalationType === "custom" && a.operating.escalation_periods) {
      // Custom escalation: find the applicable period for this year
      let escalationRate = 0;
      let yearsSincePeriodStart = 0;
      
      // Sort periods by start date to find the applicable one
      const sortedPeriods = [...a.operating.escalation_periods].sort((a, b) => 
        new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      );
      
      for (const period of sortedPeriods) {
        const periodStart = new Date(period.period_start);
        const periodEnd = new Date(period.period_end);
        
        if (y >= periodStart.getFullYear() && y <= periodEnd.getFullYear()) {
          escalationRate = period.escalation_percentage;
          yearsSincePeriodStart = y - periodStart.getFullYear();
          break;
        }
      }
      
      // Apply escalation with cap if set
      escalatedOp = baseOp * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      if (a.operating.escalation_cap) {
        const maxEscalated = baseOp * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
        escalatedOp = Math.min(escalatedOp, maxEscalated);
      }
    } else {
      // Fallback: use old escalation_method structure
      const value = a.operating.escalation_value ?? 0;
      const cap = a.operating.escalation_cap;
      const yearsSinceStart = y - startYear;
      escalatedOp = escalate(baseOp, yearsSinceStart, method, value, cap);
    }
    
    if (a.lease_type === "FS") {
      const baseYear = a.base_year ?? startYear;
      const baseYearIndex = Math.max(0, y - baseYear);
      // For FS, calculate base year OpEx using the same escalation logic
      let baseYearOp: number;
      if (opExEscalationType === "fixed") {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, baseYearIndex, method, value, cap);
      } else if (opExEscalationType === "custom" && a.operating.escalation_periods) {
        // Find escalation rate at base year
        const sortedPeriods = [...a.operating.escalation_periods].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        );
        let escalationRate = 0;
        let yearsSincePeriodStart = 0;
        
        for (const period of sortedPeriods) {
          const periodStart = new Date(period.period_start);
          const periodEnd = new Date(period.period_end);
          if (baseYear >= periodStart.getFullYear() && baseYear <= periodEnd.getFullYear()) {
            escalationRate = period.escalation_percentage;
            yearsSincePeriodStart = baseYear - periodStart.getFullYear();
            break;
          }
        }
        baseYearOp = baseOp * Math.pow(1 + escalationRate, yearsSincePeriodStart);
        if (a.operating.escalation_cap) {
          const maxEscalated = baseOp * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
          baseYearOp = Math.min(baseYearOp, maxEscalated);
        }
      } else {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, baseYearIndex, method, value, cap);
      }
      
      // FS passthrough: tenant pays opex increases above base year
      const passthrough = Math.max(0, escalatedOp - baseYearOp) * rsf;
      addToYear(y, "operating", passthrough);
    } else {
      // NNN lease: tenant pays all opex
      const passthrough = escalatedOp * rsf;
      addToYear(y, "operating", passthrough);
    }

    // Apply abatement for this year
    if (abatementType === "at_commencement") {
      // Apply all free rent months at commencement
      const freeMonths = a.concessions?.abatement_free_rent_months ?? 0;
      const abatementAppliesTo = a.concessions?.abatement_applies_to || "base_only";
      
      if (freeMonths > 0 && y === commencementYear) {
        // Find the rent rate at commencement (first period)
        const firstPeriod = a.rent_schedule[0];
        if (firstPeriod) {
          const rentAtCommencement = firstPeriod.rent_psf;
          const monthsInYear = Math.min(freeMonths, 12 - commencementMonth);
          const baseAbateAmt = (rentAtCommencement * rsf * monthsInYear) / 12;
          addToYear(y, "abatement_credit", -baseAbateAmt);
          
          // If abatement applies to base_plus_nnn, also abate operating expenses
          if (abatementAppliesTo === "base_plus_nnn") {
            const opAbateAmt = (baseOp * rsf * monthsInYear) / 12;
            addToYear(y, "abatement_credit", -opAbateAmt);
          }
        }
      }
    } else if (abatementType === "custom" && a.concessions?.abatement_periods) {
      // Apply abatement based on custom periods
      for (const abatementPeriod of a.concessions.abatement_periods) {
        const apStart = new Date(abatementPeriod.period_start);
        const apEnd = new Date(abatementPeriod.period_end);
        const apStartYear = apStart.getFullYear();
        const apEndYear = apEnd.getFullYear();
        
        // Check if this year overlaps with the abatement period
        if (y >= apStartYear && y <= apEndYear) {
          const ys = new Date(`${y}-01-01T00:00:00`);
          const ye = new Date(`${y}-12-31T23:59:59`);
          const overlapStart = apStart > ys ? apStart : ys;
          const overlapEnd = apEnd < ye ? apEnd : ye;
          
          if (overlapStart <= overlapEnd) {
            // Calculate months of overlap
            const overlapMonths = overlappingMonths(overlapStart, overlapEnd, ys, ye);
            const freeMonths = abatementPeriod.free_rent_months;
            
            if (overlapMonths > 0 && freeMonths > 0) {
              // Find the rent rate for this year (from rent schedule)
              let rentRate = 0;
              for (const r of a.rent_schedule) {
                const rStart = new Date(r.period_start);
                const rEnd = new Date(r.period_end);
                if (y >= rStart.getFullYear() && y <= rEnd.getFullYear()) {
                  const yearsInPeriod = y - rStart.getFullYear();
                  const escalationRate = r.escalation_percentage ?? 0;
                  rentRate = r.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
                  break;
                }
              }
              
              // Apply abatement for the overlapping months
              const monthsToAbate = Math.min(freeMonths, overlapMonths);
              const baseAbateAmt = (rentRate * rsf * monthsToAbate) / 12;
              addToYear(y, "abatement_credit", -baseAbateAmt);
              
              // If abatement applies to base_plus_nnn, also abate operating expenses
              if (abatementPeriod.abatement_applies_to === "base_plus_nnn") {
                const opAbateAmt = (escalatedOp * rsf * monthsToAbate) / 12;
                addToYear(y, "abatement_credit", -opAbateAmt);
              }
            }
          }
        }
      }
    }
  }

  // Parking costs (annualized)
  if (a.parking?.monthly_rate_per_stall && a.parking.stalls) {
    const pr = a.parking.monthly_rate_per_stall;
    const stalls = a.parking.stalls;
    const pm = a.parking.escalation_method ?? "fixed";
    const pv = a.parking.escalation_value ?? 0;
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      const escalatedMonthly = escalate(pr, i, pm, pv);
      addToYear(y, "parking", escalatedMonthly * 12 * stalls);
    }
  }

  // TI Shortfall (one-time cost in year 1)
  if (a.concessions.ti_actual_build_cost_psf !== undefined && a.concessions.ti_allowance_psf !== undefined) {
    const shortfall = Math.max(0, (a.concessions.ti_actual_build_cost_psf - (a.concessions.ti_allowance_psf || 0)) * rsf);
    if (shortfall > 0 && lines.length > 0) {
      const firstYearRow = lines.find((r) => r.year === startYear);
      if (firstYearRow) {
        firstYearRow.ti_shortfall = shortfall;
      }
    }
  }

  // Transaction costs (one-time cost in year 1)
  if (a.transaction_costs?.total) {
    const firstYearRow = lines.find((r) => r.year === startYear);
    if (firstYearRow) {
      firstYearRow.transaction_costs = a.transaction_costs.total;
    }
  }

  // Amortized costs (if financing settings enabled)
  if (a.financing) {
    const termYears = (new Date(a.key_dates.expiration).getTime() - new Date(a.key_dates.commencement).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    // Calculate amortized amounts per year
    const amortizedAmounts: number[] = [];
    let totalToAmortize = 0;
    
    if (a.financing.amortize_ti && a.concessions.ti_allowance_psf) {
      totalToAmortize += (a.concessions.ti_allowance_psf * rsf);
    }
    if (a.financing.amortize_free_rent) {
      // Calculate total free rent value from abatement
      let freeRentValue = 0;
      if (a.concessions?.abatement_type === "at_commencement") {
        const freeMonths = a.concessions.abatement_free_rent_months || 0;
        if (freeMonths > 0 && a.rent_schedule.length > 0) {
          const firstPeriod = a.rent_schedule[0];
          freeRentValue = (freeMonths / 12) * (firstPeriod.rent_psf * rsf);
        }
      } else if (a.concessions?.abatement_type === "custom" && a.concessions.abatement_periods) {
        // Sum up all free rent from custom periods
        for (const period of a.concessions.abatement_periods) {
          // Find rent rate for the period
          let rentRate = 0;
          for (const r of a.rent_schedule) {
            const rStart = new Date(r.period_start);
            const rEnd = new Date(r.period_end);
            const periodStart = new Date(period.period_start);
            if (periodStart >= rStart && periodStart <= rEnd) {
              rentRate = r.rent_psf;
              break;
            }
          }
          freeRentValue += (period.free_rent_months / 12) * (rentRate * rsf);
        }
      }
      totalToAmortize += freeRentValue;
    }
    if (a.financing.amortize_transaction_costs && a.transaction_costs?.total) {
      totalToAmortize += a.transaction_costs.total;
    }
    
    if (totalToAmortize > 0 && termYears > 0) {
      if (a.financing.amortization_method === "present_value" && a.financing.interest_rate) {
        // PV-based amortization
        const rate = a.financing.interest_rate;
        const annualPayment = totalToAmortize * (rate / (1 - Math.pow(1 + rate, -termYears)));
        for (let i = 0; i < Math.ceil(termYears); i++) {
          amortizedAmounts.push(annualPayment);
        }
      } else {
        // Straight-line amortization
        const annualAmount = totalToAmortize / termYears;
        for (let i = 0; i < Math.ceil(termYears); i++) {
          amortizedAmounts.push(annualAmount);
        }
      }
      
      // Apply amortized amounts to cashflow
      for (let i = 0; i < Math.min(amortizedAmounts.length, lines.length); i++) {
        const yearIndex = startYear + i;
        const row = lines.find((r) => r.year === yearIndex);
        if (row) {
          row.amortized_costs = amortizedAmounts[i];
        }
      }
    }
  }

  for (const row of lines) {
    row.subtotal = row.base_rent + row.operating + row.parking + row.other_recurring;
    row.net_cash_flow = row.subtotal + row.abatement_credit + (row.ti_shortfall || 0) + (row.transaction_costs || 0) + (row.amortized_costs || 0);
  }

  return lines;
}

export function npv(lines: AnnualLine[], discountRate: number): number {
  return lines.reduce((acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + discountRate, i + 1), 0);
}

export function effectiveRentPSF(lines: AnnualLine[], rsf: number, years: number): number {
  const totalNCF = lines.reduce((acc, r) => acc + r.net_cash_flow, 0);
  const denom = Math.max(1, rsf) * Math.max(1, years);
  return totalNCF / denom;
}

/*************************************************
 * Demo Data
 *************************************************/

const baseScenario = (): AnalysisMeta => ({
  id: nanoid(),
  name: "Demo — 20k RSF Class A",
  status: "Draft",
  tenant_name: "Acme Robotics",
  market: "Miami-Dade",
  rsf: 20000,
  lease_type: "FS",
  base_year: 2026,
  key_dates: {
    commencement: "2026-01-01",
    expiration: "2035-12-31",
  },
  operating: {
    est_op_ex_psf: 18,
    escalation_method: "fixed",
    escalation_value: 0.03,
  },
  rent_schedule: [
    { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 48, escalation_percentage: 0.03 },
    { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 51, escalation_percentage: 0.03 },
    { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 55, escalation_percentage: 0.03 },
  ],
  concessions: { 
    ti_allowance_psf: 75, 
    moving_allowance: 250000,
    abatement_type: "at_commencement",
    abatement_free_rent_months: 6,
    abatement_applies_to: "base_plus_nnn",
  },
  parking: { monthly_rate_per_stall: 180, stalls: 40, escalation_method: "fixed", escalation_value: 0.03 },
  options: [
    { type: "Renewal", window_open: "2034-01-01", window_close: "2034-06-30", terms: "+Fair Market with 3% cap" },
  ],
  cashflow_settings: { discount_rate: 0.08, granularity: "annual" },
  proposals: [],
});

const demoProposals = (): Proposal[] => {
  const ll: Proposal = {
    id: nanoid(),
    side: "Landlord",
    label: "LL v1",
    created_at: new Date().toISOString(),
    meta: { ...baseScenario(), name: "Landlord Proposal v1" },
  };
  const tn: Proposal = {
    id: nanoid(),
    side: "Tenant",
    label: "Tenant Counter 1",
    created_at: new Date().toISOString(),
    meta: {
      ...baseScenario(),
      name: "Tenant Counter v1",
      rent_schedule: [
        { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 47, escalation_percentage: 0.03 },
        { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 50, escalation_percentage: 0.03 },
        { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 54, escalation_percentage: 0.03 },
      ],
      concessions: {
        ...baseScenario().concessions,
        abatement_type: "at_commencement",
        abatement_free_rent_months: 3,
        abatement_applies_to: "base_only",
      },
    },
  };
  return [ll, tn];
};

/*************************************************
 * UI Components
 *************************************************/

function KPI({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card className="rounded-2xl shadow-sm">
      <CardContent className="p-4">
        <div className="text-sm text-muted-foreground" title={hint}>{label}</div>
        <div className="text-2xl font-semibold mt-1">{value}</div>
      </CardContent>
    </Card>
  );
}

const YearTable = React.memo(function YearTable({ lines, rsf, meta }: { lines: AnnualLine[]; rsf: number; meta?: AnalysisMeta }) {
  // Guard against empty or invalid data
  if (!lines || lines.length === 0) {
    return (
      <div className="overflow-auto border rounded-xl p-4 text-center text-muted-foreground">
        No cashflow data available
      </div>
    );
  }
  
  if (!rsf || rsf <= 0) {
    return (
      <div className="overflow-auto border rounded-xl p-4 text-center text-muted-foreground">
        Invalid RSF value
      </div>
    );
  }
  
  // Check if optional columns have any values
  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  
  // Calculate cumulative cashflow and find break-even year
  let cumulative = 0;
  const cumulativeValues: number[] = [];
  let breakEvenYear: number | null = null;
  
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
    if (breakEvenYear === null && cumulative >= 0) {
      breakEvenYear = line.year;
    }
  });
  
  // Calculate totals
  const totals = lines.reduce((acc, r) => ({
    base_rent: acc.base_rent + r.base_rent,
    operating: acc.operating + r.operating,
    parking: acc.parking + (r.parking || 0),
    abatement_credit: acc.abatement_credit + r.abatement_credit,
    ti_shortfall: acc.ti_shortfall + (r.ti_shortfall || 0),
    transaction_costs: acc.transaction_costs + (r.transaction_costs || 0),
    amortized_costs: acc.amortized_costs + (r.amortized_costs || 0),
    subtotal: acc.subtotal + r.subtotal,
    net_cash_flow: acc.net_cash_flow + r.net_cash_flow,
  }), {
    base_rent: 0,
    operating: 0,
    parking: 0,
    abatement_credit: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  });
  
  const avgBaseRentPSF = (rsf * lines.length) > 0 ? totals.base_rent / (rsf * lines.length) : 0;
  const avgNetCFPSF = (rsf * lines.length) > 0 ? totals.net_cash_flow / (rsf * lines.length) : 0;
  
  // Format PSF helper
  const fmtPSF = (value: number) => `$${(value || 0).toFixed(2)}/SF`;
  
  // Calculate start date for each year
  const getYearStartDate = (year: number): string | null => {
    if (!meta?.key_dates?.commencement) return null;
    const commencement = new Date(meta.key_dates.commencement);
    if (isNaN(commencement.getTime())) return null;
    
    // Find the first year in the cashflow
    const firstYear = lines.length > 0 ? lines[0].year : year;
    const yearOffset = year - firstYear;
    
    // Calculate start date for this year
    const startDate = new Date(commencement);
    startDate.setFullYear(commencement.getFullYear() + yearOffset);
    
    // Format as MM/YYYY
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = startDate.getFullYear();
    return `${month}/${yearStr}`;
  };
  
  return (
    <div className="overflow-x-auto border rounded-xl" style={{ maxWidth: '100%' }}>
      <table className="min-w-full text-sm" style={{ minWidth: '800px' }}>
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2">Year</th>
            <th className="text-right p-2" title="Annual base rent">Base Rent</th>
            <th className="text-right p-2" title="Base rent per square foot per year">Base Rent $/SF</th>
            <th className="text-right p-2" title="Operating expense pass-throughs">Op. Pass-Through</th>
            <th className="text-right p-2" title="Annual parking costs">Parking</th>
            <th className="text-right p-2" title="Free rent abatement credit">Abatement (credit)</th>
            {hasTIShortfall && (
              <th className="text-right p-2" title="TI shortfall (tenant pays if actual cost exceeds allowance)">TI Shortfall</th>
            )}
            {hasTransactionCosts && (
              <th className="text-right p-2" title="One-time transaction costs">Trans. Costs</th>
            )}
            {hasAmortizedCosts && (
              <th className="text-right p-2" title="Amortized deal costs (TI, free rent, transaction costs)">Amortized</th>
            )}
            <th className="text-right p-2" title="Subtotal before abatement and costs">Subtotal</th>
            <th className="text-right p-2 font-medium" title="Net cash flow including all adjustments">Net Cash Flow</th>
            <th className="text-right p-2" title="Net cash flow per square foot per year">Net CF $/SF</th>
            <th className="text-right p-2 font-medium" title="Cumulative net cash flow from lease start">Cumulative NCF</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((r, idx) => {
            const isBreakEven = breakEvenYear === r.year;
            const isPositive = r.net_cash_flow >= 0;
            const rowClass = isBreakEven 
              ? "border-t bg-yellow-50 border-yellow-200" 
              : isPositive 
                ? "border-t hover:bg-green-50/50" 
                : "border-t hover:bg-red-50/50";
            
            return (
              <tr key={r.year} className={rowClass}>
                <td className="p-2 font-medium">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const yearNum = idx + 1;
                        const startDate = getYearStartDate(r.year);
                        return startDate ? `YR ${yearNum} (${startDate})` : `YR ${yearNum}`;
                      })()}
                      {isBreakEven && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded" title="Break-even year">
                          BE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{r.year}</div>
                  </div>
                </td>
                <td className="p-2 text-right">{fmtMoney(r.base_rent)}</td>
                <td className="p-2 text-right text-muted-foreground">{fmtPSF(rsf > 0 ? (r.base_rent / rsf) : 0)}</td>
                <td className="p-2 text-right">{fmtMoney(r.operating)}</td>
                <td className="p-2 text-right">{fmtMoney(r.parking)}</td>
                <td className="p-2 text-right text-green-600">{fmtMoney(r.abatement_credit)}</td>
                {hasTIShortfall && (
                  <td className="p-2 text-right text-red-600">
                    {(r.ti_shortfall || 0) !== 0 ? fmtMoney(r.ti_shortfall) : "-"}
                  </td>
                )}
                {hasTransactionCosts && (
                  <td className="p-2 text-right text-red-600">
                    {(r.transaction_costs || 0) !== 0 ? fmtMoney(r.transaction_costs) : "-"}
                  </td>
                )}
                {hasAmortizedCosts && (
                  <td className="p-2 text-right text-red-600">
                    {(r.amortized_costs || 0) !== 0 ? fmtMoney(r.amortized_costs) : "-"}
                  </td>
                )}
                <td className="p-2 text-right">{fmtMoney(r.subtotal)}</td>
                <td className={`p-2 text-right font-medium ${!isPositive ? 'text-red-600' : ''}`}>
                  {fmtMoney(r.net_cash_flow)}
                </td>
                <td className="p-2 text-right text-muted-foreground">{fmtPSF(rsf > 0 ? (r.net_cash_flow / rsf) : 0)}</td>
                <td className={`p-2 text-right font-medium ${(cumulativeValues[idx] || 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmtMoney(cumulativeValues[idx] || 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/70 border-t-2 border-foreground/20">
          <tr className="font-semibold">
            <td className="p-2">TOTAL</td>
            <td className="p-2 text-right">{fmtMoney(totals.base_rent)}</td>
            <td className="p-2 text-right text-muted-foreground">{fmtPSF(avgBaseRentPSF)}</td>
            <td className="p-2 text-right">{fmtMoney(totals.operating)}</td>
            <td className="p-2 text-right">{fmtMoney(totals.parking)}</td>
            <td className="p-2 text-right text-green-600">{fmtMoney(totals.abatement_credit)}</td>
            {hasTIShortfall && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.ti_shortfall)}</td>
            )}
            {hasTransactionCosts && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.transaction_costs)}</td>
            )}
            {hasAmortizedCosts && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.amortized_costs)}</td>
            )}
            <td className="p-2 text-right">{fmtMoney(totals.subtotal)}</td>
            <td className="p-2 text-right">{fmtMoney(totals.net_cash_flow)}</td>
            <td className="p-2 text-right text-muted-foreground">{fmtPSF(avgNetCFPSF)}</td>
            <td className="p-2 text-right">{fmtMoney(cumulativeValues[cumulativeValues.length - 1] || 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});

/*************************************************
 * Main App
 *************************************************/

interface LeaseAnalyzerAppProps {
  initialAnalysisId?: string | null;
  initialDealId?: string | null;
  onBackToPipeline?: () => void;
  onAnalysesChanged?: (analyses: AnalysisMeta[]) => void;
  onDealsChanged?: (deals: Deal[]) => void;
}

export default function LeaseAnalyzerApp({ 
  initialAnalysisId = null, 
  initialDealId = null,
  onBackToPipeline,
  onAnalysesChanged,
  onDealsChanged,
}: LeaseAnalyzerAppProps = {}) {
  const [analyses, setAnalyses] = useState<AnalysisMeta[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialAnalysisId);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [pendingNewAnalysisId, setPendingNewAnalysisId] = useState<string | null>(null);
  const processedPendingIdRef = useRef<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{
    totalAnalyses: number;
    totalProposals: number;
    lastSaved?: string;
    deviceId: string;
    version: string;
    hasBackup: boolean;
  } | null>(null);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  
  // Duplicate dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateSourceAnalysis, setDuplicateSourceAnalysis] = useState<AnalysisMeta | null>(null);
  
  // Error handling
  const { reportError } = useErrorHandler();
  const { user: supabaseUser, supabase } = useAuth();

  const selectedAnalysis = analyses.find((a) => a.id === selectedId) ?? null;
  const selectedProposal = (selectedAnalysis?.proposals as Proposal[])?.find((p) => p.id === selectedProposalId) ?? null;

  // Handle pending new analysis - set selectedId when it appears in the array
  useEffect(() => {
    if (!pendingNewAnalysisId) {
      // Reset ref when pending is cleared
      if (processedPendingIdRef.current) {
        processedPendingIdRef.current = null;
      }
      return;
    }
    
    // Skip if we've already processed this ID
    if (processedPendingIdRef.current === pendingNewAnalysisId) {
      return;
    }
    
    const found = analyses.find((a) => a.id === pendingNewAnalysisId);
    if (found) {
      console.log('🔧 New analysis found in array, setting as selected:', pendingNewAnalysisId);
      // Mark as processed to prevent re-running
      processedPendingIdRef.current = pendingNewAnalysisId;
      // Clear pending first to prevent re-triggering
      setPendingNewAnalysisId(null);
      setSelectedId(pendingNewAnalysisId);
      // Auto-select the base proposal if it exists
      if (found.proposals && found.proposals.length > 0) {
        const baseProposal = found.proposals[0];
        console.log('🔧 Auto-selecting base proposal:', baseProposal.id);
        setSelectedProposalId(baseProposal.id);
      }
    }
  }, [pendingNewAnalysisId, analyses]);

  // Ensure selectedId is set when a new analysis is created
  useEffect(() => {
    // If we have a selectedId but the analysis isn't found yet, wait for it
    if (selectedId && !selectedAnalysis) {
      // The analysis should appear soon, but if it doesn't after a short delay, reset
      const timeout = setTimeout(() => {
        if (!analyses.find((a) => a.id === selectedId)) {
          console.warn('Selected analysis not found, resetting selection');
          setSelectedId(null);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [selectedId, selectedAnalysis, analyses]);

  // Track previous analyses to prevent unnecessary parent updates
  const prevAnalysesRef = useRef<AnalysisMeta[]>([]);
  const isInitialMountRef = useRef(true);
  const onAnalysesChangedRef = useRef(onAnalysesChanged);
  
  // Keep callback ref up to date
  useEffect(() => {
    onAnalysesChangedRef.current = onAnalysesChanged;
  }, [onAnalysesChanged]);
  
  // Notify parent of analyses changes - only when content actually changes
  useEffect(() => {
    // Skip on initial mount to prevent unnecessary callback
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevAnalysesRef.current = analyses;
      return;
    }
    
    // Compare by serializing key fields to detect actual changes
    const prevSerialized = JSON.stringify(prevAnalysesRef.current.map(a => ({ id: a.id, name: a.name, status: a.status })));
    const currentSerialized = JSON.stringify(analyses.map(a => ({ id: a.id, name: a.name, status: a.status })));
    
    // Only notify if the content actually changed
    if (prevSerialized !== currentSerialized) {
      prevAnalysesRef.current = analyses;
      onAnalysesChangedRef.current?.(analyses);
    }
  }, [analyses]);

  // Track previous deals to prevent unnecessary parent updates
  const prevDealsRef = useRef<Deal[]>([]);
  const isInitialDealsMountRef = useRef(true);
  const onDealsChangedRef = useRef(onDealsChanged);
  
  // Keep callback ref up to date
  useEffect(() => {
    onDealsChangedRef.current = onDealsChanged;
  }, [onDealsChanged]);
  
  // Notify parent of deals changes - only when content actually changes
  useEffect(() => {
    // Skip on initial mount to prevent unnecessary callback
    if (isInitialDealsMountRef.current) {
      isInitialDealsMountRef.current = false;
      prevDealsRef.current = deals;
      return;
    }
    
    // Compare by serializing key fields to detect actual changes
    const prevSerialized = JSON.stringify(prevDealsRef.current.map(d => ({ id: d.id, clientName: d.clientName, stage: d.stage })));
    const currentSerialized = JSON.stringify(deals.map(d => ({ id: d.id, clientName: d.clientName, stage: d.stage })));
    
    // Only notify if the content actually changed
    if (prevSerialized !== currentSerialized) {
      prevDealsRef.current = deals;
      onDealsChangedRef.current?.(deals);
    }
  }, [deals]);

  useEffect(() => {
    if (!supabase || !supabaseUser) {
      dealStorage.save(deals);
    }
  }, [deals, supabase, supabaseUser]);

  // Track if data has been loaded to prevent re-loading
  const hasLoadedDataRef = useRef(false);
  
  // Load data from Supabase/local storage on mount - only run once
  useEffect(() => {
    // Only load data once
    if (hasLoadedDataRef.current) {
      return;
    }
    
    hasLoadedDataRef.current = true;
    
    const loadData = async () => {
      setIsLoading(true); // Ensure loading starts
      try {
        if (!supabase || !supabaseUser) {
          const storedAnalyses = storage.load() as AnalysisMeta[];
          const storedDeals = dealStorage.load();
          if (storedAnalyses.length > 0) {
            setAnalyses(storedAnalyses);
          } else {
            const today = new Date().toISOString().split("T")[0];
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "David Barbeito CPA PA",
              status: "Draft" as const,
              tenant_name: "Acme Robotics",
              market: "Miami-Dade",
              rsf: 20000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000 * 5
                )
                  .toISOString()
                  .split("T")[0],
              },
              operating: {
                est_op_ex_psf: 15.5,
                escalation_method: "fixed",
                escalation_value: 0.03,
              },
              rent_schedule: [
                {
                  period_start: today,
                  period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  rent_psf: 32.0,
                  escalation_percentage: 0.03,
                },
              ],
              concessions: {
                ti_allowance_psf: 45.0,
                moving_allowance: 50000,
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "Demo analysis for testing",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            storage.save([demoAnalysis]);
          }

          setDeals(storedDeals);
          setStorageStats(storage.getStats());
          setLastSaved(new Date().toISOString());
          // Don't return here - let finally block handle setIsLoading(false)
        } else if (isSupabaseConfigured && supabase && supabaseUser) {
          // Add timeout wrapper - if Supabase is slow, fall back to local storage
          let remoteAnalyses: AnalysisMeta[];
          let remoteDeals: Deal[];
          
          try {
            const analysesPromise = listAnalysesForUser(supabase, supabaseUser.id);
            const dealsPromise = listDealsForUser(supabase, supabaseUser.id);
            
            [remoteAnalyses, remoteDeals] = await Promise.race([
              Promise.all([analysesPromise, dealsPromise]),
              new Promise<[AnalysisMeta[], Deal[]]>((resolve) =>
                setTimeout(() => {
                  // Fallback to local storage on timeout
                  console.warn("Supabase data load timeout in LeaseAnalyzerApp, using local storage");
                  const storedAnalyses = storage.load() as AnalysisMeta[];
                  const storedDeals = dealStorage.load();
                  resolve([storedAnalyses, storedDeals]);
                }, 3000)
              ),
            ]);
          } catch (error) {
            // #region agent log
            const requestId = crypto.randomUUID();
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:608',message:'LeaseAnalyzerApp loadData catch block entry',data:{requestId,errorType:typeof error,errorMessage:error instanceof Error?error.message:String(error),isNetworkError:error instanceof Error&&(error.message?.toLowerCase().includes('fetch')||error.message?.toLowerCase().includes('network')||error.message?.toLowerCase().includes('timeout')),hasSupabase:!!supabase,hasSupabaseUser:!!supabaseUser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            // If Supabase fails, fall back to local storage
            console.warn("Supabase data load failed in LeaseAnalyzerApp, using local storage:", error);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:611',message:'LeaseAnalyzerApp before loading from local storage',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            const storedAnalyses = storage.load() as AnalysisMeta[];
            const storedDeals = dealStorage.load();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:614',message:'LeaseAnalyzerApp after loading from local storage',data:{requestId,storedAnalysesCount:storedAnalyses.length,storedDealsCount:storedDeals.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            remoteAnalyses = storedAnalyses;
            remoteDeals = storedDeals;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:617',message:'LeaseAnalyzerApp loadData catch block exit',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
          }

          if (remoteAnalyses.length > 0) {
            setAnalyses(remoteAnalyses);
            setDeals(remoteDeals);
            storage.save(remoteAnalyses);
            dealStorage.save(remoteDeals);
            setStorageStats({
              totalAnalyses: remoteAnalyses.length,
              totalProposals: remoteAnalyses.reduce(
                (acc, analysis) => acc + (analysis.proposals?.length ?? 0),
                0
              ),
              lastSaved: new Date().toISOString(),
              deviceId: supabaseUser?.id ?? "guest",
              version: "supabase",
              hasBackup: false,
            });
          } else {
            const today = new Date().toISOString().split("T")[0];
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "David Barbeito CPA PA",
              status: "Draft" as const,
              tenant_name: "Acme Robotics",
              market: "Miami-Dade",
              rsf: 20000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000 * 5
                )
                  .toISOString()
                  .split("T")[0],
              },
              operating: {
                est_op_ex_psf: 15.5,
                escalation_method: "fixed",
                escalation_value: 0.03,
              },
              rent_schedule: [
                {
                  period_start: today,
                  period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                    .toISOString()
                    .split("T")[0],
                  rent_psf: 32.0,
                  escalation_percentage: 0.03,
                },
              ],
              concessions: {
                ti_allowance_psf: 45.0,
                moving_allowance: 50000,
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "Demo analysis for testing",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            setDeals(remoteDeals);

            if (isSupabaseConfigured && supabase && supabaseUser) {
              await upsertAnalysesForUser(supabase, supabaseUser.id, [demoAnalysis]);
            }
            dealStorage.save(remoteDeals);
            storage.save([demoAnalysis]);

            console.log("📁 Initialized with demo data");
            setStorageStats({
              totalAnalyses: 1,
              totalProposals: demoAnalysis.proposals.length,
              lastSaved: new Date().toISOString(),
              deviceId: supabaseUser?.id ?? "guest",
              version: "supabase",
              hasBackup: false,
            });
          }

          setLastSaved(new Date().toISOString());
        }
      } catch (error) {
        console.error("❌ Failed to load data, falling back to local storage:", error);
        reportError(error as Error, "Data loading");

        // Try to load from local storage as fallback
        try {
          const storedAnalyses = storage.load() as AnalysisMeta[];
          const storedDeals = dealStorage.load();
          
          if (storedAnalyses.length > 0) {
            setAnalyses(storedAnalyses);
            setDeals(storedDeals);
            setStorageStats(storage.getStats());
            setLastSaved(new Date().toISOString());
          } else {
            // No local data, create demo
            const today = new Date().toISOString().split("T")[0];
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "Demo Analysis",
              status: "Draft" as const,
              tenant_name: "Demo Tenant",
              market: "Demo Market",
              rsf: 10000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: new Date(
                  Date.now() + 365 * 24 * 60 * 60 * 1000 * 5
                )
                  .toISOString()
                  .split("T")[0],
              },
              operating: {
          escalation_type: "fixed",
        },
              rent_schedule: [],
        rent_escalation: {
          escalation_type: "fixed",
          fixed_escalation_percentage: 0,
        },
              concessions: {
                abatement_type: "at_commencement",
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            setDeals([]);
          }
        } catch (localError) {
          console.error("Failed to load from local storage:", localError);
          // Last resort: empty state
          setAnalyses([]);
          setDeals([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [supabase, supabaseUser, reportError]);


  // Auto-save when analyses change (with proper dependency management and reduced frequency)
  useEffect(() => {
    if (!isLoading && analyses.length > 0) {
      // Use a ref to track the latest analyses to prevent race conditions
      const timeoutId = setTimeout(() => {
        (async () => {
          try {
            // Get the latest analyses state at save time
            const latestAnalyses = analyses;
            
            if (isSupabaseConfigured && supabase && supabaseUser) {
              await upsertAnalysesForUser(supabase, supabaseUser.id, latestAnalyses);
            }
            
            const saveResult = storage.save(latestAnalyses);
            if (saveResult.success) {
              setLastSaved(new Date().toISOString());
              setStorageStats({
                totalAnalyses: latestAnalyses.length,
                totalProposals: latestAnalyses.reduce(
                  (acc, analysis) => acc + (analysis.proposals?.length ?? 0),
                  0
                ),
                lastSaved: new Date().toISOString(),
                deviceId: supabaseUser?.id ?? "guest",
                version: supabase && supabaseUser ? "supabase" : "local",
                hasBackup: false,
              });
            } else {
              console.error("❌ Auto-save failed:", saveResult.error);
              reportError(
                new Error(saveResult.error || "Auto-save failed"),
                "Auto-save"
              );
            }
          } catch (error) {
            console.error("❌ Auto-save error:", error);
            reportError(error as Error, "Auto-save");
          }
        })();
      }, 2000); // Reduced from 3000ms to 2000ms for faster saves

      return () => clearTimeout(timeoutId);
    }
  }, [analyses, isLoading, reportError, supabase, supabaseUser]);

  // Derived
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyses.filter((a) => !q || a.name.toLowerCase().includes(q) || a.tenant_name.toLowerCase().includes(q));
  }, [analyses, query]);

  const createNewAnalysis = () => {
    console.log('🔧 createNewAnalysis called');
    try {
      const id = nanoid();
      const today = new Date().toISOString().split('T')[0];
      console.log('🔧 Generated ID:', id);
      
      const newAnalysis: AnalysisMeta = {
        id,
        name: "",
        status: "Draft",
        tenant_name: "",
        market: "",
        rsf: 0,
        lease_type: "FS",
        rep_type: undefined,
        key_dates: {
          commencement: "",
          expiration: "",
        },
        lease_term: {
          years: 5,
          months: 0,
          include_abatement_in_term: false,
        },
        operating: {
          escalation_type: "fixed",
        },
        rent_schedule: [],
        rent_escalation: {
          escalation_type: "fixed",
          fixed_escalation_percentage: 0,
        },
        concessions: {
          abatement_type: "at_commencement",
        },
        options: [],
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        notes: "",
        proposals: [],
      };
      
      // Auto-create base proposal - default to "Tenant" side
      const baseProposal: Proposal = {
        id: nanoid(),
        side: "Tenant",
        label: "v1",
        created_at: new Date().toISOString(),
        meta: { ...newAnalysis }, // Use the actual analysis data, not demo data
      };
      
      // Add base proposal to the analysis
      newAnalysis.proposals = [baseProposal];
      
      console.log('🔧 Created new analysis with base proposal:', newAnalysis);
      
      // Use pendingNewAnalysisId mechanism to ensure selectedId is set AFTER analyses updates
      // This prevents race conditions where selectedAnalysis might be null
      setPendingNewAnalysisId(id);
      
      // Update state and immediately save to storage
      setAnalyses((prev) => {
        const updated = [newAnalysis, ...prev];
        console.log('🔧 Updated analyses array:', updated);
        
        // Save to storage immediately
        try {
          storage.save(updated);
          // Also save to Supabase if available
          if (supabase && supabaseUser) {
            upsertAnalysesForUser(supabase, supabaseUser.id, updated).catch((error) =>
              console.error("Failed to sync new analysis:", error)
            );
          }
        } catch (error) {
          console.error("Failed to save new analysis:", error);
        }
        
        return updated;
      });
      
    } catch (error) {
      console.error('❌ Error in createNewAnalysis:', error);
      reportError(error as Error, 'Create New Analysis');
    }
  };

  const duplicate = (id: string) => {
    const src = analyses.find((a) => a.id === id);
    if (!src) return;
    setDuplicateSourceAnalysis(src);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateConfirm = (options: DuplicateOptions) => {
    if (!duplicateSourceAnalysis) return;
    
    try {
      // Calculate original term in months
      const commencement = new Date(duplicateSourceAnalysis.key_dates.commencement);
      const expiration = new Date(duplicateSourceAnalysis.key_dates.expiration);
      const originalTermMonths = Math.round(
        (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      
      // Create duplicate with applied options
      const copy = applyDuplicateOptions(duplicateSourceAnalysis, options);
      copy.id = nanoid();
      
      setAnalyses((prev) => [copy, ...prev]);
      setDuplicateDialogOpen(false);
      setDuplicateSourceAnalysis(null);
    } catch (error) {
      console.error('❌ Error duplicating analysis:', error);
      reportError(error as Error, 'Duplicate Analysis');
      alert('Failed to duplicate analysis. Please try again.');
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setDuplicateSourceAnalysis(null);
  };

  const remove = (id: string) => setAnalyses((prev) => prev.filter((a) => a.id !== id));

  // Deal linking handlers
  const handleLinkAnalysisToDeal = useCallback((analysisId: string, dealId: string) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) {
        console.error('Deal not found:', dealId);
        return;
      }

      // Link analysis to deal
      const updatedDeal = linkAnalysisToDeal(deal, analysisId);
      setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
          console.error("Failed to link analysis to deal:", error)
        );
      }
      
      console.log('✅ Linked analysis', analysisId, 'to deal', dealId);
    } catch (error) {
      console.error('Error linking analysis to deal:', error);
      reportError(error as Error, 'Link analysis to deal');
    }
  }, [deals, reportError, supabase, supabaseUser]);

  const handleUnlinkAnalysisFromDeal = useCallback((analysisId: string) => {
    try {
      const linkedDeal = isAnalysisLinkedToDeal(analysisId, deals);
      if (linkedDeal) {
        const updatedDeal = unlinkAnalysisFromDeal(linkedDeal, analysisId);
        setDeals(prev => prev.map(d => d.id === linkedDeal.id ? updatedDeal : d));
        if (isSupabaseConfigured && supabase && supabaseUser) {
          upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
            console.error("Failed to unlink analysis from deal:", error)
          );
        }
        console.log('✅ Unlinked analysis', analysisId, 'from deal');
      }
    } catch (error) {
      console.error('Error unlinking analysis from deal:', error);
      reportError(error as Error, 'Unlink analysis from deal');
    }
  }, [deals, reportError, supabase, supabaseUser]);

  const handleSyncAnalysisToDeal = useCallback((analysisId: string) => {
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      const linkedDeal = isAnalysisLinkedToDeal(analysisId, deals);
      
      if (!analysis || !linkedDeal) {
        console.error('Cannot sync - analysis or deal not found');
        return;
      }

      // Sync analysis data to deal
      const updatedDeal = syncAnalysisToDeal(linkedDeal, analyses);
      setDeals(prev => prev.map(d => d.id === linkedDeal.id ? updatedDeal : d));
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
          console.error("Failed to sync analysis to deal:", error)
        );
      }
      
      console.log('✅ Synced analysis to deal');
    } catch (error) {
      console.error('Error syncing analysis to deal:', error);
      reportError(error as Error, 'Sync analysis to deal');
    }
  }, [analyses, deals, reportError, supabase, supabaseUser]);

  const handleCreateDealFromAnalysis = useCallback((analysisId: string) => {
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      if (!analysis) {
        console.error('Analysis not found:', analysisId);
        return;
      }

      // Create new deal from analysis
      const dealData = createDealFromAnalysis(analysis, {
        id: nanoid(),
        stage: "Proposal",
        priority: "Medium",
        status: "Active",
        broker: "Your Name",
        activities: [{
          id: nanoid(),
          timestamp: new Date().toISOString(),
          type: "analysis_added",
          description: `Analysis "${analysis.name}" linked to deal`,
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newDeal = dealData as Deal;
      setDeals(prev => [...prev, newDeal]);
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, newDeal).catch((error) =>
          console.error("Failed to create deal from analysis:", error)
        );
      }
      
      console.log('✅ Created new deal from analysis:', newDeal.id);
    } catch (error) {
      console.error('Error creating deal from analysis:', error);
      reportError(error as Error, 'Create deal from analysis');
    }
  }, [analyses, reportError, supabase, supabaseUser]);

  const upsertProposal = useCallback((analysisId: string, proposal: Proposal) => {
    try {
      setAnalyses((prev) =>
        prev.map((a) => {
          if (a.id !== analysisId) return a;
          const currentProposals = (a.proposals as Proposal[]) || [];
          const exists = currentProposals.some((p) => p.id === proposal.id);
          return {
            ...a,
            proposals: exists
              ? currentProposals.map((p) => (p.id === proposal.id ? proposal : p))
              : [proposal, ...currentProposals],
          };
        })
      );
    } catch (error) {
      console.error('Error updating proposal:', error);
      reportError(error as Error, 'Update proposal');
      throw error; // Re-throw so caller can handle
    }
  }, [reportError]);

  const createProposal = (side: ProposalSide) => {
    // Use selectedAnalysis directly since it's computed from current state
    // This ensures we always have the latest data
    if (!selectedAnalysis) {
      console.warn('❌ Cannot create proposal: no analysis selected');
      console.warn('   selectedId:', selectedId);
      console.warn('   analyses count:', analyses.length);
      console.warn('   analyses ids:', analyses.map(a => a.id));
      console.warn('   pendingNewAnalysisId:', pendingNewAnalysisId);
      return;
    }
    
    // Count existing proposals of this side to number the new one
    const existingProposalsOfSide = (selectedAnalysis.proposals as Proposal[]).filter(p => p.side === side);
    const versionNumber = existingProposalsOfSide.length + 1;
    
    // Create proposal using the actual analysis data, not demo data
    const p: Proposal = {
      id: nanoid(),
      side,
      label: `${side} v${versionNumber}`,
      created_at: new Date().toISOString(),
      meta: {
        ...selectedAnalysis, // Use the actual analysis data
        name: `${selectedAnalysis.name} - ${side} v${versionNumber}`, // Update name to reflect proposal
      },
    };
    
    console.log('🔧 Creating proposal:', p, 'for analysis:', selectedAnalysis.id);
    upsertProposal(selectedAnalysis.id, p);
    setSelectedProposalId(p.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your lease analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Duplicate Dialog */}
      {duplicateDialogOpen && duplicateSourceAnalysis && (
        <DuplicateDialog
          originalName={duplicateSourceAnalysis.name}
          originalRSF={duplicateSourceAnalysis.rsf}
          originalTerm={Math.round(
            (new Date(duplicateSourceAnalysis.key_dates.expiration).getTime() - 
             new Date(duplicateSourceAnalysis.key_dates.commencement).getTime()) / 
            (1000 * 60 * 60 * 24 * 30.44)
          )}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
        />
      )}
      
      {/* Enhanced save status indicator with storage info */}
      <ClientOnly fallback={
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg px-3 py-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>💾 Loading...</span>
            </div>
          </div>
        </div>
      }>
        {lastSaved && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg px-3 py-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>💾 Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                {storageStats?.hasBackup && (
                  <span className="text-green-600" title="Backup available">🔄</span>
                )}
                <button
                  onClick={() => setShowStorageInfo(!showStorageInfo)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Storage info"
                >
                  ℹ️
                </button>
              </div>
              
              {showStorageInfo && storageStats && (
                <div className="mt-2 pt-2 border-t border-muted text-xs space-y-1">
                  <div>Analyses: {storageStats.totalAnalyses}</div>
                  <div>Proposals: {storageStats.totalProposals}</div>
                  <div>Version: {storageStats.version}</div>
                  <div>Device: {storageStats.deviceId.slice(-8)}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const result = storage.createBackup();
                        if (result.success) {
                          alert('Backup created successfully');
                          setStorageStats(storage.getStats());
                        } else {
                          alert('Backup failed: ' + result.error);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Create Backup
                    </button>
                    <button
                      onClick={() => {
                        const result = storage.restoreFromBackup();
                        if (result.success) {
                          alert('Data restored from backup');
                          window.location.reload();
                        } else {
                          alert('Restore failed: ' + result.error);
                        }
                      }}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ClientOnly>
      
      {!selectedAnalysis ? (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error loading analyses list</p>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            </div>
          }
        >
          <HomeList
            list={list}
            query={query}
            setQuery={setQuery}
            onNew={createNewAnalysis}
            onOpen={(id) => {
              setSelectedId(id);
              setSelectedProposalId(null);
            }}
            onDuplicate={duplicate}
            onDelete={remove}
          />
        </ErrorBoundary>
      ) : !selectedProposal ? (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error loading proposals board</p>
                <Button onClick={() => setSelectedId(null)}>Back to List</Button>
              </div>
            </div>
          }
        >
          <ProposalsBoard
            analysis={selectedAnalysis}
            onBack={() => setSelectedId(null)}
            onOpenProposal={(pid) => setSelectedProposalId(pid)}
            onNewProposal={createProposal}
            onReorderProposals={(proposalIds) => {
              const reorderedProposals = proposalIds
                .map(id => selectedAnalysis.proposals.find(p => p.id === id))
                .filter((p): p is Proposal => p !== undefined);
              
              setAnalyses(prev =>
                prev.map(a =>
                  a.id === selectedAnalysis.id
                    ? { ...a, proposals: reorderedProposals }
                    : a
                )
              );
            }}
          />
        </ErrorBoundary>
      ) : (
        <AsyncErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error in workspace</p>
                <Button onClick={() => setSelectedProposalId(null)}>Back to Proposals</Button>
              </div>
            </div>
          }
        >
          <div className="h-full flex flex-col overflow-hidden">
          {presentationMode && selectedProposal ? (
            <PresentationMode
              proposal={selectedProposal}
              analysis={selectedAnalysis}
              proposals={selectedAnalysis.proposals}
              onClose={() => setPresentationMode(false)}
            />
          ) : (
            <Workspace
              proposal={selectedProposal}
              onBackToBoard={() => setSelectedProposalId(null)}
              onSave={(updatedMeta) => {
                try {
                  // Update the proposal with new meta
                  const updatedProposal = { ...selectedProposal, meta: updatedMeta };
                  upsertProposal(selectedAnalysis.id, updatedProposal);
                  
                  // Also update the analysis meta if this is the base scenario
                  // This ensures the analysis list reflects changes immediately
                  if (selectedProposal.label === 'Base') {
                    setAnalyses((prev) =>
                      prev.map((a) => {
                        if (a.id === selectedAnalysis.id) {
                          return { ...a, ...updatedMeta };
                        }
                        return a;
                      })
                    );
                  }
                } catch (error) {
                  console.error('Failed to save proposal:', error);
                  reportError(error as Error, 'Save proposal');
                  alert('Failed to save proposal. Please try again.');
                }
              }}
              deals={deals}
              currentLinkedDeal={isAnalysisLinkedToDeal(selectedAnalysis.id, deals)}
              onLinkToDeal={(dealId) => handleLinkAnalysisToDeal(selectedAnalysis.id, dealId)}
              onUnlinkFromDeal={() => handleUnlinkAnalysisFromDeal(selectedAnalysis.id)}
              onSyncWithDeal={() => handleSyncAnalysisToDeal(selectedAnalysis.id)}
              onCreateDealFromAnalysis={() => handleCreateDealFromAnalysis(selectedAnalysis.id)}
              onEnterPresentation={() => setPresentationMode(true)}
              allProposals={selectedAnalysis.proposals}
            />
          )}
          </div>
        </AsyncErrorBoundary>
      )}
    </div>
  );
}

function HomeList({
  list,
  query,
  setQuery,
  onNew,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  list: {
    id: string;
    name: string;
    status: "Draft" | "Active" | "Final";
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: LeaseType;
    rep_type?: "Occupier" | "Landlord";
    proposals: Proposal[];
  }[];
  query: string;
  setQuery: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Lease Analyses</h1>
          <p className="text-sm text-muted-foreground">Track negotiations and model cash flows for lease transactions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => onNew()} 
            className="rounded-2xl flex-1 sm:flex-none"
            variant="default"
          >
            <Plus className="mr-2 h-4 w-4" />
            New Analysis
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <Input
          placeholder="Search by name or tenant..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      <div className="grid gap-3">
        {list.map((a) => (
          <Card key={a.id} className="rounded-2xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-base font-medium truncate">{a.name}</span>
                    <Badge variant="secondary" className="text-xs w-fit">
                      {a.status}
                    </Badge>
                    {a.rep_type && (
                      <Badge 
                        variant={a.rep_type === "Occupier" ? "default" : "outline"} 
                        className="text-xs w-fit"
                      >
                        {a.rep_type} Rep
                      </Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div className="sm:hidden space-y-1">
                      <div>{a.tenant_name}</div>
                      <div>{a.market || "No market"} • {a.rsf.toLocaleString()} RSF • {a.lease_type}</div>
                    </div>
                    <div className="hidden sm:block">
                      {a.tenant_name} • {a.market || "No market"} • {a.rsf.toLocaleString()} RSF • {a.lease_type}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="outline" onClick={() => onOpen(a.id)} className="flex-1 sm:flex-none">
                    Open
                  </Button>
                  <Button variant="ghost" onClick={() => onDuplicate(a.id)} title="Duplicate" className="hidden sm:flex">
                    <Copy className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => onDelete(a.id)}
                    title="Delete"
                    className="text-destructive hidden sm:flex"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {/* Mobile action buttons */}
              <div className="flex items-center justify-between gap-2 mt-3 sm:hidden pt-3 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDuplicate(a.id)}
                  title="Duplicate analysis"
                  className="flex-1"
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Duplicate
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete(a.id)}
                  title="Delete analysis"
                  className="text-destructive hover:text-destructive flex-1"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

/*************************************************
 * Proposals Board (Negotiation Flow)
 *************************************************/

function ProposalsBoard({
  analysis,
  onBack,
  onOpenProposal,
  onNewProposal,
  onReorderProposals,
}: {
  analysis: {
    id: string;
    name: string;
    status: string;
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: LeaseType;
    rep_type?: "Occupier" | "Landlord";
    proposals: Proposal[];
  };
  onBack: () => void;
  onOpenProposal: (proposalId: string) => void;
  onNewProposal: (side: ProposalSide) => void;
  onReorderProposals?: (proposalIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onReorderProposals) {
      const oldIndex = analysis.proposals.findIndex(p => p.id === active.id);
      const newIndex = analysis.proposals.findIndex(p => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(analysis.proposals, oldIndex, newIndex);
        onReorderProposals(reordered.map(p => p.id));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
    <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold truncate">{analysis.name}</h2>
          {analysis.rep_type && (
            <Badge 
              variant={analysis.rep_type === "Occupier" ? "default" : "outline"} 
              className="text-xs"
            >
              {analysis.rep_type} Rep
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => onNewProposal("Landlord")} className="rounded-2xl flex-1 sm:flex-none">
            +Landlord Counter
          </Button>
          <Button variant="outline" onClick={() => onNewProposal("Tenant")} className="rounded-2xl flex-1 sm:flex-none">
            + Tenant Counter
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {analysis.proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="mb-4">
            <p className="text-lg font-medium text-muted-foreground mb-2">No proposals yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first proposal to start analyzing this lease
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => onNewProposal("Tenant")} 
              className="rounded-2xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Proposal
            </Button>
          </div>
        </div>
      ) : (
        <>
      {/* Columns - Mobile: Stack, Desktop: Grid */}
      <div className="block sm:hidden space-y-4">
        {analysis.proposals.map((p) => {
          const meta = p.meta;
          return (
            <Card key={p.id} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {p.side}
                      {p.label ? ` • ${p.label}` : ""}
                    </div>
                    <div className="text-lg font-medium">{meta.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenProposal(p.id)}
                    title="Open details"
                  >
                    Open <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                
                {/* Mobile Input Parameters */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Badge variant="secondary" title="Base Rent" className="text-center">
                    ${meta.rent_schedule?.[0]?.rent_psf || 0}/SF
                  </Badge>
                  <Badge variant="secondary" title="RSF" className="text-center">
                    {meta.rsf.toLocaleString()}
                  </Badge>
                  <Badge variant="secondary" title="Term" className="text-center">
                    {Math.round(
                      (new Date(meta.key_dates.expiration).getTime() - 
                       new Date(meta.key_dates.commencement).getTime()) / 
                      (1000 * 60 * 60 * 24 * 365.25)
                    )} yrs
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Badge variant="outline" title="TI Allowance" className="text-center">
                    ${meta.concessions?.ti_allowance_psf || 0}/SF
                  </Badge>
                  <Badge variant="outline" title="Free Rent" className="text-center">
                    {meta.concessions?.abatement_type === "at_commencement" 
                      ? (meta.concessions?.abatement_free_rent_months || 0)
                      : (meta.concessions?.abatement_periods?.reduce((sum, p) => sum + p.free_rent_months, 0) || 0)} mo
                  </Badge>
                  <Badge variant="outline" title="Moving Allowance" className="text-center">
                    {meta.concessions?.moving_allowance ? 
                      `$${(meta.concessions.moving_allowance / 1000).toFixed(0)}k` : 
                      '$0'
                    }
                  </Badge>
                </div>

                {/* Mobile proposal details */}
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Lease Type:</span>
                      <div className="font-medium">{meta.lease_type}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RSF:</span>
                      <div className="font-medium">{meta.rsf.toLocaleString()}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Rent (Yr1):</span>
                    <div className="font-medium">
                      {meta.rent_schedule.length > 0 
                        ? fmtMoney(meta.rent_schedule[0].rent_psf * meta.rsf)
                        : "—"
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="hidden sm:block overflow-auto">
        <SortableContext
          items={analysis.proposals.map(p => p.id)}
          strategy={undefined}
        >
          <div
            className="min-w-[900px] grid"
            style={{ gridTemplateColumns: `repeat(${analysis.proposals.length}, 1fr)` }}
          >

            {/* Proposal columns */}
            {analysis.proposals.map((p) => {
            const meta = p.meta;
            return (
              <div key={p.id} className="border rounded-r-xl -ml-px">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {p.side}
                      {p.label ? ` • ${p.label}` : ""}
                    </div>
                    <div className="text-lg font-medium">{meta.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenProposal(p.id)}
                    title="Open details"
                  >
                    Open <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="px-3 pb-3 grid gap-3">
                  {/* Input Parameters Summary */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Rent:</span>
                        <span className="font-medium">
                          ${meta.rent_schedule?.[0]?.rent_psf || 0}/SF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSF:</span>
                        <span className="font-medium">
                          {meta.rsf.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-medium">
                          {Math.round(
                            (new Date(meta.key_dates.expiration).getTime() - 
                             new Date(meta.key_dates.commencement).getTime()) / 
                            (1000 * 60 * 60 * 24 * 365.25)
                          )} yrs
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TI Allowance:</span>
                        <span className="font-medium">
                          ${meta.concessions?.ti_allowance_psf || 0}/SF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Free Rent:</span>
                        <span className="font-medium">
                          {meta.concessions?.abatement_type === "at_commencement" 
                            ? (meta.concessions?.abatement_free_rent_months || 0)
                            : (meta.concessions?.abatement_periods?.reduce((sum, p) => sum + p.free_rent_months, 0) || 0)} mo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moving:</span>
                        <span className="font-medium">
                          {meta.concessions?.moving_allowance ? 
                            `$${(meta.concessions.moving_allowance / 1000).toFixed(0)}k` : 
                            '$0'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </SortableContext>
      </div>
        </>
      )}
    </div>
    </DndContext>
  );
}

/*************************************************
 * Proposal Workspace (Tabs)
 *************************************************/

function Workspace({
  proposal,
  onBackToBoard,
  onSave,
  deals,
  currentLinkedDeal,
  onLinkToDeal,
  onUnlinkFromDeal,
  onSyncWithDeal,
  onCreateDealFromAnalysis,
  onEnterPresentation,
  allProposals,
}: {
  proposal: Proposal;
  onBackToBoard: () => void;
  onSave: (meta: AnalysisMeta) => void;
  deals: Deal[];
  currentLinkedDeal?: Deal | undefined;
  onLinkToDeal: (dealId: string) => void;
  onUnlinkFromDeal: () => void;
  onSyncWithDeal: () => void;
  onCreateDealFromAnalysis: () => void;
  onEnterPresentation?: () => void;
  allProposals?: Proposal[];
}) {
  const meta = proposal.meta;
  const analysisResult = useMemo(() => analyzeLease(meta), [meta]);
  const lines = analysisResult.cashflow;
  const years = analysisResult.years;
  const eff = analysisResult.metrics.effectiveRentPSF;
  const pvV = analysisResult.metrics.npv;

  // Export dialog state
  const [showExportDialog, setShowExportDialog] = useState(false);

  // Export handlers
  const handleExportPDF = async (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      await exportAnalysis('pdf', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  };

  const handleExportExcel = async (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      await exportAnalysis('excel', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  };

  const handlePrint = (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      exportAnalysis('print', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full flex-shrink-0">
      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        proposalName={`${proposal.side} - ${proposal.label || meta.name}`}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              onClick={onBackToBoard} 
              size="sm"
              className="h-8 px-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">
                  {meta.name || "Untitled Analysis"}
                </h1>
                {meta.rep_type && (
                  <Badge variant="outline" className="text-xs">
                    {meta.rep_type} Rep
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {proposal.side}
                </span>
                {proposal.label && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {proposal.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <DealLinkDropdown
              currentDealId={currentLinkedDeal?.id}
              linkedDeal={currentLinkedDeal}
              availableDeals={deals}
              onLinkToDeal={onLinkToDeal}
              onCreateNewDeal={onCreateDealFromAnalysis}
              onUnlink={onUnlinkFromDeal}
              onSyncNow={onSyncWithDeal}
            />
            {onEnterPresentation && (
              <Button
                variant="default"
                onClick={onEnterPresentation}
                size="sm"
                title="Enter Presentation Mode (Ctrl+P)"
              >
                <Presentation className="h-4 w-4 mr-2" />
                Present
              </Button>
            )}
            <Button 
              variant="default"
              onClick={() => setShowExportDialog(true)}
              size="sm"
              title="Export to PDF, Excel, or Print"
            >
              <FileDown className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button 
              onClick={() => onSave(meta)}
              size="sm"
              title="Save changes"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
        <div className="h-px bg-border"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <KPI
          label="Effective Rate"
          value={fmtRate(eff)}
          hint="Net cash flow per RSF per year (abatement-only credit)."
        />
        <KPI
          label="NPV"
          value={fmtMoney(pvV)}
          hint="Discounted net cash flows at selected rate."
        />
        <KPI
          label="NPV $/SF/yr"
          value={years > 0 && meta.rsf > 0 ? fmtRate(pvV / (meta.rsf * years)) : "$0.00/SF/yr"}
          hint="Net Present Value per square foot per year."
        />
        <KPI label="RSF" value={meta.rsf.toLocaleString()} hint="Rentable square feet." />
      </div>
      </div>

      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 pb-4 sm:pb-6">
      <Tabs defaultValue="proposal" className="w-full h-full flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 w-full flex-shrink-0">
          <TabsTrigger value="proposal" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Lease Terms</span>
            <span className="sm:hidden">Terms</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Analysis</span>
            <span className="sm:hidden">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Cashflow</span>
            <span className="sm:hidden">Cash</span>
          </TabsTrigger>
          <TabsTrigger value="ner" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">NER</span>
            <span className="sm:hidden">NER</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Commission</span>
            <span className="sm:hidden">Comm</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="proposal" className="overflow-y-auto flex-1 min-h-0">
          <ProposalTab a={meta} onSave={onSave} />
        </TabsContent>
        <TabsContent value="analysis" className="overflow-y-auto flex-1 min-h-0">
          <AnalysisTab lines={lines} meta={meta} />
        </TabsContent>
        <TabsContent value="cashflow" className="overflow-y-auto flex-1 min-h-0">
          <CashflowTab lines={lines} meta={meta} proposals={allProposals || [proposal]} />
        </TabsContent>
        <TabsContent value="ner" className="overflow-y-auto flex-1 min-h-0">
          <NERAnalysisView
            analysis={meta}
            onSave={(nerAnalysis) => {
              // Store NER analysis data (can be saved to analysis meta or separate storage)
              console.log('NER Analysis saved:', nerAnalysis);
            }}
          />
        </TabsContent>
        <TabsContent value="commission" className="overflow-y-auto flex-1 min-h-0">
          <CommissionCalculator
            analysis={meta}
            initialStructure={meta.commissionStructure}
            onSave={(structure) => {
              onSave({ ...meta, commissionStructure: structure });
            }}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}

// Sortable Rent Schedule Row Component
function RentScheduleRow({
  id,
  row,
  idx,
  setRentRow,
  deleteRentRow,
}: {
  id: string;
  row: RentRow;
  idx: number;
  setRentRow: (idx: number, patch: Partial<RentRow>) => void;
  deleteRentRow: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>::</span>
          <span>Drag to reorder</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => deleteRentRow(idx)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Period
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>Period Start</Label>
          <Input
            type="date"
            value={row.period_start}
            onChange={(e) => setRentRow(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={row.period_end}
            onChange={(e) => setRentRow(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <CurrencyInput
          label="Base Rent $/SF"
          value={row.rent_psf}
          onChange={(value) => setRentRow(idx, { rent_psf: value || 0 })}
          placeholder="0.00"
          currency="$/SF"
        />
        <PercentageInput
          label="Annual Escalation"
          value={(row.escalation_percentage ?? 0) * 100}
          onChange={(value) => setRentRow(idx, { escalation_percentage: (value || 0) / 100 })}
          placeholder="3.0"
        />
      </div>
    </div>
  );
}

// Abatement Period Row Component
function AbatementPeriodRow({
  id,
  period,
  idx,
  setAbatementPeriod,
  deleteAbatementPeriod,
}: {
  id: string;
  period: AbatementPeriod;
  idx: number;
  setAbatementPeriod: (idx: number, patch: Partial<AbatementPeriod>) => void;
  deleteAbatementPeriod: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>::</span>
          <span>Drag to reorder</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => deleteAbatementPeriod(idx)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Period
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>Period Start</Label>
          <Input
            type="date"
            value={period.period_start}
            onChange={(e) => setAbatementPeriod(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={period.period_end}
            onChange={(e) => setAbatementPeriod(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <ValidatedInput
          label="Free Rent Months"
          type="number"
          value={period.free_rent_months ?? 0}
          onChange={(e) => setAbatementPeriod(idx, { free_rent_months: Number(e.currentTarget.value) || 0 })}
          placeholder="0"
          min="0"
          hint="Number of free rent months in this period"
        />
        <Select
          label="Abatement Applies To"
          value={period.abatement_applies_to || "base_only"}
          onChange={(e) => setAbatementPeriod(idx, { abatement_applies_to: e.currentTarget.value as "base_only" | "base_plus_nnn" })}
          placeholder="Select abatement type"
          options={[
            { value: 'base_only', label: 'Base Rent Only' },
            { value: 'base_plus_nnn', label: 'Base Rent + NNN' },
          ]}
        />
      </div>
    </div>
  );
}

// Helper to get total abatement months
function getAbatementMonths(concessions: AnalysisMeta["concessions"]): number {
  if (!concessions) return 0;
  
  if (concessions.abatement_type === "at_commencement") {
    return concessions.abatement_free_rent_months || 0;
  } else if (concessions.abatement_type === "custom" && concessions.abatement_periods) {
    return concessions.abatement_periods.reduce((sum, p) => sum + p.free_rent_months, 0);
  }
  return 0;
}

// Helper to calculate expiration date
function calculateExpiration(
  commencement: string,
  years: number,
  months: number,
  includeAbatement: boolean,
  abatementMonths: number
): string {
  if (!commencement) return "";
  
  const start = new Date(commencement);
  start.setFullYear(start.getFullYear() + years);
  start.setMonth(start.getMonth() + months);
  
  if (includeAbatement && abatementMonths > 0) {
    start.setMonth(start.getMonth() + abatementMonths);
  }
  
  // Set to last day of the final month
  start.setMonth(start.getMonth() + 1);
  start.setDate(0); // Last day of previous month
  
  return start.toISOString().split('T')[0];
}

// Helper to calculate lease term from existing dates (for backward compatibility)
function calculateLeaseTermFromDates(
  commencement: string,
  expiration: string
): { years: number; months: number } | null {
  if (!commencement || !expiration) return null;
  
  const start = new Date(commencement);
  const end = new Date(expiration);
  
  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();
  
  if (months < 0) {
    years--;
    months += 12;
  }
  
  // Adjust for day of month - if expiration is last day of month, include that month
  if (end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    months++;
    if (months >= 12) {
      years++;
      months -= 12;
    }
  }
  
  return { years, months };
}

// Helper to sync rent schedule period end dates with expiration
function syncRentScheduleToExpiration(
  rentSchedule: RentRow[],
  expiration: string
): RentRow[] {
  if (!rentSchedule || rentSchedule.length === 0) return rentSchedule;
  
  // Update the last period's end date to match expiration
  const updated = [...rentSchedule];
  if (updated.length > 0) {
    updated[updated.length - 1] = {
      ...updated[updated.length - 1],
      period_end: expiration,
    };
  }
  
  return updated;
}

// Escalation Period Row Component
function EscalationPeriodRow({
  id,
  period,
  idx,
  setEscalationPeriod,
  deleteEscalationPeriod,
}: {
  id: string;
  period: EscalationPeriod;
  idx: number;
  setEscalationPeriod: (idx: number, patch: Partial<EscalationPeriod>) => void;
  deleteEscalationPeriod: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>::</span>
          <span>Drag to reorder</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => deleteEscalationPeriod(idx)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Period
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label>Period Start</Label>
          <Input
            type="date"
            value={period.period_start}
            onChange={(e) => setEscalationPeriod(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={period.period_end}
            onChange={(e) => setEscalationPeriod(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <PercentageInput
          label="Escalation %"
          value={(period.escalation_percentage ?? 0) * 100}
          onChange={(value) => setEscalationPeriod(idx, { escalation_percentage: (value || 0) / 100 })}
          placeholder="3.0"
          hint="Annual escalation rate for this period"
        />
      </div>
    </div>
  );
}

// OpEx Escalation Period Row Component
function OpExEscalationPeriodRow({
  id,
  period,
  idx,
  setOpExEscalationPeriod,
  deleteOpExEscalationPeriod,
}: {
  id: string;
  period: OpExEscalationPeriod;
  idx: number;
  setOpExEscalationPeriod: (idx: number, patch: Partial<OpExEscalationPeriod>) => void;
  deleteOpExEscalationPeriod: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>::</span>
          <span>Drag to reorder</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => deleteOpExEscalationPeriod(idx)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Period
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <Label>Period Start</Label>
          <Input
            type="date"
            value={period.period_start}
            onChange={(e) => setOpExEscalationPeriod(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={period.period_end}
            onChange={(e) => setOpExEscalationPeriod(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <PercentageInput
          label="Escalation %"
          value={(period.escalation_percentage ?? 0) * 100}
          onChange={(value) => setOpExEscalationPeriod(idx, { escalation_percentage: (value || 0) / 100 })}
          placeholder="3.0"
          hint="Annual escalation rate for this period"
        />
      </div>
    </div>
  );
}

function ProposalTab({ a, onSave }: { a: AnalysisMeta; onSave: (patch: AnalysisMeta) => void }) {
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [pendingData, setPendingData] = React.useState<AnalysisMeta | null>(null);
  const [confirmations, setConfirmations] = React.useState<ConfirmationRequest[]>([]);
  
  // Drag and drop sensors for rent schedule
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle rent schedule row reordering
  const handleRentScheduleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = parseInt(active.id.toString().replace("rent-row-", ""));
      const overIndex = parseInt(over.id.toString().replace("rent-row-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(local.rent_schedule, activeIndex, overIndex);
        updateField('rent_schedule', reordered);
      }
    }
  };

  const {
    data: local,
    errors,
    updateField,
    handleBlur,
    handleSubmit,
    getFieldError,
    getFieldWarning,
    shouldShowFieldError,
    shouldShowFieldWarning,
    isValid,
    isSubmitting
  } = useFormValidation(
    a,
    validateAnalysisMeta,
    {
      onSubmit: (data) => {
        // Validate before saving
        const validation = validateAnalysisMeta(data);
        if (validation.length > 0) {
          console.warn('Validation errors:', validation);
          // Still allow save but log warnings
        }
        
        // Check for confirmations using smart validation
        const smartValidation = getSmartValidationSummary(data);
        
        if (smartValidation.hasConfirmations && smartValidation.confirmations) {
          setPendingData(data);
          setConfirmations(smartValidation.confirmations);
          setShowConfirmation(true);
          return Promise.resolve(false); // Don't save yet
        }
        
        // No confirmations needed, save directly
        onSave(data);
        return Promise.resolve(true);
      },
      validateOnChange: true,
      validateOnBlur: true
    }
  );

  // Auto-save on critical field changes (with debounce)
  useEffect(() => {
    // Only auto-save if there are actual changes to critical fields
    const hasChanges = 
      local.name !== a.name || 
      local.tenant_name !== a.tenant_name ||
      local.rsf !== a.rsf ||
      local.market !== a.market;
    
    if (hasChanges && !isSubmitting) {
      const timeoutId = setTimeout(() => {
        // Trigger save for critical field changes
        // Use onSave directly to avoid form submission overhead
        onSave(local);
      }, 1500); // 1.5 second debounce for auto-save
      
      return () => clearTimeout(timeoutId);
    }
  }, [local.name, local.tenant_name, local.rsf, local.market, a.name, a.tenant_name, a.rsf, a.market, isSubmitting, local, onSave]);

  // Confirmation dialog functions
  const handleConfirmationResult = (section: string, confirmed: boolean) => {
    // This will be handled by the confirmation dialog
    console.log(`Section ${section} confirmed: ${confirmed}`);
  };

  const handleProceedAnyway = () => {
    if (pendingData) {
      onSave(pendingData);
      setShowConfirmation(false);
      setPendingData(null);
      setConfirmations([]);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingData(null);
    setConfirmations([]);
  };

  // Helper functions for nested updates
  const setKeyDates = (patch: Partial<AnalysisMeta["key_dates"]>) => {
    updateField('key_dates', { ...local.key_dates, ...patch });
  };

  const setOperating = (patch: Partial<AnalysisMeta["operating"]>) => {
    updateField('operating', { ...local.operating, ...patch });
  };

  const setParking = (patch: Partial<NonNullable<AnalysisMeta["parking"]>>) => {
    updateField('parking', { ...(local.parking ?? {}), ...patch });
  };

  const setConcessions = (patch: Partial<AnalysisMeta["concessions"]>) => {
    updateField('concessions', { ...local.concessions, ...patch });
  };

  // Abatement period management
  const setAbatementPeriod = (idx: number, patch: Partial<AbatementPeriod>) => {
    const periods = local.concessions.abatement_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  const addAbatementPeriod = () => {
    const periods = local.concessions.abatement_periods || [];
    const newPeriod: AbatementPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      free_rent_months: 0,
      abatement_applies_to: "base_only",
    };
    const updated = [...periods, newPeriod];
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  const deleteAbatementPeriod = (idx: number) => {
    const periods = local.concessions.abatement_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  // Escalation period management
  const setEscalationPeriod = (idx: number, patch: Partial<EscalationPeriod>) => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  const addEscalationPeriod = () => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const newPeriod: EscalationPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      escalation_percentage: 0,
    };
    const updated = [...periods, newPeriod];
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  const deleteEscalationPeriod = (idx: number) => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  // OpEx Escalation period management
  const setOpExEscalationPeriod = (idx: number, patch: Partial<OpExEscalationPeriod>) => {
    const periods = local.operating.escalation_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setOperating({ escalation_periods: updated });
  };

  const addOpExEscalationPeriod = () => {
    const periods = local.operating.escalation_periods || [];
    const newPeriod: OpExEscalationPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      escalation_percentage: 0,
    };
    const updated = [...periods, newPeriod];
    setOperating({ escalation_periods: updated });
  };

  const deleteOpExEscalationPeriod = (idx: number) => {
    const periods = local.operating.escalation_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    setOperating({ escalation_periods: updated });
  };

  // Handle OpEx escalation period reordering
  const handleOpExEscalationPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.operating.escalation_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("opex-escalation-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("opex-escalation-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        setOperating({ escalation_periods: reordered });
      }
    }
  };

  // Handle escalation period reordering
  const handleEscalationPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.rent_escalation?.escalation_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("escalation-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("escalation-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        updateField('rent_escalation', { 
          ...local.rent_escalation, 
          escalation_periods: reordered 
        });
      }
    }
  };

  // Handle abatement period reordering
  const handleAbatementPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.concessions.abatement_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("abatement-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("abatement-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        setConcessions({ abatement_periods: reordered });
      }
    }
  };

  const setRentRow = (idx: number, patch: Partial<RentRow>) => {
    const rs: RentRow[] = local.rent_schedule.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );
    updateField('rent_schedule', rs);
  };

  // Backward compatibility: Initialize rent_escalation from existing rent_schedule if not set
  useEffect(() => {
    if (!local.rent_escalation && local.rent_schedule.length > 0) {
      const firstPeriod = local.rent_schedule[0];
      if (firstPeriod.escalation_percentage !== undefined) {
        updateField('rent_escalation', {
          escalation_type: "fixed",
          fixed_escalation_percentage: firstPeriod.escalation_percentage,
        });
      }
    }
  }, []); // Only run once on mount

  // Backward compatibility: Initialize operating escalation_type from existing data
  useEffect(() => {
    if (!local.operating.escalation_type && local.operating.escalation_value !== undefined) {
      setOperating({ escalation_type: "fixed" });
    }
  }, []); // Only run once on mount

  // Get or create default rent schedule period
  const defaultRentPeriod = local.rent_schedule.length > 0 
    ? local.rent_schedule[0] 
    : {
        period_start: local.key_dates.commencement || "",
        period_end: local.key_dates.expiration || "",
        rent_psf: 0,
        escalation_percentage: 0,
      };

  // Update default rent period when simple form fields change
  const updateDefaultRentPeriod = (updates: Partial<RentRow>) => {
    const updatedPeriod: RentRow = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      rent_psf: defaultRentPeriod.rent_psf,
      escalation_percentage: defaultRentPeriod.escalation_percentage || 0,
      ...updates,
    };

    // Update or create first period
    const newSchedule = local.rent_schedule.length > 0
      ? [updatedPeriod, ...local.rent_schedule.slice(1)]
      : [updatedPeriod];
    
    updateField('rent_schedule', newSchedule);
  };

  // Backward compatibility: Calculate lease_term from existing dates if not set
  useEffect(() => {
    if (!local.lease_term && local.key_dates.commencement && local.key_dates.expiration) {
      const calculated = calculateLeaseTermFromDates(
        local.key_dates.commencement,
        local.key_dates.expiration
      );
      if (calculated) {
        updateField('lease_term', {
          ...calculated,
          include_abatement_in_term: false, // Default to false for backward compatibility
        });
      }
    }
  }, []); // Only run once on mount

  // Sync default period dates when key dates change
  useEffect(() => {
    if (local.rent_schedule.length > 0 && local.key_dates.commencement && local.key_dates.expiration) {
      const firstPeriod = local.rent_schedule[0];
      if (firstPeriod.period_start !== local.key_dates.commencement || 
          firstPeriod.period_end !== local.key_dates.expiration) {
        // Update only the dates, preserve other fields
        const updatedPeriod: RentRow = {
          ...firstPeriod,
          period_start: local.key_dates.commencement,
          period_end: local.key_dates.expiration,
        };
        const newSchedule = [updatedPeriod, ...local.rent_schedule.slice(1)];
        updateField('rent_schedule', newSchedule);
      }
    }
  }, [local.key_dates.commencement, local.key_dates.expiration, local.rent_schedule.length]);

  const addRentRow = () => {
    const newSchedule = [
      ...local.rent_schedule,
      {
        period_start: local.key_dates.expiration,
        period_end: local.key_dates.expiration,
        rent_psf: 0,
        escalation_percentage: 0.03,
        free_rent_months: 0,
        abatement_applies_to: "base_only" as const,
      },
    ];
    updateField('rent_schedule', newSchedule);
  };

  const deleteRentRow = (idx: number) => {
    const newSchedule = local.rent_schedule.filter((_, i) => i !== idx);
    updateField('rent_schedule', newSchedule);
  };

  // Calculate section completion status
  const sectionStatuses = getAllSectionStatuses(local, errors);
  const overallStatus = getOverallCompletionStatus(sectionStatuses);

  // AI Insights
  const marketData = React.useMemo(() => {
    if (local.market) {
      return getMarketBasedSuggestions(local.market);
    }
    return undefined;
  }, [local.market]);

  const proposalRecommendations = React.useMemo(() => {
    return getProposalRecommendations(local, marketData ? {
      avgRentPSF: marketData.rentRate,
      avgFreeRentMonths: marketData.commonTerm,
      avgTIAllowance: marketData.tiAllowance,
      avgTerm: marketData.leaseTerm,
    } : undefined);
  }, [local, marketData]);

  const missingInfo = React.useMemo(() => detectMissingInformation(local), [local]);
  const timelineWarnings = React.useMemo(() => detectTimelineConflicts(local), [local]);

  return (
    <>
      {/* Confirmation dialog */}
      {showConfirmation && (
        <ConfirmationDialog
          confirmations={confirmations}
          onConfirm={handleConfirmationResult}
          onCancel={handleCancelConfirmation}
          onProceedAnyway={handleProceedAnyway}
        />
      )}
      
      {/* Section Completion Overview */}
      <Card className="rounded-2xl mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Form Completion</span>
            <span className="text-sm font-normal text-muted-foreground">
              {overallStatus.completedSections} of {overallStatus.totalSections} sections complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SectionProgressBar 
              status={{
                name: 'Overall',
                isComplete: overallStatus.overallPercentage === 100,
                hasWarnings: overallStatus.sectionsWithWarnings > 0,
                hasErrors: overallStatus.sectionsWithErrors > 0,
                completionPercentage: overallStatus.overallPercentage
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {sectionStatuses.map((status, index) => (
                <SectionIndicator key={index} status={status} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ValidatedInput
              label="Client"
              value={local.name}
              onChange={(e) => updateField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
              error={getFieldError('name')}
              showError={shouldShowFieldError('name')}
              placeholder="Enter client name"
            />
            <ValidatedInput
              label="Market"
              value={local.market}
              onChange={(e) => updateField('market', e.currentTarget.value)}
              onBlur={() => handleBlur('market')}
              error={getFieldError('market')}
              showError={shouldShowFieldError('market')}
              placeholder="Enter market"
            />
            <ValidatedInput
              label="RSF"
              type="number"
              value={local.rsf && local.rsf > 0 ? local.rsf : ""}
              onChange={(e) => {
                const newRSF = e.currentTarget.value ? Number(e.currentTarget.value) || 0 : 0;
                updateField('rsf', newRSF);
              }}
              onBlur={() => handleBlur('rsf')}
              error={getFieldError('rsf')}
              warning={getFieldWarning('rsf')}
              showError={shouldShowFieldError('rsf')}
              showWarning={shouldShowFieldWarning('rsf')}
              placeholder="Enter rentable square feet"
              min="1"
              step="1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ValidatedInput
              label="Commencement"
              type="date"
              value={local.key_dates.commencement || ""}
              onChange={(e) => {
                const newCommencement = e.currentTarget.value;
                setKeyDates({ commencement: newCommencement });
                
                // Recalculate expiration if lease term exists
                if (local.lease_term) {
                  const abatementMonths = getAbatementMonths(local.concessions);
                  const expiration = calculateExpiration(
                    newCommencement,
                    local.lease_term.years,
                    local.lease_term.months,
                    local.lease_term.include_abatement_in_term ?? false,
                    abatementMonths
                  );
                  setKeyDates({ expiration });
                }
              }}
              onBlur={() => handleBlur('key_dates')}
              error={getFieldError('key_dates')}
              showError={shouldShowFieldError('key_dates')}
              placeholder="Select lease commencement"
            />
            
            <div className="space-y-1">
              <Label className="text-sm font-medium leading-none">Lease Term</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <ValidatedInput
                  label="Years"
                  type="number"
                  value={local.lease_term?.years || 0}
                  onChange={(e) => {
                    const years = Number(e.currentTarget.value) || 0;
                    const months = local.lease_term?.months || 0;
                    const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
                    
                    updateField('lease_term', { years, months, include_abatement_in_term: includeAbatement });
                    
                    // Recalculate expiration
                    if (local.key_dates.commencement) {
                      const abatementMonths = getAbatementMonths(local.concessions);
                      const expiration = calculateExpiration(
                        local.key_dates.commencement,
                        years,
                        months,
                        includeAbatement,
                        abatementMonths
                      );
                      setKeyDates({ expiration });
                      
                      // Sync rent schedule period end dates
                      if (local.rent_schedule.length > 0) {
                        const syncedSchedule = syncRentScheduleToExpiration(local.rent_schedule, expiration);
                        updateField('rent_schedule', syncedSchedule);
                      }
                    }
                  }}
                  min="0"
                  placeholder="0"
                />
                <ValidatedInput
                  label="Months"
                  type="number"
                  value={local.lease_term?.months || 0}
                  onChange={(e) => {
                    const months = Number(e.currentTarget.value) || 0;
                    const years = local.lease_term?.years || 0;
                    const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
                    
                    updateField('lease_term', { years, months, include_abatement_in_term: includeAbatement });
                    
                    // Recalculate expiration
                    if (local.key_dates.commencement) {
                      const abatementMonths = getAbatementMonths(local.concessions);
                      const expiration = calculateExpiration(
                        local.key_dates.commencement,
                        years,
                        months,
                        includeAbatement,
                        abatementMonths
                      );
                      setKeyDates({ expiration });
                      
                      // Sync rent schedule period end dates
                      if (local.rent_schedule.length > 0) {
                        const syncedSchedule = syncRentScheduleToExpiration(local.rent_schedule, expiration);
                        updateField('rent_schedule', syncedSchedule);
                      }
                    }
                  }}
                  min="0"
                  max="11"
                  placeholder="0"
                />
              </div>
            </div>
          </div>
          
          <div>
            <Label>Expiration (Calculated)</Label>
            <Input
              type="date"
              value={local.key_dates.expiration || ""}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            {(() => {
              const abatementMonths = getAbatementMonths(local.concessions);
              const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
              if (abatementMonths > 0) {
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    {includeAbatement 
                      ? `Includes ${abatementMonths} month${abatementMonths !== 1 ? 's' : ''} of abatement`
                      : `Base term only (${abatementMonths} month${abatementMonths !== 1 ? 's' : ''} abatement not included)`
                    }
                  </p>
                );
              }
              return null;
            })()}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              label="Lease Type"
              value={local.lease_type || ""}
              onChange={(e) => updateField('lease_type', e.currentTarget.value ? (e.currentTarget.value as LeaseType) : undefined)}
              onBlur={() => handleBlur('lease_type')}
              error={getFieldError('lease_type')}
              showError={shouldShowFieldError('lease_type')}
              placeholder="Select lease type"
              options={[
                { value: 'FS', label: 'Full Service (FS)' },
                { value: 'NNN', label: 'Triple Net (NNN)' },
              ]}
            />
            {local.lease_type === "FS" && (
              <Select
                label="Base Year (FS)"
                value={local.base_year?.toString() ?? ""}
                onChange={(e) => updateField('base_year', e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
                onBlur={() => handleBlur('base_year')}
                error={getFieldError('base_year')}
                showError={shouldShowFieldError('base_year')}
                placeholder="Select base year"
                options={Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return { value: year.toString(), label: year.toString() };
                })}
              />
            )}
          </div>
          {/* Validation Summary */}
          {errors.length > 0 && (
            <div className="space-y-2">
              {/* Critical Errors */}
              {errors.filter(e => e.severity === 'error').length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {errors.filter(e => e.severity === 'error').length} critical {errors.filter(e => e.severity === 'error').length === 1 ? 'error' : 'errors'}
                    </span>
                  </div>
                  <div className="text-xs text-destructive space-y-1">
                    {errors.filter(e => e.severity === 'error').slice(0, 3).map((error, idx) => (
                      <div key={idx}>• {error.message}</div>
                    ))}
                    {errors.filter(e => e.severity === 'error').length > 3 && (
                      <div>• ... and {errors.filter(e => e.severity === 'error').length - 3} more</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Warnings */}
              {errors.filter(e => e.severity === 'warning').length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {errors.filter(e => e.severity === 'warning').length} warning{errors.filter(e => e.severity === 'warning').length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    {errors.filter(e => e.severity === 'warning').slice(0, 3).map((warning, idx) => (
                      <div key={idx}>• {warning.message}</div>
                    ))}
                    {errors.filter(e => e.severity === 'warning').length > 3 && (
                      <div>• ... and {errors.filter(e => e.severity === 'warning').length - 3} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button 
              onClick={(e) => handleSubmit(e)} 
              disabled={!isValid || isSubmitting}
              className="rounded-2xl"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" className="rounded-2xl">
              <Upload className="mr-2 h-4 w-4" />
              Attach
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tenant Improvements, Rent Abatement, and Other Concessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CurrencyInput
              label="TI Allowance $/SF"
              value={local.concessions.ti_allowance_psf}
              onChange={(value) => setConcessions({ ti_allowance_psf: value })}
              placeholder="0.00"
              hint="Tenant improvement allowance per square foot"
            />
            <CurrencyInput
              label="TI Actual Cost $/SF"
              value={local.concessions.ti_actual_build_cost_psf}
              onChange={(value) => setConcessions({ ti_actual_build_cost_psf: value })}
              placeholder="0.00"
              hint="Actual cost to build per square foot"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CurrencyInput
              label="Moving Allowance"
              value={local.concessions.moving_allowance}
              onChange={(value) => setConcessions({ moving_allowance: value })}
              placeholder="0.00"
              hint="Total moving allowance"
            />
            <CurrencyInput
              label="Other Concessions"
              value={local.concessions.other_credits}
              onChange={(value) => setConcessions({ other_credits: value })}
              placeholder="0.00"
              hint="Other tenant credits"
            />
          </div>
          
          {/* Rent Abatement Section */}
          <div className="pt-2 border-t">
            <h3 className="text-sm font-medium mb-2">Rent Abatement</h3>
            <div className="space-y-3">
              <Select
                label="Abatement Type"
                value={local.concessions.abatement_type || "at_commencement"}
                onChange={(e) => {
                  const abatementType = e.currentTarget.value as "at_commencement" | "custom";
                  if (abatementType === "at_commencement") {
                    // Clear custom periods when switching to at_commencement
                    setConcessions({ 
                      abatement_type: abatementType,
                      abatement_periods: undefined 
                    });
                  } else {
                    // Initialize with empty periods array when switching to custom
                    setConcessions({ 
                      abatement_type: abatementType,
                      abatement_periods: local.concessions.abatement_periods || []
                    });
                  }
                }}
                placeholder="Select abatement type"
                options={[
                  { value: 'at_commencement', label: 'Apply at Commencement' },
                  { value: 'custom', label: 'Custom Abatement' },
                ]}
              />

              {(local.concessions.abatement_type === "at_commencement" || !local.concessions.abatement_type) ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ValidatedInput
                      label="Free Rent Months"
                      type="number"
                      value={local.concessions.abatement_free_rent_months ?? 0}
                      onChange={(e) => {
                        const newMonths = Number(e.currentTarget.value) || 0;
                        setConcessions({ abatement_free_rent_months: newMonths });
                        
                        // Recalculate expiration if lease term exists
                        if (local.lease_term && local.key_dates.commencement) {
                          const expiration = calculateExpiration(
                            local.key_dates.commencement,
                            local.lease_term.years,
                            local.lease_term.months,
                            local.lease_term.include_abatement_in_term ?? false,
                            newMonths
                          );
                          setKeyDates({ expiration });
                        }
                      }}
                      placeholder="0"
                      min="0"
                      hint="Number of months of free rent at commencement"
                    />
                    <Select
                      label="Abatement Applies To"
                      value={local.concessions.abatement_applies_to || "base_only"}
                      onChange={(e) => setConcessions({ abatement_applies_to: e.currentTarget.value as "base_only" | "base_plus_nnn" })}
                      placeholder="Select abatement type"
                      options={[
                        { value: 'base_only', label: 'Base Rent Only' },
                        { value: 'base_plus_nnn', label: 'Base Rent + NNN' },
                      ]}
                    />
                  </div>
                  
                  {/* Toggle to include abatement months in lease term - Always visible */}
                  {local.lease_term && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id="include-abatement-in-term"
                        checked={local.lease_term.include_abatement_in_term ?? false}
                        onChange={(e) => {
                          const includeAbatement = e.target.checked;
                          const years = local.lease_term?.years || 0;
                          const months = local.lease_term?.months || 0;
                          const abatementMonths = local.concessions.abatement_free_rent_months ?? 0;
                          
                          updateField('lease_term', { 
                            years, 
                            months, 
                            include_abatement_in_term: includeAbatement 
                          });
                          
                          // Recalculate expiration
                          if (local.key_dates.commencement) {
                            const expiration = calculateExpiration(
                              local.key_dates.commencement,
                              years,
                              months,
                              includeAbatement,
                              abatementMonths
                            );
                            setKeyDates({ expiration });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="include-abatement-in-term" className="text-sm font-normal cursor-pointer">
                        Add free rent months to lease term
                      </Label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Abatement Periods</Label>
                    <Button variant="outline" onClick={addAbatementPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.concessions.abatement_periods && local.concessions.abatement_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleAbatementPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.concessions.abatement_periods.map((_, idx) => `abatement-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.concessions.abatement_periods.map((period, idx) => (
                            <AbatementPeriodRow
                              key={`abatement-period-${idx}`}
                              id={`abatement-period-${idx}`}
                              period={period}
                              idx={idx}
                              setAbatementPeriod={setAbatementPeriod}
                              deleteAbatementPeriod={deleteAbatementPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No abatement periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                  
                  {/* Toggle to include abatement months in lease term - Always visible */}
                  {local.lease_term && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id="include-abatement-in-term-custom"
                        checked={local.lease_term.include_abatement_in_term ?? false}
                        onChange={(e) => {
                          const includeAbatement = e.target.checked;
                          const years = local.lease_term?.years || 0;
                          const months = local.lease_term?.months || 0;
                          const abatementMonths = getAbatementMonths(local.concessions);
                          
                          updateField('lease_term', { 
                            years, 
                            months, 
                            include_abatement_in_term: includeAbatement 
                          });
                          
                          // Recalculate expiration
                          if (local.key_dates.commencement) {
                            const expiration = calculateExpiration(
                              local.key_dates.commencement,
                              years,
                              months,
                              includeAbatement,
                              abatementMonths
                            );
                            setKeyDates({ expiration });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="include-abatement-in-term-custom" className="text-sm font-normal cursor-pointer">
                        Add free rent months to lease term
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* TI Shortfall Summary */}
          {local.concessions.ti_actual_build_cost_psf !== undefined && local.concessions.ti_allowance_psf !== undefined && (
            <div className="bg-muted/50 border rounded-lg p-2 mt-2">
              <div className="text-sm font-medium mb-1.5">TI Shortfall Analysis</div>
              {(() => {
                const shortfall = calculateTIShortfall(
                  local.rsf,
                  local.concessions.ti_allowance_psf,
                  local.concessions.ti_actual_build_cost_psf,
                  undefined
                );
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Allowance Total:</span>
                      <div className="font-medium">${shortfall.allowanceTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual Cost Total:</span>
                      <div className="font-medium">${shortfall.actualCostTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tenant Contribution:</span>
                      <div className={`font-medium ${shortfall.tenantContribution > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${shortfall.tenantContribution.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:col-span-2">
        <CardHeader>
          <CardTitle>
            {local.lease_type === "FS" 
              ? "Base Rent, Operating Expense Pass-Throughs, and Parking"
              : "Base Rent, Operating Expenses, and Parking"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {/* Base Rent Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">Base Rent</h3>
            <div className="space-y-3">
              <CurrencyInput
                label="Base Rent $/SF"
                value={defaultRentPeriod.rent_psf}
                onChange={(value) => updateDefaultRentPeriod({ rent_psf: value || 0 })}
                placeholder="0.00"
                hint="Base rent per square foot per year ($/SF/yr)"
                currency="$/SF"
              />
              
              <Select
                label="Escalation Type"
                value={local.rent_escalation?.escalation_type || "fixed"}
                onChange={(e) => {
                  const escalationType = e.currentTarget.value as "fixed" | "custom";
                  if (escalationType === "fixed") {
                    // Clear custom periods when switching to fixed
                    updateField('rent_escalation', { 
                      escalation_type: escalationType,
                      escalation_periods: undefined 
                    });
                  } else {
                    // Initialize with empty periods array when switching to custom
                    updateField('rent_escalation', { 
                      escalation_type: escalationType,
                      escalation_periods: local.rent_escalation?.escalation_periods || []
                    });
                  }
                }}
                placeholder="Select escalation type"
                options={[
                  { value: 'fixed', label: 'Fixed Annual Escalations' },
                  { value: 'custom', label: 'Custom Escalations' },
                ]}
              />

              {(local.rent_escalation?.escalation_type === "fixed" || !local.rent_escalation?.escalation_type) ? (
                <PercentageInput
                  label="Annual Escalation"
                  value={(local.rent_escalation?.fixed_escalation_percentage ?? (defaultRentPeriod.escalation_percentage ?? 0)) * 100}
                  onChange={(value) => {
                    const escalationPercentage = (value || 0) / 100;
                    updateField('rent_escalation', { 
                      escalation_type: "fixed",
                      fixed_escalation_percentage: escalationPercentage
                    });
                    // Also update the default rent period for backward compatibility
                    updateDefaultRentPeriod({ escalation_percentage: escalationPercentage });
                  }}
                  placeholder="3.0"
                  hint="Annual escalation rate (applies to entire lease term)"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Escalation Periods</Label>
                    <Button variant="outline" onClick={addEscalationPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.rent_escalation?.escalation_periods && local.rent_escalation.escalation_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleEscalationPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.rent_escalation.escalation_periods.map((_, idx) => `escalation-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.rent_escalation.escalation_periods.map((period, idx) => (
                            <EscalationPeriodRow
                              key={`escalation-period-${idx}`}
                              id={`escalation-period-${idx}`}
                              period={period}
                              idx={idx}
                              setEscalationPeriod={setEscalationPeriod}
                              deleteEscalationPeriod={deleteEscalationPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No escalation periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Operating Expenses Section */}
          <div className="pt-3 border-t">
            <h3 className="text-sm font-medium mb-2">
              {local.lease_type === "FS" ? "Operating Expense Pass-Throughs" : "Operating Expenses"}
            </h3>
            <div className="space-y-3">
              <CurrencyInput
                label="OpEx $/SF"
                value={local.operating.est_op_ex_psf}
                onChange={(value) => setOperating({ est_op_ex_psf: value })}
                placeholder="0.00"
                hint={
                  local.lease_type === "FS" 
                    ? "Base year operating expenses per square foot (tenant pays increases above this)"
                    : "Estimated operating expenses per square foot"
                }
              />
              
              <Select
                label="Escalation Type"
                value={local.operating.escalation_type || "fixed"}
                onChange={(e) => {
                  const escalationType = e.currentTarget.value as "fixed" | "custom";
                  if (escalationType === "fixed") {
                    // Clear custom periods when switching to fixed
                    setOperating({ 
                      escalation_type: escalationType,
                      escalation_periods: undefined 
                    });
                  } else {
                    // Initialize with empty periods array when switching to custom
                    setOperating({ 
                      escalation_type: escalationType,
                      escalation_periods: local.operating.escalation_periods || []
                    });
                  }
                }}
                placeholder="Select escalation type"
                options={[
                  { value: 'fixed', label: 'Fixed Annual Escalations' },
                  { value: 'custom', label: 'Custom Escalations' },
                ]}
              />

              {(local.operating.escalation_type === "fixed" || !local.operating.escalation_type) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <PercentageInput
                    label="OpEx Escalation %"
                    value={(local.operating.escalation_value ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_value: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Annual escalation rate (fixed percentage)"
                  />
                  <PercentageInput
                    label="OpEx Escalation Cap"
                    value={(local.operating.escalation_cap ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_cap: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Maximum escalation rate (optional)"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Escalation Periods</Label>
                    <Button variant="outline" onClick={addOpExEscalationPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.operating.escalation_periods && local.operating.escalation_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleOpExEscalationPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.operating.escalation_periods.map((_, idx) => `opex-escalation-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.operating.escalation_periods.map((period, idx) => (
                            <OpExEscalationPeriodRow
                              key={`opex-escalation-period-${idx}`}
                              id={`opex-escalation-period-${idx}`}
                              period={period}
                              idx={idx}
                              setOpExEscalationPeriod={setOpExEscalationPeriod}
                              deleteOpExEscalationPeriod={deleteOpExEscalationPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No escalation periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                  <PercentageInput
                    label="OpEx Escalation Cap"
                    value={(local.operating.escalation_cap ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_cap: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Maximum escalation rate (optional, applies to all periods)"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Parking Section */}
          <div className="pt-3 border-t">
            <h3 className="text-sm font-medium mb-2">Parking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <ValidatedInput
                label="# Spaces"
                type="number"
                value={local.parking?.stalls ?? 0}
                onChange={(e) => setParking({ stalls: Number(e.currentTarget.value) })}
                placeholder="0"
                min="0"
                hint="Number of parking spaces"
              />
              <CurrencyInput
                label="Parking Rate $/stall/mo"
                value={local.parking?.monthly_rate_per_stall}
                onChange={(value) => setParking({ monthly_rate_per_stall: value })}
                placeholder="0.00"
                hint="Monthly parking rate per stall"
              />
              <PercentageInput
                label="Parking Escalation %"
                value={local.parking?.escalation_value}
                onChange={(value) => setParking({ escalation_value: value })}
                placeholder="0.00"
                hint="Annual escalation rate (fixed percentage)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Transaction Costs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <CurrencyInput
              label="Legal Fees"
              value={local.transaction_costs?.legal_fees}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (value || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, legal_fees: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Brokerage Fees"
              value={local.transaction_costs?.brokerage_fees}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (value || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, brokerage_fees: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Due Diligence"
              value={local.transaction_costs?.due_diligence}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (value || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, due_diligence: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Environmental"
              value={local.transaction_costs?.environmental}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (value || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, environmental: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Other"
              value={local.transaction_costs?.other}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (value || 0);
                updateField('transaction_costs', { ...current, other: value, total });
              }}
              placeholder="0.00"
            />
            <div className="flex items-center gap-2 border rounded-lg p-3 bg-muted/50">
              <Label className="text-sm font-medium">Total:</Label>
              <span className="text-sm font-semibold">
                ${(local.transaction_costs?.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Financing / Amortization</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amortize Costs</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_ti || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_ti: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_free_rent: local.financing?.amortize_free_rent || false,
                      amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize TI Allowance</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_free_rent || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_free_rent: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_ti: local.financing?.amortize_ti || false,
                      amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize Free Rent</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_transaction_costs || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_transaction_costs: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_ti: local.financing?.amortize_ti || false,
                      amortize_free_rent: local.financing?.amortize_free_rent || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize Transaction Costs</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Select
                label="Amortization Method"
                value={local.financing?.amortization_method || "straight_line"}
                onChange={(e) => updateField('financing', {
                  ...local.financing,
                  amortization_method: e.currentTarget.value as "straight_line" | "present_value",
                  amortize_ti: local.financing?.amortize_ti || false,
                  amortize_free_rent: local.financing?.amortize_free_rent || false,
                  amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                })}
                options={[
                  { value: 'straight_line', label: 'Straight Line' },
                  { value: 'present_value', label: 'Present Value' },
                ]}
              />
              {local.financing?.amortization_method === "present_value" && (
                <PercentageInput
                  label="Interest Rate"
                  value={local.financing?.interest_rate}
                  onChange={(value) => updateField('financing', {
                    ...local.financing,
                    interest_rate: value,
                  })}
                  placeholder="8.0"
                  hint="Interest rate for PV amortization"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:col-span-2">
        <CardHeader>
          <CardTitle>These notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={local.notes || ""}
            onChange={(e) => updateField('notes', e.currentTarget.value)}
            placeholder="Enter notes about this analysis..."
            rows={6}
            className="min-h-[150px]"
          />
          
          <div className="space-y-2">
            <Label>Files</Label>
            <div className="flex flex-wrap gap-2">
              {local.attachedFiles && local.attachedFiles.length > 0 && local.attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const newFiles = local.attachedFiles?.filter((_, i) => i !== idx) || [];
                      updateField('attachedFiles', newFiles);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    const newFiles = files.map(file => ({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      file: file,
                    }));
                    const existingFiles = local.attachedFiles || [];
                    updateField('attachedFiles', [...existingFiles, ...newFiles]);
                  }
                  // Reset input
                  e.target.value = '';
                }}
                multiple
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Add files
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PDF or Word documents (max 10MB per file)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}

// Helper function to export table to CSV
function exportTableToCSV(lines: AnnualLine[], rsf: number, meta: AnalysisMeta): void {
  if (typeof window === 'undefined') return; // Server-side guard
  if (!lines || lines.length === 0) return; // Empty data guard
  if (!rsf || rsf <= 0) return; // Invalid RSF guard
  
  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  
  // Calculate cumulative
  let cumulative = 0;
  const cumulativeValues: number[] = [];
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
  });
  
  // Build CSV headers
  const headers = [
    'Year',
    'Base Rent',
    'Base Rent $/SF',
    'Op. Pass-Through',
    'Parking',
    'Abatement (credit)',
    ...(hasTIShortfall ? ['TI Shortfall'] : []),
    ...(hasTransactionCosts ? ['Transaction Costs'] : []),
    ...(hasAmortizedCosts ? ['Amortized Costs'] : []),
    'Subtotal',
    'Net Cash Flow',
    'Net CF $/SF',
    'Cumulative NCF',
  ];
  
  // Build CSV rows
  const rows = lines.map((r, idx) => [
    r.year.toString(),
    r.base_rent.toFixed(2),
    (rsf > 0 ? (r.base_rent / rsf) : 0).toFixed(2),
    r.operating.toFixed(2),
    (r.parking || 0).toFixed(2),
    r.abatement_credit.toFixed(2),
    ...(hasTIShortfall ? [(r.ti_shortfall || 0).toFixed(2)] : []),
    ...(hasTransactionCosts ? [(r.transaction_costs || 0).toFixed(2)] : []),
    ...(hasAmortizedCosts ? [(r.amortized_costs || 0).toFixed(2)] : []),
    r.subtotal.toFixed(2),
    r.net_cash_flow.toFixed(2),
    (rsf > 0 ? (r.net_cash_flow / rsf) : 0).toFixed(2),
    (cumulativeValues[idx] || 0).toFixed(2),
  ]);
  
  // Calculate totals
  const totals = lines.reduce((acc, r) => ({
    base_rent: acc.base_rent + r.base_rent,
    operating: acc.operating + r.operating,
    parking: acc.parking + (r.parking || 0),
    abatement_credit: acc.abatement_credit + r.abatement_credit,
    ti_shortfall: acc.ti_shortfall + (r.ti_shortfall || 0),
    transaction_costs: acc.transaction_costs + (r.transaction_costs || 0),
    amortized_costs: acc.amortized_costs + (r.amortized_costs || 0),
    subtotal: acc.subtotal + r.subtotal,
    net_cash_flow: acc.net_cash_flow + r.net_cash_flow,
  }), {
    base_rent: 0,
    operating: 0,
    parking: 0,
    abatement_credit: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  });
  
  const avgBaseRentPSF = totals.base_rent / (rsf * lines.length);
  const avgNetCFPSF = totals.net_cash_flow / (rsf * lines.length);
  
  // Add totals row
  rows.push([
    'TOTAL',
    totals.base_rent.toFixed(2),
    avgBaseRentPSF.toFixed(2),
    totals.operating.toFixed(2),
    totals.parking.toFixed(2),
    totals.abatement_credit.toFixed(2),
    ...(hasTIShortfall ? [totals.ti_shortfall.toFixed(2)] : []),
    ...(hasTransactionCosts ? [totals.transaction_costs.toFixed(2)] : []),
    ...(hasAmortizedCosts ? [totals.amortized_costs.toFixed(2)] : []),
    totals.subtotal.toFixed(2),
    totals.net_cash_flow.toFixed(2),
    avgNetCFPSF.toFixed(2),
    cumulativeValues[cumulativeValues.length - 1].toFixed(2),
  ]);
  
  // Convert to CSV string
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  // Download
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.name.replace(/[^a-z0-9]/gi, '_')}_cashflow_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
  }
}

// Helper function to copy table to clipboard
function copyTableToClipboard(lines: AnnualLine[], rsf: number, meta: AnalysisMeta): void {
  if (typeof window === 'undefined') return; // Server-side guard
  if (typeof navigator === 'undefined' || !navigator.clipboard) return; // Clipboard API not available
  if (!lines || lines.length === 0) return; // Empty data guard
  if (!rsf || rsf <= 0) return; // Invalid RSF guard
  
  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  
  let cumulative = 0;
  const cumulativeValues: number[] = [];
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
  });
  
  const fmtPSF = (value: number) => `$${(value || 0).toFixed(2)}/SF`;
  
  // Build text table
  const headers = [
    'Year',
    'Base Rent',
    'Base Rent $/SF',
    'Op. Pass-Through',
    'Parking',
    'Abatement',
    ...(hasTIShortfall ? ['TI Shortfall'] : []),
    ...(hasTransactionCosts ? ['Trans. Costs'] : []),
    ...(hasAmortizedCosts ? ['Amortized'] : []),
    'Subtotal',
    'Net CF',
    'Net CF $/SF',
    'Cumulative',
  ].join('\t');
  
  const rows = lines.map((r, idx) => [
    r.year.toString(),
    fmtMoney(r.base_rent),
    fmtPSF(rsf > 0 ? (r.base_rent / rsf) : 0),
    fmtMoney(r.operating),
    fmtMoney(r.parking || 0),
    fmtMoney(r.abatement_credit),
    ...(hasTIShortfall ? [fmtMoney(r.ti_shortfall || 0)] : []),
    ...(hasTransactionCosts ? [fmtMoney(r.transaction_costs || 0)] : []),
    ...(hasAmortizedCosts ? [fmtMoney(r.amortized_costs || 0)] : []),
    fmtMoney(r.subtotal),
    fmtMoney(r.net_cash_flow),
    fmtPSF(rsf > 0 ? (r.net_cash_flow / rsf) : 0),
    fmtMoney(cumulativeValues[idx] || 0),
  ].join('\t'));
  
  const textContent = [headers, ...rows].join('\n');
  
  try {
    navigator.clipboard.writeText(textContent).then(() => {
      // Could show a toast notification here
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  } catch (error) {
    console.error('Clipboard API not available:', error);
  }
}

const AnalysisTab = React.memo(function AnalysisTab({ lines, meta }: { lines: AnnualLine[]; meta: AnalysisMeta }) {
  // Check for missing critical data
  const dataQuality = React.useMemo(() => {
    const issues: string[] = [];
    if (!meta.key_dates.commencement || !meta.key_dates.expiration) {
      issues.push("Missing lease dates");
    }
    if (!meta.rsf || meta.rsf === 0) {
      issues.push("RSF not set");
    }
    if (!meta.rent_schedule || meta.rent_schedule.length === 0) {
      issues.push("No rent schedule");
    }
    if (lines.length === 0) {
      issues.push("No cashflow data");
    }
    return {
      hasIssues: issues.length > 0,
      issues,
    };
  }, [meta, lines]);

  const yieldMetrics = React.useMemo(() => {
    // Calculate initial investment (TI + transaction costs + free rent value + TI shortfall if paid upfront)
    const tiTotal = (meta.concessions.ti_allowance_psf || 0) * meta.rsf;
    const transactionTotal = meta.transaction_costs?.total || 0;
    const freeRentValue = meta.rent_schedule.length > 0 
      ? (() => {
          let freeRentValue = 0;
          if (meta.concessions?.abatement_type === "at_commencement") {
            const freeMonths = meta.concessions.abatement_free_rent_months || 0;
            if (freeMonths > 0 && meta.rent_schedule.length > 0) {
              freeRentValue = (freeMonths / 12) * (meta.rent_schedule[0].rent_psf * meta.rsf);
            }
          } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
            for (const period of meta.concessions.abatement_periods) {
              let rentRate = 0;
              for (const r of meta.rent_schedule) {
                const rStart = new Date(r.period_start);
                const rEnd = new Date(r.period_end);
                const periodStart = new Date(period.period_start);
                if (periodStart >= rStart && periodStart <= rEnd) {
                  rentRate = r.rent_psf;
                  break;
                }
              }
              freeRentValue += (period.free_rent_months / 12) * (rentRate * meta.rsf);
            }
          }
          return freeRentValue;
        })()
      : 0;
    const tiShortfall = lines.length > 0 && lines[0].ti_shortfall ? lines[0].ti_shortfall : 0;
    const initialInvestment = tiTotal + transactionTotal + freeRentValue + tiShortfall;
    
    const discountRate = meta.cashflow_settings?.discount_rate || 0.08;
    return calculateLandlordYield(lines, initialInvestment, discountRate);
  }, [lines, meta]);

  // Calculate summary statistics
  const summaryStats = React.useMemo(() => {
    const totalLeaseValue = lines.reduce((sum, line) => sum + line.net_cash_flow, 0);
    const averageAnnualCashflow = lines.length > 0 ? totalLeaseValue / lines.length : 0;
    
    // Calculate lease term - handle missing dates gracefully
    let leaseTermYears = 0;
    let leaseTermMonths = 0;
    if (meta.key_dates.commencement && meta.key_dates.expiration) {
      const commencement = new Date(meta.key_dates.commencement);
      const expiration = new Date(meta.key_dates.expiration);
      if (!isNaN(commencement.getTime()) && !isNaN(expiration.getTime()) && expiration > commencement) {
        leaseTermYears = (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
        leaseTermMonths = Math.round(leaseTermYears * 12);
      }
    }
    
    // Use actual lease term or fallback to number of years in cashflow
    const effectiveTermYears = leaseTermYears > 0 ? leaseTermYears : lines.length;
    const effectiveRentPSFValue = effectiveRentPSF(lines, meta.rsf, effectiveTermYears);
    
    const startingRent = lines.length > 0 ? lines[0].base_rent : 0;
    const endingRent = lines.length > 0 ? lines[lines.length - 1].base_rent : 0;
    
    // Calculate free rent value for concessions total
    const freeRentValue = meta.rent_schedule.length > 0 
      ? (() => {
          let freeRentValue = 0;
          if (meta.concessions?.abatement_type === "at_commencement") {
            const freeMonths = meta.concessions.abatement_free_rent_months || 0;
            if (freeMonths > 0 && meta.rent_schedule.length > 0) {
              freeRentValue = (freeMonths / 12) * (meta.rent_schedule[0].rent_psf * meta.rsf);
            }
          } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
            for (const period of meta.concessions.abatement_periods) {
              let rentRate = 0;
              for (const r of meta.rent_schedule) {
                const rStart = new Date(r.period_start);
                const rEnd = new Date(r.period_end);
                const periodStart = new Date(period.period_start);
                if (periodStart >= rStart && periodStart <= rEnd) {
                  rentRate = r.rent_psf;
                  break;
                }
              }
              freeRentValue += (period.free_rent_months / 12) * (rentRate * meta.rsf);
            }
          }
          return freeRentValue;
        })()
      : 0;
    
    const totalConcessions = 
      (meta.concessions.ti_allowance_psf || 0) * meta.rsf +
      (meta.concessions.moving_allowance || 0) +
      (meta.concessions.other_credits || 0) +
      freeRentValue;
    
    return {
      totalLeaseValue,
      averageAnnualCashflow,
      effectiveRentPSFValue,
      leaseTermYears,
      leaseTermMonths,
      startingRent,
      endingRent,
      totalConcessions,
      freeRentValue,
    };
  }, [lines, meta]);

  // Calculate lease term display
  const leaseTermDisplay = React.useMemo(() => {
    if (summaryStats.leaseTermYears <= 0 && summaryStats.leaseTermMonths <= 0) {
      return "Not set";
    }
    const years = Math.floor(summaryStats.leaseTermYears);
    const months = summaryStats.leaseTermMonths % 12;
    if (years > 0 && months > 0) {
      return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`;
    } else if (years > 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    } else {
      return `${months} month${months !== 1 ? 's' : ''}`;
    }
  }, [summaryStats.leaseTermYears, summaryStats.leaseTermMonths]);

  return (
    <div className="space-y-4">
      {/* Data Quality Warning */}
      {dataQuality.hasIssues && (
        <Card className="rounded-2xl border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>Incomplete Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-2">
              Some calculations may be inaccurate due to missing information:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {dataQuality.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Deal Terms Summary Card */}
      <DealTermsSummaryCard meta={meta} />

      {/* Lease Summary Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lease Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Lease Term</Label>
              <div className="text-sm font-semibold">{leaseTermDisplay}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">RSF</Label>
              <div className="text-sm font-semibold">{meta.rsf.toLocaleString()} SF</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lease Type</Label>
              <div className="text-sm font-semibold">{meta.lease_type === 'FS' ? 'Full Service' : 'Triple Net'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Market</Label>
              <div className="text-sm font-semibold">{meta.market}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Commencement</Label>
              <div className="text-sm font-semibold">
                {meta.key_dates.commencement 
                  ? new Date(meta.key_dates.commencement).toLocaleDateString()
                  : "Not set"}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expiration</Label>
              <div className="text-sm font-semibold">
                {meta.key_dates.expiration 
                  ? new Date(meta.key_dates.expiration).toLocaleDateString()
                  : "Not set"}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Statistics Card */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Lease Value</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.totalLeaseValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Avg. Annual Cashflow</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.averageAnnualCashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Effective Rent $/SF</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.effectiveRentPSFValue.toFixed(2)}/SF/yr
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Starting Rent</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.startingRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ending Rent</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.endingRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Concessions</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.totalConcessions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Yield Metrics Summary */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Financial Metrics</span>
            <span className="text-xs font-normal text-muted-foreground">
              Discount Rate: {((meta.cashflow_settings?.discount_rate || 0.08) * 100).toFixed(1)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Return Metrics */}
            <div>
              <Label className="text-sm font-medium mb-2 block">Return Metrics</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground" title="Net Present Value at discount rate">NPV</Label>
                  <div className="text-xl font-bold text-primary">
                    ${yieldMetrics.npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="NPV per square foot per year">NPV $/SF/yr</Label>
                  <div className="text-xl font-bold text-primary">
                    {summaryStats.leaseTermYears > 0 && meta.rsf > 0 
                      ? `$${(yieldMetrics.npv / (meta.rsf * summaryStats.leaseTermYears)).toFixed(2)}/SF/yr`
                      : "$0.00/SF/yr"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Internal Rate of Return - annualized return percentage">IRR</Label>
                  <div className="text-xl font-bold text-primary">
                    {yieldMetrics.irr.toFixed(2)}%
                  </div>
                  {yieldMetrics.irr > 0 && yieldMetrics.irr < 8 && (
                    <div className="text-xs text-yellow-600 mt-1">Below market (8-12%)</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Annual cashflow return on initial investment">Yield on Cost</Label>
                  <div className="text-lg font-semibold">
                    {yieldMetrics.yieldOnCost.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Total return divided by initial investment">Equity Multiple</Label>
                  <div className="text-lg font-semibold">
                    {yieldMetrics.equityMultiple.toFixed(2)}x
                  </div>
                </div>
              </div>
            </div>
            
            {/* Time & Risk Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Time Metrics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Year when cumulative cashflow becomes positive">Payback Period</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.paybackPeriod} {yieldMetrics.paybackPeriod === 1 ? 'year' : 'years'}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Cash Return Metrics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Total cash return over lease term">Cash-on-Cash Return</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.cashOnCashReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Average annual return on investment">Net Yield</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.netYield.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Scenario Comparison Table */}
      <ScenarioComparisonTable baseMeta={meta} />

      {/* Detailed Cash Flow Table */}
      <DetailedCashflowTable lines={lines} meta={meta} />
      
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Annual Cashflow</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyTableToClipboard(lines, meta.rsf, meta)}
              className="rounded-lg"
              title="Copy table to clipboard"
            >
              <Copy className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTableToCSV(lines, meta.rsf, meta)}
              className="rounded-lg"
              title="Export table to CSV"
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-lg"
              title="Print view"
            >
              <Printer className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <YearTable lines={lines} rsf={meta.rsf} meta={meta} />
        </CardContent>
      </Card>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>* Net Cash Flow includes: base rent, operating pass-throughs, parking, abatement credits, TI shortfall (if applicable), transaction costs (if applicable), and amortized costs (if financing enabled).</div>
        <div>* TI allowance, moving allowance, and other credits are not included in Net Cash Flow (they are upfront costs, not recurring cashflow).</div>
        <div>* Break-even year (BE) indicates when cumulative cashflow becomes positive.</div>
      </div>
    </div>
  );
});

function CashflowTab({ lines, meta, proposals }: { lines: AnnualLine[]; meta: AnalysisMeta; proposals?: Proposal[] }) {
  // Import chart components dynamically to avoid heavy initial bundle
  const [ChartsLoaded, setChartsLoaded] = React.useState(false);
  const [ChartComponents, setChartComponents] = React.useState<{
    CashflowChart?: React.ComponentType<any>;
    RentEscalationChart?: React.ComponentType<any>;
    ConcessionsChart?: React.ComponentType<any>;
  }>({});
  
  React.useEffect(() => {
    Promise.all([
      import("@/components/charts/CashflowChart"),
      import("@/components/charts/RentEscalationChart"),
      import("@/components/charts/ConcessionsChart"),
    ]).then(([Cashflow, RentEscalation, Concessions]) => {
      setChartComponents({
        CashflowChart: Cashflow.CashflowChart,
        RentEscalationChart: RentEscalation.RentEscalationChart,
        ConcessionsChart: Concessions.ConcessionsChart,
      });
      setChartsLoaded(true);
    });
  }, []);
  
  // Get comparison data if multiple proposals exist
  const comparisonProposal = proposals && proposals.length > 1 
    ? proposals.find(p => p.id !== proposals[0].id)
    : undefined;
  const comparisonCashflow = comparisonProposal 
    ? buildAnnualCashflow(comparisonProposal.meta)
    : undefined;

  if (!ChartsLoaded || !ChartComponents.CashflowChart) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading charts...</p>
        </div>
      </div>
    );
  }

  const { CashflowChart, RentEscalationChart, ConcessionsChart } = ChartComponents;

  return (
    <div className="space-y-6">
      {CashflowChart && (
        <CashflowChart
          cashflow={lines}
          title="Annual Cashflow Timeline"
          compareWith={comparisonCashflow}
          compareLabel={comparisonProposal?.label || "Comparison"}
        />
      )}
      {RentEscalationChart && (
        <RentEscalationChart
          cashflow={lines}
          title="Rent Escalation"
        />
      )}
      {ConcessionsChart && (
        <ConcessionsChart
          analysis={meta}
          cashflow={lines}
          title="Concessions Breakdown"
        />
      )}
    </div>
  );
}

/*************************************************
 * Export Hooks (stubs)
 *************************************************/

// TODO: Implement server routes to export a PDF (Playwright) and Excel (xlsx) using the `lines` output
// and the source AnalysisMeta for each proposal. Keep annual breakdown in Excel for single- or multi-scenario.

/*************************************************
 * Lightweight Runtime Tests (console.assert)
 *************************************************/

(function runLightTests() {
  try {
    const a = baseScenario();
    const lines = buildAnnualCashflow(a);
    // TEST 1: FS base-year passthrough for first year should be ~0
    const y0 = lines.find((l) => l.year === new Date(a.key_dates.commencement).getFullYear());
    console.assert((y0?.operating ?? 0) >= -1 && (y0?.operating ?? 0) < 1, "FS base-year year-1 passthrough should be ~0");

    // TEST 2: NPV should be finite
    const pv = npv(lines, a.cashflow_settings.discount_rate);
    console.assert(Number.isFinite(pv), "NPV should be finite");

    // TEST 3: Effective rate should be finite
    const eff = effectiveRentPSF(lines, a.rsf, lines.length);
    console.assert(Number.isFinite(eff), "Effective rate should be finite");
  } catch (e) {
    console.warn("Light tests encountered an error:", e);
  }
})();


