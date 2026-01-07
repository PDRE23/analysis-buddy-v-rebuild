## Scope of This Document

This document defines the existing business logic, assumptions, and calculation behavior of the application as implemented in v1.

It is not a design proposal.
It is not an optimization plan.
All calculations and outputs in v2 must match v1 exactly unless explicitly approved.

## Non-Negotiables

- All numeric outputs (NPV, IRR, effective rent, termination fees, yield metrics) must match v1 for identical inputs.
- Calculation order must not change.
- Default rates (8% discount / termination) must not change unless explicitly overridden by the user.
- Annualization logic (365.25 days, 30.44-day months) must not change.
- Any deviation from the above requires explicit user approval before implementation.

### 3.5 Early Termination Fee Calculation

For termination options:
1. Find active rent period at termination date
2. Calculate then-current rent (with escalations applied)
3. **Rent Fee**: `fee_months_of_rent * monthly_rent`
4. **Base Rent Penalty**: `base_rent_penalty * rsf`
5. **Unamortized Costs** (if included):
   - Uses PV amortization to calculate remaining balance
   - Includes: TI allowance, TI overage, free rent, brokerage, other costs
   - Default interest rate: 8%
6. **Total Fee**: `rent_fee + base_rent_penalty + unamortized_costs`

### 3.6 Unamortized Costs Calculation

Uses Present Value amortization:
- Calculates remaining balance at termination date
- Components: TI allowance, TI overage, free rent, brokerage, other transaction costs
- Formula: `PV of remaining payments = payment * (1 - (1 + r)^-n) / r`
- Where `n` = remaining months, `r` = monthly interest rate

### 3.7 Landlord Yield Metrics

- NPV (at discount rate)
- IRR (as percentage)
- Cash-on-Cash Return (as percentage)
- Yield on Cost (as percentage)
- Equity Multiple
- Payback Period (years)
- Net Yield (as percentage)

### 3.8 Sensitivity Analysis

Tests how changes in variables affect NPV:
- Default variations: -20%, -10%, 0%, +10%, +20%
- Calculates NPV for each variation
- Shows percent change from base NPV

### 3.9 Export Outputs

#### PDF Export
- Property summary
- Key financial metrics table
- Rent schedule breakdown
- Annual cashflow table
- Charts (cashflow visualization)
- Notes section
- Professional headers/footers

#### Excel Export
- **Summary Sheet**: Property and deal terms
- **Metrics Sheet**: Key financial metrics with formulas
- **Rent Schedule Sheet**: Editable rent schedule
- **Cashflow Sheet**: Annual cashflow with totals
- Color-coded sheets, conditional formatting

#### Comparison Export
- Side-by-side proposal comparison
- Metrics comparison table
- Cashflow comparison (year-by-year)
- Landscape format for PDF

---

## 4. Core Assumptions and Rules

### 4.1 Date and Time Calculations

- **Lease Term Calculation**: 
  - Prefers `lease_term.years + lease_term.months/12` if available
  - Falls back to date difference: `(expiration - commencement) / 365.25 days`
  - Accounts for leap years using 365.25 days/year

- **Month Calculations**:
  - Uses average month length: 30.44 days
  - `overlappingMonths`: Calculates partial month overlaps between date ranges
  - Counts partial months (e.g., Jan 15 - Feb 10 = 2 months)

- **Date Validation**:
  - Expiration must be after commencement
  - Rent start must be after commencement (if provided)
  - Lease term must be at least 1 year, warning if > 50 years
  - 1-day tolerance for lease_term vs expiration date mismatch

### 4.2 Financial Calculation Rules

- **Escalation**:
  - Applied annually using compound formula: `value * (1 + rate)^years`
  - Escalation within rent periods uses same formula
  - Custom escalation periods override fixed escalation

- **Abatement**:
  - Applied as negative values (credits)
  - Cannot exceed base rent for that period
  - If `base_plus_nnn`: Also abates operating expenses proportionally

- **TI Shortfall**:
  - Only calculated if `ti_actual_build_cost_psf > ti_allowance_psf`
  - Applied as one-time cost in first year
  - Tenant contribution = max(0, actual - allowance)

- **Transaction Costs**:
  - One-time costs applied to first year
  - Total is sum of all component costs
  - Can be amortized if financing enabled

- **Amortization**:
  - **Straight-line**: Simple division over term years
  - **Present Value**: Uses PMT formula with interest rate
  - Default interest rate: 8% for termination calculations
  - Can amortize: TI allowance, free rent value, transaction costs

- **NPV Calculation**:
  - Uses year index starting at 1 (not 0) for discounting
  - Formula: `NPV = Σ (cashflow[i] / (1 + r)^(i+1))`

- **IRR Calculation**:
  - Newton-Raphson method with max 100 iterations
  - Tolerance: 1e-6
  - Constrained between -99% and 99%
  - Falls back to bisection method if Newton-Raphson fails

### 4.3 Lease Type Rules

- **FS (Full Service)**:
  - Operating expenses included in cashflow
  - Base year required for some calculations
  - OpEx escalates annually

- **NNN (Triple Net)**:
  - Operating expenses NOT included in cashflow
  - Tenant pays operating expenses separately
  - Base year not applicable

### 4.4 Rent Schedule Rules

- At least one rent period required
- Periods must have valid date ranges (end > start)
- Periods can overlap (uses first matching period)
- Escalation within period is annual compound
- Free rent months in period (legacy) apply to that period only

### 4.5 Abatement Rules

- **At Commencement**:
  - Applied in commencement year
  - Uses rent rate from first rent period
  - Can apply to "base_only" or "base_plus_nnn"

- **Custom Periods**:
  - Can have multiple abatement periods
  - Each period specifies free rent months
  - Calculated for overlapping months with calendar years
  - Uses rent rate active during abatement period

### 4.6 Validation Rules

- **Required Fields**:
  - Analysis name
  - Tenant name
  - Market
  - RSF (must be >= 1, warning if < 100 or > 10,000,000)
  - Commencement date
  - Expiration date
  - Discount rate (must be >= 0, warning if > 1)
  - At least one rent period

- **Date Rules**:
  - All dates must be valid ISO date strings
  - Expiration > Commencement
  - Rent start > Commencement (if provided)
  - Lease term >= 1 year

- **Number Rules**:
  - RSF: Positive, >= 1
  - Rent rates: >= 0
  - Percentages: 0-100 (for display), 0-1 (for calculations)
  - Discount rate: >= 0, typically 0-1

### 4.7 Calculation Edge Cases

- **Zero/Undefined Values**:
  - Missing RSF defaults to 0 (causes division errors)
  - Missing rent schedule returns empty cashflow
  - Zero discount rate handled in NPV (no discounting)
  - Zero term years returns 0 for amortization

- **Date Edge Cases**:
  - Invalid dates return 0 or empty results
  - Dates outside lease term are ignored
  - Partial years handled proportionally

- **Financial Edge Cases**:
  - Division by zero protected (returns 0 or safe default)
  - Infinite values checked with `isFinite()`
  - Negative values clamped where appropriate (e.g., escalation rate >= 0)

### 4.8 Data Persistence

- Analyses stored in localStorage (client-side)
- Supabase integration available (server-side)
- Auto-save on field changes
- Data keyed by user ID (multi-tenant)

### 4.9 Proposal Comparison

- Multiple proposals can be created per analysis
- Each proposal is a complete AnalysisMeta object
- Proposals can be compared side-by-side
- Comparison shows: metrics, cashflow, rent schedule differences

### 4.10 Deal Pipeline Integration

- Analyses can be linked to deals
- Deal stages: "Lead" | "Touring" | "Proposal" | "Lease Execution" | "Closed Won" | "Closed Lost"
- Deal priority: "High" | "Medium" | "Low"
- Analyses sync with deal data (RSF, lease term, dates)

---

## 5. Data Structures

### 5.1 AnalysisMeta (Primary Data Structure)

Complete structure defined in `LeaseAnalyzerApp.tsx` (lines 130-216). Contains all inputs and metadata for a lease analysis.

### 5.2 AnnualLine (Cashflow Output)

{
  year: number;                    // Calendar year
  base_rent: number;                // $ total
  abatement_credit: number;         // Negative (credit)
  operating: number;                 // Passthroughs
  parking: number;                   // Annualized
  other_recurring: number;           // Reserved
  ti_shortfall?: number;            // One-time (year 1)
  transaction_costs?: number;        // One-time (year 1)
  amortized_costs?: number;          // Amortized amounts
  subtotal: number;                 // base_rent + operating + parking
  net_cash_flow: number;            // Final cashflow
}### 5.3 NERAnalysis

Separate structure for Net Effective Rent calculations (see `lib/types/ner.ts`).

### 5.4 Deal

Pipeline management structure (see `lib/types/deal.ts`). Links analyses to business deals.

---

## 6. Key Calculation Functions

### Core Functions (calculations.ts)
- `npv()`: Net Present Value
- `effectiveRentPSF()`: Effective rent per square foot
- `irr()`: Internal Rate of Return
- `paybackPeriod()`: Payback period calculation
- `cashOnCashReturn()`: Cash-on-cash return
- `roi()`: Return on Investment
- `calculateTIShortfall()`: TI shortfall calculation
- `calculateUnamortizedCosts()`: PV amortization balance
- `calculateEarlyTerminationFee()`: Termination fee calculation
- `calculatePVAmortizationBalance()`: PV amortization helper

### Cashflow Engine (LeaseAnalyzerApp.tsx)
- `buildAnnualCashflow()`: Main cashflow calculation engine

### NER Functions (nerCalculations.ts)
- `calculateNPV()`: NPV for NER
- `calculatePMT()`: Payment equivalent
- `calculateYearlyBreakdown()`: Year-by-year NER
- `calculateStartingNER()`: Starting NER calculation
- `calculateNER()`: Simple NER
- `calculateNERWithInterest()`: Discounted NER
- `performNERAnalysis()`: Complete NER analysis

### Financial Modeling (financialModeling.ts)
- `calculateIRR()`: IRR with Newton-Raphson
- `performSensitivityAnalysis()`: Sensitivity analysis
- `calculateBreakEven()`: Break-even point
- `valueLeaseOption()`: Option valuation
- `calculateLandlordYield()`: Comprehensive yield metrics

---

## 7. User Workflows

### 7.1 Create Analysis
1. User selects "Occupier Rep" or "Landlord Rep"
2. System creates new analysis with default structure
3. User navigates to Workspace to edit details
4. Analysis auto-saves to storage

### 7.2 Edit Analysis
1. User opens analysis from list
2. Selects proposal to edit
3. Edits fields in Proposal tab
4. Views results in Analysis tab (cashflow table)
5. Views charts in Cashflow tab
6. Can create additional proposals for comparison

### 7.3 Compare Proposals
1. User creates multiple proposals (Landlord/Tenant counters)
2. Views comparison in Cashflow tab
3. Exports comparison report (PDF/Excel)

### 7.4 Export Analysis
1. User clicks Export button
2. Selects sections to include
3. Chooses format (PDF/Excel/Print)
4. Downloads generated file

### 7.5 NER Analysis
1. User navigates to NER tab
2. Enters NER-specific inputs (base rent years 1-5, 6-LXD, months free, TI)
3. System calculates NER metrics
4. Displays yearly breakdown and summary

### 7.6 Deal Pipeline
1. User creates deal in Pipeline tab
2. Links analysis to deal
3. Tracks deal through stages
4. Views deal metrics and analytics

---

## 8. Technical Implementation Notes

### 8.1 Storage
- Primary: localStorage (client-side)
- Secondary: Supabase (server-side, user-scoped)
- Auto-save on changes

### 8.2 Calculation Engine
- Pure functions (no side effects)
- Memoized for performance
- Handles edge cases gracefully

### 8.3 Validation
- Real-time validation on input
- Smart validation with confirmations for blank sections
- Error/warning severity levels

### 8.4 Export
- PDF: jsPDF + jspdf-autotable
- Excel: ExcelJS
- Charts: SVG generation
- Print: CSS media queries

### 8.5 UI Framework
- Next.js 15 (React 19)
- Tailwind CSS
- shadcn/ui components
- Responsive design (mobile/tablet/desktop)

---

## 9. Business Logic Summary

### Core Principle
The application models commercial lease cashflows by:
1. Breaking lease into annual periods
2. Calculating base rent from rent schedule with escalations
3. Adding operating expenses (FS only) and parking
4. Subtracting abatement credits
5. Adding one-time costs (TI shortfall, transaction costs)
6. Applying amortization if enabled
7. Calculating net cash flow per year
8. Computing financial metrics (NPV, IRR, effective rent, etc.)

### Key Assumptions
- All calculations use annual granularity (monthly available but not primary)
- Escalations compound annually
- Abatement applies as credits (negative values)
- TI shortfall is one-time cost in year 1
- Transaction costs are one-time in year 1
- Amortization can be straight-line or PV-based
- Default discount rate: 8%
- Default termination interest rate: 8%
- Average month: 30.44 days
- Year length: 365.25 days (accounts for leap years)

### Calculation Order
1. Validate inputs
2. Build annual cashflow array
3. Calculate base rent (with escalations)
4. Add operating expenses (FS only)
5. Add parking
6. Apply abatement credits
7. Add TI shortfall (year 1)
8. Add transaction costs (year 1)
9. Apply amortization (if enabled)
10. Calculate net cash flow
11. Compute financial metrics
12. Generate outputs (tables, charts, exports)
5.3 NERAnalysis
Separate structure for Net Effective Rent calculations (see lib/types/ner.ts).
5.4 Deal
Pipeline management structure (see lib/types/deal.ts). Links analyses to business deals.
6. Key Calculation Functions
Core Functions (calculations.ts)
npv(): Net Present Value
effectiveRentPSF(): Effective rent per square foot
irr(): Internal Rate of Return
paybackPeriod(): Payback period calculation
cashOnCashReturn(): Cash-on-cash return
roi(): Return on Investment
calculateTIShortfall(): TI shortfall calculation
calculateUnamortizedCosts(): PV amortization balance
calculateEarlyTerminationFee(): Termination fee calculation
calculatePVAmortizationBalance(): PV amortization helper
Cashflow Engine (LeaseAnalyzerApp.tsx)
buildAnnualCashflow(): Main cashflow calculation engine
NER Functions (nerCalculations.ts)
calculateNPV(): NPV for NER
calculatePMT(): Payment equivalent
calculateYearlyBreakdown(): Year-by-year NER
calculateStartingNER(): Starting NER calculation
calculateNER(): Simple NER
calculateNERWithInterest(): Discounted NER
performNERAnalysis(): Complete NER analysis
Financial Modeling (financialModeling.ts)
calculateIRR(): IRR with Newton-Raphson
performSensitivityAnalysis(): Sensitivity analysis
calculateBreakEven(): Break-even point
valueLeaseOption(): Option valuation
calculateLandlordYield(): Comprehensive yield metrics
7. User Workflows
7.1 Create Analysis
User selects "Occupier Rep" or "Landlord Rep"
System creates new analysis with default structure
User navigates to Workspace to edit details
Analysis auto-saves to storage
7.2 Edit Analysis
User opens analysis from list
Selects proposal to edit
Edits fields in Proposal tab
Views results in Analysis tab (cashflow table)
Views charts in Cashflow tab
Can create additional proposals for comparison
7.3 Compare Proposals
User creates multiple proposals (Landlord/Tenant counters)
Views comparison in Cashflow tab
Exports comparison report (PDF/Excel)
7.4 Export Analysis
User clicks Export button
Selects sections to include
Chooses format (PDF/Excel/Print)
Downloads generated file
7.5 NER Analysis
User navigates to NER tab
Enters NER-specific inputs (base rent years 1-5, 6-LXD, months free, TI)
System calculates NER metrics
Displays yearly breakdown and summary
7.6 Deal Pipeline
User creates deal in Pipeline tab
Links analysis to deal
Tracks deal through stages
Views deal metrics and analytics
8. Technical Implementation Notes
8.1 Storage
Primary: localStorage (client-side)
Secondary: Supabase (server-side, user-scoped)
Auto-save on changes
8.2 Calculation Engine
Pure functions (no side effects)
Memoized for performance
Handles edge cases gracefully
8.3 Validation
Real-time validation on input
Smart validation with confirmations for blank sections
Error/warning severity levels
8.4 Export
PDF: jsPDF + jspdf-autotable
Excel: ExcelJS
Charts: SVG generation
Print: CSS media queries
8.5 UI Framework
Next.js 15 (React 19)
Tailwind CSS
shadcn/ui components
Responsive design (mobile/tablet/desktop)
9. Business Logic Summary
Core Principle
The application models commercial lease cashflows by:
Breaking lease into annual periods
Calculating base rent from rent schedule with escalations
Adding operating expenses (FS only) and parking
Subtracting abatement credits
Adding one-time costs (TI shortfall, transaction costs)
Applying amortization if enabled
Calculating net cash flow per year
Computing financial metrics (NPV, IRR, effective rent, etc.)
Key Assumptions
All calculations use annual granularity (monthly available but not primary)
Escalations compound annually
Abatement applies as credits (negative values)
TI shortfall is one-time cost in year 1
Transaction costs are one-time in year 1
Amortization can be straight-line or PV-based
Default discount rate: 8%
Default termination interest rate: 8%
Average month: 30.44 days
Year length: 365.25 days (accounts for leap years)
Calculation Order
Validate inputs
Build annual cashflow array
Calculate base rent (with escalations)
Add operating expenses (FS only)
Add parking
Apply abatement credits
Add TI shortfall (year 1)
Add transaction costs (year 1)
Apply amortization (if enabled)
Calculate net cash flow
Compute financial metrics
Generate outputs (tables, charts, exports)

