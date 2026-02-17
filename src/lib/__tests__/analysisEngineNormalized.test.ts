import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";
import { normalizeAnalysis } from "@/lib/analysis";

function buildMeta(): AnalysisMeta {
  return {
    id: "norm-engine",
    name: "Normalized Engine",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 12000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2025-12-31",
    },
    lease_term: {
      years: 2,
      months: 0,
      include_abatement_in_term: true,
    },
    operating: {
      escalation_type: "custom",
      escalation_periods: [
        {
          period_start: "2024-01-01",
          period_end: "2024-12-31",
          escalation_percentage: 0.02,
        },
        {
          period_start: "2025-01-01",
          period_end: "2025-12-31",
          escalation_percentage: 0.03,
        },
      ],
    },
    rent_schedule: [
      {
        period_start: "2024-01-01",
        period_end: "2025-12-31",
        rent_psf: 32,
      },
    ],
    rent_escalation: {
      escalation_type: "custom",
      escalation_periods: [
        {
          period_start: "2024-01-01",
          period_end: "2024-12-31",
          escalation_percentage: 0.03,
        },
        {
          period_start: "2025-01-01",
          period_end: "2025-12-31",
          escalation_percentage: 0.04,
        },
      ],
    },
    concessions: {
      abatement_type: "at_commencement",
      abatement_free_rent_months: 1,
      abatement_applies_to: "base_only",
    },
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
  };
}

describe("analyzeLease normalized fallback parity", () => {
  it("matches legacy outputs when normalized inputs are provided", () => {
    const meta = buildMeta();
    const legacy = analyzeLease(meta);
    const { normalized } = normalizeAnalysis(meta);
    const normalizedResult = analyzeLease(meta, normalized);

    const strip = (obj: typeof legacy) => JSON.parse(JSON.stringify(obj));
    expect(strip(normalizedResult)).toEqual(strip(legacy));
  });
});
