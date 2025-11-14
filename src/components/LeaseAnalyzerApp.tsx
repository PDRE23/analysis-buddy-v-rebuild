"use client";

import React, { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Plus, Upload, FileDown, Download, Copy, Save, Trash2, ArrowLeft, ChevronRight, AlertCircle, Presentation } from "lucide-react";
import { nanoid } from "nanoid";
import { storage } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
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
import { DuplicateDialog, applyDuplicateOptions } from "@/components/ui/duplicate-dialog";
import type { DuplicateOptions } from "@/components/ui/duplicate-dialog";
import { CommissionCalculator } from "@/components/deals/CommissionCalculator";
import type { CommissionStructure } from "@/lib/commission";
import { exportAnalysis } from "@/lib/export";
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
  free_rent_months?: number; // Free rent period applied at period start
  abatement_applies_to?: "base_only" | "base_plus_nnn"; // What the free rent abates
}

interface OptionRow {
  type: "Renewal" | "Expansion" | "Termination" | "ROFR" | "ROFO";
  window_open: string; // ISO
  window_close: string; // ISO
  terms?: string;
}

export interface AnalysisMeta extends Record<string, unknown> {
  id: string;
  name: string;
  status: "Draft" | "Active" | "Final";
  tenant_name: string;
  market: string;
  rsf: number; // rentable square feet
  lease_type: LeaseType;
  base_year?: number; // for FS
  expense_stop_psf?: number; // for NNN
  key_dates: {
    commencement: string; // ISO date
    rent_start: string; // ISO date
    expiration: string; // ISO date
    early_access?: string; // ISO date
  };
  operating: {
    est_op_ex_psf?: number;
    escalation_method?: "fixed" | "cpi";
    escalation_value?: number; // e.g., 0.03 for 3% or CPI base
    escalation_cap?: number; // optional cap (e.g., 0.05)
  };
  rent_schedule: RentRow[];
  concessions: {
    ti_allowance_psf?: number;
    moving_allowance?: number;
    other_credits?: number;
  };
  parking?: {
    monthly_rate_per_stall?: number;
    stalls?: number;
    escalation_method?: "fixed" | "cpi";
    escalation_value?: number;
  };
  options: OptionRow[];
  cashflow_settings: {
    discount_rate: number; // e.g., 0.08
    granularity: "annual" | "monthly";
  };
  notes?: string;
  commissionStructure?: CommissionStructure;
  proposals: Proposal[];
}

interface Proposal {
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

interface AnnualLine {
  year: number; // calendar year
  base_rent: number; // $ total (not psf)
  abatement_credit: number; // negative number (credit)
  operating: number; // passthroughs modeled
  parking: number; // annualized parking cost
  other_recurring: number; // reserved for future
  subtotal: number; // base_rent + operating + parking + other_recurring
  net_cash_flow: number; // subtotal + abatement_credit (TI/moving NOT netted in)
}
type AnnualLineNumericKey = Exclude<keyof AnnualLine, "year">;

/** Apply CPI or fixed escalation to a base value for N periods. */
function escalate(value: number, n: number, method: "fixed" | "cpi" = "fixed", rate = 0): number {
  if (n <= 0) return value;
  const r = Math.max(0, rate);
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

function buildAnnualCashflow(a: AnalysisMeta): AnnualLine[] {
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
    subtotal: 0,
    net_cash_flow: 0,
  }));

  const rsf = a.rsf;
  const addToYear = (year: number, field: AnnualLineNumericKey, amount: number) => {
    const row = lines.find((r) => r.year === year);
    if (row) row[field] = (row[field] as number) + amount;
  };

  // Base Rent & Abatement
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

      // Apply free rent at the beginning of the period
      // Free rent only applies in the first year of the period
      if (y === periodStartYear) {
        const freeMonths = clamp(r.free_rent_months ?? 0, 0, 12);
        if (freeMonths > 0) {
          const baseAbateAmt = (r.rent_psf * rsf * freeMonths) / 12;
          addToYear(y, "abatement_credit", -baseAbateAmt);
        }
      }
    }
  }

  // Operating pass-throughs
  const baseOp = a.operating.est_op_ex_psf ?? 0;
  const method = a.operating.escalation_method ?? "fixed";
  const value = a.operating.escalation_value ?? 0;
  const startYear = new Date(a.key_dates.commencement).getFullYear();

  for (const y of years) {
    const yearsSinceStart = y - startYear;
    const escalatedOp = escalate(baseOp, yearsSinceStart, method, value);
    if (a.lease_type === "FS") {
      const baseYear = a.base_year ?? startYear;
      const baseYearIndex = Math.max(0, y - baseYear);
      const baseYearOp = escalate(baseOp, baseYearIndex, method, value);
      const passthrough = Math.max(0, escalatedOp - baseYearOp) * rsf;
      addToYear(y, "operating", passthrough);
    } else {
      const stop = a.expense_stop_psf ?? 0;
      const passthrough = Math.max(0, escalatedOp - stop) * rsf;
      addToYear(y, "operating", passthrough);
    }
    
    // Apply operating expense abatement if free rent applies to base_plus_nnn
    for (const r of a.rent_schedule) {
      const ps = new Date(r.period_start);
      const periodStartYear = ps.getFullYear();
      
      if (y === periodStartYear && r.abatement_applies_to === "base_plus_nnn") {
        const freeMonths = clamp(r.free_rent_months ?? 0, 0, 12);
        if (freeMonths > 0) {
          const opAbateAmt = (escalatedOp * rsf * freeMonths) / 12;
          addToYear(y, "abatement_credit", -opAbateAmt);
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

  for (const row of lines) {
    row.subtotal = row.base_rent + row.operating + row.parking + row.other_recurring;
    row.net_cash_flow = row.subtotal + row.abatement_credit; // only abatement nets into NCF
  }

  return lines;
}

function npv(lines: AnnualLine[], discountRate: number): number {
  return lines.reduce((acc, row, i) => acc + row.net_cash_flow / Math.pow(1 + discountRate, i + 1), 0);
}

function effectiveRentPSF(lines: AnnualLine[], rsf: number, years: number): number {
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
  expense_stop_psf: undefined,
  key_dates: {
    commencement: "2026-01-01",
    rent_start: "2026-02-01",
    expiration: "2035-12-31",
  },
  operating: {
    est_op_ex_psf: 18,
    escalation_method: "fixed",
    escalation_value: 0.03,
  },
  rent_schedule: [
    { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 48, escalation_percentage: 0.03, free_rent_months: 6, abatement_applies_to: "base_plus_nnn" },
    { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 51, escalation_percentage: 0.03, free_rent_months: 0, abatement_applies_to: "base_only" },
    { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 55, escalation_percentage: 0.03, free_rent_months: 0, abatement_applies_to: "base_only" },
  ],
  concessions: { ti_allowance_psf: 75, moving_allowance: 250000 },
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
        { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 47, escalation_percentage: 0.03, free_rent_months: 3, abatement_applies_to: "base_only" },
        { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 50, escalation_percentage: 0.03, free_rent_months: 0, abatement_applies_to: "base_only" },
        { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 54, escalation_percentage: 0.03, free_rent_months: 0, abatement_applies_to: "base_only" },
      ],
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

function YearTable({ lines }: { lines: AnnualLine[] }) {
  return (
    <div className="overflow-auto border rounded-xl">
      <table className="min-w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2">Year</th>
            <th className="text-right p-2">Base Rent</th>
            <th className="text-right p-2">Op. Pass-Through</th>
            <th className="text-right p-2">Parking</th>
            <th className="text-right p-2">Abatement (credit)</th>
            <th className="text-right p-2">Subtotal</th>
            <th className="text-right p-2">Net Cash Flow</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((r) => (
            <tr key={r.year} className="border-t">
              <td className="p-2">{r.year}</td>
              <td className="p-2 text-right">{fmtMoney(r.base_rent)}</td>
              <td className="p-2 text-right">{fmtMoney(r.operating)}</td>
              <td className="p-2 text-right">{fmtMoney(r.parking)}</td>
              <td className="p-2 text-right">{fmtMoney(r.abatement_credit)}</td>
              <td className="p-2 text-right">{fmtMoney(r.subtotal)}</td>
              <td className="p-2 text-right font-medium">{fmtMoney(r.net_cash_flow)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

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

  useEffect(() => {
    onAnalysesChanged?.(analyses);
  }, [analyses, onAnalysesChanged]);

  useEffect(() => {
    onDealsChanged?.(deals);
  }, [deals, onDealsChanged]);

  useEffect(() => {
    if (!supabase || !supabaseUser) {
      dealStorage.save(deals);
    }
  }, [deals, supabase, supabaseUser]);

  // Load data from Supabase/local storage on mount
  useEffect(() => {
    const loadData = async () => {
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
                rent_start: today,
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
                  free_rent_months: 0,
                  abatement_applies_to: "base_only",
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
          return;
        }

        const [remoteAnalyses, remoteDeals] = await Promise.all([
          listAnalysesForUser(supabase, supabaseUser.id),
          listDealsForUser(supabase, supabaseUser.id),
        ]);

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
              rent_start: today,
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
                free_rent_months: 0,
                abatement_applies_to: "base_only",
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

          await upsertAnalysesForUser(supabase, supabaseUser.id, [demoAnalysis]);
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
      } catch (error) {
        console.error("❌ Failed to load data:", error);
        reportError(error as Error, "Data loading");

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
            rent_start: today,
            expiration: new Date(
              Date.now() + 365 * 24 * 60 * 60 * 1000 * 5
            )
              .toISOString()
              .split("T")[0],
          },
          operating: {},
          rent_schedule: [],
          concessions: {},
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
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [reportError, supabase, supabaseUser]);


  // Auto-save when analyses change (with proper dependency management and reduced frequency)
  useEffect(() => {
    if (!isLoading && analyses.length > 0) {
      const timeoutId = setTimeout(() => {
        (async () => {
          try {
            if (supabase && supabaseUser) {
              await upsertAnalysesForUser(supabase, supabaseUser.id, analyses);
            }
            const saveResult = storage.save(analyses);
            if (saveResult.success) {
              setLastSaved(new Date().toISOString());
              setStorageStats({
                totalAnalyses: analyses.length,
                totalProposals: analyses.reduce(
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
      }, 3000);

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
        name: `New Analysis ${analyses.length + 1}`,
        status: "Draft",
        tenant_name: "Untitled Tenant",
        market: "",
        rsf: 0,
        lease_type: "FS",
        key_dates: {
          commencement: today,
          rent_start: today,
          expiration: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5).toISOString().split('T')[0], // 5 years from now
        },
        operating: {},
        rent_schedule: [],
        concessions: {},
        options: [],
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        notes: "",
        proposals: [],
      };
      
      console.log('🔧 Created new analysis:', newAnalysis);
      
      setAnalyses((prev) => {
        const updated = [newAnalysis, ...prev];
        console.log('🔧 Updated analyses array:', updated);
        return updated;
      });
      
      setSelectedId(id);
      console.log('🔧 Set selected ID to:', id);
      
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
      if (supabase && supabaseUser) {
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
        if (supabase && supabaseUser) {
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
      if (supabase && supabaseUser) {
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
      if (supabase && supabaseUser) {
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

  const upsertProposal = (analysisId: string, proposal: Proposal) => {
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
  };

  const createProposal = (side: ProposalSide) => {
    if (!selectedAnalysis) return;
    const p: Proposal = {
      id: nanoid(),
      side,
      label: `${side} v1`,
      created_at: new Date().toISOString(),
      meta: baseScenario(),
    };
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
    <div className="min-h-screen bg-background">
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
            onExport={() => {
              try {
                const data = storage.export();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `lease-analyses-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
              } catch (error) {
                reportError(error as Error, 'Export data');
                alert('Export failed. Please try again.');
              }
            }}
            onImport={(file: File) => {
              const reader = new FileReader();
              reader.onload = (e) => {
                try {
                  const content = e.target?.result as string;
                  const result = storage.import(content);
                  if (result.success) {
                    const importedAnalyses = storage.load() as AnalysisMeta[];
                    setAnalyses(importedAnalyses);
                    if (supabaseUser) {
                      upsertAnalysesForUser(supabase, supabaseUser.id, importedAnalyses).catch(
                        (error) => console.error("Failed to sync imported analyses:", error)
                      );
                    }
                    console.log('✅ Imported', result.count, 'analyses');
                  } else {
                    console.error('❌ Import failed:', result.error);
                    alert(`Import failed: ${result.error}`);
                  }
                } catch (error) {
                  reportError(error as Error, 'Import data');
                  alert('Import failed. Please check the file format.');
                }
              };
              reader.readAsText(file);
            }}
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
                  upsertProposal(selectedAnalysis.id, { ...selectedProposal, meta: updatedMeta });
                } catch (error) {
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
  onExport,
  onImport,
}: {
  list: {
    id: string;
    name: string;
    status: "Draft" | "Active" | "Final";
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: LeaseType;
    proposals: Proposal[];
  }[];
  query: string;
  setQuery: (v: string) => void;
  onNew: () => void;
  onOpen: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onExport: () => void;
  onImport: (file: File) => void;
}) {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4 sm:py-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold">Lease Analyses</h1>
          <p className="text-sm text-muted-foreground">Track negotiations and model cash flows for tenant-rep deals.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onExport} title="Export all analyses" className="flex-1 sm:flex-none">
              <Download className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <label className="flex-1 sm:flex-none">
              <Button variant="outline" asChild title="Import analyses from JSON file" className="w-full sm:w-auto">
                <span>
                  <Upload className="mr-2 h-4 w-4" />
                  <span className="hidden sm:inline">Import</span>
                </span>
              </Button>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    onImport(file);
                    e.target.value = ''; // Reset input
                  }
                }}
              />
            </label>
          </div>
          <Button onClick={onNew} className="rounded-2xl w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            New analysis
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
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => onNewProposal("Landlord")} className="flex-1 sm:flex-none">
            + Landlord
          </Button>
          <Button onClick={() => onNewProposal("Tenant")} className="rounded-2xl flex-1 sm:flex-none">
            + Tenant Counter
          </Button>
        </div>
      </div>

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
                    {meta.rent_schedule?.[0]?.free_rent_months || 0} mo
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
                          {meta.rent_schedule?.[0]?.free_rent_months || 0} mo
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
  const lines = useMemo(() => buildAnnualCashflow(meta), [meta]);
  const years =
    new Date(meta.key_dates.expiration).getFullYear() -
      new Date(meta.key_dates.commencement).getFullYear() +
    1;
  const eff = useMemo(() => effectiveRentPSF(lines, meta.rsf, years), [lines, meta, years]);
  const pvV = useMemo(() => npv(lines, meta.cashflow_settings.discount_rate), [lines, meta]);

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
    <div className="h-full overflow-y-auto">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6">
      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        proposalName={`${proposal.side} - ${proposal.label || meta.name}`}
      />

      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBackToBoard} className="flex-shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Back to Proposals</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold truncate">
            {proposal.side}
            {proposal.label ? ` • ${proposal.label}` : ""}
          </h2>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
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
              className="flex-1 sm:flex-none rounded-2xl"
              title="Enter Presentation Mode (Ctrl+P)"
            >
              <Presentation className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Present</span>
            </Button>
          )}
          <Button 
            variant="outline" 
            onClick={() => setShowExportDialog(true)}
            title="Export to PDF, Excel, or Print" 
            className="flex-1 sm:flex-none"
          >
            <FileDown className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>
          <Button title="Save" className="rounded-2xl flex-1 sm:flex-none">
            <Save className="mr-2 h-4 w-4" />
            Save
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
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
        <KPI label="RSF" value={meta.rsf.toLocaleString()} hint="Rentable square feet." />
      </div>

      <Tabs defaultValue="proposal" className="w-full">
        <TabsList className="grid grid-cols-5 w-full">
          <TabsTrigger value="proposal" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Proposal</span>
            <span className="sm:hidden">Prop</span>
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
        <TabsContent value="proposal">
          <ProposalTab a={meta} onSave={onSave} />
        </TabsContent>
        <TabsContent value="analysis">
          <AnalysisTab lines={lines} />
        </TabsContent>
        <TabsContent value="cashflow">
          <CashflowTab lines={lines} meta={meta} proposals={allProposals || [proposal]} />
        </TabsContent>
        <TabsContent value="ner">
          <NERAnalysisView
            analysis={meta}
            onSave={(nerAnalysis) => {
              // Store NER analysis data (can be saved to analysis meta or separate storage)
              console.log('NER Analysis saved:', nerAnalysis);
            }}
          />
        </TabsContent>
        <TabsContent value="commission">
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
          label="Base Rent ($/SF/yr)"
          value={row.rent_psf}
          onChange={(value) => setRentRow(idx, { rent_psf: value || 0 })}
          placeholder="0.00"
        />
        <PercentageInput
          label="Annual Escalation"
          value={(row.escalation_percentage ?? 0) * 100}
          onChange={(value) => setRentRow(idx, { escalation_percentage: (value || 0) / 100 })}
          placeholder="3.0"
        />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t">
        <ValidatedInput
          label="Free Rent (Months)"
          type="number"
          value={row.free_rent_months ?? 0}
          onChange={(e) => setRentRow(idx, { free_rent_months: Number(e.currentTarget.value) })}
          placeholder="0"
          min="0"
          hint="Applied at the beginning of the period"
        />
        <Select
          label="Apply Abatement To"
          value={row.abatement_applies_to || "base_only"}
          onChange={(e) => setRentRow(idx, { abatement_applies_to: e.currentTarget.value as "base_only" | "base_plus_nnn" })}
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

  const setRentRow = (idx: number, patch: Partial<RentRow>) => {
    const rs: RentRow[] = local.rent_schedule.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );
    updateField('rent_schedule', rs);
  };

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
              label="Proposal Name"
              value={local.name}
              onChange={(e) => updateField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
              error={getFieldError('name')}
              showError={shouldShowFieldError('name')}
              placeholder="Enter proposal name"
            />
            <ValidatedInput
              label="Tenant"
              value={local.tenant_name}
              onChange={(e) => updateField('tenant_name', e.currentTarget.value)}
              onBlur={() => handleBlur('tenant_name')}
              error={getFieldError('tenant_name')}
              showError={shouldShowFieldError('tenant_name')}
              placeholder="Enter tenant name"
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
              value={Number.isFinite(local.rsf) ? local.rsf : 0}
              onChange={(e) => updateField('rsf', Number(e.currentTarget.value) || 0)}
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <ValidatedInput
              label="Commencement"
              type="date"
              value={local.key_dates.commencement}
              onChange={(e) => setKeyDates({ commencement: e.currentTarget.value })}
              onBlur={() => handleBlur('key_dates')}
              error={getFieldError('key_dates')}
              showError={shouldShowFieldError('key_dates')}
            />
            <ValidatedInput
              label="Rent Start"
              type="date"
              value={local.key_dates.rent_start}
              onChange={(e) => setKeyDates({ rent_start: e.currentTarget.value })}
              onBlur={() => handleBlur('key_dates')}
              error={getFieldError('key_dates')}
              showError={shouldShowFieldError('key_dates')}
            />
            <ValidatedInput
              label="Expiration"
              type="date"
              value={local.key_dates.expiration}
              onChange={(e) => setKeyDates({ expiration: e.currentTarget.value })}
              onBlur={() => handleBlur('key_dates')}
              error={getFieldError('key_dates')}
              showError={shouldShowFieldError('key_dates')}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              label="Lease Type"
              value={local.lease_type}
              onChange={(e) => updateField('lease_type', e.currentTarget.value as LeaseType)}
              onBlur={() => handleBlur('lease_type')}
              error={getFieldError('lease_type')}
              showError={shouldShowFieldError('lease_type')}
              placeholder="Select lease type"
              options={[
                { value: 'FS', label: 'Full Service (FS)' },
                { value: 'NNN', label: 'Triple Net (NNN)' },
              ]}
            />
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
            <CurrencyInput
              label="Expense Stop $/SF (NNN)"
              value={local.expense_stop_psf}
              onChange={(value) => updateField('expense_stop_psf', value)}
              onBlur={() => handleBlur('expense_stop_psf')}
              error={getFieldError('expense_stop_psf')}
              showError={shouldShowFieldError('expense_stop_psf')}
              placeholder="0.00"
              hint="Annual expense stop per square foot"
            />
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
          <CardTitle>Operating, Concessions & Settings</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <CurrencyInput
              label="Est. OpEx $/SF"
              value={local.operating.est_op_ex_psf}
              onChange={(value) => setOperating({ est_op_ex_psf: value })}
              placeholder="0.00"
              hint="Estimated operating expenses per square foot"
            />
            <Select
              label="Escalation Method"
              value={local.operating.escalation_method ?? "fixed"}
              onChange={(e) => setOperating({ escalation_method: e.currentTarget.value as "fixed" | "cpi" })}
              placeholder="Select escalation method"
              options={[
                { value: 'fixed', label: 'Fixed %' },
                { value: 'cpi', label: 'CPI' },
              ]}
            />
            <PercentageInput
              label="Escalation Value"
              value={local.operating.escalation_value}
              onChange={(value) => setOperating({ escalation_value: value })}
              placeholder="0.00"
              hint="Annual escalation rate"
            />
            <PercentageInput
              label="Cap (optional)"
              value={local.operating.escalation_cap}
              onChange={(value) => setOperating({ escalation_cap: value })}
              placeholder="0.00"
              hint="Maximum escalation rate"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <CurrencyInput
              label="TI $/SF"
              value={local.concessions.ti_allowance_psf}
              onChange={(value) => setConcessions({ ti_allowance_psf: value })}
              placeholder="0.00"
              hint="Tenant improvement allowance per square foot"
            />
            <CurrencyInput
              label="Moving Allowance"
              value={local.concessions.moving_allowance}
              onChange={(value) => setConcessions({ moving_allowance: value })}
              placeholder="0.00"
              hint="Total moving allowance"
            />
            <CurrencyInput
              label="Other Credits"
              value={local.concessions.other_credits}
              onChange={(value) => setConcessions({ other_credits: value })}
              placeholder="0.00"
              hint="Other tenant credits"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
            <CurrencyInput
              label="Parking $/stall/mo"
              value={local.parking?.monthly_rate_per_stall}
              onChange={(value) => setParking({ monthly_rate_per_stall: value })}
              placeholder="0.00"
              hint="Monthly parking rate per stall"
            />
            <ValidatedInput
              label="# Stalls"
              type="number"
              value={local.parking?.stalls ?? 0}
              onChange={(e) => setParking({ stalls: Number(e.currentTarget.value) })}
              placeholder="0"
              min="0"
              hint="Number of parking stalls"
            />
            <Select
              label="Parking Method"
              value={local.parking?.escalation_method ?? "fixed"}
              onChange={(e) => setParking({ escalation_method: e.currentTarget.value as "fixed" | "cpi" })}
              placeholder="Select escalation method"
              options={[
                { value: 'fixed', label: 'Fixed %' },
                { value: 'cpi', label: 'CPI' },
              ]}
            />
            <PercentageInput
              label="Parking Escalation"
              value={local.parking?.escalation_value}
              onChange={(value) => setParking({ escalation_value: value })}
              placeholder="0.00"
              hint="Annual parking escalation rate"
            />
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:col-span-2">
        <CardHeader>
          <CardTitle>Rent Schedule & Abatement</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleRentScheduleDragEnd}
          >
            <SortableContext
              items={local.rent_schedule.map((_, idx) => `rent-row-${idx}`)}
              strategy={verticalListSortingStrategy}
            >
              {local.rent_schedule.map((r, idx) => (
                <RentScheduleRow
                  key={`rent-row-${idx}`}
                  id={`rent-row-${idx}`}
                  row={r}
                  idx={idx}
                  setRentRow={setRentRow}
                  deleteRentRow={deleteRentRow}
                />
              ))}
            </SortableContext>
          </DndContext>
          <div>
            <Button variant="outline" onClick={addRentRow}>
              <Plus className="mr-2 h-4 w-4" />
              Add Period
            </Button>
          </div>
        </CardContent>
      </Card>
      </div>
    </>
  );
}

function AnalysisTab({ lines }: { lines: AnnualLine[] }) {
  return (
    <div className="space-y-4">
      <YearTable lines={lines} />
      <div className="text-xs text-muted-foreground">
        * Net Cash Flow includes abatement as a credit only; TI, moving, and other credits are summarized outside NCF.
      </div>
    </div>
  );
}

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


