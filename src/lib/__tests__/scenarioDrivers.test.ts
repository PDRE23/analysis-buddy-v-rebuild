import type { MonthlyCashflowLine } from "@/lib/analysis/scenarioEconomics";
import { computeScenarioDrivers, compareScenarios } from "@/lib/analysis/scenarioDrivers";
import type { AnalysisMeta } from "@/types";
import { analyzeLease } from "@/lib/analysis-engine";

function makeLine(overrides: Partial<MonthlyCashflowLine> = {}, monthIndex = 0): MonthlyCashflowLine {
  return {
    monthIndex,
    start_date: "2024-01-01",
    end_date: "2024-01-31",
    payment_date: "2024-01-01",
    base_rent: 25000,
    operating: 10000,
    parking: 0,
    other_recurring: 0,
    abatement_credit: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 35000,
    net_cash_flow: 35000,
    ...overrides,
  };
}

describe("computeScenarioDrivers", () => {
  it("returns top 3 drivers sorted by absolute delta", () => {
    const base = [makeLine()];
    const scenario = [
      makeLine({
        base_rent: 30000,
        operating: 8000,
        parking: 500,
        amortized_costs: 200,
      }),
    ];

    const drivers = computeScenarioDrivers(base, scenario);
    expect(drivers).toHaveLength(3);
    expect(drivers[0].key).toBe("base_rent");
    expect(drivers[0].delta).toBe(5000);
    expect(drivers[1].key).toBe("operating");
    expect(drivers[1].delta).toBe(-2000);
    expect(drivers[2].key).toBe("parking");
    expect(drivers[2].delta).toBe(500);
  });

  it("excludes buckets with zero delta", () => {
    const base = [makeLine()];
    const scenario = [makeLine({ base_rent: 26000 })];

    const drivers = computeScenarioDrivers(base, scenario, 10);
    expect(drivers).toHaveLength(1);
    expect(drivers[0].key).toBe("base_rent");
    expect(drivers[0].delta).toBe(1000);
  });

  it("sums across multiple months", () => {
    const base = [makeLine({}, 0), makeLine({}, 1)];
    const scenario = [
      makeLine({ base_rent: 26000 }, 0),
      makeLine({ base_rent: 27000 }, 1),
    ];

    const drivers = computeScenarioDrivers(base, scenario);
    expect(drivers[0].key).toBe("base_rent");
    expect(drivers[0].delta).toBe(3000);
  });

  it("delta is signed: scenario - base", () => {
    const base = [makeLine({ operating: 10000 })];
    const scenario = [makeLine({ operating: 7000 })];

    const drivers = computeScenarioDrivers(base, scenario, 10);
    const opDriver = drivers.find((d) => d.key === "operating");
    expect(opDriver).toBeDefined();
    expect(opDriver!.delta).toBe(-3000);
  });

  it("returns empty array when cashflows are identical", () => {
    const base = [makeLine()];
    const drivers = computeScenarioDrivers(base, base);
    expect(drivers).toHaveLength(0);
  });
});

describe("compareScenarios (MonthlyEconomics integration)", () => {
  function buildMeta(rentPsf: number): AnalysisMeta {
    return {
      id: "driver-int-test",
      name: "Driver Integration",
      status: "Draft",
      tenant_name: "Tenant",
      market: "Market",
      rsf: 10000,
      lease_type: "NNN",
      key_dates: { commencement: "2024-01-01", expiration: "2025-12-31" },
      lease_term: { years: 2, months: 0, include_abatement_in_term: true },
      operating: { est_op_ex_psf: 12, escalation_type: "fixed", escalation_value: 0.03 },
      rent_schedule: [{ period_start: "2024-01-01", period_end: "2025-12-31", rent_psf: rentPsf }],
      concessions: { abatement_type: "at_commencement", abatement_free_rent_months: 0, abatement_applies_to: "base_only" },
      transaction_costs: { total: 0 },
      financing: { amortize_ti: false, amortize_free_rent: false, amortize_transaction_costs: false, amortization_method: "present_value", interest_rate: 0.06 },
      options: [],
      cashflow_settings: { discount_rate: 0.08, granularity: "annual" },
      proposals: [],
    };
  }

  it("returns comparison result with topDrivers attached", () => {
    const baseResult = analyzeLease(buildMeta(30));
    const scenarioResult = analyzeLease(buildMeta(35));
    const comparison = compareScenarios(baseResult.monthlyEconomics!, scenarioResult.monthlyEconomics!);

    expect(comparison.topDrivers.length).toBeGreaterThanOrEqual(1);
    expect(comparison.topDrivers[0].key).toBe("base_rent");
    expect(comparison.topDrivers[0].delta).toBeGreaterThan(0);
    expect(comparison.npvDelta).not.toBe(0);
    expect(comparison.totalCashflowDelta).toBeGreaterThan(0);
  });
});
