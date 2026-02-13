export interface NormalizedDates {
  commencement?: string;
  expiration?: string;
  rent_start?: string;
  term_months_total?: number;
  term_years?: number;
  term_months_remainder?: number;
  include_abatement_in_term: boolean;
  abatement_months_total: number;
}

export interface NormalizedEscalationPeriod {
  period_start: string;
  period_end: string;
  escalation_percentage: number;
}

export interface NormalizedAbatementPeriod {
  period_start: string;
  period_end: string;
  free_rent_months: number;
  abatement_applies_to: "base_only" | "base_plus_nnn";
}

export interface NormalizationIssue {
  severity: "info" | "warn" | "error";
  code: string;
  message: string;
  field?: string;
}

export interface NormalizedBaseMeta {
  dates: NormalizedDates;
  abatement: NormalizedAbatementPeriod[];
  rent: {
    escalation_periods: NormalizedEscalationPeriod[];
  };
  operating: {
    escalation_periods: NormalizedEscalationPeriod[];
  };
}

export interface NormalizedAnalysisResult {
  normalized: NormalizedBaseMeta;
  issues: NormalizationIssue[];
}
