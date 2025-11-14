/**
 * Main export module - aggregates all export functionality
 */

export * from './types';
export * from './pdf-export';
export * from './excel-export';
export * from './print-styles';
export * from './comparison-export';
export * from './chart-generator';

import type { ExportConfig } from './types';
import type { AnalysisData, CashflowLine, ExportData } from './pdf-export';
import { generatePDF, downloadPDF } from './pdf-export';
import { generateExcel, downloadExcel, generateComparisonExcel } from './excel-export';
import { openPrintDialog, injectPrintStyles } from './print-styles';
import { generateComparisonPDF, downloadComparisonPDF } from './comparison-export';
import { generateCashflowChartSVG, generateMetricsComparisonSVG } from './chart-generator';

/**
 * Helper to build cashflow lines from analysis data
 * This is a simplified version - the actual implementation should use the real calculation engine
 */
function buildCashflowFromAnalysis(analysis: AnalysisData): CashflowLine[] {
  // This is a stub - should be replaced with actual calculation logic
  const startYear = new Date(analysis.key_dates.commencement).getFullYear();
  const endYear = new Date(analysis.key_dates.expiration).getFullYear();
  const years: CashflowLine[] = [];
  
  for (let year = startYear; year <= endYear; year++) {
    years.push({
      year,
      base_rent: 0,
      operating: 0,
      parking: 0,
      abatement_credit: 0,
      subtotal: 0,
      net_cash_flow: 0,
    });
  }
  
  return years;
}

/**
 * Calculate basic metrics from cashflow
 */
function calculateMetrics(
  cashflow: CashflowLine[],
  analysis: AnalysisData
): { effectiveRate: number; npv: number; totalYears: number } {
  const totalNCF = cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);
  const totalYears = cashflow.length;
  const effectiveRate = totalYears > 0 && analysis.rsf > 0 
    ? totalNCF / (analysis.rsf * totalYears) 
    : 0;
  
  // Simple NPV calculation (should use discount rate from analysis)
  const discountRate = 0.08; // Default 8%
  const npv = cashflow.reduce((acc, line, i) => {
    return acc + line.net_cash_flow / Math.pow(1 + discountRate, i + 1);
  }, 0);
  
  return { effectiveRate, npv, totalYears };
}

/**
 * Main export function for single analysis
 */
export async function exportAnalysis(
  format: 'pdf' | 'excel' | 'print',
  analysis: AnalysisData,
  cashflow: CashflowLine[],
  metrics: { effectiveRate: number; npv: number; totalYears: number },
  config: ExportConfig,
  proposalInfo?: { side: string; label: string }
): Promise<void> {
  const exportData: ExportData = {
    analysis,
    cashflow,
    metrics,
    proposalLabel: proposalInfo?.label,
    proposalSide: proposalInfo?.side,
  };
  
  const filename = `${analysis.name.replace(/[^a-z0-9]/gi, '_')}_${format}_${new Date().toISOString().split('T')[0]}`;
  
  try {
    if (format === 'pdf') {
      const pdfBlob = await generatePDF(exportData, config, {
        title: analysis.name,
        author: 'B² (Bsquared)',
        subject: 'Lease Analysis Report',
        keywords: ['lease', 'analysis', 'commercial real estate'],
        createdDate: new Date(),
      });
      downloadPDF(pdfBlob, `${filename}.pdf`);
    } else if (format === 'excel') {
      const excelBuffer = await generateExcel(exportData, config);
      downloadExcel(excelBuffer, `${filename}.xlsx`);
    } else if (format === 'print') {
      injectPrintStyles();
      openPrintDialog({ title: analysis.name });
    }
  } catch (error) {
    console.error(`Export failed (${format}):`, error);
    throw new Error(`Failed to export ${format.toUpperCase()}`);
  }
}

/**
 * Export comparison of multiple proposals
 */
export async function exportComparison(
  format: 'pdf' | 'excel',
  proposals: Array<{
    analysis: AnalysisData;
    cashflow: CashflowLine[];
    metrics: { effectiveRate: number; npv: number; totalYears: number };
    side: string;
    label: string;
  }>,
  config: ExportConfig
): Promise<void> {
  const exportDataList: ExportData[] = proposals.map((p) => ({
    analysis: p.analysis,
    cashflow: p.cashflow,
    metrics: p.metrics,
    proposalLabel: p.label,
    proposalSide: p.side,
  }));
  
  const filename = `Comparison_${format}_${new Date().toISOString().split('T')[0]}`;
  
  try {
    if (format === 'excel') {
      const excelBuffer = await generateComparisonExcel(exportDataList, config);
      downloadExcel(excelBuffer, `${filename}.xlsx`);
    } else {
      // Generate side-by-side comparison PDF
      const pdfBlob = await generateComparisonPDF(exportDataList, config);
      downloadComparisonPDF(pdfBlob, `${filename}.pdf`);
    }
  } catch (error) {
    console.error(`Comparison export failed (${format}):`, error);
    throw new Error(`Failed to export comparison ${format.toUpperCase()}`);
  }
}

/**
 * Quick export functions with defaults
 */
export const quickExport = {
  /**
   * Quick PDF export with default settings
   */
  toPDF: async (
    analysis: AnalysisData,
    cashflow: CashflowLine[],
    metrics: { effectiveRate: number; npv: number; totalYears: number }
  ): Promise<void> => {
    await exportAnalysis('pdf', analysis, cashflow, metrics, {
      includeSummary: true,
      includeRentSchedule: true,
      includeCashflow: true,
      includeMetrics: true,
      includeCharts: false,
      includeNotes: true,
      format: 'letter',
      orientation: 'portrait',
    });
  },
  
  /**
   * Quick Excel export with default settings
   */
  toExcel: async (
    analysis: AnalysisData,
    cashflow: CashflowLine[],
    metrics: { effectiveRate: number; npv: number; totalYears: number }
  ): Promise<void> => {
    await exportAnalysis('excel', analysis, cashflow, metrics, {
      includeSummary: true,
      includeRentSchedule: true,
      includeCashflow: true,
      includeMetrics: true,
      includeCharts: false,
      includeNotes: true,
    });
  },
  
  /**
   * Quick print with default settings
   */
  print: (analysis: AnalysisData): void => {
    openPrintDialog({ title: analysis.name });
  },
};

