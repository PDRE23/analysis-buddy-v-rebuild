import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function buildMetaWithFinancing(): AnalysisMeta {
  return {
    id: "amort-test",
    name: "Amortization Cashflow",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 10000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2026-12-31",
    },
    lease_term: {
      years: 3,
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
        period_end: "2026-12-31",
        rent_psf: 30,
      },
    ],
    concessions: {
      ti_allowance_psf: 50,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
      abatement_applies_to: "base_only",
    },
    financing: {
      amortize_ti: true,
      amortize_free_rent: false,
      amortize_transaction_costs: false,
      amortization_method: "present_value",
      interest_rate: 0.06,
    },
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
  };
}

describe("monthlyCashflow amortization", () => {
  it("includes amortized_costs when financing is enabled", () => {
    const meta = buildMetaWithFinancing();
    const result = analyzeLease(meta);

    expect(result.monthlyEconomics).toBeDefined();
    expect(result.monthlyEconomics!.monthlyCashflow.length).toBeGreaterThan(0);

    const hasAmortized = result.monthlyEconomics!.monthlyCashflow.some(
      (m) => m.amortized_costs > 0
    );
    expect(hasAmortized).toBe(true);
  });

  it("sum of amortized_costs across months is > 0", () => {
    const meta = buildMetaWithFinancing();
    const result = analyzeLease(meta);

    const totalAmortized = result.monthlyEconomics!.monthlyCashflow.reduce(
      (sum, m) => sum + m.amortized_costs,
      0
    );
    expect(totalAmortized).toBeGreaterThan(0);
  });

  it("NPV is finite", () => {
    const meta = buildMetaWithFinancing();
    const result = analyzeLease(meta);

    expect(Number.isFinite(result.monthlyEconomics!.npv)).toBe(true);
  });
});
