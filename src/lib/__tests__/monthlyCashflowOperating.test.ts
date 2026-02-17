import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function buildNNNMeta(): AnalysisMeta {
  return {
    id: "nnn-op-test",
    name: "NNN Operating",
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

function buildFSMeta(): AnalysisMeta {
  return {
    id: "fs-op-test",
    name: "FS Operating",
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

describe("monthlyCashflow operating — NNN", () => {
  const result = analyzeLease(buildNNNMeta());
  const cf = result.monthlyEconomics!.monthlyCashflow;

  it("operating > 0 for all months", () => {
    for (const m of cf) {
      expect(m.operating).toBeGreaterThan(0);
    }
  });

  it("operating grows across term years", () => {
    const yr0 = cf[0].operating;
    const yr1 = cf[12].operating;
    const yr2 = cf[24].operating;
    expect(yr1).toBeGreaterThan(yr0);
    expect(yr2).toBeGreaterThan(yr1);
  });

  it("year 0 monthly operating matches (est_op_ex_psf * rsf) / 12", () => {
    const expected = (12 * 10000) / 12;
    expect(cf[0].operating).toBeCloseTo(expected, 2);
  });
});

describe("monthlyCashflow operating — FS", () => {
  const result = analyzeLease(buildFSMeta());
  const cf = result.monthlyEconomics!.monthlyCashflow;

  it("operating is 0 during base year months (year 0)", () => {
    for (let i = 0; i < 12; i++) {
      expect(cf[i].operating).toBe(0);
    }
  });

  it("operating > 0 after base year (year 1+)", () => {
    for (let i = 12; i < cf.length; i++) {
      expect(cf[i].operating).toBeGreaterThan(0);
    }
  });

  it("FS year 1 operating reflects escalation above base year", () => {
    const baseOpPsf = 12;
    const escalated = baseOpPsf * Math.pow(1.03, 1);
    const expectedMonthly = ((escalated - baseOpPsf) * 10000) / 12;
    expect(cf[12].operating).toBeCloseTo(expectedMonthly, 2);
  });
});
