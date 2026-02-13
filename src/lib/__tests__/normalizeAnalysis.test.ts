import { normalizeAnalysis } from "@/lib/analysis";

function buildBaseAnalysis() {
  return {
    id: "test-id",
    name: "Test Analysis",
    status: "Draft",
    tenant_name: "Test Tenant",
    market: "Test Market",
    rsf: 10000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2029-12-31",
    },
    operating: {
      escalation_method: "fixed",
      escalation_value: 0.03,
    },
    rent_schedule: [
      {
        period_start: "2024-01-01",
        period_end: "2029-12-31",
        rent_psf: 30,
        escalation_percentage: 0.03,
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

describe("normalizeAnalysis", () => {
  it("derives rent_start from commencement + abatement months when missing", () => {
    const analysis = buildBaseAnalysis();
    analysis.concessions = {
      ...analysis.concessions,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 2,
    };
    analysis.key_dates = {
      ...analysis.key_dates,
      rent_start: undefined,
    };

    const { normalized } = normalizeAnalysis(analysis);
    expect(normalized.dates.rent_start).toBe("2024-03-01");
  });

  it("uses explicit rent_start even when abatement exists", () => {
    const analysis = buildBaseAnalysis();
    analysis.concessions = {
      ...analysis.concessions,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 2,
    };
    analysis.key_dates = {
      ...analysis.key_dates,
      rent_start: "2024-02-15",
    };

    const { normalized } = normalizeAnalysis(analysis);
    expect(normalized.dates.rent_start).toBe("2024-02-15");
  });

  it("includes abatement months in term only when enabled", () => {
    const withAbatement = buildBaseAnalysis();
    withAbatement.lease_term = {
      years: 1,
      months: 0,
      include_abatement_in_term: true,
    };
    withAbatement.concessions = {
      ...withAbatement.concessions,
      abatement_free_rent_months: 3,
    };

    const withoutAbatement = buildBaseAnalysis();
    withoutAbatement.lease_term = {
      years: 1,
      months: 0,
      include_abatement_in_term: false,
    };
    withoutAbatement.concessions = {
      ...withoutAbatement.concessions,
      abatement_free_rent_months: 3,
    };

    expect(normalizeAnalysis(withAbatement).normalized.dates.term_months_total).toBe(15);
    expect(normalizeAnalysis(withoutAbatement).normalized.dates.term_months_total).toBe(12);
  });

  it("uses fixed escalation fallback rules for rent", () => {
    const useFixed = {
      ...buildBaseAnalysis(),
      rent_escalation: {
        escalation_type: "fixed",
        fixed_escalation_percentage: 0.02,
      },
      rent_schedule: [
        {
          period_start: "2024-01-01",
          period_end: "2029-12-31",
          rent_psf: 30,
          escalation_percentage: 0.05,
        },
      ],
    };

    const useSchedule = {
      ...buildBaseAnalysis(),
      rent_escalation: {
        escalation_type: "fixed",
      },
      rent_schedule: [
        {
          period_start: "2024-01-01",
          period_end: "2029-12-31",
          rent_psf: 30,
          escalation_percentage: 0.04,
        },
      ],
    };

    const useZero = {
      ...buildBaseAnalysis(),
      rent_escalation: {
        escalation_type: "fixed",
      },
      rent_schedule: [
        {
          period_start: "2024-01-01",
          period_end: "2029-12-31",
          rent_psf: 30,
        },
      ],
    };

    expect(normalizeAnalysis(useFixed).normalized.rent.escalation_periods[0]?.escalation_percentage).toBe(0.02);
    expect(normalizeAnalysis(useSchedule).normalized.rent.escalation_periods[0]?.escalation_percentage).toBe(0.04);
    expect(normalizeAnalysis(useZero).normalized.rent.escalation_periods[0]?.escalation_percentage).toBe(0);
  });

  it("warns when fixed escalation amount is missing escalation_mode", () => {
    const analysis = buildBaseAnalysis();
    analysis.rent_escalation = {
      escalation_type: "fixed",
      fixed_escalation_amount: 2,
    };

    const { issues } = normalizeAnalysis(analysis);
    const warning = issues.find((issue) => issue.code === "fixed_amount_mode_missing");
    expect(warning).toBeDefined();
    expect(warning?.severity).toBe("warn");
  });

  it("does not mutate the input analysis", () => {
    const analysis = buildBaseAnalysis();
    const snapshot = JSON.stringify(analysis);
    normalizeAnalysis(analysis);
    expect(JSON.stringify(analysis)).toBe(snapshot);
  });
});
