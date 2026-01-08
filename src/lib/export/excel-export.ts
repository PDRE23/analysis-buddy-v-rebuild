/**
 * Excel Export functionality using exceljs
 */

import ExcelJS from 'exceljs';
import type { ExportConfig } from './types';
import type { AnalysisData, CashflowLine, ExportData } from './pdf-export';

const fmtMoney = (v: number | undefined): number => v ?? 0;
const fmtRate = (v: number | undefined): number => v ?? 0;

/**
 * Generate Excel workbook for a single analysis
 */
export async function generateExcel(
  data: ExportData,
  config: ExportConfig
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'B² (Bsquared)';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.lastPrinted = new Date();
  
  // Add worksheets
  if (config.includeSummary) {
    addSummarySheet(workbook, data);
  }
  
  if (config.includeMetrics) {
    addMetricsSheet(workbook, data);
  }
  
  if (config.includeRentSchedule) {
    addRentScheduleSheet(workbook, data);
  }
  
  if (config.includeCashflow) {
    addCashflowSheet(workbook, data);
  }
  
  return await workbook.xlsx.writeBuffer();
}

function addSummarySheet(workbook: ExcelJS.Workbook, data: ExportData): void {
  const sheet = workbook.addWorksheet('Summary', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });
  
  // Set column widths
  sheet.columns = [
    { width: 25 },
    { width: 35 },
  ];
  
  // Title
  const titleRow = sheet.addRow([data.analysis.name]);
  titleRow.font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
  titleRow.height = 30;
  sheet.mergeCells('A1:B1');
  
  // Proposal info
  if (data.proposalSide && data.proposalLabel) {
    const proposalRow = sheet.addRow([`${data.proposalSide} Proposal - ${data.proposalLabel}`]);
    proposalRow.font = { size: 12, italic: true, color: { argb: 'FF64748B' } };
    sheet.mergeCells(`A2:B2`);
  }
  
  sheet.addRow([]);
  
  // Summary section header
  const summaryHeaderRow = sheet.addRow(['Property Summary']);
  summaryHeaderRow.font = { size: 14, bold: true };
  summaryHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  sheet.mergeCells(`A${summaryHeaderRow.number}:B${summaryHeaderRow.number}`);
  
  // Summary data
  const summaryData = [
    ['Tenant', data.analysis.tenant_name],
    ['Market', data.analysis.market || 'N/A'],
    ['Square Footage', `${data.analysis.rsf.toLocaleString()} RSF`],
    ['Lease Type', data.analysis.lease_type],
    ['Status', data.analysis.status],
    ['Commencement', new Date(data.analysis.key_dates.commencement).toLocaleDateString()],
    ['Rent Start', new Date(data.analysis.key_dates.rent_start).toLocaleDateString()],
    ['Expiration', new Date(data.analysis.key_dates.expiration).toLocaleDateString()],
    ['Term', `${data.metrics.totalYears} years`],
  ];
  
  if (data.analysis.lease_type === 'FS' && data.analysis.base_year) {
    summaryData.push(['Base Year', data.analysis.base_year.toString()]);
  }
  
  summaryData.forEach(([label, value]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' },
    };
  });
  
  sheet.addRow([]);
  
  // Key Metrics section
  const metricsHeaderRow = sheet.addRow(['Key Financial Metrics']);
  metricsHeaderRow.font = { size: 14, bold: true };
  metricsHeaderRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  sheet.mergeCells(`A${metricsHeaderRow.number}:B${metricsHeaderRow.number}`);
  
  const metricsData = [
    ['Effective Rate ($/SF/yr)', data.metrics.effectiveRate],
    ['Net Present Value', data.metrics.npv],
  ];
  
  if (data.analysis.concessions.ti_allowance_psf) {
    metricsData.push(['TI Allowance ($/SF)', data.analysis.concessions.ti_allowance_psf]);
  }
  if (data.analysis.concessions.moving_allowance) {
    metricsData.push(['Moving Allowance', data.analysis.concessions.moving_allowance]);
  }
  
  metricsData.forEach(([label, value]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' },
    };
    row.getCell(2).font = { bold: true, color: { argb: 'FF2563EB' } };
    
    // Format as currency or number
    if (typeof label === 'string' && (label.includes('Rate') || label.includes('Allowance'))) {
      row.getCell(2).numFmt = '$#,##0.00';
    } else {
      row.getCell(2).numFmt = '$#,##0';
    }
  });
  
  // Add notes if available
  if (data.analysis.notes) {
    sheet.addRow([]);
    const notesHeaderRow = sheet.addRow(['Notes']);
    notesHeaderRow.font = { size: 14, bold: true };
    notesHeaderRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE5E7EB' },
    };
    sheet.mergeCells(`A${notesHeaderRow.number}:B${notesHeaderRow.number}`);
    
    const notesRow = sheet.addRow([data.analysis.notes]);
    notesRow.alignment = { wrapText: true, vertical: 'top' };
    sheet.mergeCells(`A${notesRow.number}:B${notesRow.number}`);
    notesRow.height = 60;
  }
}

function addMetricsSheet(workbook: ExcelJS.Workbook, data: ExportData): void {
  const sheet = workbook.addWorksheet('Metrics', {
    properties: { tabColor: { argb: 'FF10B981' } },
  });
  
  sheet.columns = [
    { width: 30 },
    { width: 20 },
  ];
  
  // Header
  const headerRow = sheet.addRow(['Financial Metrics', 'Value']);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.height = 25;
  
  // Metrics
  const metricsRows = [
    ['Effective Rate ($/SF/yr)', data.metrics.effectiveRate, '$#,##0.00'],
    ['Net Present Value', data.metrics.npv, '$#,##0'],
    ['Total Years', data.metrics.totalYears, '0'],
    ['Total RSF', data.analysis.rsf, '#,##0'],
  ];
  
  if (data.analysis.concessions.ti_allowance_psf) {
    metricsRows.push(['TI Allowance ($/SF)', data.analysis.concessions.ti_allowance_psf, '$#,##0.00']);
    metricsRows.push([
      'Total TI Allowance',
      data.analysis.concessions.ti_allowance_psf * data.analysis.rsf,
      '$#,##0',
    ]);
  }
  
  if (data.analysis.concessions.moving_allowance) {
    metricsRows.push(['Moving Allowance', data.analysis.concessions.moving_allowance, '$#,##0']);
  }
  
  if (data.analysis.concessions.other_credits) {
    metricsRows.push(['Other Credits', data.analysis.concessions.other_credits, '$#,##0']);
  }
  
  metricsRows.forEach(([label, value, format]) => {
    const row = sheet.addRow([label, value]);
    row.getCell(2).numFmt = format as string;
    row.getCell(2).font = { bold: true };
    row.getCell(2).alignment = { horizontal: 'right' };
  });
  
  // Add borders
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }
  });
}

function addRentScheduleSheet(workbook: ExcelJS.Workbook, data: ExportData): void {
  const sheet = workbook.addWorksheet('Rent Schedule', {
    properties: { tabColor: { argb: 'FFF59E0B' } },
  });
  
  sheet.columns = [
    { width: 15 },
    { width: 15 },
    { width: 18 },
    { width: 15 },
    { width: 15 },
    { width: 20 },
  ];
  
  // Header
  const headerRow = sheet.addRow([
    'Period Start',
    'Period End',
    'Base Rent ($/SF/yr)',
    'Escalation',
    'Free Rent (mo)',
    'Abatement Applies To',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.height = 25;
  
  // Data rows
  data.analysis.rent_schedule.forEach((row) => {
    const annualRate = row.rent_psf; // Always annual
    const annualTotal = annualRate * data.analysis.rsf;
    const escalationPct = ((row.escalation_percentage || 0) * 100).toFixed(1) + '%';
    const abatementType = row.abatement_applies_to === 'base_plus_nnn' ? 'Base + NNN' : 'Base Only';
    
    const dataRow = sheet.addRow([
      new Date(row.period_start),
      new Date(row.period_end),
      row.rent_psf,
      escalationPct,
      row.free_rent_months || 0,
      abatementType,
    ]);
    
    dataRow.getCell(1).numFmt = 'mm/dd/yyyy';
    dataRow.getCell(2).numFmt = 'mm/dd/yyyy';
    dataRow.getCell(3).numFmt = '$#,##0.00';
    dataRow.getCell(5).numFmt = '0';
    dataRow.getCell(6).numFmt = '$#,##0';
    dataRow.getCell(6).font = { bold: true };
  });
  
  // Add borders
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }
  });
}

function addCashflowSheet(workbook: ExcelJS.Workbook, data: ExportData): void {
  const sheet = workbook.addWorksheet('Cashflow', {
    properties: { tabColor: { argb: 'FF8B5CF6' } },
  });
  
  sheet.columns = [
    { width: 10 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 18 },
    { width: 20 },
  ];
  
  // Header
  const headerRow = sheet.addRow([
    'Year',
    'Base Rent',
    'Operating',
    'Parking',
    'Abatement',
    'Subtotal',
    'Net Cash Flow',
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.height = 25;
  
  // Data rows
  data.cashflow.forEach((line) => {
    const row = sheet.addRow([
      line.year,
      line.base_rent,
      line.operating,
      line.parking,
      line.abatement_credit,
      line.subtotal,
      line.net_cash_flow,
    ]);
    
    // Format currency columns
    for (let i = 2; i <= 7; i++) {
      row.getCell(i).numFmt = '$#,##0';
    }
    
    row.getCell(7).font = { bold: true };
  });
  
  // Totals row
  const totals = data.cashflow.reduce(
    (acc, line) => ({
      base_rent: acc.base_rent + line.base_rent,
      operating: acc.operating + line.operating,
      parking: acc.parking + line.parking,
      abatement_credit: acc.abatement_credit + line.abatement_credit,
      subtotal: acc.subtotal + line.subtotal,
      net_cash_flow: acc.net_cash_flow + line.net_cash_flow,
    }),
    { base_rent: 0, operating: 0, parking: 0, abatement_credit: 0, subtotal: 0, net_cash_flow: 0 }
  );
  
  const totalsRow = sheet.addRow([
    'TOTAL',
    totals.base_rent,
    totals.operating,
    totals.parking,
    totals.abatement_credit,
    totals.subtotal,
    totals.net_cash_flow,
  ]);
  
  totalsRow.font = { bold: true };
  totalsRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE5E7EB' },
  };
  
  for (let i = 2; i <= 7; i++) {
    totalsRow.getCell(i).numFmt = '$#,##0';
  }
  
  // Add borders
  sheet.eachRow((row, rowNumber) => {
    if (rowNumber > 1) {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          bottom: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          left: { style: 'thin', color: { argb: 'FFE5E7EB' } },
          right: { style: 'thin', color: { argb: 'FFE5E7EB' } },
        };
      });
    }
  });
  
  // Freeze header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
}

/**
 * Generate comparison Excel workbook for multiple proposals
 */
export async function generateComparisonExcel(
  proposals: ExportData[],
  config: ExportConfig
): Promise<ExcelJS.Buffer> {
  const workbook = new ExcelJS.Workbook();
  
  workbook.creator = 'B² (Bsquared)';
  workbook.created = new Date();
  
  // Add comparison overview sheet
  const overviewSheet = workbook.addWorksheet('Comparison', {
    properties: { tabColor: { argb: 'FF2563EB' } },
  });
  
  // Set column widths - first column for labels, then one column per proposal
  overviewSheet.columns = [
    { width: 25 },
    ...proposals.map(() => ({ width: 20 })),
  ];
  
  // Title
  const titleRow = overviewSheet.addRow(['Proposal Comparison']);
  titleRow.font = { size: 18, bold: true, color: { argb: 'FF2563EB' } };
  titleRow.height = 30;
  overviewSheet.mergeCells(`A1:${String.fromCharCode(65 + proposals.length)}1`);
  
  overviewSheet.addRow([]);
  
  // Headers
  const headerRow = overviewSheet.addRow([
    'Metric',
    ...proposals.map((p) => `${p.proposalSide} - ${p.proposalLabel || 'Proposal'}`),
  ]);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF2563EB' },
  };
  headerRow.height = 25;
  
  // Comparison data
  const comparisonMetrics = [
    ['Effective Rate ($/SF/yr)', ...proposals.map((p) => p.metrics.effectiveRate), '$#,##0.00'],
    ['Net Present Value', ...proposals.map((p) => p.metrics.npv), '$#,##0'],
    ['Total Years', ...proposals.map((p) => p.metrics.totalYears), '0'],
    ['RSF', ...proposals.map((p) => p.analysis.rsf), '#,##0'],
    ['Lease Type', ...proposals.map((p) => p.analysis.lease_type), '@'],
    [
      'TI Allowance ($/SF)',
      ...proposals.map((p) => p.analysis.concessions.ti_allowance_psf || 0),
      '$#,##0.00',
    ],
    [
      'Moving Allowance',
      ...proposals.map((p) => p.analysis.concessions.moving_allowance || 0),
      '$#,##0',
    ],
  ];
  
  comparisonMetrics.forEach(([label, ...values]) => {
    const format = values[values.length - 1] as string;
    const dataValues = values.slice(0, -1);
    
    const row = overviewSheet.addRow([label, ...dataValues]);
    row.getCell(1).font = { bold: true };
    row.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF9FAFB' },
    };
    
    // Format data cells
    for (let i = 2; i <= proposals.length + 1; i++) {
      row.getCell(i).numFmt = format;
      row.getCell(i).alignment = { horizontal: 'right' };
    }
  });
  
  // Add individual sheets for each proposal
  proposals.forEach((proposal, index) => {
    addCashflowSheet(workbook, proposal);
    // Rename the sheet to include proposal info
    const sheets = workbook.worksheets;
    const lastSheet = sheets[sheets.length - 1];
    lastSheet.name = `${proposal.proposalSide?.substring(0, 2) || 'P'}${index + 1} Cashflow`;
  });
  
  return await workbook.xlsx.writeBuffer();
}

/**
 * Download Excel file
 */
export function downloadExcel(buffer: ExcelJS.Buffer, filename: string): void {
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

