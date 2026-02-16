import { npv, npvFromFlows } from "@/lib/calculations/metrics-engine";
import { npvMonthly } from "@/lib/analysis/npv";
import type { AnnualLine } from "@/types";

function makeLine(year: number, ncf: number): AnnualLine {
  return {
    year,
    base_rent: ncf,
    abatement_credit: 0,
    operating: 0,
    parking: 0,
    other_recurring: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: ncf,
    net_cash_flow: ncf,
  };
}

describe("NPV parity — annual vs monthly compounding", () => {
  const rates = [0, 0.05, 0.08, 0.10, 0.15];
  const flows = [100_000, 105_000, 110_250, 115_762.5, 121_550.63];

  it.each(rates)(
    "npv() and npvMonthly() agree at annual boundaries (rate=%s)",
    (rate) => {
      const lines = flows.map((f, i) => makeLine(i + 1, f));

      const annualNpv = npv(lines, rate);

      const dated = flows.map((f, i) => ({
        date: new Date(2025 + i, 0, 1),
        amount: f,
      }));
      const monthlyNpv = npvMonthly(dated, rate, new Date(2024, 0, 1));

      expect(annualNpv).toBeCloseTo(monthlyNpv, 2);
    }
  );

  it("npvFromFlows produces same result as npv for identical data", () => {
    const lines = flows.map((f, i) => makeLine(i + 1, f));
    const genericFlows = flows.map((f) => ({ net_cash_flow: f }));

    for (const rate of rates) {
      expect(npvFromFlows(genericFlows, rate)).toBeCloseTo(npv(lines, rate), 10);
    }
  });

  it("npv returns sum of flows when discount rate is zero", () => {
    const lines = flows.map((f, i) => makeLine(i + 1, f));
    const total = flows.reduce((a, b) => a + b, 0);
    expect(npv(lines, 0)).toBe(total);
  });

  it("npv with higher discount rate produces lower present value", () => {
    const lines = flows.map((f, i) => makeLine(i + 1, f));
    const lowRate = npv(lines, 0.05);
    const highRate = npv(lines, 0.15);
    expect(highRate).toBeLessThan(lowRate);
  });
});
