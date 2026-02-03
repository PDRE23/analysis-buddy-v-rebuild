/**
 * Form validation utilities for Lease Analyzer
 */

import type { AnalysisMeta } from "@/types";
import { getDerivedRentStartDate } from "./utils";
import { parseDateInput, parseDateOnly } from "./dateOnly";

export interface ValidationError {
  field: string;
  message: string;
  type: 'required' | 'format' | 'range' | 'business' | 'date' | 'confirmation';
  severity: 'error' | 'warning';
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  confirmations?: ConfirmationRequest[];
}

export interface ConfirmationRequest {
  section: string;
  message: string;
  fields: string[];
  type: 'optional' | 'recommended';
}

/**
 * Validate a date string
 */
export const validateDate = (value: string | undefined, fieldName: string): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!value) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      type: 'required',
      severity: 'error'
    });
    return errors;
  }

  const date = parseDateInput(value);
  if (!date || isNaN(date.getTime())) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid date`,
      type: 'format',
      severity: 'error'
    });
  }

  return errors;
};

/**
 * Validate a positive number
 */
export const validatePositiveNumber = (
  value: number | undefined, 
  fieldName: string, 
  min = 0
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (value === undefined || value === null) {
    errors.push({
      field: fieldName,
      message: `${fieldName} is required`,
      type: 'required',
      severity: 'error'
    });
    return errors;
  }

  if (isNaN(value)) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be a valid number`,
      type: 'format',
      severity: 'error'
    });
    return errors;
  }

  if (value < min) {
    errors.push({
      field: fieldName,
      message: `${fieldName} must be at least ${min}`,
      type: 'range',
      severity: 'error'
    });
  }

  return errors;
};

/**
 * Validate a percentage (0-100)
 */
export const validatePercentage = (value: number | undefined, fieldName: string): ValidationError[] => {
  const errors = validatePositiveNumber(value, fieldName);
  
  if (errors.length > 0) return errors;

  if (value! > 100) {
    errors.push({
      field: fieldName,
      message: `${fieldName} cannot exceed 100%`,
      type: 'range',
      severity: 'error'
    });
  }

  return errors;
};

/**
 * Validate date range (end must be after start)
 */
export const validateDateRange = (
  startDate: string | undefined,
  endDate: string | undefined,
  startFieldName: string,
  endFieldName: string
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!startDate || !endDate) return errors; // Let required validation handle missing dates
  
  const start = parseDateInput(startDate);
  const end = parseDateInput(endDate);
  if (!start || !end) return errors;
  
  if (start >= end) {
    errors.push({
      field: endFieldName,
      message: `${endFieldName} must be after ${startFieldName}`,
      type: 'date',
      severity: 'error'
    });
  }

  return errors;
};

/**
 * Validate lease term (must be reasonable)
 */
export const validateLeaseTerm = (
  commencement: string | undefined,
  expiration: string | undefined
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!commencement || !expiration) return errors;
  
  const start = parseDateOnly(commencement);
  const end = parseDateOnly(expiration);
  if (!start || !end) return errors;
  const yearsDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24 * 365);
  
  if (yearsDiff < 1) {
    errors.push({
      field: 'expiration',
      message: 'Lease term must be at least 1 year',
      type: 'business',
      severity: 'error'
    });
  }
  
  if (yearsDiff > 50) {
    errors.push({
      field: 'expiration',
      message: 'Lease term cannot exceed 50 years',
      type: 'business',
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Validate that lease_term matches calculated expiration date
 */
export const validateLeaseTermConsistency = (
  meta: AnalysisMeta
): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!meta.lease_term || !meta.key_dates.commencement || !meta.key_dates.expiration) {
    return errors; // Let other validations handle missing fields
  }
  
  // Calculate expected expiration from lease_term
  // Get abatement months
  let abatementMonths = 0;
  if (meta.concessions?.abatement_type === "at_commencement") {
    abatementMonths = meta.concessions.abatement_free_rent_months || 0;
  } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
    abatementMonths = meta.concessions.abatement_periods.reduce((sum, p) => sum + p.free_rent_months, 0);
  }
  
  const includeAbatement = meta.lease_term.include_abatement_in_term ?? false;
  
  // Calculate expected expiration (reuse calculateExpiration logic)
  const start = parseDateOnly(meta.key_dates.commencement);
  if (!start) return errors;
  const expectedExp = new Date(start);
  expectedExp.setFullYear(expectedExp.getFullYear() + meta.lease_term.years);
  expectedExp.setMonth(expectedExp.getMonth() + meta.lease_term.months);
  
  if (includeAbatement && abatementMonths > 0) {
    expectedExp.setMonth(expectedExp.getMonth() + abatementMonths);
  }
  
  // End date is the day before the same day-of-month
  expectedExp.setDate(expectedExp.getDate() - 1);
  
  const actualExp = parseDateOnly(meta.key_dates.expiration);
  if (!actualExp) return errors;
  
  // Allow 1 day tolerance for date calculation differences
  const diffDays = Math.abs((actualExp.getTime() - expectedExp.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffDays > 1) {
    errors.push({
      field: 'lease_term',
      message: `Lease term (${meta.lease_term.years} years, ${meta.lease_term.months} months) does not match calculated expiration date`,
      type: 'business',
      severity: 'warning'
    });
  }
  
  return errors;
};

/**
 * Validate rent schedule
 */
export const validateRentSchedule = (rentSchedule: Array<{
  period_start: string;
  period_end: string;
  rent_psf: number;
  free_rent_months?: number;
}>): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (!rentSchedule || rentSchedule.length === 0) {
    errors.push({
      field: 'rent_schedule',
      message: 'At least one rent period is required',
      type: 'required',
      severity: 'error'
    });
    return errors;
  }

  rentSchedule.forEach((period, index) => {
    const periodPrefix = `Rent Period ${index + 1}`;
    
    // Validate start date
    errors.push(...validateDate(period.period_start, `${periodPrefix} Start Date`));
    
    // Validate end date
    errors.push(...validateDate(period.period_end, `${periodPrefix} End Date`));
    
    // Validate date range
    errors.push(...validateDateRange(
      period.period_start,
      period.period_end,
      `${periodPrefix} Start Date`,
      `${periodPrefix} End Date`
    ));
    
    // Validate rent rate
    errors.push(...validatePositiveNumber(period.rent_psf, `${periodPrefix} Rent Rate`, 0));
    
    // Validate free rent months
    if (period.free_rent_months !== undefined) {
      if (period.free_rent_months < 0) {
        errors.push({
          field: `rent_schedule.${index}.free_rent_months`,
          message: `${periodPrefix} free rent months cannot be negative`,
          type: 'range',
          severity: 'error'
        });
      }
    }
  });

  return errors;
};

/**
 * Validate RSF (reasonable range)
 */
export const validateRSF = (rsf: number | undefined): ValidationError[] => {
  const errors = validatePositiveNumber(rsf, 'RSF', 1);
  
  if (errors.length > 0) return errors;

  if (rsf! < 100) {
    errors.push({
      field: 'rsf',
      message: 'RSF must be at least 100 square feet',
      type: 'range',
      severity: 'warning'
    });
  }
  
  if (rsf! > 10000000) { // 10M sq ft
    errors.push({
      field: 'rsf',
      message: 'RSF cannot exceed 10,000,000 square feet',
      type: 'range',
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Validate discount rate (reasonable range)
 */
export const validateDiscountRate = (rate: number | undefined): ValidationError[] => {
  const errors: ValidationError[] = [];
  
  if (rate === undefined || rate === null) {
    errors.push({
      field: 'discount_rate',
      message: 'Discount rate is required',
      type: 'required',
      severity: 'error'
    });
    return errors;
  }

  if (rate < 0) {
    errors.push({
      field: 'discount_rate',
      message: 'Discount rate cannot be negative',
      type: 'range',
      severity: 'error'
    });
  }
  
  if (rate > 1) { // 100%
    errors.push({
      field: 'discount_rate',
      message: 'Discount rate cannot exceed 100%',
      type: 'range',
      severity: 'warning'
    });
  }

  return errors;
};

/**
 * Get field display name
 */
export const getFieldDisplayName = (field: string): string => {
  const fieldMap: Record<string, string> = {
    'tenant_name': 'Tenant Name',
    'market': 'Market',
    'rsf': 'RSF',
    'lease_type': 'Lease Type',
    'base_year': 'Base Year',
    'commencement': 'Commencement Date',
    'rent_start': 'Rent Start Date',
    'expiration': 'Expiration Date',
    'est_op_ex_psf': 'Operating Expenses',
    'manual_pass_through_psf': 'Manual Pass-Through',
    'escalation_value': 'Escalation Rate',
    'ti_allowance_psf': 'TI Allowance',
    'moving_allowance': 'Moving Allowance',
    'monthly_rate_per_stall': 'Parking Rate',
    'stalls': 'Number of Stalls',
    'discount_rate': 'Discount Rate',
  };
  
  return fieldMap[field] || field;
};

/**
 * Check for blank optional sections that need confirmation
 */
export const checkBlankSections = (meta: unknown): ConfirmationRequest[] => {
  const confirmations: ConfirmationRequest[] = [];

  // Operating Expenses Section
  const operatingFields = [];
  const operating = (meta as any)?.operating;
  const isManualPassThrough = (meta as any)?.lease_type === 'FS' && operating?.use_manual_pass_through;
  if (!operating?.est_op_ex_psf && !isManualPassThrough) operatingFields.push('Operating Expenses per SF');
  if (isManualPassThrough && !operating?.manual_pass_through_psf) operatingFields.push('Manual Pass-Through per SF');
  if (!(meta as any)?.operating?.escalation_value) operatingFields.push('Escalation Rate');
  
  if (operatingFields.length > 0) {
    confirmations.push({
      section: 'Operating Expenses',
      message: `Operating expenses section is incomplete. Did you mean to leave these fields blank?`,
      fields: operatingFields,
      type: 'optional'
    });
  }

  // Concessions Section
  const concessionsFields = [];
  if (!(meta as any)?.concessions?.ti_allowance_psf) concessionsFields.push('TI Allowance');
  if (!(meta as any)?.concessions?.moving_allowance) concessionsFields.push('Moving Allowance');
  if (!(meta as any)?.concessions?.other_credits) concessionsFields.push('Other Credits');
  
  if (concessionsFields.length > 0) {
    confirmations.push({
      section: 'Concessions',
      message: `Concessions section is incomplete. Did you mean to leave these fields blank?`,
      fields: concessionsFields,
      type: 'optional'
    });
  }

  // Parking Section
  const parkingFields = [];
  if (!(meta as any)?.parking?.monthly_rate_per_stall) parkingFields.push('Parking Rate');
  if (!(meta as any)?.parking?.stalls) parkingFields.push('Number of Stalls');
  
  if (parkingFields.length > 0) {
    confirmations.push({
      section: 'Parking',
      message: `Parking section is incomplete. Did you mean to leave these fields blank?`,
      fields: parkingFields,
      type: 'optional'
    });
  }

  // Rent Schedule Section
  if (!(meta as any)?.rent_schedule || (meta as any)?.rent_schedule?.length === 0) {
    confirmations.push({
      section: 'Rent Schedule',
      message: `No rent periods defined. Did you mean to leave this section blank?`,
      fields: ['Rent Schedule'],
      type: 'recommended'
    });
  }

  return confirmations;
};

/**
 * Smart validation with confirmations for blank sections
 */
export const smartValidateAnalysisMeta = (meta: unknown): ValidationResult => {
  const errors: ValidationError[] = [];
  const analysis = meta as AnalysisMeta;
  const derivedRentStart = getDerivedRentStartDate(analysis);
  
  // Only validate truly required fields
  if (!(meta as any)?.name?.trim()) {
    errors.push({
      field: 'name',
      message: 'Proposal name is required',
      type: 'required',
      severity: 'error'
    });
  }

  if (!(meta as any)?.tenant_name?.trim()) {
    errors.push({
      field: 'tenant_name',
      message: 'Tenant Name is required',
      type: 'required',
      severity: 'error'
    });
  }

  if (!(meta as any)?.market?.trim()) {
    errors.push({
      field: 'market',
      message: 'Market is required',
      type: 'required',
      severity: 'error'
    });
  }

  // Validate RSF
  const rsfErrors = validateRSF((meta as any)?.rsf);
  errors.push(...rsfErrors);

  // Validate key dates
  if (analysis?.key_dates) {
    if (analysis.key_dates.commencement) {
      errors.push(...validateDate(analysis.key_dates.commencement, 'Commencement Date'));
    }
    if (derivedRentStart) {
      errors.push(...validateDate(derivedRentStart, 'Rent Start Date'));
    }
    if (analysis.key_dates.expiration) {
      errors.push(...validateDate(analysis.key_dates.expiration, 'Expiration Date'));
    }

    // Validate date relationships if all dates are present
    if (analysis.key_dates.commencement && derivedRentStart) {
      const commencement = parseDateOnly(analysis.key_dates.commencement);
      const rentStart = parseDateOnly(derivedRentStart);
      if (commencement && rentStart && commencement > rentStart) {
        errors.push({
          field: 'rent_start',
          message: 'Rent Start Date must be on or after Commencement Date',
          type: 'date',
          severity: 'error'
        });
      }
    }

    if (derivedRentStart && analysis.key_dates.expiration) {
      errors.push(...validateDateRange(
        derivedRentStart,
        analysis.key_dates.expiration,
        'Rent Start Date',
        'Expiration Date'
      ));
    }
  }

  // Check for blank sections that need confirmation
  const confirmations = checkBlankSections(meta);

  return {
    isValid: errors.length === 0,
    errors,
    confirmations: confirmations.length > 0 ? confirmations : undefined
  };
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): string[] => {
  return errors.map(error => {
    const fieldName = getFieldDisplayName(error.field);
    return `${fieldName}: ${error.message}`;
  });
};

/**
 * Format confirmation requests for display
 */
export const formatConfirmationRequests = (confirmations: ConfirmationRequest[]): string[] => {
  return confirmations.map(conf => {
    const fieldsList = conf.fields.join(', ');
    return `${conf.section}: ${conf.message} (${fieldsList})`;
  });
};
