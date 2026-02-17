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

    it("feeAtMonth equals exactly 6 * base_rent at that month", () => {
      for (const m of [0, 6, 12, 24, 35]) {
        const baseRent = me.monthlyCashflow[m].base_rent;
        expect(term.feeAtMonth(m)).toBe(6 * baseRent);
      }
    });

    it("componentsAtMonth shows exactly zero unamortized", () => {
      const c = term.componentsAtMonth!(12);
      expect(c.unamortized).toBe(0);
      expect(c.totalFee).toBe(c.penaltyRent);
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

    it("unamortized at month 0 equals totalToAmortize exactly", () => {
      const c = term.componentsAtMonth!(0);
      expect(c.unamortized).toBe(me.amortization!.totalToAmortize);
    });

    it("feeAtMonth(0) exceeds penalty rent by exactly totalToAmortize", () => {
      const c = term.componentsAtMonth!(0);
      expect(c.totalFee).toBe(c.penaltyRent + me.amortization!.totalToAmortize);
    });

    it("unamortized at month 1 equals ending_balance of schedule[0]", () => {
      const c = term.componentsAtMonth!(1);
      expect(c.unamortized).toBe(me.amortization!.schedule[0].ending_balance);
    });

    it("unamortized at last month equals balance before final payment", () => {
      const lastIdx = me.monthlyCashflow.length - 1;
      const c = term.componentsAtMonth!(lastIdx);
      const schedule = me.amortization!.schedule;
      const expectedBalance = schedule[lastIdx - 1].ending_balance;
      expect(c.unamortized).toBe(expectedBalance);
      expect(c.unamortized).toBeGreaterThan(0);
    });

    it("unamortized is strictly non-increasing", () => {
      for (let i = 1; i < me.monthlyCashflow.length; i++) {
        const prev = term.componentsAtMonth!(i - 1).unamortized;
        const curr = term.componentsAtMonth!(i).unamortized;
        expect(curr).toBeLessThanOrEqual(prev);
      }
    });

    it("unamortized is always within [0, totalToAmortize]", () => {
      const total = me.amortization!.totalToAmortize;
      for (let i = 0; i < me.monthlyCashflow.length; i++) {
        const u = term.componentsAtMonth!(i).unamortized;
        expect(u).toBeGreaterThanOrEqual(0);
        expect(u).toBeLessThanOrEqual(total);
      }
    });

    it("eqMonths at month 0 exceeds penaltyMonths", () => {
      const c = term.componentsAtMonth!(0);
      expect(c.eqMonths).toBeGreaterThan(term.penaltyMonths!);
    });
  });
});
