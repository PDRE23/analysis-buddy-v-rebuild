import type { AnalysisMeta } from "@/types";
import { buildMonthlyRentSchedule, normalizeAnalysis } from "@/lib/analysis";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";

function buildMeta(): AnalysisMeta {
  return {
    id: "monthly-parity",
    name: "Monthly Parity",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 1000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2025-12-31",
    },
    operating: {
      escalation_method: "fixed",
      escalation_value: 0,
    },
    rent_schedule: [
      {
        period_start: "2024-01-01",
        period_end: "2025-12-31",
        rent_psf: 30,
      },
    ],
    rent_escalation: {
      escalation_type: "fixed",
      fixed_escalation_percentage: 0.03,
    },
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

describe("monthly rent schedule parity (contract rent)", () => {
  it("matches annual cashflow base rent totals for fixed % escalations", () => {
    const meta = buildMeta();
    const { normalized } = normalizeAnalysis(meta);

    const schedule = buildMonthlyRentSchedule({
      normalized,
      rsf: meta.rsf,
      rent: {
        base_rent_psf: meta.rent_schedule[0].rent_psf,
        escalation: { type: "fixed_percent", fixed_percent: 0.03 },
      },
    });

    const annualCashflow = buildAnnualCashflow(meta);
    const annualBaseTotal = annualCashflow.reduce((sum, row) => sum + row.base_rent, 0);

    expect(schedule.summary.total_contract_rent).toBeCloseTo(annualBaseTotal);
    expect(schedule.summary.total_net_rent).toBeCloseTo(annualBaseTotal);
  });
});
