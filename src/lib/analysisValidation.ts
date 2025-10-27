/**
 * Validation rules for AnalysisMeta
 */

import { AnalysisMeta } from '@/components/LeaseAnalyzerApp';
import { 
  ValidationError, 
  ValidationResult,
  validateDate, 
  validatePositiveNumber, 
  validateDateRange, 
  validateLeaseTerm, 
  validateRSF, 
  validateDiscountRate,
  validateRentSchedule,
  smartValidateAnalysisMeta
} from './validation';

/**
 * Validate AnalysisMeta object
 */
export const validateAnalysisMeta = (meta: AnalysisMeta): ValidationError[] => {
  const errors: ValidationError[] = [];

  // Required fields
  if (!meta.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Proposal name is required',
      type: 'required',
      severity: 'error'
    });
  }

  if (!meta.tenant_name?.trim()) {
    errors.push({
      field: 'tenant_name',
      message: 'Tenant name is required',
      type: 'required',
      severity: 'error'
    });
  }

  if (!meta.market?.trim()) {
    errors.push({
      field: 'market',
      message: 'Market is required',
      type: 'required',
      severity: 'error'
    });
  }

  // Validate RSF
  errors.push(...validateRSF(meta.rsf));

  // Validate lease type
  if (!meta.lease_type || !['FS', 'NNN'].includes(meta.lease_type)) {
    errors.push({
      field: 'lease_type',
      message: 'Lease type must be FS or NNN',
      type: 'format',
      severity: 'error'
    });
  }

  // Validate key dates
  errors.push(...validateDate(meta.key_dates.commencement, 'Commencement Date'));
  errors.push(...validateDate(meta.key_dates.rent_start, 'Rent Start Date'));
  errors.push(...validateDate(meta.key_dates.expiration, 'Expiration Date'));

  // Validate date relationships
  errors.push(...validateDateRange(
    meta.key_dates.commencement,
    meta.key_dates.rent_start,
    'Commencement Date',
    'rent_start'
  ));

  errors.push(...validateDateRange(
    meta.key_dates.rent_start,
    meta.key_dates.expiration,
    'Rent Start Date',
    'expiration'
  ));

  // Validate lease term
  errors.push(...validateLeaseTerm(
    meta.key_dates.commencement,
    meta.key_dates.expiration
  ));

  // Validate operating expenses
  if (meta.operating.est_op_ex_psf !== undefined) {
    errors.push(...validatePositiveNumber(meta.operating.est_op_ex_psf, 'Operating Expenses'));
  }

  if (meta.operating.escalation_value !== undefined) {
    errors.push(...validatePositiveNumber(meta.operating.escalation_value, 'Escalation Rate'));
  }

  if (meta.operating.escalation_cap !== undefined) {
    errors.push(...validatePositiveNumber(meta.operating.escalation_cap, 'Escalation Cap'));
  }

  // Validate concessions
  if (meta.concessions.ti_allowance_psf !== undefined) {
    errors.push(...validatePositiveNumber(meta.concessions.ti_allowance_psf, 'TI Allowance'));
  }

  if (meta.concessions.moving_allowance !== undefined) {
    errors.push(...validatePositiveNumber(meta.concessions.moving_allowance, 'Moving Allowance'));
  }

  if (meta.concessions.other_credits !== undefined) {
    errors.push(...validatePositiveNumber(meta.concessions.other_credits, 'Other Credits'));
  }

  // Validate parking
  if (meta.parking?.monthly_rate_per_stall !== undefined) {
    errors.push(...validatePositiveNumber(meta.parking.monthly_rate_per_stall, 'Parking Rate'));
  }

  if (meta.parking?.stalls !== undefined) {
    errors.push(...validatePositiveNumber(meta.parking.stalls, 'Number of Stalls', 0));
  }

  if (meta.parking?.escalation_value !== undefined) {
    errors.push(...validatePositiveNumber(meta.parking.escalation_value, 'Parking Escalation'));
  }

  // Validate rent schedule
  errors.push(...validateRentSchedule(meta.rent_schedule));

  // Validate cashflow settings
  errors.push(...validateDiscountRate(meta.cashflow_settings.discount_rate));

  // Validate base year for FS leases
  if (meta.lease_type === 'FS') {
    if (!meta.base_year) {
      errors.push({
        field: 'base_year',
        message: 'Base year is required for FS leases',
        type: 'required',
        severity: 'error'
      });
    } else {
      const commencementYear = new Date(meta.key_dates.commencement).getFullYear();
      if (meta.base_year < commencementYear) {
        errors.push({
          field: 'base_year',
          message: 'Base year cannot be before commencement date',
          type: 'business',
          severity: 'error'
        });
      }
    }
  }

  // Validate expense stop for NNN leases
  if (meta.lease_type === 'NNN' && meta.expense_stop_psf !== undefined) {
    errors.push(...validatePositiveNumber(meta.expense_stop_psf, 'Expense Stop'));
  }

  return errors;
};

/**
 * Smart validation with confirmations for blank sections
 */
export const smartValidateAnalysisMetaWithConfirmations = (meta: AnalysisMeta): ValidationResult => {
  return smartValidateAnalysisMeta(meta);
};

/**
 * Get validation summary
 */
export const getValidationSummary = (meta: AnalysisMeta) => {
  const errors = validateAnalysisMeta(meta);
  const criticalErrors = errors.filter(e => e.severity === 'error');
  const warnings = errors.filter(e => e.severity === 'warning');

  return {
    isValid: criticalErrors.length === 0,
    hasCriticalErrors: criticalErrors.length > 0,
    hasWarnings: warnings.length > 0,
    errorCount: errors.length,
    criticalErrorCount: criticalErrors.length,
    warningCount: warnings.length,
    errors,
    criticalErrors,
    warnings,
  };
};

/**
 * Get smart validation summary with confirmations
 */
export const getSmartValidationSummary = (meta: AnalysisMeta) => {
  const result = smartValidateAnalysisMeta(meta);
  const criticalErrors = result.errors.filter(e => e.severity === 'error');
  const warnings = result.errors.filter(e => e.severity === 'warning');

  return {
    isValid: criticalErrors.length === 0,
    hasCriticalErrors: criticalErrors.length > 0,
    hasWarnings: warnings.length > 0,
    hasConfirmations: !!result.confirmations,
    errorCount: result.errors.length,
    criticalErrorCount: criticalErrors.length,
    warningCount: warnings.length,
    confirmationCount: result.confirmations?.length || 0,
    errors: result.errors,
    criticalErrors,
    warnings,
    confirmations: result.confirmations,
  };
};
