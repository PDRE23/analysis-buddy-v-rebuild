/**
 * Analysis and proposal type definitions
 */

import type { LeaseType, ProposalSide } from "./lease";
import type { CommissionStructure } from "@/lib/commission";

export interface RentRow {
  period_start: string; // ISO date
  period_end: string;   // ISO date
  rent_psf: number;     // Base rent $/RSF/year
  escalation_percentage?: number; // Annual escalation (e.g., 0.03 for 3%)
}

export interface AbatementPeriod {
  period_start: string; // ISO date - when abatement starts
  period_end: string;   // ISO date - when abatement ends
  free_rent_months: number; // Number of free rent months in this period
  abatement_applies_to: "base_only" | "base_plus_nnn"; // What the free rent abates
}

export interface EscalationPeriod {
  period_start: string; // ISO date - when escalation period starts
  period_end: string;   // ISO date - when escalation period ends
  escalation_percentage: number; // Escalation rate for this period (e.g., 0.03 for 3%)
}

export interface OpExEscalationPeriod {
  period_start: string; // ISO date - when escalation period starts
  period_end: string;   // ISO date - when escalation period ends
  escalation_percentage: number; // Escalation rate for this period (e.g., 0.03 for 3%)
}

export interface OptionRow {
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
    // Manual pass-through override for FS leases
    use_manual_pass_through?: boolean;
    manual_pass_through_psf?: number;
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

