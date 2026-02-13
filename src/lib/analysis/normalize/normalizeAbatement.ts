import type { AnalysisMeta } from "@/types";
import type { NormalizedAbatementPeriod } from "../normalized/types";
import { formatDateOnly } from "@/lib/dateOnly";
import { parseDateOnly } from "@/lib/dateOnly";

export function normalizeAbatement(meta: AnalysisMeta): NormalizedAbatementPeriod[] {
  const concessions = meta.concessions;
  if (!concessions) return [];

  if (concessions.abatement_type === "custom" && concessions.abatement_periods) {
    return concessions.abatement_periods.map((period) => ({
      period_start: period.period_start,
      period_end: period.period_end,
      free_rent_months: period.free_rent_months,
      abatement_applies_to: period.abatement_applies_to ?? "base_only",
    }));
  }

  if (concessions.abatement_type === "at_commencement") {
    const freeMonths = concessions.abatement_free_rent_months ?? 0;
    const commencement = meta.key_dates?.commencement;
    if (freeMonths <= 0 || !commencement) return [];
    const start = parseDateOnly(commencement);
    if (!start) return [];

    const end = new Date(start);
    end.setMonth(end.getMonth() + freeMonths);
    end.setDate(end.getDate() - 1);

    return [
      {
        period_start: formatDateOnly(start),
        period_end: formatDateOnly(end),
        free_rent_months: freeMonths,
        abatement_applies_to: concessions.abatement_applies_to ?? "base_only",
      },
    ];
  }

  return [];
}
