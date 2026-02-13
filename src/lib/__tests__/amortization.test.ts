import { buildAmortizationSchedule } from "@/lib/analysis";

describe("buildAmortizationSchedule", () => {
  it("uses straight-line when annual rate is zero", () => {
    const schedule = buildAmortizationSchedule(1200, 0, 12);
    expect(schedule).toHaveLength(12);
    expect(schedule[0].interest).toBe(0);
    expect(schedule[0].principal).toBeCloseTo(100);
    expect(schedule[11].ending_balance).toBeCloseTo(0);
  });

  it("matches a simple amortization case", () => {
    const schedule = buildAmortizationSchedule(1200, 0.12, 12);
    const monthlyRate = Math.pow(1 + 0.12, 1 / 12) - 1;
    const payment = 1200 * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -12)));
    const expectedInterest = 1200 * monthlyRate;
    const expectedPrincipal = payment - expectedInterest;
    const expectedEnding = 1200 - expectedPrincipal;

    expect(schedule[0].interest).toBeCloseTo(expectedInterest);
    expect(schedule[0].principal).toBeCloseTo(expectedPrincipal);
    expect(schedule[0].ending_balance).toBeCloseTo(expectedEnding);
  });
});
