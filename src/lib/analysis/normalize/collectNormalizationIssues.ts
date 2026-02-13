import type { AnalysisMeta } from "@/types";
import type { NormalizedAbatementPeriod } from "../normalized/types";
import type { NormalizedDates } from "../normalized/types";
import type { NormalizedEscalationPeriod } from "../normalized/types";
import type { NormalizationIssue } from "../normalized/types";
import { parseDateInput } from "@/lib/dateOnly";

type NormalizedBundle = {
  dates: NormalizedDates;
  abatement: NormalizedAbatementPeriod[];
  rentEsc: NormalizedEscalationPeriod[];
  opExEsc: NormalizedEscalationPeriod[];
};

function addWarn(
  issues: NormalizationIssue[],
  code: string,
  message: string,
  field?: string
): void {
  issues.push({
    severity: "warn",
    code,
    message,
    field,
  });
}

function collectEscalationOrderingIssues(
  issues: NormalizationIssue[],
  label: string,
  periods: NormalizedEscalationPeriod[]
): void {
  for (let i = 1; i < periods.length; i += 1) {
    const prev = periods[i - 1];
    const current = periods[i];
    const prevStart = parseDateInput(prev.period_start);
    const currentStart = parseDateInput(current.period_start);
    const prevEnd = parseDateInput(prev.period_end);

    if (prevStart && currentStart && currentStart < prevStart) {
      addWarn(
        issues,
        `${label}_unsorted`,
        `${label} escalation periods are not sorted by start date.`,
        `${label}[${i}].period_start`
      );
    }

    if (prevEnd && currentStart && currentStart <= prevEnd) {
      addWarn(
        issues,
        `${label}_overlap`,
        `${label} escalation periods overlap.`,
        `${label}[${i}].period_start`
      );
    }
  }
}

export function collectNormalizationIssues(
  meta: AnalysisMeta,
  normalized: NormalizedBundle
): NormalizationIssue[] {
  const issues: NormalizationIssue[] = [];

  if (!meta.key_dates?.commencement) {
    addWarn(
      issues,
      "missing_commencement",
      "Commencement date is missing.",
      "key_dates.commencement"
    );
  }

  const commencementDate = parseDateInput(normalized.dates.commencement);
  const rentStartDate = parseDateInput(normalized.dates.rent_start);
  if (commencementDate && rentStartDate && rentStartDate < commencementDate) {
    addWarn(
      issues,
      "rent_start_before_commencement",
      "Rent start is before commencement.",
      "key_dates.rent_start"
    );
  }

  const expirationDate = parseDateInput(normalized.dates.expiration);
  if (commencementDate && expirationDate && expirationDate < commencementDate) {
    addWarn(
      issues,
      "expiration_before_commencement",
      "Expiration is before commencement.",
      "key_dates.expiration"
    );
  }

  if (meta.concessions?.abatement_type === "at_commencement") {
    const freeMonths = meta.concessions.abatement_free_rent_months ?? 0;
    if (freeMonths < 0) {
      addWarn(
        issues,
        "negative_free_rent_months",
        "Free rent months cannot be negative.",
        "concessions.abatement_free_rent_months"
      );
    }
  }

  if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
    meta.concessions.abatement_periods.forEach((period, index) => {
      if (period.free_rent_months < 0) {
        addWarn(
          issues,
          "negative_free_rent_months",
          "Free rent months cannot be negative.",
          `concessions.abatement_periods[${index}].free_rent_months`
        );
      }
    });
  }

  if (
    meta.rent_escalation?.fixed_escalation_amount !== undefined &&
    !meta.rent_escalation?.escalation_mode
  ) {
    addWarn(
      issues,
      "fixed_amount_mode_missing",
      "Fixed escalation amount provided without escalation_mode (percent vs amount).",
      "rent_escalation.escalation_mode"
    );
  }

  collectEscalationOrderingIssues(issues, "rent_escalation", normalized.rentEsc);
  collectEscalationOrderingIssues(issues, "operating_escalation", normalized.opExEsc);

  return issues;
}
