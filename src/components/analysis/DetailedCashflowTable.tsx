"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnnualLine, AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { npv } from "@/components/LeaseAnalyzerApp";
import { calculateCommission } from "@/lib/commission";

interface DetailedCashflowTableProps {
  lines: AnnualLine[];
  meta: AnalysisMeta;
}

export function DetailedCashflowTable({ lines, meta }: DetailedCashflowTableProps) {
  const discountRate = meta.cashflow_settings?.discount_rate || 0.08;
  
  // Calculate commission per year if commission structure exists
  const commissionPerYear = useMemo(() => {
    if (!meta.commissionStructure) return lines.map(() => 0);
    
    const commissionResult = calculateCommission(meta, meta.commissionStructure);
    const totalCommission = commissionResult.breakdown.totalCommission;
    
    // Distribute commission across years (simplified - could be more sophisticated)
    const years = lines.length;
    if (years === 0) return [];
    
    // For now, allocate all commission to year 1 (can be enhanced later)
    const perYear = totalCommission / years;
    return lines.map((_, idx) => idx === 0 ? totalCommission : 0);
  }, [lines, meta]);

  // Calculate detailed breakdown for each year
  const detailedData = useMemo(() => {
    return lines.map((line, idx) => {
      // Gross Rent = base rent (before abatement)
      const grossRent = line.base_rent;
      
      // Abated Base Rent = negative abatement credit
      const abatedBaseRent = line.abatement_credit; // Already negative
      
      // Gross Revenue = base rent + abatement credit (net after abatement)
      const grossRevenue = line.base_rent + line.abatement_credit;
      
      // Net Operating Income = subtotal (base rent + operating + parking after abatement)
      const netOperatingIncome = line.subtotal;
      
      // Tenant Improvements = TI shortfall or amortized TI
      const tenantImprovements = line.ti_shortfall || 0;
      
      // Commissions
      const commissions = commissionPerYear[idx] || 0;
      
      // Capital = transaction costs + amortized costs
      const capital = (line.transaction_costs || 0) + (line.amortized_costs || 0);
      
      // Net Cash Flow
      const netCashFlow = line.net_cash_flow;
      
      return {
        year: line.year,
        grossRent,
        abatedBaseRent,
        grossRevenue,
        netOperatingIncome,
        tenantImprovements,
        commissions,
        capital,
        netCashFlow,
      };
    });
  }, [lines, commissionPerYear]);

  // Calculate totals
  const totals = useMemo(() => {
    return detailedData.reduce((acc, row) => ({
      grossRent: acc.grossRent + row.grossRent,
      abatedBaseRent: acc.abatedBaseRent + row.abatedBaseRent,
      grossRevenue: acc.grossRevenue + row.grossRevenue,
      netOperatingIncome: acc.netOperatingIncome + row.netOperatingIncome,
      tenantImprovements: acc.tenantImprovements + row.tenantImprovements,
      commissions: acc.commissions + row.commissions,
      capital: acc.capital + row.capital,
      netCashFlow: acc.netCashFlow + row.netCashFlow,
    }), {
      grossRent: 0,
      abatedBaseRent: 0,
      grossRevenue: 0,
      netOperatingIncome: 0,
      tenantImprovements: 0,
      commissions: 0,
      capital: 0,
      netCashFlow: 0,
    });
  }, [detailedData]);

  // Calculate NPV for each row
  const npvValues = useMemo(() => {
    return detailedData.map((row, idx) => {
      // Calculate NPV up to this year
      const cashflowsUpToYear = detailedData.slice(0, idx + 1).map(r => r.netCashFlow);
      return npv(
        cashflowsUpToYear.map((cf, i) => ({
          year: detailedData[i].year,
          base_rent: 0,
          abatement_credit: 0,
          operating: 0,
          parking: 0,
          other_recurring: 0,
          subtotal: 0,
          net_cash_flow: cf,
        })),
        discountRate
      );
    });
  }, [detailedData, discountRate]);

  // Calculate total NPV
  const totalNPV = useMemo(() => {
    return npv(lines, discountRate);
  }, [lines, discountRate]);

  // Get year start date
  const getYearStartDate = (year: number, idx: number): string | null => {
    if (!meta.key_dates?.commencement) return null;
    const commencement = new Date(meta.key_dates.commencement);
    if (isNaN(commencement.getTime())) return null;
    
    const yearNum = idx + 1;
    const startDate = new Date(commencement);
    startDate.setFullYear(commencement.getFullYear() + idx);
    
    const month = (startDate.getMonth() + 1).toString().padStart(2, '0');
    const yearStr = startDate.getFullYear();
    return `${month}/${yearStr}`;
  };

  const fmtMoney = (value: number) => 
    value.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Detailed Cash Flow</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm" style={{ minWidth: '1000px' }}>
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-2">Start Date</th>
                <th className="text-right p-2">Gross Rent</th>
                <th className="text-right p-2">Abated Base Rent</th>
                <th className="text-right p-2">Gross Revenue</th>
                <th className="text-right p-2">Net Operating Income</th>
                <th className="text-right p-2">Tenant Improvements</th>
                <th className="text-right p-2">Commissions</th>
                <th className="text-right p-2">Capital</th>
                <th className="text-right p-2 font-medium">Net Cash Flow</th>
                <th className="text-right p-2">NPV ({((discountRate * 100).toFixed(2))}%)</th>
              </tr>
            </thead>
            <tbody>
              {detailedData.map((row, idx) => {
                const startDate = getYearStartDate(row.year, idx);
                const yearLabel = startDate ? `YR ${idx + 1} (${startDate})` : `YR ${idx + 1}`;
                
                return (
                  <tr key={row.year} className="border-t hover:bg-muted/30">
                    <td className="p-2 font-medium">{yearLabel}</td>
                    <td className="p-2 text-right">{fmtMoney(row.grossRent)}</td>
                    <td className="p-2 text-right text-green-600">{fmtMoney(row.abatedBaseRent)}</td>
                    <td className="p-2 text-right">{fmtMoney(row.grossRevenue)}</td>
                    <td className="p-2 text-right">{fmtMoney(row.netOperatingIncome)}</td>
                    <td className="p-2 text-right text-red-600">
                      {row.tenantImprovements !== 0 ? fmtMoney(-row.tenantImprovements) : "-"}
                    </td>
                    <td className="p-2 text-right text-red-600">
                      {row.commissions !== 0 ? fmtMoney(-row.commissions) : "-"}
                    </td>
                    <td className="p-2 text-right text-red-600">
                      {row.capital !== 0 ? fmtMoney(-row.capital) : "-"}
                    </td>
                    <td className={`p-2 text-right font-medium ${row.netCashFlow < 0 ? 'text-red-600' : ''}`}>
                      {fmtMoney(row.netCashFlow)}
                    </td>
                    <td className="p-2 text-right text-muted-foreground">
                      {fmtMoney(npvValues[idx])}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-muted/70 border-t-2 border-foreground/20">
              <tr className="font-semibold">
                <td className="p-2">Total</td>
                <td className="p-2 text-right">{fmtMoney(totals.grossRent)}</td>
                <td className="p-2 text-right text-green-600">{fmtMoney(totals.abatedBaseRent)}</td>
                <td className="p-2 text-right">{fmtMoney(totals.grossRevenue)}</td>
                <td className="p-2 text-right">{fmtMoney(totals.netOperatingIncome)}</td>
                <td className="p-2 text-right text-red-600">
                  {totals.tenantImprovements !== 0 ? fmtMoney(-totals.tenantImprovements) : "-"}
                </td>
                <td className="p-2 text-right text-red-600">
                  {totals.commissions !== 0 ? fmtMoney(-totals.commissions) : "-"}
                </td>
                <td className="p-2 text-right text-red-600">
                  {totals.capital !== 0 ? fmtMoney(-totals.capital) : "-"}
                </td>
                <td className="p-2 text-right">{fmtMoney(totals.netCashFlow)}</td>
                <td className="p-2 text-right font-medium">{fmtMoney(totalNPV)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

