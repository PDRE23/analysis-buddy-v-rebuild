/**
 * Cashflow output type definitions
 */

export interface AnnualLine {
  year: number; // calendar year
  base_rent: number; // $ total (not psf)
  abatement_credit: number; // negative number (credit)
  operating: number; // passthroughs modeled
  parking: number; // annualized parking cost
  other_recurring: number; // reserved for future
  ti_shortfall?: number; // TI shortfall (one-time cost, typically year 1)
  transaction_costs?: number; // transaction costs (one-time cost, typically year 1)
  amortized_costs?: number; // amortized deal costs
  subtotal: number; // base_rent + operating + parking + other_recurring
  net_cash_flow: number; // subtotal + abatement_credit + ti_shortfall + transaction_costs + amortized_costs (TI/moving NOT netted in)
}

export type AnnualLineNumericKey = Exclude<keyof AnnualLine, "year">;

