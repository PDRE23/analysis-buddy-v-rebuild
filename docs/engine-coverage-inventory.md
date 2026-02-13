# Engine Coverage Inventory (analysis-buddy-v2-rebuild)

Scope and layers
- Sources reviewed: cashflow-engine, metrics-engine, analysis-engine, scenario-engine, validation, and related NER/commission/export modules.
- Scenario-engine is a merge + analyze wrapper only (no additional math).
- Layer legend: normalize = input normalization/derivation; cashflow = time-series dollars; metrics = summary outputs; validation = data integrity checks.

## Rent
Current coverage
- Base rent from rent schedule with fixed/custom escalation and schedule fallback; term-year proration by months (cashflow-engine).
- Rent schedule required plus date/rate validation (validation).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Rent start and early access handling | Commencement and rent start often differ; affects proration and NPV | commencement, rent_start or early_access, rent schedule | normalize + cashflow + validation |
| Escalation caps/floors and CPI-indexed increases | Standard lease language; simple percent can misstate rent | cap/floor percent, CPI index or annual CPI, compounding rules | normalize + cashflow + validation |
| Percentage rent / breakpoint | Required for retail deals | sales schedule, breakpoint, percent rent | cashflow + validation |

## Concessions
Current coverage
- Abatement at commencement or custom periods; base-only or base+NNN credit (cashflow-engine).
- TI shortfall (actual vs allowance) as year-1 cost; free rent value used in amortization when enabled (cashflow-engine).
- TI/moving/other credits validated for positive values (validation).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Apply TI allowance, moving allowance, other credits to cashflow | Concessions drive effective rent and NPV; not currently in cashflow | amounts, payer, timing | cashflow + metrics |
| Concession payment timing schedule | TI/credits are often paid over time | payment dates/amounts or percent over months | cashflow + validation |
| Abatement period consistency checks | Prevent overlaps or out-of-term free rent | abatement_periods, key_dates | validation |

## Operating Expenses
Current coverage
- FS vs NNN pass-throughs; base year logic; manual pass-through for FS; fixed/custom escalation with cap (cashflow-engine).
- Op-ex and base-year validations (validation).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Modified gross / expense stop support | Common lease type between FS and NNN | lease_type = MG, expense stop or base year | cashflow + validation |
| Op-ex category breakdown (CAM/tax/insurance) | Different escalations and recovery rules | per-category rates, escalation rules | cashflow + validation |
| Gross-up, admin fee, cap rules | Standard recovery adjustments | gross-up percent, admin percent, caps/floors | cashflow + validation |

## Parking
Current coverage
- Monthly rate per stall with fixed escalation; added to cashflow (cashflow-engine).
- Rate/stall validations (validation).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Included/free stalls vs paid stalls | Allowances change true cost | included_stalls, paid_stalls, rate | normalize + cashflow + validation |
| Parking rate schedules or custom escalation periods | Parking often steps up differently than rent | rate schedule or escalation periods | cashflow + validation |

## Financing/Amortization
Current coverage
- Amortize TI allowance, free rent, and transaction costs; straight-line or PV with interest rate; amortized_costs line (cashflow-engine).
- NPV and effective rent PSF metrics computed from cashflow using discount rate (analysis-engine + metrics-engine).
- Additional metric utilities (IRR, ROI, payback, cash-on-cash) exist but are not surfaced yet (calculations.ts).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Monthly cashflow granularity (use cashflow_settings.granularity) | Needed for short terms and monthly escalations | granularity, monthly schedule | cashflow + metrics |
| Debt or financing cashflows for TI or other upfront costs | Real financing costs affect NPV | principal, rate, term, draw schedule | cashflow |
| Amortize brokerage/commission/moving allowances explicitly | Major deal costs not amortized today | amounts, amortize flags | cashflow + validation |

## Options
Current coverage
- Option types defined; termination fee calculation and termination scenario helper exist (calculations.ts).
- Validation for termination option fields (validation).
- Scenario-engine merges overrides and runs analysis-engine (scenario-engine).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Renewal/expansion option scenario modeling | Core decision support | option term, RSF delta, rent schedule | scenario-engine + cashflow + validation |
| ROFR/ROFO evaluation beyond metadata | Often drives go/no-go decisions | option windows, proposed terms | scenario-engine + validation |
| Probability-weighted option outcomes | Enables expected value comparisons | option probability | metrics |

## NER
Current coverage
- NER engine computes yearly breakdown, NPV/PMT, starting NER, and NER with interest from NER inputs (nerCalculations.ts).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Derive NER from AnalysisMeta | Avoids duplicate inputs and mismatch | rent schedule, concessions, term, discount rate | normalize + metrics |
| Multi-step rent schedule support | More than 1-5/6+ is common | step schedule | metrics |
| Include other concessions or parking/op-ex if NER definition requires | Completeness | moving/other credits, parking, op-ex | metrics |

## Commission
Current coverage
- Commission calculation with year-1/subsequent rates, TI override, splits, accelerated payment; default structures (commission.ts).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Apply commission to cashflow with timing | Brokerage cost impacts NPV | commission structure, timing | cashflow + validation |
| Use renewal/expansion commission rates | Aligns with option type | option type, commission structure | commission + validation |
| Tiered or capped commission schedules | Common brokerage structures | tiers, caps | normalize + commission |

## Exports
Current coverage
- PDF/Excel/Print exports for single analysis and PDF/Excel comparisons; configurable sections and chart SVGs (export module).

Missing / likely needed
| Missing item | Why it matters | Minimum inputs | Where it should live |
| --- | --- | --- | --- |
| Ensure exports always use analysis-engine outputs (avoid stub helper) | Accuracy in reports | AnalysisMeta, analysis-engine outputs | exports |
| NER exports and charts | Parity with NER module | NER results | exports |
| Option/scenario export packages (termination, renewal comparisons) | Decision support | scenario results | exports |
