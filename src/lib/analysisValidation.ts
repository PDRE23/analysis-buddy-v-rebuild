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
  validateLeaseTermConsistency,
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

  // Validate USF and load factor
  if (meta.usf !== undefined) {
    if (meta.usf <= 0) {
      errors.push({
        field: 'usf',
        message: 'USF must be greater than 0',
        type: 'format',
        severity: 'error'
      });
    }
    if (meta.rsf > 0 && meta.usf > meta.rsf) {
      errors.push({
        field: 'usf',
        message: 'USF cannot be greater than RSF',
        type: 'business',
        severity: 'error'
      });
    }
  }

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

  // Validate lease term consistency
  errors.push(...validateLeaseTermConsistency(meta));

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

  // Validate transaction costs
  if (meta.transaction_costs) {
    if (meta.transaction_costs.legal_fees !== undefined) {
      errors.push(...validatePositiveNumber(meta.transaction_costs.legal_fees, 'Legal Fees', 0));
    }
    if (meta.transaction_costs.brokerage_fees !== undefined) {
      errors.push(...validatePositiveNumber(meta.transaction_costs.brokerage_fees, 'Brokerage Fees', 0));
    }
    if (meta.transaction_costs.due_diligence !== undefined) {
      errors.push(...validatePositiveNumber(meta.transaction_costs.due_diligence, 'Due Diligence', 0));
    }
    if (meta.transaction_costs.environmental !== undefined) {
      errors.push(...validatePositiveNumber(meta.transaction_costs.environmental, 'Environmental', 0));
    }
    if (meta.transaction_costs.other !== undefined) {
      errors.push(...validatePositiveNumber(meta.transaction_costs.other, 'Other Transaction Costs', 0));
    }
  }

  // Validate financing
  if (meta.financing) {
    if (meta.financing.amortization_method && !['straight_line', 'present_value'].includes(meta.financing.amortization_method)) {
      errors.push({
        field: 'financing.amortization_method',
        message: 'Amortization method must be straight_line or present_value',
        type: 'format',
        severity: 'error'
      });
    }
    if (meta.financing.amortization_method === 'present_value' && (!meta.financing.interest_rate || meta.financing.interest_rate <= 0)) {
      errors.push({
        field: 'financing.interest_rate',
        message: 'Interest rate is required for present value amortization',
        type: 'required',
        severity: 'error'
      });
    }
  }

  // Validate termination options
  if (meta.options) {
    meta.options.forEach((option, index) => {
      if (option.type === 'Termination') {
        if (!option.notice_months || option.notice_months <= 0) {
          errors.push({
            field: `options[${index}].notice_months`,
            message: 'Notice months is required for termination options',
            type: 'required',
            severity: 'error'
          });
        }
        if (option.fee_months_of_rent !== undefined && option.fee_months_of_rent < 0) {
          errors.push({
            field: `options[${index}].fee_months_of_rent`,
            message: 'Fee months of rent cannot be negative',
            type: 'format',
            severity: 'error'
          });
        }
        if (option.base_rent_penalty !== undefined && option.base_rent_penalty < 0) {
          errors.push({
            field: `options[${index}].base_rent_penalty`,
            message: 'Base rent penalty cannot be negative',
            type: 'format',
            severity: 'error'
          });
        }
      }
    });
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
