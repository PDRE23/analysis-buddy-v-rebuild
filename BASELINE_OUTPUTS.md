NOTE:
This file may be populated after Phase 1.
Baseline values will be added before any calculation logic is modified.

# BASELINE OUTPUTS (v1)

Purpose:
These scenarios capture trusted outputs from v1 to validate that v2 produces identical results.
Screenshots are acceptable. Precision beyond displayed values is not required.

---

## Scenario 1 – Simple Fixed Escalation

Inputs (high level):
- Lease term:
- Rent structure:
- Escalation:
- Lease type (FS / NNN):
- Abatement: None

Outputs:
- NPV:
- IRR:
- Effective Rent PSF:
- Termination Fee (if applicable):

Notes:
Baseline “clean” deal used as sanity check.

---

## Scenario 2 – Abatement at Commencement

Inputs (high level):
- Lease term:
- Free rent at commencement:
- Escalation:
- Lease type:

Outputs:
- NPV:
- IRR:
- Effective Rent PSF:
- Termination Fee (if applicable):

Notes:
Validates commencement abatement logic.

---

## Scenario 3 – Full Service (FS) with Operating Expenses

Inputs (high level):
- Lease term:
- OpEx included (FS):
- OpEx escalation:
- Escalation:
- Abatement (if any):

Outputs:
- NPV:
- IRR:
- Effective Rent PSF:

Notes:
Validates FS vs NNN handling.

---

## Scenario 4 – Custom Abatement Periods

Inputs (high level):
- Lease term:
- Custom abatement periods:
- Escalation:
- Lease type:

Outputs:
- NPV:
- IRR:
- Effective Rent PSF:

Notes:
Validates overlapping abatement and calendar handling.

---

## Scenario 5 – Amortization or Early Termination

Inputs (high level):
- Lease term:
- Amortization enabled (Yes/No):
- Interest rate:
- Early termination option (if any):

Outputs:
- NPV:
- IRR:
- Effective Rent PSF:
- Termination Fee:
- Unamortized Costs:

Notes:
Validates amortization and termination fee logic.

---

## Validation Rule

For each scenario:
- v2 outputs must match v1 exactly (within rounding tolerance).
- If outputs differ, stop and investigate before proceeding.
