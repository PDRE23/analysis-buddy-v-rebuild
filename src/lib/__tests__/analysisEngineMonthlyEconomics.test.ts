import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function buildMeta(): AnalysisMeta {
  return {
    id: "monthly-econ",
    name: "Monthly Economics",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 10000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2024-12-31",
    },
    lease_term: {
      years: 1,
      months: 0,
      include_abatement_in_term: true,
    },
    operating: {
      escalation_type: "fixed",
      escalation_value: 0.03,
    },
    rent_schedule: [
      {
        period_start: "2024-01-01",
        period_end: "2024-12-31",
        rent_psf: 30,
      },
    ],
    concessions: {
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
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

describe("analyzeLease monthly economics", () => {
  it("populates monthlyEconomics", () => {
    const meta = buildMeta();
    const result = analyzeLease(meta);

    expect(result.monthlyEconomics).toBeDefined();
    expect(result.monthlyEconomics?.rentSchedule.months.length).toBeGreaterThan(0);
    expect(typeof result.monthlyEconomics?.npv).toBe("number");
  });

  it("returns assumptionsSummary defaults", () => {
    const meta = buildMeta();
    const result = analyzeLease(meta);

    expect(result.assumptionsSummary).toBeDefined();
    expect(result.assumptionsSummary?.discountRateAnnual).toBe(meta.cashflow_settings.discount_rate);
    expect(result.assumptionsSummary?.billingTiming).toBe("advance");
    expect(result.assumptionsSummary?.amortRateAnnual).toBeUndefined();
    expect(result.assumptionsSummary?.escalationMode).toBeUndefined();
    expect(result.assumptionsSummary?.rounding).toBeUndefined();
  });
});
