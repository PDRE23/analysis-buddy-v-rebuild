import type { AnnualLine, AnalysisMeta } from "@/types";
import { formatDateOnly } from "@/lib/dateOnly";

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function exportTableToCSV(lines: AnnualLine[], rsf: number, meta: AnalysisMeta): void {
  if (typeof window === 'undefined') return;
  if (!lines || lines.length === 0) return;
  if (!rsf || rsf <= 0) return;
  
  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  
  let cumulative = 0;
  const cumulativeValues: number[] = [];
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
  });
  
  const headers = [
    'Term Year',
    'Base Rent',
    'Base Rent $/SF',
    'Op. Pass-Through',
    'Parking',
    'Abatement (credit)',
    ...(hasTIShortfall ? ['TI Shortfall'] : []),
    ...(hasTransactionCosts ? ['Transaction Costs'] : []),
    ...(hasAmortizedCosts ? ['Amortized Costs'] : []),
    'Total',
    'Cumulative NCF',
  ];
  
  const rows = lines.map((r, idx) => [
    `YR ${r.year}`,
    r.base_rent.toFixed(2),
    (rsf > 0 ? (r.base_rent / rsf) : 0).toFixed(2),
    r.operating.toFixed(2),
    (r.parking || 0).toFixed(2),
    r.abatement_credit.toFixed(2),
    ...(hasTIShortfall ? [(r.ti_shortfall || 0).toFixed(2)] : []),
    ...(hasTransactionCosts ? [(r.transaction_costs || 0).toFixed(2)] : []),
    ...(hasAmortizedCosts ? [(r.amortized_costs || 0).toFixed(2)] : []),
    r.net_cash_flow.toFixed(2),
    (cumulativeValues[idx] || 0).toFixed(2),
  ]);
  
  const totals = lines.reduce((acc, r) => ({
    base_rent: acc.base_rent + r.base_rent,
    operating: acc.operating + r.operating,
    parking: acc.parking + (r.parking || 0),
    abatement_credit: acc.abatement_credit + r.abatement_credit,
    ti_shortfall: acc.ti_shortfall + (r.ti_shortfall || 0),
    transaction_costs: acc.transaction_costs + (r.transaction_costs || 0),
    amortized_costs: acc.amortized_costs + (r.amortized_costs || 0),
    subtotal: acc.subtotal + r.subtotal,
    net_cash_flow: acc.net_cash_flow + r.net_cash_flow,
  }), {
    base_rent: 0,
    operating: 0,
    parking: 0,
    abatement_credit: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  });
  
  const avgBaseRentPSF = totals.base_rent / (rsf * lines.length);
  
  rows.push([
    'TOTAL',
    totals.base_rent.toFixed(2),
    avgBaseRentPSF.toFixed(2),
    totals.operating.toFixed(2),
    totals.parking.toFixed(2),
    totals.abatement_credit.toFixed(2),
    ...(hasTIShortfall ? [totals.ti_shortfall.toFixed(2)] : []),
    ...(hasTransactionCosts ? [totals.transaction_costs.toFixed(2)] : []),
    ...(hasAmortizedCosts ? [totals.amortized_costs.toFixed(2)] : []),
    totals.net_cash_flow.toFixed(2),
    cumulativeValues[cumulativeValues.length - 1].toFixed(2),
  ]);
  
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.join(',')),
  ].join('\n');
  
  try {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${meta.name.replace(/[^a-z0-9]/gi, '_')}_cashflow_${formatDateOnly(new Date())}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to export CSV:', error);
  }
}

export function copyTableToClipboard(lines: AnnualLine[], rsf: number, meta: AnalysisMeta): void {
  if (typeof window === 'undefined') return;
  if (typeof navigator === 'undefined' || !navigator.clipboard) return;
  if (!lines || lines.length === 0) return;
  if (!rsf || rsf <= 0) return;
  
  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  
  let cumulative = 0;
  const cumulativeValues: number[] = [];
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
  });
  
  const fmtPSF = (value: number) => `$${(value || 0).toFixed(2)}/SF`;
  
  const headers = [
    'Term Year',
    'Base Rent',
    'Base Rent $/SF',
    'Op. Pass-Through',
    'Parking',
    'Abatement',
    ...(hasTIShortfall ? ['TI Shortfall'] : []),
    ...(hasTransactionCosts ? ['Trans. Costs'] : []),
    ...(hasAmortizedCosts ? ['Amortized'] : []),
    'Total',
    'Cumulative Total',
  ].join('\t');
  
  const rows = lines.map((r, idx) => [
    `YR ${r.year}`,
    fmtMoney(r.base_rent),
    fmtPSF(rsf > 0 ? (r.base_rent / rsf) : 0),
    fmtMoney(r.operating),
    fmtMoney(r.parking || 0),
    fmtMoney(r.abatement_credit),
    ...(hasTIShortfall ? [fmtMoney(r.ti_shortfall || 0)] : []),
    ...(hasTransactionCosts ? [fmtMoney(r.transaction_costs || 0)] : []),
    ...(hasAmortizedCosts ? [fmtMoney(r.amortized_costs || 0)] : []),
    fmtMoney(r.net_cash_flow),
    fmtMoney(cumulativeValues[idx] || 0),
  ].join('\t'));
  
  const textContent = [headers, ...rows].join('\n');
  
  try {
    navigator.clipboard.writeText(textContent).then(() => {
    }).catch(err => {
      console.error('Failed to copy to clipboard:', err);
    });
  } catch (error) {
    console.error('Clipboard API not available:', error);
  }
}
