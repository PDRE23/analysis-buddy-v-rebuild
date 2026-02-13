import { parseDateInput } from "@/lib/dateOnly";

export type DatedCashflow = {
  date: string | Date;
  amount: number;
};

function monthIndexFromAnchor(anchor: Date, date: Date): number {
  let months = (date.getFullYear() - anchor.getFullYear()) * 12 + (date.getMonth() - anchor.getMonth());
  if (date.getDate() < anchor.getDate()) {
    months -= 1;
  }
  return Math.max(0, months);
}

function resolveAnchorDate(cashflows: DatedCashflow[], anchorDate?: Date): Date | undefined {
  if (anchorDate) return anchorDate;
  let earliest: Date | undefined;
  for (const flow of cashflows) {
    const date = flow.date instanceof Date ? flow.date : parseDateInput(flow.date);
    if (!date) continue;
    if (!earliest || date < earliest) {
      earliest = date;
    }
  }
  return earliest;
}

/**
 * Net present value with monthly compounding.
 *
 * Assumptions:
 * - Discounting uses monthly compounding derived from the annual rate.
 * - Period index is computed from an anchor date (earliest cashflow by default).
 * - Day-based discounting is not supported yet.
 */
export function npvMonthly(
  cashflows: DatedCashflow[],
  annualDiscountRate: number,
  anchorDate?: Date
): number {
  if (cashflows.length === 0) return 0;
  const anchor = resolveAnchorDate(cashflows, anchorDate);
  if (!anchor) return 0;

  if (annualDiscountRate === 0) {
    return cashflows.reduce((sum, flow) => sum + flow.amount, 0);
  }

  const monthlyRate = Math.pow(1 + annualDiscountRate, 1 / 12) - 1;
  return cashflows.reduce((sum, flow) => {
    const date = flow.date instanceof Date ? flow.date : parseDateInput(flow.date);
    if (!date) return sum;
    const periodIndex = monthIndexFromAnchor(anchor, date);
    const discounted = flow.amount / Math.pow(1 + monthlyRate, periodIndex);
    return sum + discounted;
  }, 0);
}
