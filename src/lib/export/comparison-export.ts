/**
 * Comparison export for multiple proposals
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportConfig, BrandingConfig } from './types';
import { DEFAULT_BRANDING } from './types';
import type { ExportData, CashflowLine } from './pdf-export';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

const fmtMoney = (v: number | undefined): string =>
  (v ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtRate = (v: number | undefined): string => `$${(v ?? 0).toFixed(2)}/SF/yr`;

/**
 * Generate comparison PDF for multiple proposals
 */
export async function generateComparisonPDF(
  proposals: ExportData[],
  config: ExportConfig
): Promise<Blob> {
  const branding = { ...DEFAULT_BRANDING, ...config.branding };
  const doc = new jsPDF({
    orientation: 'landscape', // Landscape for side-by-side comparison
    unit: 'mm',
    format: config.format || 'letter',
  });

  let yPosition = 20;

  // Set document properties
  doc.setProperties({
    title: 'Proposal Comparison',
    author: branding.companyName,
    subject: 'Lease Analysis Comparison Report',
    keywords: 'lease, analysis, comparison, commercial real estate',
  });

  // Header
  yPosition = addHeader(doc, branding, yPosition);
  yPosition += 5;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Proposal Comparison', 20, yPosition);
  yPosition += 10;

  // Summary comparison table
  yPosition = addComparisonTable(doc, proposals, yPosition);

  // Key metrics comparison
  yPosition = addMetricsComparison(doc, proposals, yPosition);

  // Cashflow comparison
  if (config.includeCashflow) {
    yPosition = addCashflowComparison(doc, proposals, yPosition);
  }

  // Add footer
  addFooter(doc, branding);

  return doc.output('blob');
}

function addHeader(doc: jsPDF, branding: BrandingConfig, yPosition: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(branding.companyName || 'Lease Analyzer', 20, yPosition);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  const dateStr = new Date().toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  doc.text(dateStr, doc.internal.pageSize.width - 20, yPosition, { align: 'right' });
  
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition + 3, doc.internal.pageSize.width - 20, yPosition + 3);
  
  return yPosition + 5;
}

function addComparisonTable(doc: jsPDF, proposals: ExportData[], yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Overview', 20, yPosition);
  yPosition += 8;

  // Build table data
  const headers = [
    'Field',
    ...proposals.map((p) => `${p.proposalSide || 'P'} ${p.proposalLabel || ''}`),
  ];

  const rows = [
    ['Tenant', ...proposals.map((p) => p.analysis.tenant_name)],
    ['Market', ...proposals.map((p) => p.analysis.market || 'N/A')],
    ['RSF', ...proposals.map((p) => p.analysis.rsf.toLocaleString())],
    ['Lease Type', ...proposals.map((p) => p.analysis.lease_type)],
    ['Term (years)', ...proposals.map((p) => p.metrics.totalYears.toString())],
    [
      'Commencement',
      ...proposals.map((p) => new Date(p.analysis.key_dates.commencement).toLocaleDateString()),
    ],
    [
      'Expiration',
      ...proposals.map((p) => new Date(p.analysis.key_dates.expiration).toLocaleDateString()),
    ],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 40 },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addMetricsComparison(doc: jsPDF, proposals: ExportData[], yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Financial Metrics', 20, yPosition);
  yPosition += 8;

  const headers = [
    'Metric',
    ...proposals.map((p) => `${p.proposalSide || 'P'} ${p.proposalLabel || ''}`),
  ];

  const rows = [
    ['Effective Rate', ...proposals.map((p) => fmtRate(p.metrics.effectiveRate))],
    ['Net Present Value', ...proposals.map((p) => fmtMoney(p.metrics.npv))],
    [
      'TI Allowance ($/SF)',
      ...proposals.map((p) =>
        p.analysis.concessions.ti_allowance_psf
          ? `$${p.analysis.concessions.ti_allowance_psf.toFixed(2)}`
          : '-'
      ),
    ],
    [
      'Moving Allowance',
      ...proposals.map((p) =>
        p.analysis.concessions.moving_allowance
          ? fmtMoney(p.analysis.concessions.moving_allowance)
          : '-'
      ),
    ],
    [
      'Total Concessions',
      ...proposals.map((p) => {
        const ti = (p.analysis.concessions.ti_allowance_psf || 0) * p.analysis.rsf;
        const moving = p.analysis.concessions.moving_allowance || 0;
        const other = p.analysis.concessions.other_credits || 0;
        return fmtMoney(ti + moving + other);
      }),
    ],
  ];

  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: {
      fontSize: 9,
      cellPadding: 3,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addCashflowComparison(doc: jsPDF, proposals: ExportData[], yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Annual Net Cash Flow Comparison', 20, yPosition);
  yPosition += 8;

  // Find common years across all proposals
  const allYears = new Set<number>();
  proposals.forEach((p) => {
    p.cashflow.forEach((line) => allYears.add(line.year));
  });
  const sortedYears = Array.from(allYears).sort();

  const headers = [
    'Year',
    ...proposals.map((p) => `${p.proposalSide?.substring(0, 2) || 'P'} ${p.proposalLabel || ''}`),
  ];

  const rows = sortedYears.map((year) => [
    year.toString(),
    ...proposals.map((p) => {
      const line = p.cashflow.find((l) => l.year === year);
      return line ? fmtMoney(line.net_cash_flow) : '-';
    }),
  ]);

  // Add totals row
  const totals = proposals.map((p) => {
    const total = p.cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);
    return fmtMoney(total);
  });
  rows.push(['TOTAL', ...totals]);

  autoTable(doc, {
    startY: yPosition,
    head: [headers],
    body: rows,
    theme: 'striped',
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [37, 99, 235],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
    },
    columnStyles: {
      0: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      // Bold the totals row
      if (data.row.index === rows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
      // Align currency columns to right
      if (data.column.index > 0) {
        data.cell.styles.halign = 'right';
      }
    },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addFooter(doc: jsPDF, branding: BrandingConfig): void {
  const pageCount = doc.getNumberOfPages();
  
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.setFont('helvetica', 'normal');
    
    if (branding.footer) {
      doc.text(branding.footer, 20, pageHeight - 10);
    }
    
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
}

/**
 * Download comparison PDF
 */
export function downloadComparisonPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

