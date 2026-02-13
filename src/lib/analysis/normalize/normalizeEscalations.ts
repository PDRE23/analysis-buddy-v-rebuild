import type { AnalysisMeta } from "@/types";
import type { NormalizedEscalationPeriod } from "../normalized/types";

function resolveEscalationWindow(meta: AnalysisMeta): { start: string; end: string } | null {
  const start = meta.key_dates?.commencement || meta.rent_schedule[0]?.period_start;
  const end = meta.key_dates?.expiration || meta.rent_schedule[0]?.period_end;
  if (!start || !end) return null;
  return { start, end };
}

function resolveFixedRentEscalation(meta: AnalysisMeta): number {
  return (
    meta.rent_escalation?.fixed_escalation_percentage ??
    meta.rent_schedule[0]?.escalation_percentage ??
    0
  );
}

function resolveFixedOpExEscalation(meta: AnalysisMeta): number {
  return meta.operating.escalation_value ?? 0;
}

export function normalizeRentEscalations(meta: AnalysisMeta): NormalizedEscalationPeriod[] {
  const escalationType = meta.rent_escalation?.escalation_type || "fixed";

  if (escalationType === "custom" && meta.rent_escalation?.escalation_periods) {
    return meta.rent_escalation.escalation_periods.map((period) => ({
      period_start: period.period_start,
      period_end: period.period_end,
      escalation_percentage: period.escalation_percentage,
    }));
  }

  const rate = resolveFixedRentEscalation(meta);
  const window = resolveEscalationWindow(meta);
  if (!window) return [];

  return [
    {
      period_start: window.start,
      period_end: window.end,
      escalation_percentage: rate,
    },
  ];
}

export function normalizeOpExEscalations(meta: AnalysisMeta): NormalizedEscalationPeriod[] {
  const escalationType = meta.operating.escalation_type || "fixed";

  if (escalationType === "custom" && meta.operating.escalation_periods) {
    return meta.operating.escalation_periods.map((period) => ({
      period_start: period.period_start,
      period_end: period.period_end,
      escalation_percentage: period.escalation_percentage,
    }));
  }

  const rate = resolveFixedOpExEscalation(meta);
  const window = resolveEscalationWindow(meta);
  if (!window) return [];

  return [
    {
      period_start: window.start,
      period_end: window.end,
      escalation_percentage: rate,
    },
  ];
}
