/**
 * Test validation scenarios for Step 2 implementation
 */

import type { AnalysisMeta } from '@/types';
import { validateAnalysisMeta, getSmartValidationSummary } from '../analysisValidation';
import { getAllSectionStatuses, getOverallCompletionStatus } from '../sectionCompletion';
import { getDerivedRentStartDate } from '../utils';

describe('Validation Scenarios', () => {
  const baseAnalysis: AnalysisMeta = {
    id: 'test-id',
    name: 'Test Analysis',
    status: 'Draft',
    tenant_name: 'Test Tenant',
    market: 'Test Market',
    rsf: 10000,
    lease_type: 'FS',
    base_year: 2024,
    key_dates: {
      commencement: '2024-01-01',
      rent_start: '2024-02-01',
      expiration: '2029-12-31',
    },
    operating: {
      est_op_ex_psf: 15,
      escalation_method: 'fixed',
      escalation_value: 0.03,
    },
    rent_schedule: [
      {
        period_start: '2024-01-01',
        period_end: '2026-12-31',
        rent_psf: 30,
        escalation_percentage: 0.03,
      },
    ],
    concessions: {
      ti_allowance_psf: 50,
      moving_allowance: 100000,
      abatement_type: 'at_commencement',
      abatement_free_rent_months: 2,
      abatement_applies_to: 'base_only',
    },
    parking: {
      monthly_rate_per_stall: 150,
      stalls: 20,
      escalation_method: 'fixed',
      escalation_value: 0.03,
    },
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: 'annual',
    },
    notes: '',
    proposals: [],
  };

  describe('FS Lease with Missing Base Year', () => {
    it('should not require base year for FS lease', () => {
      const analysis = { ...baseAnalysis, base_year: undefined };
      const errors = validateAnalysisMeta(analysis);
      
      const baseYearError = errors.find(e => e.field === 'base_year');
      expect(baseYearError).toBeUndefined();
    });
  });

  describe('NNN Lease with Missing Expense Stop', () => {
    it('should show warning for missing expense stop in NNN lease', () => {
      const analysis: AnalysisMeta = { ...baseAnalysis, lease_type: 'NNN' as const };
      const errors = validateAnalysisMeta(analysis);
      
      // NNN leases should have expense stop, but it's not strictly required
      // This would be caught by smart validation as a confirmation
      const smartValidation = getSmartValidationSummary(analysis);
      expect(smartValidation.hasConfirmations).toBe(true);
    });
  });

  describe('Invalid Date Sequences', () => {
    it('should not require rent start when omitted', () => {
      const analysis = {
        ...baseAnalysis,
        key_dates: {
          commencement: '2024-02-01',
          rent_start: undefined,
          expiration: '2029-12-31',
        },
      };
      const errors = validateAnalysisMeta(analysis);
      
      const dateError = errors.find(e => e.field === 'rent_start');
      expect(dateError).toBeUndefined();
    });

    it('should show error for expiration before derived rent start', () => {
      const analysis = {
        ...baseAnalysis,
        concessions: {
          ...baseAnalysis.concessions,
          abatement_type: 'at_commencement' as const,
          abatement_free_rent_months: 3,
          abatement_applies_to: 'base_only' as const,
        },
        key_dates: {
          commencement: '2024-01-01',
          rent_start: undefined,
          expiration: '2024-02-01', // Before derived rent start (commencement + 3 months)
        },
      };
      const errors = validateAnalysisMeta(analysis);
      
      const dateError = errors.find(e => e.field === 'expiration');
      expect(dateError).toBeDefined();
      expect(dateError?.severity).toBe('error');
    });
  });

  describe('Derived Rent Start', () => {
    it('shifts by abatement_free_rent_months for at_commencement', () => {
      const analysis = {
        ...baseAnalysis,
        concessions: {
          ...baseAnalysis.concessions,
          abatement_type: 'at_commencement' as const,
          abatement_free_rent_months: 2,
        },
        key_dates: {
          ...baseAnalysis.key_dates,
          rent_start: undefined,
        },
      };
      expect(getDerivedRentStartDate(analysis)).toBe('2024-03-01');
    });

    it('shifts by sum of custom abatement periods', () => {
      const analysis = {
        ...baseAnalysis,
        concessions: {
          ...baseAnalysis.concessions,
          abatement_type: 'custom' as const,
          abatement_periods: [
            { period_start: '2024-01-01', period_end: '2024-01-31', free_rent_months: 1, abatement_applies_to: 'base_only' as const },
            { period_start: '2024-02-01', period_end: '2024-02-29', free_rent_months: 2, abatement_applies_to: 'base_only' as const },
          ],
        },
        key_dates: {
          ...baseAnalysis.key_dates,
          rent_start: undefined,
        },
      };
      expect(getDerivedRentStartDate(analysis)).toBe('2024-04-01');
    });

    it('defaults to commencement when no abatement', () => {
      const analysis = {
        ...baseAnalysis,
        concessions: {
          ...baseAnalysis.concessions,
          abatement_type: 'at_commencement' as const,
          abatement_free_rent_months: 0,
        },
        key_dates: {
          ...baseAnalysis.key_dates,
          rent_start: undefined,
        },
      };
      expect(getDerivedRentStartDate(analysis)).toBe('2024-01-01');
    });

    it('returns undefined when commencement is blank', () => {
      const analysis = {
        ...baseAnalysis,
        key_dates: {
          ...baseAnalysis.key_dates,
          commencement: '',
          rent_start: undefined,
        },
      };
      expect(getDerivedRentStartDate(analysis)).toBeUndefined();
    });
  });

  describe('RSF Outside Reasonable Ranges', () => {
    it('should show warning for very small RSF', () => {
      const analysis = { ...baseAnalysis, rsf: 50 }; // Very small
      const errors = validateAnalysisMeta(analysis);
      
      const rsfWarning = errors.find(e => e.field === 'rsf' && e.severity === 'warning');
      expect(rsfWarning).toBeDefined();
    });

    it('should show warning for very large RSF', () => {
      const analysis = { ...baseAnalysis, rsf: 15000000 }; // Very large
      const errors = validateAnalysisMeta(analysis);
      
      const rsfWarning = errors.find(e => e.field === 'rsf' && e.severity === 'warning');
      expect(rsfWarning).toBeDefined();
    });
  });

  describe('Incomplete Rent Schedules', () => {
    it('should show error for empty rent schedule', () => {
      const analysis = { ...baseAnalysis, rent_schedule: [] };
      const errors = validateAnalysisMeta(analysis);
      
      const rentError = errors.find(e => e.field === 'rent_schedule');
      expect(rentError).toBeDefined();
      expect(rentError?.severity).toBe('error');
    });

    it('should show error for negative free rent months', () => {
      const analysis = {
        ...baseAnalysis,
        concessions: {
          ...baseAnalysis.concessions,
          abatement_type: 'at_commencement' as const,
          abatement_free_rent_months: -1, // Negative
          abatement_applies_to: 'base_only' as const,
        },
      };
      const errors = validateAnalysisMeta(analysis);
      
      const freeRentError = errors.find(e => e.field.includes('free_rent_months') || e.field.includes('abatement'));
      expect(freeRentError).toBeDefined();
      expect(freeRentError?.severity).toBe('error');
    });
  });

  describe('Missing Required Fields', () => {
    it('should show errors for missing required fields', () => {
      const analysis = {
        ...baseAnalysis,
        name: '',
        tenant_name: '',
        market: '',
      };
      const errors = validateAnalysisMeta(analysis);
      
      const nameError = errors.find(e => e.field === 'name');
      const tenantError = errors.find(e => e.field === 'tenant_name');
      const marketError = errors.find(e => e.field === 'market');
      
      expect(nameError).toBeDefined();
      expect(tenantError).toBeDefined();
      expect(marketError).toBeDefined();
      
      expect(nameError?.severity).toBe('error');
      expect(tenantError?.severity).toBe('error');
      expect(marketError?.severity).toBe('error');
    });
  });

  describe('Section Completion Status', () => {
    it('should calculate correct completion percentages', () => {
      const analysis = {
        ...baseAnalysis,
        operating: {}, // Empty operating section
        concessions: {}, // Empty concessions section
      };
      const errors = validateAnalysisMeta(analysis);
      const sectionStatuses = getAllSectionStatuses(analysis, errors);
      const overallStatus = getOverallCompletionStatus(sectionStatuses);
      
      // Basic Information should be complete
      const basicInfo = sectionStatuses.find(s => s.name === 'Basic Information');
      expect(basicInfo?.isComplete).toBe(true);
      
      // Operating Expenses should be incomplete
      const operating = sectionStatuses.find(s => s.name === 'Operating Expenses');
      expect(operating?.isComplete).toBe(false);
      expect(operating?.completionPercentage).toBeLessThan(100);
      
      // Overall should reflect incomplete sections
      expect(overallStatus.overallPercentage).toBeLessThan(100);
    });
  });

  describe('Smart Validation with Confirmations', () => {
    it('should show confirmations for blank optional sections', () => {
      const analysis = {
        ...baseAnalysis,
        operating: {}, // Empty operating section
        concessions: {}, // Empty concessions section
        parking: undefined, // No parking section
      };
      
      const smartValidation = getSmartValidationSummary(analysis);
      
      expect(smartValidation.hasConfirmations).toBe(true);
      expect(smartValidation.confirmations).toBeDefined();
      expect(smartValidation.confirmations?.length).toBeGreaterThan(0);
      
      // Should have confirmations for operating expenses and concessions
      const operatingConfirmation = smartValidation.confirmations?.find(c => c.section === 'Operating Expenses');
      const concessionsConfirmation = smartValidation.confirmations?.find(c => c.section === 'Concessions');
      
      expect(operatingConfirmation).toBeDefined();
      expect(concessionsConfirmation).toBeDefined();
    });
  });

  describe('Progressive Validation (Warnings vs Errors)', () => {
    it('should distinguish between errors and warnings', () => {
      const analysis = {
        ...baseAnalysis,
        name: '', // Error - required field
        rsf: 50, // Warning - very small RSF
        cashflow_settings: {
          discount_rate: 1.5, // Warning - very high discount rate
          granularity: 'annual' as const,
        },
      };
      
      const errors = validateAnalysisMeta(analysis);
      const criticalErrors = errors.filter(e => e.severity === 'error');
      const warnings = errors.filter(e => e.severity === 'warning');
      
      expect(criticalErrors.length).toBeGreaterThan(0);
      expect(warnings.length).toBeGreaterThan(0);
      
      // Name should be an error
      const nameError = criticalErrors.find(e => e.field === 'name');
      expect(nameError).toBeDefined();
      
      // RSF should be a warning
      const rsfWarning = warnings.find(e => e.field === 'rsf');
      expect(rsfWarning).toBeDefined();
    });
  });
});
