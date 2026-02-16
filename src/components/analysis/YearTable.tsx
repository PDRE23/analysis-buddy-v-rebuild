import React from "react";
import type { AnnualLine, AnalysisMeta } from "@/types";
import { parseDateOnly } from "@/lib/dateOnly";

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

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
  
  const avgBaseRentPSF = (rsf * lines.length) > 0 ? totals.base_rent / (rsf * lines.length) : 0;
  const avgOpExPSF = (rsf * lines.length) > 0 ? totals.operating / (rsf * lines.length) : 0;
  
  const fmtPSF = (value: number) => `$${(value || 0).toFixed(2)}/SF`;
  
  const getYearStartDate = (yearIndex: number): string | null => {
    if (!meta?.key_dates?.commencement) return null;
    const commencement = parseDateOnly(meta.key_dates.commencement);
    if (!commencement) return null;

    const startDate = new Date(commencement);
    startDate.setFullYear(commencement.getFullYear() + yearIndex);
    
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = startDate.getFullYear();
    return `${month}/${yearStr}`;
  };
  
  return (
    <div className="overflow-x-auto border rounded-xl" style={{ maxWidth: '100%' }}>
      <table className="w-full text-sm">
        <thead className="bg-muted/50">
          <tr>
            <th className="text-left p-2">Term Year</th>
            <th className="text-right p-2" title="Annual base rent">Base Rent</th>
            <th className="text-right p-2" title="Base rent per square foot per year">Base Rent $/SF</th>
            <th
              className="text-right p-2"
              title={
                meta?.lease_type === "NNN"
                  ? "Operating expenses"
                  : "Operating expense pass-throughs"
              }
            >
              {meta?.lease_type === "NNN" ? "OpEx" : "OpEx Pass-Through"}
            </th>
            <th className="text-right p-2" title="Operating expenses per square foot per year">OpEx $/SF</th>
            <th className="text-right p-2" title="Annual parking costs">Parking</th>
            <th className="text-right p-2" title="Free rent abatement credit">Abatement (credit)</th>
            {hasTIShortfall && (
              <th className="text-right p-2" title="TI shortfall (tenant pays if actual cost exceeds allowance)">TI Shortfall</th>
            )}
            {hasTransactionCosts && (
              <th className="text-right p-2" title="One-time transaction costs">Trans. Costs</th>
            )}
            {hasAmortizedCosts && (
              <th className="text-right p-2" title="Amortized deal costs (TI, free rent, transaction costs)">Amortized</th>
            )}
            <th className="text-right p-2 font-medium" title="Net cash flow including all adjustments">Total</th>
            <th className="text-right p-2 font-medium" title="Cumulative net cash flow from lease start">Cumulative Total</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((r, idx) => {
            const isBreakEven = breakEvenYear === r.year;
            const isPositive = r.net_cash_flow >= 0;
            const rowClass = isBreakEven 
              ? "border-t bg-yellow-50 border-yellow-200" 
              : isPositive 
                ? "border-t hover:bg-green-50/50" 
                : "border-t hover:bg-red-50/50";
            
            return (
              <tr key={r.year} className={rowClass}>
                <td className="p-2 font-medium">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      {(() => {
                        const startDate = getYearStartDate(idx);
                        return startDate ? `YR ${r.year} (${startDate})` : `YR ${r.year}`;
                      })()}
                      {isBreakEven && (
                        <span className="text-xs bg-yellow-200 text-yellow-800 px-1.5 py-0.5 rounded" title="Break-even year">
                          BE
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">Term Year {r.year}</div>
                  </div>
                </td>
                <td className="p-2 text-right">{fmtMoney(r.base_rent)}</td>
                <td className="p-2 text-right text-muted-foreground">{fmtPSF(rsf > 0 ? (r.base_rent / rsf) : 0)}</td>
                <td className="p-2 text-right">{fmtMoney(r.operating)}</td>
                <td className="p-2 text-right text-muted-foreground">{fmtPSF(rsf > 0 ? (r.operating / rsf) : 0)}</td>
                <td className="p-2 text-right">{fmtMoney(r.parking)}</td>
                <td className="p-2 text-right text-green-600">{fmtMoney(r.abatement_credit)}</td>
                {hasTIShortfall && (
                  <td className="p-2 text-right text-red-600">
                    {(r.ti_shortfall || 0) !== 0 ? fmtMoney(r.ti_shortfall) : "-"}
                  </td>
                )}
                {hasTransactionCosts && (
                  <td className="p-2 text-right text-red-600">
                    {(r.transaction_costs || 0) !== 0 ? fmtMoney(r.transaction_costs) : "-"}
                  </td>
                )}
                {hasAmortizedCosts && (
                  <td className="p-2 text-right text-red-600">
                    {(r.amortized_costs || 0) !== 0 ? fmtMoney(r.amortized_costs) : "-"}
                  </td>
                )}
                <td className={`p-2 text-right font-medium ${!isPositive ? 'text-red-600' : ''}`}>
                  {fmtMoney(r.net_cash_flow)}
                </td>
                <td className={`p-2 text-right font-medium ${(cumulativeValues[idx] || 0) < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  {fmtMoney(cumulativeValues[idx] || 0)}
                </td>
              </tr>
            );
          })}
        </tbody>
        <tfoot className="bg-muted/70 border-t-2 border-foreground/20">
          <tr className="font-semibold">
            <td className="p-2">TOTAL</td>
            <td className="p-2 text-right">{fmtMoney(totals.base_rent)}</td>
            <td className="p-2 text-right text-muted-foreground">{fmtPSF(avgBaseRentPSF)}</td>
            <td className="p-2 text-right">{fmtMoney(totals.operating)}</td>
            <td className="p-2 text-right text-muted-foreground">{fmtPSF(avgOpExPSF)}</td>
            <td className="p-2 text-right">{fmtMoney(totals.parking)}</td>
            <td className="p-2 text-right text-green-600">{fmtMoney(totals.abatement_credit)}</td>
            {hasTIShortfall && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.ti_shortfall)}</td>
            )}
            {hasTransactionCosts && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.transaction_costs)}</td>
            )}
            {hasAmortizedCosts && (
              <td className="p-2 text-right text-red-600">{fmtMoney(totals.amortized_costs)}</td>
            )}
            <td className="p-2 text-right">{fmtMoney(totals.net_cash_flow)}</td>
            <td className="p-2 text-right">{fmtMoney(cumulativeValues[cumulativeValues.length - 1] || 0)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
});
