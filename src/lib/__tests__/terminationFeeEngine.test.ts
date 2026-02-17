import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function baseMeta(overrides: Partial<AnalysisMeta> = {}): AnalysisMeta {
  return {
    id: "term-fee-test",
    name: "Termination Fee",
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
      ti_allowance_psf: 0,
      ti_actual_build_cost_psf: 0,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
      abatement_applies_to: "base_only",
    },
    transaction_costs: { total: 0 },
    financing: {
      amortize_ti: false,
      amortize_free_rent: false,
      amortize_transaction_costs: false,
      amortization_method: "present_value",
      interest_rate: 0.06,
    },
    options: [
      {
        type: "Termination",
        window_open: "2025-01-01",
        window_close: "2026-12-31",
        fee_months_of_rent: 6,
      },
    ],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
    ...overrides,
  };
}

describe("Termination Fee Engine v2", () => {
  describe("Case A: no amortization", () => {
    const result = analyzeLease(baseMeta());
    const me = result.monthlyEconomics!;
    const term = me.termination!;

    it("penaltyMonths is 6", () => {
      expect(term.penaltyMonths).toBe(6);
    });

    it("feeAtMonth equals 6 * base_rent at that month", () => {
      for (const m of [0, 6, 12, 24, 35]) {
        const baseRent = me.monthlyCashflow[m].base_rent;
        expect(term.feeAtMonth(m)).toBeCloseTo(6 * baseRent, 4);
      }
    });

    it("componentsAtMonth shows zero unamortized", () => {
      const c = term.componentsAtMonth!(12);
      expect(c.unamortized).toBe(0);
      expect(c.totalFee).toBeCloseTo(c.penaltyRent, 6);
    });

    it("feesByMonth length equals monthlyCashflow length", () => {
      expect(term.feesByMonth.length).toBe(me.monthlyCashflow.length);
    });
  });

  describe("Case B: with amortization (TI shortfall)", () => {
    const meta = baseMeta({
      concessions: {
        ti_allowance_psf: 50,
        ti_actual_build_cost_psf: 60,
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
    });
    const result = analyzeLease(meta);
    const me = result.monthlyEconomics!;
    const term = me.termination!;

    it("feeAtMonth(0) exceeds penalty rent due to unamortized balance", () => {
      const c = term.componentsAtMonth!(0);
      expect(c.unamortized).toBeGreaterThan(0);
      expect(c.totalFee).toBeGreaterThan(c.penaltyRent);
    });

    it("feeAtMonth(last) unamortized is less than feeAtMonth(0) unamortized", () => {
      const lastIdx = me.monthlyCashflow.length - 1;
      const cLast = term.componentsAtMonth!(lastIdx);
      const cFirst = term.componentsAtMonth!(0);
      expect(cLast.unamortized).toBeLessThan(cFirst.unamortized);
    });

    it("feesByMonth is non-increasing (within float tolerance)", () => {
      for (let i = 1; i < term.feesByMonth.length; i++) {
        expect(term.feesByMonth[i]).toBeLessThanOrEqual(term.feesByMonth[i - 1] + 0.01);
      }
    });

    it("eqMonths at month 0 is > penaltyMonths when unamortized exists", () => {
      const c = term.componentsAtMonth!(0);
      expect(c.eqMonths).toBeGreaterThan(term.penaltyMonths!);
    });
  });
});
