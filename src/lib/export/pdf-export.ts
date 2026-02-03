/**
 * PDF Export functionality using jsPDF
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { ExportConfig, ExportMetadata, BrandingConfig } from './types';
import { DEFAULT_BRANDING } from './types';
import { formatDateOnlyDisplay } from '../dateOnly';

// Extend jsPDF type to include autoTable
declare module 'jspdf' {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: {
      finalY: number;
    };
  }
}

export interface AnalysisData {
  id: string;
  name: string;
  status: string;
  tenant_name: string;
  market: string;
  rsf: number;
  lease_type: string;
  base_year?: number;
  key_dates: {
    commencement: string;
    rent_start: string;
    expiration: string;
    early_access?: string;
  };
  rent_schedule: Array<{
    period_start: string;
    period_end: string;
    rent_psf: number;
    escalation_percentage?: number;
    free_rent_months?: number;
    abatement_applies_to?: string;
  }>;
  concessions: {
    ti_allowance_psf?: number;
    moving_allowance?: number;
    other_credits?: number;
  };
  parking?: {
    monthly_rate_per_stall?: number;
    stalls?: number;
  };
  operating: {
    est_op_ex_psf?: number;
    escalation_method?: string;
    escalation_value?: number;
  };
  notes?: string;
}

export interface CashflowLine {
  year: number; // term year index (1-based)
  base_rent: number;
  operating: number;
  parking: number;
  abatement_credit: number;
  subtotal: number;
  net_cash_flow: number;
}

export interface ExportData {
  analysis: AnalysisData;
  cashflow: CashflowLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
  proposalLabel?: string;
  proposalSide?: string;
}

const fmtMoney = (v: number | undefined): string =>
  (v ?? 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const fmtRate = (v: number | undefined): string => `$${(v ?? 0).toFixed(2)}/SF/yr`;

const fmtPercent = (v: number | undefined): string => `${((v ?? 0) * 100).toFixed(2)}%`;

/**
 * Generate PDF export for a single analysis
 */
export async function generatePDF(
  data: ExportData,
  config: ExportConfig,
  metadata?: ExportMetadata
): Promise<Blob> {
  const branding = { ...DEFAULT_BRANDING, ...config.branding };
  const doc = new jsPDF({
    orientation: config.orientation || 'portrait',
    unit: 'mm',
    format: config.format || 'letter',
  });

  let yPosition = 20;

  // Set document properties
  if (metadata) {
    doc.setProperties({
      title: metadata.title,
      author: metadata.author || branding.companyName,
      subject: metadata.subject || 'Lease Analysis Report',
      keywords: metadata.keywords?.join(', ') || 'lease, analysis, commercial real estate',
    });
  }

  // Header
  yPosition = addHeader(doc, branding, yPosition);
  yPosition += 5;

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text(data.analysis.name, 20, yPosition);
  yPosition += 8;

  if (data.proposalSide && data.proposalLabel) {
    doc.setFontSize(12);
    doc.setTextColor(100, 100, 100);
    doc.text(`${data.proposalSide} Proposal - ${data.proposalLabel}`, 20, yPosition);
    yPosition += 10;
  } else {
    yPosition += 5;
  }

  // Summary Section
  if (config.includeSummary) {
    yPosition = addSummarySection(doc, data, yPosition);
  }

  // Key Metrics
  if (config.includeMetrics) {
    yPosition = addMetricsSection(doc, data, yPosition);
  }

  // Rent Schedule
  if (config.includeRentSchedule && data.analysis.rent_schedule.length > 0) {
    yPosition = addRentScheduleSection(doc, data, yPosition);
  }

  // Cashflow Table
  if (config.includeCashflow && data.cashflow.length > 0) {
    yPosition = addCashflowSection(doc, data, yPosition);
  }

  // Notes
  if (config.includeNotes && data.analysis.notes) {
    yPosition = addNotesSection(doc, data, yPosition);
  }

  // Footer on all pages
  addFooter(doc, branding);

  return doc.output('blob');
}

function addHeader(doc: jsPDF, branding: BrandingConfig, yPosition: number): number {
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Primary color
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
  
  // Draw line
  doc.setDrawColor(200, 200, 200);
  doc.line(20, yPosition + 3, doc.internal.pageSize.width - 20, yPosition + 3);
  
  return yPosition + 5;
}

function addSummarySection(doc: jsPDF, data: ExportData, yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 60) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Property Summary', 20, yPosition);
  yPosition += 8;

  const summaryData = [
    ['Tenant', data.analysis.tenant_name],
    ['Market', data.analysis.market || 'N/A'],
    ['Square Footage', `${data.analysis.rsf.toLocaleString()} RSF`],
    ['Lease Type', data.analysis.lease_type],
    ['Status', data.analysis.status],
    ['Commencement', formatDateOnlyDisplay(data.analysis.key_dates.commencement, "N/A")],
    ['Expiration', formatDateOnlyDisplay(data.analysis.key_dates.expiration, "N/A")],
    ['Term', `${data.metrics.totalYears} years`],
  ];

  if (data.analysis.lease_type === 'FS' && data.analysis.base_year) {
    summaryData.push(['Base Year', data.analysis.base_year.toString()]);
  }

  autoTable(doc, {
    startY: yPosition,
    head: [],
    body: summaryData,
    theme: 'plain',
    styles: {
      fontSize: 10,
      cellPadding: 2,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50 },
      1: { cellWidth: 'auto' },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addMetricsSection(doc: jsPDF, data: ExportData, yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Key Financial Metrics', 20, yPosition);
  yPosition += 8;

  const metricsData = [
    ['Effective Rate', fmtRate(data.metrics.effectiveRate)],
    ['Net Present Value', fmtMoney(data.metrics.npv)],
    ['Total Term', `${data.metrics.totalYears} years`],
  ];

  // Add concessions if available
  if (data.analysis.concessions.ti_allowance_psf) {
    metricsData.push(['TI Allowance', fmtRate(data.analysis.concessions.ti_allowance_psf)]);
  }
  if (data.analysis.concessions.moving_allowance) {
    metricsData.push(['Moving Allowance', fmtMoney(data.analysis.concessions.moving_allowance)]);
  }

  autoTable(doc, {
    startY: yPosition,
    body: metricsData,
    theme: 'striped',
    styles: {
      fontSize: 10,
      cellPadding: 3,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 60 },
      1: { halign: 'right', cellWidth: 'auto', fontStyle: 'bold' },
    },
    headStyles: {
      fillColor: [37, 99, 235],
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addRentScheduleSection(doc: jsPDF, data: ExportData, yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Rent Schedule', 20, yPosition);
  yPosition += 8;

  const scheduleData = data.analysis.rent_schedule.map((row) => [
    formatDateOnlyDisplay(row.period_start, "N/A"),
    formatDateOnlyDisplay(row.period_end, "N/A"),
    fmtRate(row.rent_psf),
    row.escalation_percentage ? `${(row.escalation_percentage * 100).toFixed(1)}%` : '0%',
    row.free_rent_months ? `${row.free_rent_months} months` : '-',
    row.abatement_applies_to === 'base_plus_nnn' ? 'Base + NNN' : 'Base Only',
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Period Start', 'Period End', 'Base Rent', 'Escalation', 'Free Rent', 'Abatement']],
    body: scheduleData,
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
      2: { halign: 'right' },
      4: { halign: 'center' },
    },
    margin: { left: 20, right: 20 },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addCashflowSection(doc: jsPDF, data: ExportData, yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 50) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Annual Cashflow', 20, yPosition);
  yPosition += 8;

  const cashflowData = data.cashflow.map((line) => [
    `YR ${line.year}`,
    fmtMoney(line.base_rent),
    fmtMoney(line.operating),
    fmtMoney(line.parking),
    fmtMoney(line.abatement_credit),
    fmtMoney(line.net_cash_flow),
  ]);

  // Add totals row
  const totals = data.cashflow.reduce(
    (acc, line) => ({
      base_rent: acc.base_rent + line.base_rent,
      operating: acc.operating + line.operating,
      parking: acc.parking + line.parking,
      abatement_credit: acc.abatement_credit + line.abatement_credit,
      net_cash_flow: acc.net_cash_flow + line.net_cash_flow,
    }),
    { base_rent: 0, operating: 0, parking: 0, abatement_credit: 0, net_cash_flow: 0 }
  );

  cashflowData.push([
    'TOTAL',
    fmtMoney(totals.base_rent),
    fmtMoney(totals.operating),
    fmtMoney(totals.parking),
    fmtMoney(totals.abatement_credit),
    fmtMoney(totals.net_cash_flow),
  ]);

  autoTable(doc, {
    startY: yPosition,
    head: [['Term Year', 'Base Rent', 'Operating', 'Parking', 'Abatement', 'Net Cash Flow']],
    body: cashflowData,
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
      0: { halign: 'center', cellWidth: 20 },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 20, right: 20 },
    didParseCell: (data: any) => {
      // Bold the totals row
      if (data.row.index === cashflowData.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [240, 240, 240];
      }
    },
  });

  return (doc as any).lastAutoTable.finalY + 10;
}

function addNotesSection(doc: jsPDF, data: ExportData, yPosition: number): number {
  const pageHeight = doc.internal.pageSize.height;
  
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = 20;
  }

  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Notes', 20, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  const splitNotes = doc.splitTextToSize(data.analysis.notes || '', doc.internal.pageSize.width - 40);
  doc.text(splitNotes, 20, yPosition);
  
  return yPosition + (splitNotes.length * 5) + 10;
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
    
    // Footer text
    if (branding.footer) {
      doc.text(branding.footer, 20, pageHeight - 10);
    }
    
    // Page numbers
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - 20, pageHeight - 10, { align: 'right' });
  }
}

/**
 * Download PDF file
 */
export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

