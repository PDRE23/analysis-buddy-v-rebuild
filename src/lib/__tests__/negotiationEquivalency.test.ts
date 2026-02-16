import type { MonthlyRentScheduleResult } from "@/lib/analysis";
import {
  freeRentToRateEquivalentPsfYr,
  rateToFreeRentMonths,
  rateToTiEquivalentPsf,
  termExtensionToAdditionalTiPsf,
  tiToRateEquivalentPsfYr,
} from "@/lib/analysis";
import { formatDateOnly } from "@/lib/dateOnly";

const buildSchedule = (
  monthlyRents: number[],
  freeMonthIndexes: number[] = []
): MonthlyRentScheduleResult => {
  const months = monthlyRents.map((rent, index) => {
    const start = new Date(2024, index, 1);
    const end = new Date(2024, index + 1, 0);
    const isFree = freeMonthIndexes.includes(index);
    const freeAmount = isFree ? -rent : 0;
    const net = rent + freeAmount;
    return {
      period_index: index,
      start_date: formatDateOnly(start),
      end_date: formatDateOnly(end),
      contractual_base_rent: rent,
      free_rent_amount: freeAmount,
      net_rent_due: net,
    };
  });

  const totalContract = months.reduce((sum, row) => sum + row.contractual_base_rent, 0);
  const totalNet = months.reduce((sum, row) => sum + row.net_rent_due, 0);
  const freeRentValue = months.reduce(
    (sum, row) => sum + Math.abs(Math.min(0, row.free_rent_amount)),
    0
  );

  return {
    months,
    summary: {
      total_contract_rent: totalContract,
      total_net_rent: totalNet,
      free_rent_value: freeRentValue,
    },
    assumptions: {
      payment_timing: "advance",
      rounding: "none",
      term_source: "term_months",
    },
  };
};

describe("negotiation equivalencies", () => {
  const rentSchedule = buildSchedule([1000, 1000, 1000, 1100, 1100, 1100], [0]);
  const rsf = 1000;
  const discountRateAnnual = 0.1;

  it("tiToRateEquivalentPsfYr increases with TI", () => {
    const low = tiToRateEquivalentPsfYr({
      tiPsf: 5,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const high = tiToRateEquivalentPsfYr({
      tiPsf: 15,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("tiToRateEquivalentPsfYr round-trips via rateToTiEquivalentPsf", () => {
    const tiPsf = 12;
    const rate = tiToRateEquivalentPsfYr({
      tiPsf,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const tiBack = rateToTiEquivalentPsf({
      rateDeltaPsfYr: rate,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(tiBack).toBeCloseTo(tiPsf, 6);
  });

  it("rateToTiEquivalentPsf increases with rate delta", () => {
    const low = rateToTiEquivalentPsf({
      rateDeltaPsfYr: 1,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const high = rateToTiEquivalentPsf({
      rateDeltaPsfYr: 3,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(high).toBeGreaterThan(low);
  });

  it("rateToTiEquivalentPsf round-trips via tiToRateEquivalentPsfYr", () => {
    const rateDelta = 1.75;
    const ti = rateToTiEquivalentPsf({
      rateDeltaPsfYr: rateDelta,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const rateBack = tiToRateEquivalentPsfYr({
      tiPsf: ti,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(rateBack).toBeCloseTo(rateDelta, 6);
  });

  it("freeRentToRateEquivalentPsfYr increases with free rent months", () => {
    const one = freeRentToRateEquivalentPsfYr({
      freeRentMonths: 1,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const two = freeRentToRateEquivalentPsfYr({
      freeRentMonths: 2,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(two).toBeGreaterThan(one);
  });

  it("freeRentToRateEquivalentPsfYr round-trips via rateToFreeRentMonths", () => {
    const months = 2;
    const rate = freeRentToRateEquivalentPsfYr({
      freeRentMonths: months,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const monthsBack = rateToFreeRentMonths({
      rateDeltaPsfYr: rate,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(monthsBack).toBe(months);
  });

  it("rateToFreeRentMonths increases with rate delta", () => {
    const low = rateToFreeRentMonths({
      rateDeltaPsfYr: 0.5,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const high = rateToFreeRentMonths({
      rateDeltaPsfYr: 3,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(high).toBeGreaterThanOrEqual(low);
  });

  it("rateToFreeRentMonths round-trips via freeRentToRateEquivalentPsfYr", () => {
    const rateDelta = freeRentToRateEquivalentPsfYr({
      freeRentMonths: 2,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const months = rateToFreeRentMonths({
      rateDeltaPsfYr: rateDelta,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const rateBack = freeRentToRateEquivalentPsfYr({
      freeRentMonths: months,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(rateBack).toBeCloseTo(rateDelta, 6);
  });

  it("termExtensionToAdditionalTiPsf increases with extension months", () => {
    const short = termExtensionToAdditionalTiPsf({
      extensionMonths: 3,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const long = termExtensionToAdditionalTiPsf({
      extensionMonths: 6,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(long).toBeGreaterThan(short);
  });

  it("termExtensionToAdditionalTiPsf round-trips through rate and TI", () => {
    const extensionTi = termExtensionToAdditionalTiPsf({
      extensionMonths: 6,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const rate = tiToRateEquivalentPsfYr({
      tiPsf: extensionTi,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    const tiBack = rateToTiEquivalentPsf({
      rateDeltaPsfYr: rate,
      rsf,
      rentSchedule,
      discountRateAnnual,
    });
    expect(tiBack).toBeCloseTo(extensionTi, 6);
  });
});
