/**
 * Export configuration and types for PDF/Excel generation
 */

export interface ExportConfig {
  includeLeaseTerms: boolean;
  includeSummary: boolean;
  includeRentSchedule: boolean;
  includeCashflow: boolean;
  includeMetrics: boolean;
  includeCharts: boolean;
  includeNotes: boolean;
  includeNER: boolean;
  includeCommission: boolean;
  branding?: BrandingConfig;
  format?: 'letter' | 'a4' | 'legal';
  orientation?: 'portrait' | 'landscape';
}

export interface BrandingConfig {
  companyName?: string;
  logo?: string;
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
  footer?: string;
}

export interface ExportMetadata {
  title: string;
  author?: string;
  subject?: string;
  keywords?: string[];
  createdDate: Date;
}

export const DEFAULT_EXPORT_CONFIG: ExportConfig = {
  includeLeaseTerms: true,
  includeSummary: true,
  includeRentSchedule: false,
  includeCashflow: true,
  includeMetrics: true,
  includeCharts: false,
  includeNotes: true,
  includeNER: false,
  includeCommission: false,
  format: 'letter',
  orientation: 'landscape',
};

export const DEFAULT_BRANDING: BrandingConfig = {
  companyName: 'B\u00B2',
  primaryColor: '#0f1729',
  secondaryColor: '#1e293b',
  accentColor: '#d4a843',
  footer: 'Confidential \u2014 Prepared by B\u00B2 (Analysis Buddy)',
};
