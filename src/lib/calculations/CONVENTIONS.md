# Financial Calculation Conventions

## Compounding

All NPV calculations use **monthly compounding** internally.

- The input `discountRate` is treated as an **effective annual rate** (EAR).
- Internally converted to monthly: `r_m = (1 + EAR)^(1/12) - 1`.
- Annual cash flows at year *n* are discounted by `(1 + r_m)^(12n)`, which is algebraically equal to `(1 + EAR)^n` for integer-year boundaries.
- Sub-annual (monthly/dated) cash flows use `npvMonthly()` from `@/lib/analysis/npv`, which applies the same conversion.

**Canonical functions:**
| Function | Module | Input | Use case |
|---|---|---|---|
| `npv()` | `metrics-engine.ts` | `AnnualLine[]` | Annual lease cashflow NPV |
| `npvFromFlows()` | `metrics-engine.ts` | `{net_cash_flow}[]` | Type-flexible annual NPV |
| `npvMonthly()` | `analysis/npv.ts` | `DatedCashflow[]` | Sub-annual / dated NPV |

## Rounding

No intermediate rounding is applied in any calculation engine.

- All values are IEEE 754 double-precision floats throughout the pipeline.
- Rounding is applied only at the **display layer** (UI formatting functions).
- Display conventions:
  - Currency: `$X,XXX` (0 decimal places via `fmtMoney`)
  - Rate per SF: `$X.XX/SF/yr` (2 decimal places via `fmtRate`)
  - Percentages: 1-2 decimal places depending on context
- Export (PDF/Excel) uses the same display formatting as the UI.

## Escalation

- **Fixed escalation**: `base * (1 + rate)^n` where `n` is the term year index (0-based).
- **CPI escalation**: treated identically to fixed (rate = provided CPI estimate).
- **Custom escalation**: period-based lookup with per-period rates and base tracking.
- Escalation caps: `Math.min(rate, cap)` applied before compounding.

## Lease Term Calculation

- Term years are computed from commencement to expiration dates.
- Anniversary dates respect month-end clamping (e.g., Jan 31 start maps to Feb 28 in non-leap years).
- Partial final years are proportional based on actual months.

## Operating Expenses

- **NNN leases**: tenant pays full escalated OpEx.
- **Full Service (FS) leases**: tenant pays only the increase above the base year OpEx.
- Base year defaults to commencement year if not specified.

## Abatement

- **At commencement**: free months applied sequentially from year 1 forward.
- **Custom**: per-period free rent with date-range overlap calculation.
- Abatement scope: `base_only` (default) or `base_plus_nnn`.
- Abatement is recorded as a negative `abatement_credit` on the annual line.

## Net Cash Flow

```
subtotal = base_rent + operating + parking + other_recurring
net_cash_flow = subtotal + abatement_credit + ti_shortfall + transaction_costs + amortized_costs
```

- `abatement_credit` is negative (reduces cash flow).
- `ti_shortfall`, `transaction_costs`, `amortized_costs` are typically year-1 only.

## Unamortized Balance (Termination Fees)

The **unamortized balance at monthIndex** is defined as the outstanding amortization
balance **before** that month's payment is applied.

- `monthIndex 0` (first month): equals `totalToAmortize` — no payments have occurred yet.
- `monthIndex N` (N ≥ 1): equals `schedule[N-1].ending_balance` — i.e., the balance after the previous month's payment, which is the balance before the current month's payment.
- `monthIndex ≥ schedule.length`: the amortization is fully paid; return `0`.

Resolution order:
1. If `schedule[monthIndex].beginning_balance` is defined, use it directly (balance before that month's payment).
2. Else if `schedule[monthIndex-1].ending_balance` is defined, use it (balance after previous payment = balance before current payment).
3. Otherwise, compute `totalToAmortize - Σ(principal for months 0..monthIndex-1)`.

The result is clamped to `[0, totalToAmortize]` to guard against floating-point drift.

**Termination fee at monthIndex:**
```
penaltyRent = penaltyMonths × monthlyCashflow[monthIndex].base_rent
totalFee    = penaltyRent + unamortizedBalance(monthIndex)
eqMonths    = totalFee / base_rent   (if base_rent > 0)
```

## Effective Rent

```
effective_rent_psf = total_net_cash_flow / (RSF * term_years)
```

- RSF and term_years are clamped to minimum 1 to avoid division by zero.
