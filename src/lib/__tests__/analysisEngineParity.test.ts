import { analyzeLease } from "@/lib/analysis-engine";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";
import { npv, effectiveRentPSF } from "@/lib/calculations/metrics-engine";
import type { AnalysisMeta } from "@/types";

function baseMeta(): AnalysisMeta {
  return {
    id: "parity-test",
    name: "Parity Test Lease",
    status: "draft",
    tenant_name: "Test Tenant",
    market: "Test Market",
    rsf: 10_000,
    lease_type: "NNN",
    key_dates: {
      commencement: "2025-01-01",
      rent_start: "2025-01-01",
      expiration: "2029-12-31",
    },
    rent_schedule: [
      {
        period_start: "2025-01-01",
        period_end: "2029-12-31",
        rent_psf: 50,
        escalation_percentage: 0.03,
      },
    ],
    rent_escalation: {
      escalation_type: "fixed",
      fixed_escalation_percentage: 0.03,
    },
    operating: {
      est_op_ex_psf: 15,
      escalation_type: "fixed",
      escalation_value: 0.02,
    },
    concessions: {
      ti_allowance_psf: 40,
      abatement_type: "at_commencement",
      abatement_free_rent_months: 3,
      abatement_applies_to: "base_only",
    },
    cashflow_settings: {
      discount_rate: 0.08,
    },
    parking: {},
  } as AnalysisMeta;
}

describe("Analysis engine → UI parity", () => {
  const meta = baseMeta();

  it("analyzeLease cashflow matches direct buildAnnualCashflow", () => {
    const result = analyzeLease(meta);
    const directCashflow = buildAnnualCashflow(meta);

    expect(result.cashflow.length).toBe(directCashflow.length);
    for (let i = 0; i < result.cashflow.length; i++) {
      expect(result.cashflow[i].year).toBe(directCashflow[i].year);
      expect(result.cashflow[i].base_rent).toBeCloseTo(directCashflow[i].base_rent, 6);
      expect(result.cashflow[i].net_cash_flow).toBeCloseTo(directCashflow[i].net_cash_flow, 6);
      expect(result.cashflow[i].operating).toBeCloseTo(directCashflow[i].operating, 6);
      expect(result.cashflow[i].abatement_credit).toBeCloseTo(directCashflow[i].abatement_credit, 6);
    }
  });

  it("analyzeLease metrics match direct metric calculations", () => {
    const result = analyzeLease(meta);
    const cashflow = buildAnnualCashflow(meta);
    const directNpv = npv(cashflow, meta.cashflow_settings.discount_rate);
    const directEff = effectiveRentPSF(cashflow, meta.rsf, result.years);

    expect(result.metrics.npv).toBeCloseTo(directNpv, 6);
    expect(result.metrics.effectiveRentPSF).toBeCloseTo(directEff, 6);
  });

  it("NNN lease has non-zero operating costs every year", () => {
    const result = analyzeLease(meta);
    for (const line of result.cashflow) {
      expect(line.operating).toBeGreaterThan(0);
    }
  });

  it("abatement reduces net cash flow in early years", () => {
    const result = analyzeLease(meta);
    expect(result.cashflow[0].abatement_credit).toBeLessThan(0);
  });

  it("FS lease produces zero opex in base year (no increase above base)", () => {
    const fsMeta = { ...baseMeta(), lease_type: "FS" as const };
    const result = analyzeLease(fsMeta);
    expect(result.cashflow[0].operating).toBe(0);
  });
});
