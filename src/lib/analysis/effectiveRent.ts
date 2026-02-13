export type FreeRentScheduleLike = {
  months: Array<{ free_rent_amount: number }>;
};

/**
 * Blended rent rate ($/SF/year) from total net rent.
 *
 * Assumptions:
 * - Term is expressed in whole months; conversion to years uses months/12.
 * - No rounding is applied here; leave rounding to presentation.
 */
export function blendedRate(totalNetRent: number, rsf: number, termMonths: number): number {
  if (rsf <= 0 || termMonths <= 0) return 0;
  const years = termMonths / 12;
  return totalNetRent / (rsf * years);
}

/**
 * Sum the value of free rent concessions from a monthly schedule.
 *
 * Assumptions:
 * - free_rent_amount is negative for abated months.
 */
export function freeRentValue(schedule: FreeRentScheduleLike): number {
  return schedule.months.reduce((sum, month) => {
    const credit = Math.min(0, month.free_rent_amount);
    return sum + Math.abs(credit);
  }, 0);
}
