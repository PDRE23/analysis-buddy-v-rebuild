/**
 * Premium PDF Export — "Modern Institutional" styling
 * Navy/gold palette matching the Analysis tab aesthetic
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { ExportConfig, ExportMetadata, BrandingConfig } from "./types";
import { DEFAULT_BRANDING } from "./types";
import { formatDateOnlyDisplay } from "../dateOnly";

declare module "jspdf" {
  interface jsPDF {
    autoTable: typeof autoTable;
    lastAutoTable?: { finalY: number };
  }
}

const NAVY = [15, 23, 41] as const; // #0f1729
const SLATE = [30, 41, 59] as const; // #1e293b
const GOLD = [212, 168, 67] as const; // #d4a843
const WHITE = [255, 255, 255] as const;
const LIGHT_BG = [248, 250, 252] as const; // #f8fafc
const BORDER = [226, 232, 240] as const; // #e2e8f0
const MUTED = [100, 116, 139] as const; // #64748b
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const DARK_TEXT = [15, 23, 41] as const;

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
    ti_actual_build_cost_psf?: number;
    moving_allowance?: number;
    other_credits?: number;
    abatement_type?: string;
    abatement_free_rent_months?: number;
    abatement_applies_to?: string;
    abatement_periods?: Array<{
      period_start: string;
      free_rent_months: number;
    }>;
  };
  parking?: {
    monthly_rate_per_stall?: number;
    stalls?: number;
    escalation_value?: number;
  };
  operating: {
    est_op_ex_psf?: number;
    escalation_method?: string;
    escalation_value?: number;
  };
  rent_escalation?: {
    escalation_type?: string;
    fixed_escalation_percentage?: number;
    escalation_mode?: string;
    fixed_escalation_amount?: number;
    escalation_periods?: Array<unknown>;
  };
  cashflow_settings?: {
    discount_rate?: number;
  };
  transaction_costs?: {
    total?: number;
  };
  commissionStructure?: {
    yearOneBrokerage: number;
    subsequentYears: number;
    renewalCommission: number;
    expansionCommission: number;
    splitPercentage: number;
    acceleratedPayment: boolean;
    tiOverride?: number;
  };
  notes?: string;
}

export interface CashflowLine {
  year: number;
  base_rent: number;
  operating: number;
  parking: number;
  abatement_credit: number;
  subtotal: number;
  net_cash_flow: number;
  ti_shortfall?: number;
  transaction_costs?: number;
  amortized_costs?: number;
  other_recurring?: number;
}

export interface NERExportData {
  ner: number;
  nerWithInterest: number;
  startingNER: number;
  yearlyBreakdown: Array<{
    year: number;
    baseRent: number;
    freeRent: number;
    ti: number;
    total: number;
  }>;
  calculations: {
    total: number;
    average: number;
    npv: number;
    pmt: number;
  };
  startingNERCalc: {
    amortizedFreeRent: number;
    amortizedTI: number;
    startingRent: number;
    startingNER: number;
  };
}

export interface CommissionExportData {
  total: number;
  breakdown: {
    year1Commission: number;
    subsequentYearsCommission: number;
    tiCommission: number;
    totalCommission: number;
    splitAmount: number;
    netCommission: number;
    acceleratedTotal?: number;
  };
  structure: {
    yearOneBrokerage: number;
    subsequentYears: number;
    splitPercentage: number;
    acceleratedPayment: boolean;
  };
}

export interface ExportData {
  analysis: AnalysisData;
  cashflow: CashflowLine[];
  metrics: {
    effectiveRate: number;
    npv: number;
    totalYears: number;
  };
  yieldMetrics?: {
    irr: number;
    yieldOnCost: number;
    equityMultiple: number;
    paybackPeriod: number;
    cashOnCashReturn: number;
    netYield: number;
  };
  summaryStats?: {
    totalLeaseValue: number;
    averageAnnualCashflow: number;
    totalConcessions: number;
    startingRent: number;
    endingRent: number;
    leaseTermYears: number;
    leaseTermMonths: number;
  };
  nerData?: NERExportData;
  commissionData?: CommissionExportData;
  proposalLabel?: string;
  proposalSide?: string;
}

const fmtMoney = (v: number | undefined): string =>
  (v ?? 0).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });

const fmtRate = (v: number | undefined): string =>
  `$${(v ?? 0).toFixed(2)}/SF/yr`;

const fmtPSF = (v: number): string => `$${v.toFixed(2)}`;

export async function generatePDF(
  data: ExportData,
  config: ExportConfig,
  metadata?: ExportMetadata,
): Promise<Blob> {
  const branding = { ...DEFAULT_BRANDING, ...config.branding };
  const isLandscape = config.orientation === "landscape";
  const doc = new jsPDF({
    orientation: config.orientation || "landscape",
    unit: "mm",
    format: config.format || "letter",
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  const contentWidth = pageWidth - margin * 2;

  if (metadata) {
    doc.setProperties({
      title: metadata.title,
      author: metadata.author || branding.companyName,
      subject: metadata.subject || "Lease Analysis Report",
      keywords:
        metadata.keywords?.join(", ") ||
        "lease, analysis, commercial real estate",
    });
  }

  let y = addCoverHeader(doc, data, branding, margin, contentWidth, pageWidth);

  if (config.includeLeaseTerms) {
    y = ensureSpace(doc, y, 60, pageHeight, margin);
    y = addLeaseTermsSection(doc, data, y, margin, contentWidth);
  }

  if (config.includeSummary) {
    y = ensureSpace(doc, y, 50, pageHeight, margin);
    y = addFinancialSummarySection(doc, data, y, margin, contentWidth);
  }

  if (config.includeMetrics) {
    y = ensureSpace(doc, y, 50, pageHeight, margin);
    y = addMetricsSection(doc, data, y, margin, contentWidth);
  }

  if (config.includeRentSchedule && data.analysis.rent_schedule.length > 0) {
    y = ensureSpace(doc, y, 40, pageHeight, margin);
    y = addRentScheduleSection(doc, data, y, margin, contentWidth);
  }

  if (config.includeCashflow && data.cashflow.length > 0) {
    y = ensureSpace(doc, y, 50, pageHeight, margin);
    y = addCashflowSection(doc, data, y, margin, contentWidth, isLandscape);
  }

  if (config.includeNER && data.nerData) {
    y = ensureSpace(doc, y, 60, pageHeight, margin);
    y = addNERSection(doc, data, y, margin, contentWidth);
  }

  if (config.includeCommission && data.commissionData) {
    y = ensureSpace(doc, y, 50, pageHeight, margin);
    y = addCommissionSection(doc, data, y, margin, contentWidth);
  }

  if (config.includeNotes && data.analysis.notes) {
    y = ensureSpace(doc, y, 30, pageHeight, margin);
    y = addNotesSection(doc, data, y, margin, contentWidth);
  }

  addFooterToAllPages(doc, branding, margin);

  return doc.output("blob");
}

function ensureSpace(
  doc: jsPDF,
  y: number,
  needed: number,
  pageHeight: number,
  margin: number,
): number {
  if (y + needed > pageHeight - 20) {
    doc.addPage();
    return margin + 5;
  }
  return y;
}

function drawSectionHeader(
  doc: jsPDF,
  title: string,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.8);
  doc.line(margin, y, margin + contentWidth, y);

  y += 6;
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(title, margin, y);
  y += 7;

  return y;
}

function addCoverHeader(
  doc: jsPDF,
  data: ExportData,
  branding: BrandingConfig,
  margin: number,
  contentWidth: number,
  pageWidth: number,
): number {
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, pageWidth, 38, "F");

  doc.setFillColor(...GOLD);
  doc.rect(0, 38, pageWidth, 2, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...WHITE);
  doc.text(branding.companyName || "B\u00B2", margin, 16);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 190, 210);
  const dateStr = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  doc.text(dateStr, pageWidth - margin, 12, { align: "right" });
  doc.text("Lease Analysis Report", pageWidth - margin, 18, { align: "right" });

  let y = 48;
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...NAVY);
  doc.text(data.analysis.name, margin, y);
  y += 7;

  if (data.proposalSide && data.proposalLabel) {
    doc.setFontSize(11);
    doc.setTextColor(...MUTED);
    doc.text(
      `${data.proposalSide} Proposal \u2014 ${data.proposalLabel}`,
      margin,
      y,
    );
    y += 5;
  }

  if (data.analysis.tenant_name) {
    doc.setFontSize(10);
    doc.setTextColor(...MUTED);
    doc.text(`Tenant: ${data.analysis.tenant_name}`, margin, y);
    y += 5;
  }

  y += 4;
  return y;
}

function addLeaseTermsSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  y = drawSectionHeader(doc, "Lease Terms Summary", y, margin, contentWidth);

  const a = data.analysis;
  const discountRate = a.cashflow_settings?.discount_rate || 0.08;

  const startingRentPSF =
    a.rent_schedule.length > 0 ? a.rent_schedule[0].rent_psf : 0;
  const leaseType =
    a.lease_type === "FS" ? "Full Service Gross" : "Triple Net (NNN)";

  let escalation = "\u2014";
  if (a.rent_escalation) {
    const re = a.rent_escalation;
    if (re.escalation_type === "custom" && re.escalation_periods?.length) {
      escalation = `Custom (${re.escalation_periods.length} period${re.escalation_periods.length !== 1 ? "s" : ""})`;
    } else if (
      re.escalation_mode === "amount" &&
      re.fixed_escalation_amount != null
    ) {
      escalation = `$${re.fixed_escalation_amount.toFixed(2)}/SF/yr fixed`;
    } else if (re.fixed_escalation_percentage != null) {
      escalation = `${(re.fixed_escalation_percentage * 100).toFixed(1)}% annual`;
    }
  }

  let abatement = "None";
  const c = a.concessions;
  if (c.abatement_type === "at_commencement") {
    const months = c.abatement_free_rent_months || 0;
    if (months > 0) {
      const appliesTo =
        c.abatement_applies_to === "base_plus_nnn"
          ? "base + NNN"
          : "base rent only";
      abatement = `${months} month${months !== 1 ? "s" : ""} at commencement (${appliesTo})`;
    }
  } else if (c.abatement_type === "custom" && c.abatement_periods?.length) {
    const totalMonths = c.abatement_periods.reduce(
      (s, p) => s + p.free_rent_months,
      0,
    );
    abatement = `Custom \u2014 ${totalMonths} month${totalMonths !== 1 ? "s" : ""}`;
  }

  const tiPSF = c.ti_allowance_psf || 0;
  const tiTotal = tiPSF * a.rsf;
  const tiShortfall =
    (c.ti_actual_build_cost_psf || 0) > tiPSF
      ? ((c.ti_actual_build_cost_psf || 0) - tiPSF) * a.rsf
      : 0;

  const parking = a.parking?.stalls
    ? `${a.parking.stalls} stall${a.parking.stalls !== 1 ? "s" : ""} @ ${fmtMoney(a.parking.monthly_rate_per_stall || 0)}/mo`
    : "\u2014";

  const txTotal = a.transaction_costs?.total || 0;

  const termYears =
    data.summaryStats?.leaseTermYears || data.metrics.totalYears;
  const termMonths =
    data.summaryStats?.leaseTermMonths || Math.round(termYears * 12);
  const termDisplay = `${Math.floor(termYears)} yr${Math.floor(termYears) !== 1 ? "s" : ""}${termMonths % 12 > 0 ? `, ${termMonths % 12} mo` : ""} (${termMonths} months)`;

  const fields: [string, string][] = [
    ["RSF", `${a.rsf.toLocaleString()} SF`],
    ["Commencement", formatDateOnlyDisplay(a.key_dates.commencement, "N/A")],
    ["Expiration", formatDateOnlyDisplay(a.key_dates.expiration, "N/A")],
    ["Term", termDisplay],
    ["Lease Type", leaseType],
  ];
  if (a.lease_type === "FS" && a.base_year) {
    fields.push(["Base Year", String(a.base_year)]);
  }
  fields.push(
    [
      "Starting Rent",
      startingRentPSF > 0 ? fmtRate(startingRentPSF) : "\u2014",
    ],
    ["Rent Escalation", escalation],
    ["Abatement", abatement],
    [
      "TI Allowance",
      tiPSF > 0 ? `$${tiPSF.toFixed(2)}/SF (${fmtMoney(tiTotal)})` : "None",
    ],
  );
  if (tiShortfall > 0) fields.push(["TI Shortfall", fmtMoney(tiShortfall)]);
  if (txTotal > 0) fields.push(["Transaction Costs", fmtMoney(txTotal)]);
  fields.push(
    ["Parking", parking],
    ["Discount Rate", `${(discountRate * 100).toFixed(1)}%`],
  );

  const colCount = 4;
  const colWidth = contentWidth / colCount;
  const rowHeight = 10;

  for (let i = 0; i < fields.length; i++) {
    const col = i % colCount;
    const row = Math.floor(i / colCount);
    const x = margin + col * colWidth;
    const fy = y + row * rowHeight;

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(fields[i][0].toUpperCase(), x, fy);

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...DARK_TEXT);
    doc.text(fields[i][1], x, fy + 4);
  }

  const totalRows = Math.ceil(fields.length / colCount);
  y += totalRows * rowHeight + 6;
  return y;
}

function addFinancialSummarySection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  y = drawSectionHeader(doc, "Financial Summary", y, margin, contentWidth);

  const stats = data.summaryStats;
  if (!stats) return y;

  const kpis: [string, string][] = [
    ["Total Lease Value", fmtMoney(stats.totalLeaseValue)],
    ["Avg. Annual Cashflow", fmtMoney(stats.averageAnnualCashflow)],
    ["Effective Rent", fmtRate(data.metrics.effectiveRate)],
    ["Starting Rent", fmtMoney(stats.startingRent)],
    ["Ending Rent", fmtMoney(stats.endingRent)],
    ["Total Concessions", fmtMoney(stats.totalConcessions)],
  ];

  const kpiWidth = contentWidth / kpis.length;

  for (let i = 0; i < kpis.length; i++) {
    const x = margin + i * kpiWidth;
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, kpiWidth - 3, 16, 2, 2, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(kpis[i][0].toUpperCase(), x + 3, y + 5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(kpis[i][1], x + 3, y + 12);
  }

  y += 22;
  return y;
}

function addMetricsSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  y = drawSectionHeader(doc, "Financial Metrics", y, margin, contentWidth);

  const discountRate = data.analysis.cashflow_settings?.discount_rate || 0.08;
  const ym = data.yieldMetrics;
  const rsf = data.analysis.rsf;
  const termYears =
    data.summaryStats?.leaseTermYears || data.metrics.totalYears;

  const returnMetrics: [string, string][] = [
    ["NPV", fmtMoney(data.metrics.npv)],
    [
      "NPV $/SF/yr",
      termYears > 0 && rsf > 0
        ? fmtRate(data.metrics.npv / (rsf * termYears))
        : "$0.00/SF/yr",
    ],
  ];

  if (ym) {
    returnMetrics.push(
      ["IRR", `${ym.irr.toFixed(2)}%`],
      ["Yield on Cost", `${ym.yieldOnCost.toFixed(2)}%`],
      ["Equity Multiple", `${ym.equityMultiple.toFixed(2)}x`],
      [
        "Payback Period",
        `${ym.paybackPeriod} yr${ym.paybackPeriod !== 1 ? "s" : ""}`,
      ],
    );
  }

  const kpiWidth = contentWidth / Math.min(returnMetrics.length, 6);

  for (let i = 0; i < returnMetrics.length; i++) {
    const x = margin + i * kpiWidth;
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, kpiWidth - 3, 16, 2, 2, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(returnMetrics[i][0].toUpperCase(), x + 3, y + 5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(returnMetrics[i][1], x + 3, y + 12);
  }

  y += 20;

  doc.setFontSize(7);
  doc.setFont("helvetica", "italic");
  doc.setTextColor(...MUTED);
  doc.text(`Discount Rate: ${(discountRate * 100).toFixed(1)}%`, margin, y);
  y += 6;

  return y;
}

function addRentScheduleSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  y = drawSectionHeader(doc, "Rent Schedule", y, margin, contentWidth);

  const scheduleData = data.analysis.rent_schedule.map((row) => [
    formatDateOnlyDisplay(row.period_start, "N/A"),
    formatDateOnlyDisplay(row.period_end, "N/A"),
    fmtRate(row.rent_psf),
    row.escalation_percentage
      ? `${(row.escalation_percentage * 100).toFixed(1)}%`
      : "0%",
    row.free_rent_months ? `${row.free_rent_months} mo` : "\u2014",
    row.abatement_applies_to === "base_plus_nnn" ? "Base + NNN" : "Base Only",
  ]);

  autoTable(doc, {
    startY: y,
    head: [
      [
        "Period Start",
        "Period End",
        "Base Rent",
        "Escalation",
        "Free Rent",
        "Abatement",
      ],
    ],
    body: scheduleData,
    theme: "grid",
    styles: {
      fontSize: 8,
      cellPadding: 2.5,
      lineColor: [...BORDER],
      lineWidth: 0.3,
    },
    headStyles: {
      fillColor: [...NAVY],
      textColor: [...WHITE],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: { fillColor: [...LIGHT_BG] },
    columnStyles: {
      2: { halign: "right" },
      3: { halign: "center" },
      4: { halign: "center" },
    },
    margin: { left: margin, right: margin },
  });

  return (doc as any).lastAutoTable.finalY + 8;
}

function addCashflowSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
  isLandscape: boolean,
): number {
  y = drawSectionHeader(doc, "Annual Cashflow", y, margin, contentWidth);

  const lines = data.cashflow;
  const rsf = data.analysis.rsf;

  const hasTIShortfall = lines.some((r) => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(
    (r) => (r.transaction_costs || 0) !== 0,
  );
  const hasAmortizedCosts = lines.some((r) => (r.amortized_costs || 0) !== 0);
  const hasParking = lines.some((r) => (r.parking || 0) !== 0);

  const totals = lines.reduce(
    (acc, r) => ({
      base_rent: acc.base_rent + r.base_rent,
      operating: acc.operating + r.operating,
      parking: acc.parking + (r.parking || 0),
      subtotal: acc.subtotal + r.subtotal,
      abatement_credit: acc.abatement_credit + r.abatement_credit,
      ti_shortfall: acc.ti_shortfall + (r.ti_shortfall || 0),
      transaction_costs: acc.transaction_costs + (r.transaction_costs || 0),
      amortized_costs: acc.amortized_costs + (r.amortized_costs || 0),
      net_cash_flow: acc.net_cash_flow + r.net_cash_flow,
    }),
    {
      base_rent: 0,
      operating: 0,
      parking: 0,
      subtotal: 0,
      abatement_credit: 0,
      ti_shortfall: 0,
      transaction_costs: 0,
      amortized_costs: 0,
      net_cash_flow: 0,
    },
  );

  type RowDef = {
    label: string;
    getValue: (r: CashflowLine) => number;
    getTotal: () => number;
    show: boolean;
    isBold?: boolean;
    isCredit?: boolean;
    isDebit?: boolean;
    psfRow?: boolean;
  };

  const rowDefs: RowDef[] = [
    {
      label: "Base Rent",
      getValue: (r) => r.base_rent,
      getTotal: () => totals.base_rent,
      show: true,
    },
    {
      label: "Operating",
      getValue: (r) => r.operating,
      getTotal: () => totals.operating,
      show: true,
    },
    {
      label: "Parking",
      getValue: (r) => r.parking || 0,
      getTotal: () => totals.parking,
      show: hasParking,
    },
    {
      label: "Subtotal",
      getValue: (r) => r.subtotal,
      getTotal: () => totals.subtotal,
      show: true,
      isBold: true,
      psfRow: true,
    },
    {
      label: "Abatement",
      getValue: (r) => r.abatement_credit,
      getTotal: () => totals.abatement_credit,
      show: true,
      isCredit: true,
    },
    {
      label: "TI Shortfall",
      getValue: (r) => r.ti_shortfall || 0,
      getTotal: () => totals.ti_shortfall,
      show: hasTIShortfall,
      isDebit: true,
    },
    {
      label: "Transaction Costs",
      getValue: (r) => r.transaction_costs || 0,
      getTotal: () => totals.transaction_costs,
      show: hasTransactionCosts,
      isDebit: true,
    },
    {
      label: "Amortized Costs",
      getValue: (r) => r.amortized_costs || 0,
      getTotal: () => totals.amortized_costs,
      show: hasAmortizedCosts,
      isDebit: true,
    },
    {
      label: "Net Cash Flow",
      getValue: (r) => r.net_cash_flow,
      getTotal: () => totals.net_cash_flow,
      show: true,
      isBold: true,
      psfRow: true,
    },
  ];

  const visibleRows = rowDefs.filter((r) => r.show);

  const yearHeaders = lines.map((l) => `YR ${l.year}`);
  const head = [["", ...yearHeaders, "Total"]];

  const body: (
    | string
    | { content: string; styles?: Record<string, unknown> }
  )[][] = [];

  for (const rowDef of visibleRows) {
    const row: (
      | string
      | { content: string; styles?: Record<string, unknown> }
    )[] = [];
    row.push({
      content: rowDef.label,
      styles: rowDef.isBold ? { fontStyle: "bold" } : {},
    });

    for (const line of lines) {
      const val = rowDef.getValue(line);
      let textColor: number[] | undefined;
      if (rowDef.isCredit && val !== 0) textColor = [...GREEN];
      else if (rowDef.isDebit && val !== 0) textColor = [...RED];
      else if (rowDef.isBold && val < 0) textColor = [...RED];

      row.push({
        content: val === 0 && !rowDef.isBold ? "\u2013" : fmtMoney(val),
        styles: {
          ...(textColor ? { textColor } : {}),
          ...(rowDef.isBold ? { fontStyle: "bold" } : {}),
          halign: "right",
        },
      });
    }

    const totalVal = rowDef.getTotal();
    let totalColor: number[] | undefined;
    if (rowDef.isCredit && totalVal !== 0) totalColor = [...GREEN];
    else if (rowDef.isDebit && totalVal !== 0) totalColor = [...RED];
    else if (rowDef.isBold && totalVal < 0) totalColor = [...RED];

    row.push({
      content: fmtMoney(totalVal),
      styles: {
        ...(totalColor ? { textColor: totalColor } : {}),
        fontStyle: "bold",
        halign: "right",
      },
    });
    body.push(row);

    if (rowDef.psfRow && rsf > 0) {
      const psfLabel =
        rowDef.label === "Subtotal" ? "  Subtotal $/RSF" : "  Net CF $/RSF";
      const psfRow: (
        | string
        | { content: string; styles?: Record<string, unknown> }
      )[] = [];
      psfRow.push({
        content: psfLabel,
        styles: { fontStyle: "italic", textColor: [...MUTED], fontSize: 7 },
      });

      for (const line of lines) {
        psfRow.push({
          content: fmtPSF(rowDef.getValue(line) / rsf),
          styles: { halign: "right", textColor: [...MUTED], fontSize: 7 },
        });
      }
      psfRow.push({
        content: fmtPSF(totalVal / rsf),
        styles: {
          halign: "right",
          textColor: [...MUTED],
          fontSize: 7,
          fontStyle: "bold",
        },
      });
      body.push(psfRow);
    }
  }

  let cumulative = 0;
  const cumulativeRow: (
    | string
    | { content: string; styles?: Record<string, unknown> }
  )[] = [];
  cumulativeRow.push({
    content: "Cumulative",
    styles: { fontStyle: "bold", textColor: [...MUTED] },
  });
  for (const line of lines) {
    cumulative += line.net_cash_flow;
    cumulativeRow.push({
      content: fmtMoney(cumulative),
      styles: {
        halign: "right",
        fontStyle: "bold",
        textColor: cumulative < 0 ? [...RED] : [...GREEN],
      },
    });
  }
  cumulativeRow.push({
    content: fmtMoney(cumulative),
    styles: {
      halign: "right",
      fontStyle: "bold",
      textColor: cumulative < 0 ? [...RED] : [...GREEN],
    },
  });
  body.push(cumulativeRow);

  const fontSize = lines.length > 10 ? 6.5 : lines.length > 7 ? 7 : 7.5;

  autoTable(doc, {
    startY: y,
    head,
    body,
    theme: "grid",
    styles: {
      fontSize,
      cellPadding: 1.5,
      lineColor: [...BORDER],
      lineWidth: 0.2,
      overflow: "ellipsize",
    },
    headStyles: {
      fillColor: [...NAVY],
      textColor: [...WHITE],
      fontStyle: "bold",
      fontSize: fontSize - 0.5,
      halign: "right",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: isLandscape ? 32 : 28 },
    },
    alternateRowStyles: { fillColor: [...LIGHT_BG] },
    margin: { left: margin, right: margin },
    didParseCell: (hookData: any) => {
      if (hookData.section === "head" && hookData.column.index === 0) {
        hookData.cell.styles.halign = "left";
      }
      const lastBodyIdx = body.length - 1;
      if (hookData.section === "body" && hookData.row.index === lastBodyIdx) {
        hookData.cell.styles.fillColor = [240, 245, 250];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  return y;
}

function addNERSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  if (!data.nerData) return y;
  y = drawSectionHeader(
    doc,
    "Net Effective Rent (NER) Analysis",
    y,
    margin,
    contentWidth,
  );
  const ner = data.nerData;
  const rsf = data.analysis.rsf;

  const kpis: [string, string][] = [
    ["NER (Simple)", rsf > 0 ? fmtRate(ner.ner) : "\u2014"],
    ["NER (Discounted)", rsf > 0 ? fmtRate(ner.nerWithInterest) : "\u2014"],
    ["Starting NER", rsf > 0 ? fmtRate(ner.startingNER) : "\u2014"],
    ["Total Rent", fmtMoney(ner.calculations.total)],
    ["NPV", fmtMoney(ner.calculations.npv)],
    ["PMT (Annualized)", fmtMoney(ner.calculations.pmt)],
  ];

  const kpiWidth = contentWidth / kpis.length;
  for (let i = 0; i < kpis.length; i++) {
    const x = margin + i * kpiWidth;
    doc.setFillColor(...LIGHT_BG);
    doc.roundedRect(x, y, kpiWidth - 3, 16, 2, 2, "F");

    doc.setFontSize(6.5);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...MUTED);
    doc.text(kpis[i][0].toUpperCase(), x + 3, y + 5);

    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...NAVY);
    doc.text(kpis[i][1], x + 3, y + 12);
  }
  y += 22;

  if (ner.yearlyBreakdown && ner.yearlyBreakdown.length > 0) {
    const tableData = ner.yearlyBreakdown.map((yr) => [
      `Year ${yr.year}`,
      fmtMoney(yr.baseRent),
      fmtMoney(yr.freeRent),
      fmtMoney(yr.ti),
      fmtMoney(yr.total),
    ]);

    autoTable(doc, {
      startY: y,
      head: [["Year", "Base Rent", "Free Rent", "TI/NBI", "Net Total"]],
      body: tableData,
      theme: "grid",
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
        lineColor: [...BORDER],
        lineWidth: 0.2,
      },
      headStyles: {
        fillColor: [...NAVY],
        textColor: [...WHITE],
        fontStyle: "bold",
        fontSize: 7,
      },
      alternateRowStyles: { fillColor: [...LIGHT_BG] },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
        3: { halign: "right" },
        4: { halign: "right", fontStyle: "bold" },
      },
      margin: { left: margin, right: margin },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  return y;
}

function addCommissionSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  if (!data.commissionData) return y;
  y = drawSectionHeader(doc, "Commission Summary", y, margin, contentWidth);
  const comm = data.commissionData;

  const items: [string, string][] = [
    ["Year 1 Commission", fmtMoney(comm.breakdown.year1Commission)],
    ["Subsequent Years", fmtMoney(comm.breakdown.subsequentYearsCommission)],
  ];
  if (comm.breakdown.tiCommission > 0) {
    items.push(["TI Commission", fmtMoney(comm.breakdown.tiCommission)]);
  }
  items.push(["Gross Commission", fmtMoney(comm.breakdown.totalCommission)]);
  if (comm.breakdown.splitAmount > 0) {
    items.push([
      "Co-Broker Split",
      `(${fmtMoney(comm.breakdown.splitAmount)})`,
    ]);
  }
  items.push(["Net Commission", fmtMoney(comm.breakdown.netCommission)]);

  autoTable(doc, {
    startY: y,
    body: items,
    theme: "grid",
    styles: {
      fontSize: 9,
      cellPadding: 3,
      lineColor: [...BORDER],
      lineWidth: 0.2,
    },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 55 },
      1: { halign: "right" },
    },
    alternateRowStyles: { fillColor: [...LIGHT_BG] },
    margin: { left: margin, right: margin },
    didParseCell: (hookData: any) => {
      if (
        hookData.section === "body" &&
        hookData.row.index === items.length - 1
      ) {
        hookData.cell.styles.fillColor = [240, 248, 240];
        hookData.cell.styles.fontStyle = "bold";
        hookData.cell.styles.textColor = [...GREEN];
      }
    },
  });

  y = (doc as any).lastAutoTable.finalY + 8;
  return y;
}

function addNotesSection(
  doc: jsPDF,
  data: ExportData,
  y: number,
  margin: number,
  contentWidth: number,
): number {
  y = drawSectionHeader(doc, "Notes", y, margin, contentWidth);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(60, 60, 60);

  const splitNotes = doc.splitTextToSize(
    data.analysis.notes || "",
    contentWidth,
  );
  doc.text(splitNotes, margin, y);

  return y + splitNotes.length * 4.5 + 8;
}

function addFooterToAllPages(
  doc: jsPDF,
  branding: BrandingConfig,
  margin: number,
): void {
  const pageCount = doc.getNumberOfPages();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.height;
    const pageWidth = doc.internal.pageSize.width;

    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(margin, pageHeight - 14, pageWidth - margin, pageHeight - 14);

    doc.setFontSize(7);
    doc.setTextColor(...MUTED);
    doc.setFont("helvetica", "italic");
    if (branding.footer) {
      doc.text(branding.footer, margin, pageHeight - 9);
    }

    doc.setFont("helvetica", "normal");
    doc.text(`Page ${i} of ${pageCount}`, pageWidth - margin, pageHeight - 9, {
      align: "right",
    });
  }
}

export function downloadPDF(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
