import { npvMonthly } from "@/lib/analysis";

describe("npvMonthly", () => {
  it("computes NPV with monthly compounding", () => {
    const cashflows = [
      { date: "2024-01-01", amount: 100 },
      { date: "2024-02-01", amount: 100 },
      { date: "2024-03-01", amount: 100 },
    ];
    const annualRate = 0.12;
    const monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
    const expected =
      100 / Math.pow(1 + monthlyRate, 0) +
      100 / Math.pow(1 + monthlyRate, 1) +
      100 / Math.pow(1 + monthlyRate, 2);

    const result = npvMonthly(cashflows, annualRate);
    expect(result).toBeCloseTo(expected);
  });

  it("returns sum when discount rate is zero", () => {
    const cashflows = [
      { date: "2024-01-01", amount: 100 },
      { date: "2024-02-01", amount: 50 },
    ];
    const result = npvMonthly(cashflows, 0);
    expect(result).toBe(150);
  });
});
