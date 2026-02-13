import { buildAmortizationSchedule, terminationFeeAtMonth } from "@/lib/analysis";

describe("terminationFeeAtMonth", () => {
  it("calculates fee at month 0 with penalty", () => {
    const schedule = buildAmortizationSchedule(1200, 0, 12);
    const fee = terminationFeeAtMonth(schedule, 0, 2, 1000);
    expect(fee).toBeCloseTo(1100 + 2000);
  });

  it("calculates fee mid-term without penalty rent", () => {
    const schedule = buildAmortizationSchedule(1200, 0, 12);
    const fee = terminationFeeAtMonth(schedule, 5, 0);
    expect(fee).toBeCloseTo(600);
  });

  it("returns zero balance at end term", () => {
    const schedule = buildAmortizationSchedule(1200, 0, 12);
    const fee = terminationFeeAtMonth(schedule, 11, 0);
    expect(fee).toBeCloseTo(0);
  });
});
