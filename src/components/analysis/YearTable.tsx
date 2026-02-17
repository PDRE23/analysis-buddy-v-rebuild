import React from "react";
import type { AnnualLine, AnalysisMeta } from "@/types";
import { parseDateOnly } from "@/lib/dateOnly";

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtPSF = (v: number) => `$${(v || 0).toFixed(2)}`;

export const YearTable = React.memo(function YearTable({ lines, rsf, meta }: { lines: AnnualLine[]; rsf: number; meta?: AnalysisMeta }) {
  if (!lines || lines.length === 0) {
    return (
      <div className="overflow-auto border rounded-xl p-4 text-center text-muted-foreground">
        No cashflow data available
      </div>
    );
  }

  if (!rsf || rsf <= 0) {
    return (
      <div className="overflow-auto border rounded-xl p-4 text-center text-muted-foreground">
        Invalid RSF value
      </div>
    );
  }

  const hasTIShortfall = lines.some(r => (r.ti_shortfall || 0) !== 0);
  const hasTransactionCosts = lines.some(r => (r.transaction_costs || 0) !== 0);
  const hasAmortizedCosts = lines.some(r => (r.amortized_costs || 0) !== 0);
  const hasParking = lines.some(r => (r.parking || 0) !== 0);
  const hasOtherRecurring = lines.some(r => (r.other_recurring || 0) !== 0);

  const totals = lines.reduce((acc, r) => ({
    base_rent: acc.base_rent + r.base_rent,
    operating: acc.operating + r.operating,
    parking: acc.parking + (r.parking || 0),
    other_recurring: acc.other_recurring + (r.other_recurring || 0),
    subtotal: acc.subtotal + r.subtotal,
    abatement_credit: acc.abatement_credit + r.abatement_credit,
    ti_shortfall: acc.ti_shortfall + (r.ti_shortfall || 0),
    transaction_costs: acc.transaction_costs + (r.transaction_costs || 0),
    amortized_costs: acc.amortized_costs + (r.amortized_costs || 0),
    net_cash_flow: acc.net_cash_flow + r.net_cash_flow,
  }), {
    base_rent: 0, operating: 0, parking: 0, other_recurring: 0,
    subtotal: 0, abatement_credit: 0, ti_shortfall: 0,
    transaction_costs: 0, amortized_costs: 0, net_cash_flow: 0,
  });

  let cumulative = 0;
  const cumulativeValues: number[] = [];
  let breakEvenYear: number | null = null;
  lines.forEach((line) => {
    cumulative += line.net_cash_flow;
    cumulativeValues.push(cumulative);
    if (breakEvenYear === null && cumulative >= 0) {
      breakEvenYear = line.year;
    }
  });

  const getYearLabel = (yearIndex: number, year: number): string => {
    if (!meta?.key_dates?.commencement) return `YR ${year}`;
    const commencement = parseDateOnly(meta.key_dates.commencement);
    if (!commencement) return `YR ${year}`;
    const startDate = new Date(commencement);
    startDate.setFullYear(commencement.getFullYear() + yearIndex);
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    return `YR ${year} (${month}/${startDate.getFullYear()})`;
  };

  type RowDef = {
    label: string;
    getValue: (r: AnnualLine) => number;
    getTotal: () => number;
    show: boolean;
    isBold?: boolean;
    isCredit?: boolean;
    isDebit?: boolean;
    isSeparator?: boolean;
    psfRow?: { label: string };
  };

  const rows: RowDef[] = [
    { label: "Base Rent", getValue: r => r.base_rent, getTotal: () => totals.base_rent, show: true },
    { label: "Operating", getValue: r => r.operating, getTotal: () => totals.operating, show: true },
    { label: "Parking", getValue: r => r.parking || 0, getTotal: () => totals.parking, show: hasParking },
    { label: "Other Recurring", getValue: r => r.other_recurring || 0, getTotal: () => totals.other_recurring, show: hasOtherRecurring },
    {
      label: "Subtotal", getValue: r => r.subtotal, getTotal: () => totals.subtotal, show: true,
      isBold: true, isSeparator: true,
      psfRow: { label: "Subtotal $/RSF" },
    },
    { label: "Abatement (Free Rent)", getValue: r => r.abatement_credit, getTotal: () => totals.abatement_credit, show: true, isCredit: true },
    { label: "TI Shortfall", getValue: r => r.ti_shortfall || 0, getTotal: () => totals.ti_shortfall, show: hasTIShortfall, isDebit: true },
    { label: "Transaction Costs", getValue: r => r.transaction_costs || 0, getTotal: () => totals.transaction_costs, show: hasTransactionCosts, isDebit: true },
    { label: "Amortized Costs", getValue: r => r.amortized_costs || 0, getTotal: () => totals.amortized_costs, show: hasAmortizedCosts, isDebit: true },
    {
      label: "Net Cash Flow", getValue: r => r.net_cash_flow, getTotal: () => totals.net_cash_flow, show: true,
      isBold: true, isSeparator: true,
      psfRow: { label: "Net Cash Flow $/RSF" },
    },
  ];

  const visibleRows = rows.filter(r => r.show);

  const cellClass = (value: number, row: RowDef) => {
    if (row.isCredit) return value !== 0 ? "text-green-600" : "";
    if (row.isDebit) return value !== 0 ? "text-red-600" : "";
    if (row.isBold && value < 0) return "text-red-600 font-semibold";
    if (row.isBold) return "font-semibold";
    return "";
  };

  return (
    <div className="overflow-x-auto border rounded-xl" style={{ maxWidth: '100%' }}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2 sticky left-0 bg-muted/50 min-w-[160px]"></th>
            {lines.map((r, idx) => (
              <th key={r.year} className="text-right p-2 whitespace-nowrap min-w-[100px]">
                <div className="flex items-center justify-end gap-1">
                  {getYearLabel(idx, r.year)}
                  {breakEvenYear === r.year && (
                    <span className="text-xs bg-yellow-200 text-yellow-800 px-1 py-0.5 rounded" title="Break-even year">BE</span>
                  )}
                </div>
              </th>
            ))}
            <th className="text-right p-2 whitespace-nowrap min-w-[110px] border-l-2 border-foreground/20 bg-muted/70">Total</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <React.Fragment key={row.label}>
              <tr className={row.isSeparator ? "border-t-2 border-foreground/20 bg-muted/30" : "border-t"}>
                <td className={`p-2 sticky left-0 bg-background ${row.isBold ? 'font-semibold' : ''} ${row.isSeparator ? 'bg-muted/30' : ''}`}>
                  {row.label}
                </td>
                {lines.map((r) => {
                  const val = row.getValue(r);
                  return (
                    <td key={r.year} className={`p-2 text-right ${cellClass(val, row)}`}>
                      {val === 0 && !row.isBold ? "–" : fmtMoney(val)}
                    </td>
                  );
                })}
                <td className={`p-2 text-right border-l-2 border-foreground/20 bg-muted/10 ${cellClass(row.getTotal(), row)}`}>
                  {fmtMoney(row.getTotal())}
                </td>
              </tr>
              {row.psfRow && (
                <tr className="border-t border-dashed">
                  <td className="p-2 pl-6 sticky left-0 bg-background text-muted-foreground text-xs italic">
                    {row.psfRow.label}
                  </td>
                  {lines.map((r) => (
                    <td key={r.year} className="p-2 text-right text-muted-foreground text-xs">
                      {fmtPSF(rsf > 0 ? row.getValue(r) / rsf : 0)}
                    </td>
                  ))}
                  <td className="p-2 text-right border-l-2 border-foreground/20 bg-muted/10 text-muted-foreground text-xs">
                    {fmtPSF(rsf > 0 ? row.getTotal() / rsf : 0)}
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
          <tr className="border-t bg-muted/30">
            <td className="p-2 sticky left-0 bg-muted/30 font-semibold text-muted-foreground">Cumulative</td>
            {lines.map((r, idx) => {
              const cv = cumulativeValues[idx] || 0;
              return (
                <td key={r.year} className={`p-2 text-right font-medium ${cv < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmtMoney(cv)}
                </td>
              );
            })}
            <td className={`p-2 text-right border-l-2 border-foreground/20 bg-muted/10 font-medium ${cumulative < 0 ? 'text-red-600' : 'text-green-700'}`}>
              {fmtMoney(cumulative)}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
});
