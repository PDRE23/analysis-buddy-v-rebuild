import type { AnalysisMeta } from "@/types";
import type { NormalizedAnalysisResult, NormalizedBaseMeta } from "../normalized/types";
import { collectNormalizationIssues } from "./collectNormalizationIssues";
import { normalizeAbatement } from "./normalizeAbatement";
import { normalizeDates } from "./normalizeDates";
import { normalizeOpExEscalations } from "./normalizeEscalations";
import { normalizeRentEscalations } from "./normalizeEscalations";

export function normalizeAnalysis(meta: AnalysisMeta): NormalizedAnalysisResult {
  const dates = normalizeDates(meta);
  const abatement = normalizeAbatement(meta);
  const rentEsc = normalizeRentEscalations(meta);
  const opExEsc = normalizeOpExEscalations(meta);
  const normalized: NormalizedBaseMeta = {
    dates,
    abatement,
    rent: {
      escalation_periods: rentEsc,
    },
    operating: {
      escalation_periods: opExEsc,
    },
  };
  const issues = collectNormalizationIssues(meta, {
    dates,
    abatement,
    rentEsc,
    opExEsc,
  });

  return { normalized, issues };
}
