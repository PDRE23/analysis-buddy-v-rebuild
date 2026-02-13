export type AmortizationRow = {
  month: number;
  interest: number;
  principal: number;
  ending_balance: number;
};

/**
 * Build a monthly amortization schedule.
 *
 * Assumptions:
 * - Monthly compounding derived from annual rate.
 * - Payments are level across the term; no rounding is applied.
 */
export function buildAmortizationSchedule(
  principal: number,
  annualRate: number,
  termMonths: number
): AmortizationRow[] {
  if (principal <= 0 || termMonths <= 0) return [];

  const monthlyRate = annualRate === 0 ? 0 : Math.pow(1 + annualRate, 1 / 12) - 1;
  const payment =
    monthlyRate === 0
      ? principal / termMonths
      : principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -termMonths)));

  let balance = principal;
  const rows: AmortizationRow[] = [];

  for (let i = 1; i <= termMonths; i += 1) {
    const interest = monthlyRate === 0 ? 0 : balance * monthlyRate;
    const principalPayment = payment - interest;
    balance = Math.max(0, balance - principalPayment);
    rows.push({
      month: i,
      interest,
      principal: principalPayment,
      ending_balance: balance,
    });
  }

  return rows;
}
