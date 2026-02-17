import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function buildMeta(): AnalysisMeta {
  return {
    id: "rollup-test",
    name: "Annual Rollup",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 10000,
    lease_type: "NNN",
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
      est_op_ex_psf: 12,
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
      ti_actual_build_cost_psf: 60,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
      abatement_applies_to: "base_only",
    },
    transaction_costs: {
      total: 15000,
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

describe("annualFromMonthly rollup", () => {
  const result = analyzeLease(buildMeta());
  const me = result.monthlyEconomics!;
  const annual = me.annualFromMonthly;
  const monthly = me.monthlyCashflow;

  it("annualFromMonthly has at least 1 row", () => {
    expect(annual.length).toBeGreaterThanOrEqual(1);
  });

  it("sum of monthly net_cash_flow equals sum of annual net_cash_flow", () => {
    const monthlyTotal = monthly.reduce((s, m) => s + m.net_cash_flow, 0);
    const annualTotal = annual.reduce((s, a) => s + a.net_cash_flow, 0);
    expect(Math.abs(monthlyTotal - annualTotal)).toBeLessThan(1e-6);
  });

  it("year 1 base_rent equals sum of monthly base_rent for months 0-11", () => {
    const yr1Monthly = monthly.filter((m) => m.monthIndex < 12);
    const yr1MonthlySum = yr1Monthly.reduce((s, m) => s + m.base_rent, 0);
    expect(annual[0].base_rent).toBeCloseTo(yr1MonthlySum, 6);
  });

  it("year numbers are 1-based and sequential", () => {
    for (let i = 0; i < annual.length; i++) {
      expect(annual[i].year).toBe(i + 1);
    }
  });
});
