/**
 * Section completion utilities
 */

import { AnalysisMeta } from '@/components/LeaseAnalyzerApp';
import { ValidationError } from './validation';
import { SectionStatus } from '@/components/ui/section-indicator';

/**
 * Calculate completion status for a section
 */
export function calculateSectionCompletion(
  sectionName: string,
  fields: string[],
  data: AnalysisMeta,
  errors: ValidationError[]
): SectionStatus {
  const sectionErrors = errors.filter(error => fields.includes(error.field));
  const hasErrors = sectionErrors.some(error => error.severity === 'error');
  const hasWarnings = sectionErrors.some(error => error.severity === 'warning');
  
  // Calculate completion percentage
  let completedFields = 0;
  const totalFields = fields.length;
  
  for (const field of fields) {
    const value = getNestedValue(data, field);
    if (value !== undefined && value !== null && value !== '') {
      completedFields++;
    }
  }
  
  const completionPercentage = totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 100;
  const isComplete = completionPercentage === 100 && !hasErrors;
  
  return {
    name: sectionName,
    isComplete,
    hasWarnings,
    hasErrors,
    completionPercentage
  };
}

/**
 * Get nested value from object using dot notation
 */
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
}

/**
 * Get all section statuses for an analysis
 */
export function getAllSectionStatuses(data: AnalysisMeta, errors: ValidationError[]): SectionStatus[] {
  const sections = [
    {
      name: 'Basic Information',
      fields: ['name', 'tenant_name', 'market', 'rsf', 'lease_type']
    },
    {
      name: 'Key Dates',
      fields: ['key_dates.commencement', 'key_dates.rent_start', 'key_dates.expiration']
    },
    {
      name: 'Lease Terms',
      fields: ['base_year', 'expense_stop_psf']
    },
    {
      name: 'Operating Expenses',
      fields: ['operating.est_op_ex_psf', 'operating.escalation_method', 'operating.escalation_value']
    },
    {
      name: 'Concessions',
      fields: ['concessions.ti_allowance_psf', 'concessions.moving_allowance', 'concessions.other_credits']
    },
    {
      name: 'Parking',
      fields: ['parking.monthly_rate_per_stall', 'parking.stalls', 'parking.escalation_method', 'parking.escalation_value']
    },
    {
      name: 'Rent Schedule',
      fields: ['rent_schedule']
    },
    {
      name: 'Cashflow Settings',
      fields: ['cashflow_settings.discount_rate']
    }
  ];
  
  return sections.map(section => 
    calculateSectionCompletion(section.name, section.fields, data, errors)
  );
}

/**
 * Get overall completion status
 */
export function getOverallCompletionStatus(sectionStatuses: SectionStatus[]): {
  totalSections: number;
  completedSections: number;
  sectionsWithErrors: number;
  sectionsWithWarnings: number;
  overallPercentage: number;
} {
  const totalSections = sectionStatuses.length;
  const completedSections = sectionStatuses.filter(s => s.isComplete).length;
  const sectionsWithErrors = sectionStatuses.filter(s => s.hasErrors).length;
  const sectionsWithWarnings = sectionStatuses.filter(s => s.hasWarnings).length;
  const overallPercentage = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 100;
  
  return {
    totalSections,
    completedSections,
    sectionsWithErrors,
    sectionsWithWarnings,
    overallPercentage
  };
}
