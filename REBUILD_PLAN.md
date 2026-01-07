Analysis Buddy V2 Rebuild Plan
Overview
Rebuild plan focused on structure, clarity, and maintainability while preserving all business logic, calculations, assumptions, and outputs from v1.
Principles
Preserve all business logic exactly
No new features
No optimization of financial calculations
Improve file organization and code structure
Maintain type safety
Enable easier maintenance and testing
Phase 1: Foundation & Type Extraction
Goal: Extract all type definitions into a centralized, well-organized type system.
Files to Create:
src/types/analysis.ts - AnalysisMeta, Proposal, RentRow, AbatementPeriod, EscalationPeriod, OpExEscalationPeriod, OptionRow
src/types/cashflow.ts - AnnualLine interface
src/types/lease.ts - LeaseType, ProposalSide, and lease-related types
src/types/index.ts - Re-exports all types
Files to Modify:
src/components/LeaseAnalyzerApp.tsx - Remove type definitions, import from types
src/lib/types/ner.ts - Verify compatibility
src/lib/types/deal.ts - Verify compatibility
Validation:
[ ] All TypeScript compilation passes
[ ] No runtime type errors
[ ] All imports resolve correctly
[ ] Type definitions match v1 exactly (no structural changes)
Risk Level: Low
Only moving type definitions
No logic changes
Phase 2: Core Calculation Engine Extraction
Goal: Extract the cashflow calculation engine from LeaseAnalyzerApp.tsx into dedicated modules.
Files to Create:
src/lib/calculations/cashflow-engine.ts - Move buildAnnualCashflow() function
src/lib/calculations/rent-calculations.ts - Rent schedule calculations (escalation, period matching)
src/lib/calculations/abatement-calculations.ts - Abatement logic
src/lib/calculations/operating-expenses.ts - Operating expense calculations
src/lib/calculations/parking.ts - Parking calculations
src/lib/calculations/amortization.ts - Amortization logic (straight-line and PV)
src/lib/calculations/index.ts - Re-exports
Files to Modify:
src/components/LeaseAnalyzerApp.tsx - Remove buildAnnualCashflow(), import from new location
src/lib/calculations.ts - Keep existing functions, ensure compatibility
Validation:
[ ] Run identical test cases on v1 and v2 buildAnnualCashflow()
[ ] Compare AnnualLine outputs byte-for-byte for 10+ diverse scenarios
[ ] Verify edge cases (zero values, date boundaries, partial years)
[ ] Confirm calculation order unchanged
[ ] Test with all lease types (FS, NNN)
[ ] Test with all escalation types (fixed, custom)
[ ] Test with all abatement configurations
Test Scenarios to Validate:
Simple 5-year lease, fixed escalation
Complex lease with custom escalation periods
Lease with abatement at commencement
Lease with custom abatement periods
FS lease with operating expenses
NNN lease (no operating expenses)
Lease with parking
Lease with TI shortfall
Lease with transaction costs
Lease with amortization (straight-line)
Lease with amortization (PV)
Partial year scenarios
Edge cases (zero RSF, zero rent, etc.)
Risk Level: Medium
Core calculation logic
Requires thorough validation
Phase 3: Financial Metrics Extraction
Goal: Organize financial calculation functions into logical modules.
Files to Create:
src/lib/calculations/metrics.ts - NPV, IRR, effective rent, payback period, cash-on-cash, ROI
src/lib/calculations/termination.ts - Early termination fee, unamortized costs, PV amortization balance
src/lib/calculations/ti-calculations.ts - TI shortfall calculations
Files to Modify:
src/lib/calculations.ts - Move functions to new modules, keep file as re-export for backward compatibility
src/lib/financialModeling.ts - Verify no conflicts, ensure IRR implementation matches
Validation:
[ ] Test NPV with identical inputs (must match v1 exactly)
[ ] Test IRR with identical inputs (must match v1 exactly)
[ ] Test effective rent calculation
[ ] Test termination fee calculations (all scenarios)
[ ] Test unamortized costs calculation
[ ] Test TI shortfall calculation
[ ] Verify default rates (8% discount, 8% termination) unchanged
[ ] Verify annualization constants (365.25 days, 30.44 days) unchanged
Risk Level: Medium
Financial calculations are critical
Must match v1 exactly
Phase 4: NER Calculations Organization
Goal: Ensure NER calculations are well-organized and isolated.
Files to Review:
src/lib/nerCalculations.ts - Verify structure is clean
src/lib/types/ner.ts - Already extracted, verify
Files to Create (if needed):
src/lib/calculations/ner/ - If further organization needed
ner-core.ts - Core NER calculations
ner-breakdown.ts - Yearly breakdown
ner-metrics.ts - NER metrics (NER, NER with interest, starting NER)
Validation:
[ ] Test all NER calculation functions with identical inputs
[ ] Verify NER outputs match v1 exactly
[ ] Test edge cases (zero TI, zero free rent, partial years)
Risk Level: Low
NER calculations already in separate file
Mostly organizational
Phase 5: Date & Time Utilities Extraction
Goal: Extract date calculation utilities into a dedicated module.
Files to Create:
src/lib/utils/dates.ts - overlappingMonths(), lease term calculations, date validation
src/lib/utils/constants.ts - Constants (365.25 days/year, 30.44 days/month, default rates)
Files to Modify:
src/lib/leaseTermCalculations.ts - Move to dates.ts or keep as wrapper
src/lib/calculations.ts - Remove overlappingMonths() if duplicated
src/components/LeaseAnalyzerApp.tsx - Update imports
Validation:
[ ] Test date calculations with identical inputs
[ ] Verify leap year handling (365.25)
[ ] Verify month calculations (30.44 days)
[ ] Test edge cases (year boundaries, leap years)
Risk Level: Low
Utility functions
No business logic changes
Phase 6: Validation Logic Organization
Goal: Organize validation functions into a clear structure.
Files to Review:
src/lib/analysisValidation.ts - Verify structure
src/lib/validation.ts - Check for duplication
Files to Create (if needed):
src/lib/validation/ - If further organization needed
field-validation.ts - Field-level validation
date-validation.ts - Date validation rules
number-validation.ts - Number validation rules
analysis-validation.ts - Complete analysis validation
Validation:
[ ] Test all validation rules with identical inputs
[ ] Verify validation messages unchanged
[ ] Test edge cases
Risk Level: Low
Validation logic is isolated
Mostly organizational
Phase 7: UI Component Decomposition
Goal: Break down LeaseAnalyzerApp.tsx into smaller, focused components.
Files to Create:
src/components/analysis/ProposalForm.tsx - Proposal input form
src/components/analysis/RentScheduleEditor.tsx - Rent schedule editing
src/components/analysis/ConcessionsEditor.tsx - Concessions/abatement editing
src/components/analysis/OptionsEditor.tsx - Options editing
src/components/analysis/CashflowView.tsx - Cashflow table display
src/components/analysis/MetricsDisplay.tsx - Financial metrics display
src/components/analysis/ProposalSelector.tsx - Proposal selection UI
src/hooks/useAnalysisState.ts - State management hook
src/hooks/useCashflow.ts - Cashflow calculation hook
Files to Modify:
src/components/LeaseAnalyzerApp.tsx - Refactor to use new components, maintain exact same behavior
Validation:
[ ] UI renders identically to v1
[ ] All user interactions work identically
[ ] State management behaves identically
[ ] Auto-save works identically
[ ] Form validation works identically
[ ] No visual regressions
Risk Level: Medium-High
Large UI component
Must preserve all behavior exactly
Phase 8: Export Module Organization
Goal: Ensure export functionality is well-organized.
Files to Review:
src/lib/export/ - Already organized, verify structure
src/lib/export/index.ts - Main export function
Validation:
[ ] PDF export produces identical output to v1
[ ] Excel export produces identical output to v1
[ ] Comparison export works identically
[ ] All export formats match v1 exactly
Risk Level: Low
Export already in separate module
Mostly verification
Phase 9: Storage & Persistence Organization
Goal: Ensure storage logic is clean and well-organized.
Files to Review:
src/lib/storage.ts - Verify structure
src/lib/dealStorage.ts - Verify structure
src/lib/supabase/ - Verify structure
Validation:
[ ] Data loads identically from storage
[ ] Auto-save works identically
[ ] Data migration (if any) works correctly
[ ] Supabase sync works identically
Risk Level: Low
Storage already in separate modules
Mostly verification
Phase 10: Integration & End-to-End Testing
Goal: Comprehensive testing to ensure v2 matches v1 exactly.
Test Plan:
Unit Tests:
[ ] All calculation functions tested with identical inputs
[ ] All utility functions tested
[ ] All validation functions tested
Integration Tests:
[ ] Complete analysis creation workflow
[ ] Proposal creation and editing
[ ] Cashflow calculation for complex scenarios
[ ] Export functionality (PDF, Excel, comparison)
[ ] Storage persistence
[ ] Deal integration
Regression Tests:
[ ] Test suite of 20+ diverse lease scenarios from v1
[ ] Compare all numeric outputs (NPV, IRR, effective rent, etc.)
[ ] Compare all AnnualLine outputs
[ ] Compare all export outputs
[ ] Test all edge cases
Manual Testing:
[ ] User workflow testing (create, edit, compare, export)
[ ] UI/UX verification (should look and feel identical)
[ ] Performance testing (should be similar or better)
Validation Criteria:
All numeric outputs match v1 exactly (within floating-point precision)
All UI behavior matches v1 exactly
All exports match v1 exactly
No regressions in functionality
Risk Level: High
Final validation phase
Must catch any discrepancies
Phase 11: Documentation & Cleanup
Goal: Document the new structure and clean up any temporary code.
Tasks:
[ ] Update code comments
[ ] Document module structure
[ ] Create architecture diagram
[ ] Update README with new structure
[ ] Remove any temporary code
[ ] Ensure all imports are clean
[ ] Verify no circular dependencies
Risk Level: Low
Documentation and cleanup only
Validation Strategy
Automated Testing:
Create test suite that runs v1 and v2 calculations side-by-side
Compare outputs for identical inputs
Flag any discrepancies (even tiny ones)
Test with diverse scenarios (simple to complex)
Manual Validation:
Create 10-20 representative lease analyses in v1
Recreate same analyses in v2
Compare all outputs manually
Verify UI behavior matches
Key Metrics to Compare:
NPV (must match exactly)
IRR (must match exactly)
Effective rent PSF (must match exactly)
All AnnualLine values (must match exactly)
Termination fees (must match exactly)
Unamortized costs (must match exactly)
All export outputs (must match exactly)
Risk Mitigation
High-Risk Phases:
Phase 2 (Cashflow Engine): Most critical, requires extensive testing
Phase 3 (Financial Metrics): Financial calculations must be exact
Phase 7 (UI Decomposition): Large refactor, must preserve behavior
Mitigation Strategies:
Complete validation after each phase before proceeding
Keep v1 code as reference until v2 is fully validated
Create comprehensive test suite early
Test incrementally, not just at the end
Document any deviations (should be zero)
Success Criteria
The rebuild is successful when:
✅ All business logic preserved exactly
✅ All calculations produce identical outputs
✅ All UI behavior matches v1
✅ Code is better organized and more maintainable
✅ Type safety is improved
✅ No new features introduced
✅ No optimizations that change behavior
✅ All tests pass
✅ Documentation is updated
Notes
Do not optimize calculations (even if "better" algorithms exist)
Do not change default values (8% rates, 365.25 days, etc.)
Do not change calculation order
Do not change data structures (only reorganize code)
Preserve all edge case handling exactly as-is
Preserve all validation rules exactly as-is