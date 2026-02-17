import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function buildMeta(): AnalysisMeta {
  return {
    id: "onetime-test",
    name: "One-Time Costs",
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
      ti_actual_build_cost_psf: 65,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
      abatement_applies_to: "base_only",
    },
    transaction_costs: {
      total: 25000,
      legal_fees: 10000,
      brokerage_fees: 10000,
      due_diligence: 5000,
    },
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
  };
}

describe("monthlyCashflow one-time costs", () => {
  const meta = buildMeta();
  const result = analyzeLease(meta);
  const cf = result.monthlyEconomics!.monthlyCashflow;

  it("month 0 has expected transaction_costs", () => {
    expect(cf[0].transaction_costs).toBe(25000);
  });

  it("month 0 has expected ti_shortfall", () => {
    expect(cf[0].ti_shortfall).toBe((65 - 50) * 10000);
  });

  it("months 1..end have 0 for transaction_costs and ti_shortfall", () => {
    for (let i = 1; i < cf.length; i++) {
      expect(cf[i].transaction_costs).toBe(0);
      expect(cf[i].ti_shortfall).toBe(0);
    }
  });

  it("net_cash_flow month 0 reflects one-time costs", () => {
    const m0 = cf[0];
    const expected =
      m0.subtotal +
      m0.abatement_credit +
      m0.ti_shortfall +
      m0.transaction_costs +
      m0.amortized_costs;
    expect(m0.net_cash_flow).toBeCloseTo(expected, 2);
  });

  it("NPV is finite", () => {
    expect(Number.isFinite(result.monthlyEconomics!.npv)).toBe(true);
  });
});
