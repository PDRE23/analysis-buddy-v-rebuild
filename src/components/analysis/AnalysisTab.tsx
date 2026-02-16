import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Copy, Download, Printer } from "lucide-react";
import type { AnnualLine, AnalysisMeta } from "@/types";
import { parseDateOnly, formatDateOnlyDisplay } from "@/lib/dateOnly";
import { calculateLeaseTermParts, formatLeaseTerm } from "@/lib/leaseTermCalculations";
import { effectiveRentPSF } from "@/lib/calculations/metrics-engine";
import { calculateLandlordYield } from "@/lib/financialModeling";
import { DealTermsSummaryCard } from "@/components/analysis/DealTermsSummaryCard";
import { DetailedCashflowTable } from "@/components/analysis/DetailedCashflowTable";
import { ScenarioComparisonTable } from "@/components/analysis/ScenarioComparisonTable";
import { YearTable } from "@/components/analysis/YearTable";
import { exportTableToCSV, copyTableToClipboard } from "@/components/analysis/export-utils";

export const AnalysisTab = React.memo(function AnalysisTab({ lines, meta }: { lines: AnnualLine[]; meta: AnalysisMeta }) {
  const dataQuality = React.useMemo(() => {
    const issues: string[] = [];
    if (!meta.key_dates.commencement || !meta.key_dates.expiration) {
      issues.push("Missing lease dates");
    }
    if (!meta.rsf || meta.rsf === 0) {
      issues.push("RSF not set");
    }
    if (!meta.rent_schedule || meta.rent_schedule.length === 0) {
      issues.push("No rent schedule");
    }
    if (lines.length === 0) {
      issues.push("No cashflow data");
    }
    return {
      hasIssues: issues.length > 0,
      issues,
    };
  }, [meta, lines]);

  const yieldMetrics = React.useMemo(() => {
    const tiTotal = (meta.concessions.ti_allowance_psf || 0) * meta.rsf;
    const transactionTotal = meta.transaction_costs?.total || 0;
    const freeRentValue = meta.rent_schedule.length > 0 
      ? (() => {
          let freeRentValue = 0;
          if (meta.concessions?.abatement_type === "at_commencement") {
            const freeMonths = meta.concessions.abatement_free_rent_months || 0;
            if (freeMonths > 0 && meta.rent_schedule.length > 0) {
              freeRentValue = (freeMonths / 12) * (meta.rent_schedule[0].rent_psf * meta.rsf);
            }
          } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
            for (const period of meta.concessions.abatement_periods) {
              let rentRate = 0;
              for (const r of meta.rent_schedule) {
                const rStart = parseDateOnly(r.period_start) ?? new Date(r.period_start);
                const rEnd = parseDateOnly(r.period_end) ?? new Date(r.period_end);
                const periodStart = parseDateOnly(period.period_start) ?? new Date(period.period_start);
                if (periodStart >= rStart && periodStart <= rEnd) {
                  rentRate = r.rent_psf;
                  break;
                }
              }
              freeRentValue += (period.free_rent_months / 12) * (rentRate * meta.rsf);
            }
          }
          return freeRentValue;
        })()
      : 0;
    const tiShortfall = lines.length > 0 && lines[0].ti_shortfall ? lines[0].ti_shortfall : 0;
    const initialInvestment = tiTotal + transactionTotal + freeRentValue + tiShortfall;
    
    const discountRate = meta.cashflow_settings?.discount_rate || 0.08;
    return calculateLandlordYield(lines, initialInvestment, discountRate);
  }, [lines, meta]);

  const summaryStats = React.useMemo(() => {
    const totalLeaseValue = lines.reduce((sum, line) => sum + line.net_cash_flow, 0);
    const averageAnnualCashflow = lines.length > 0 ? totalLeaseValue / lines.length : 0;
    
    let leaseTermYears = 0;
    let leaseTermMonths = 0;
    const leaseTermParts = calculateLeaseTermParts(meta);
    if (leaseTermParts) {
      leaseTermYears = leaseTermParts.years + leaseTermParts.months / 12;
      leaseTermMonths = leaseTermParts.years * 12 + leaseTermParts.months;
    }
    
    const effectiveTermYears = leaseTermYears > 0 ? leaseTermYears : lines.length;
    const effectiveRentPSFValue = effectiveRentPSF(lines, meta.rsf, effectiveTermYears);
    
    const startingRent = lines.length > 0 ? lines[0].base_rent : 0;
    const endingRent = lines.length > 0 ? lines[lines.length - 1].base_rent : 0;
    
    const freeRentValue = meta.rent_schedule.length > 0 
      ? (() => {
          let freeRentValue = 0;
          if (meta.concessions?.abatement_type === "at_commencement") {
            const freeMonths = meta.concessions.abatement_free_rent_months || 0;
            if (freeMonths > 0 && meta.rent_schedule.length > 0) {
              freeRentValue = (freeMonths / 12) * (meta.rent_schedule[0].rent_psf * meta.rsf);
            }
          } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
            for (const period of meta.concessions.abatement_periods) {
              let rentRate = 0;
              for (const r of meta.rent_schedule) {
                const rStart = parseDateOnly(r.period_start) ?? new Date(r.period_start);
                const rEnd = parseDateOnly(r.period_end) ?? new Date(r.period_end);
                const periodStart = parseDateOnly(period.period_start) ?? new Date(period.period_start);
                if (periodStart >= rStart && periodStart <= rEnd) {
                  rentRate = r.rent_psf;
                  break;
                }
              }
              freeRentValue += (period.free_rent_months / 12) * (rentRate * meta.rsf);
            }
          }
          return freeRentValue;
        })()
      : 0;
    
    const totalConcessions = 
      (meta.concessions.ti_allowance_psf || 0) * meta.rsf +
      (meta.concessions.moving_allowance || 0) +
      (meta.concessions.other_credits || 0) +
      freeRentValue;
    
    return {
      totalLeaseValue,
      averageAnnualCashflow,
      effectiveRentPSFValue,
      leaseTermYears,
      leaseTermMonths,
      startingRent,
      endingRent,
      totalConcessions,
      freeRentValue,
    };
  }, [lines, meta]);

  const leaseTermDisplay = React.useMemo(() => formatLeaseTerm(meta), [meta]);

  return (
    <div className="space-y-4">
      {dataQuality.hasIssues && (
        <Card className="rounded-2xl border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="text-yellow-800 flex items-center gap-2">
              <span>⚠️</span>
              <span>Incomplete Data</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-yellow-700 mb-2">
              Some calculations may be inaccurate due to missing information:
            </p>
            <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
              {dataQuality.issues.map((issue, idx) => (
                <li key={idx}>{issue}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <DealTermsSummaryCard meta={meta} />

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Lease Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Lease Term</Label>
              <div className="text-sm font-semibold">{leaseTermDisplay}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">RSF</Label>
              <div className="text-sm font-semibold">{meta.rsf.toLocaleString()} SF</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Lease Type</Label>
              <div className="text-sm font-semibold">{meta.lease_type === 'FS' ? 'Full Service' : 'Triple Net'}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Market</Label>
              <div className="text-sm font-semibold">{meta.market}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Commencement</Label>
              <div className="text-sm font-semibold">
                {formatDateOnlyDisplay(meta.key_dates.commencement)}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Expiration</Label>
              <div className="text-sm font-semibold">
                {formatDateOnlyDisplay(meta.key_dates.expiration)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div>
              <Label className="text-xs text-muted-foreground">Total Lease Value</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.totalLeaseValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Avg. Annual Cashflow</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.averageAnnualCashflow.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Effective Rent $/SF</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.effectiveRentPSFValue.toFixed(2)}/SF/yr
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Starting Rent</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.startingRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Ending Rent</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.endingRent.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Total Concessions</Label>
              <div className="text-lg font-semibold">
                ${summaryStats.totalConcessions.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Financial Metrics</span>
            <span className="text-xs font-normal text-muted-foreground">
              Discount Rate: {((meta.cashflow_settings?.discount_rate || 0.08) * 100).toFixed(1)}%
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Return Metrics</Label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground" title="Net Present Value at discount rate">NPV</Label>
                  <div className="text-xl font-bold text-primary">
                    ${yieldMetrics.npv.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="NPV per square foot per year">NPV $/SF/yr</Label>
                  <div className="text-xl font-bold text-primary">
                    {summaryStats.leaseTermYears > 0 && meta.rsf > 0 
                      ? `$${(yieldMetrics.npv / (meta.rsf * summaryStats.leaseTermYears)).toFixed(2)}/SF/yr`
                      : "$0.00/SF/yr"}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Internal Rate of Return - annualized return percentage">IRR</Label>
                  <div className="text-xl font-bold text-primary">
                    {yieldMetrics.irr.toFixed(2)}%
                  </div>
                  {yieldMetrics.irr > 0 && yieldMetrics.irr < 8 && (
                    <div className="text-xs text-yellow-600 mt-1">Below market (8-12%)</div>
                  )}
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Annual cashflow return on initial investment">Yield on Cost</Label>
                  <div className="text-lg font-semibold">
                    {yieldMetrics.yieldOnCost.toFixed(2)}%
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground" title="Total return divided by initial investment">Equity Multiple</Label>
                  <div className="text-lg font-semibold">
                    {yieldMetrics.equityMultiple.toFixed(2)}x
                  </div>
                </div>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
              <div>
                <Label className="text-sm font-medium mb-2 block">Time Metrics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Year when cumulative cashflow becomes positive">Payback Period</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.paybackPeriod} {yieldMetrics.paybackPeriod === 1 ? 'year' : 'years'}
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">Cash Return Metrics</Label>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Total cash return over lease term">Cash-on-Cash Return</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.cashOnCashReturn.toFixed(2)}%
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground" title="Average annual return on investment">Net Yield</Label>
                    <div className="text-lg font-semibold">
                      {yieldMetrics.netYield.toFixed(2)}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <ScenarioComparisonTable baseMeta={meta} />

      <DetailedCashflowTable lines={lines} meta={meta} />
      
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle>Annual Cashflow</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => copyTableToClipboard(lines, meta.rsf, meta)}
              className="rounded-lg"
              title="Copy table to clipboard"
            >
              <Copy className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Copy</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportTableToCSV(lines, meta.rsf, meta)}
              className="rounded-lg"
              title="Export table to CSV"
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="rounded-lg"
              title="Print view"
            >
              <Printer className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Print</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <YearTable lines={lines} rsf={meta.rsf} meta={meta} />
        </CardContent>
      </Card>
      <div className="text-xs text-muted-foreground space-y-1">
        <div>* Net Cash Flow includes: base rent, operating pass-throughs, parking, abatement credits, TI shortfall (if applicable), transaction costs (if applicable), and amortized costs (if financing enabled).</div>
        <div>* TI allowance, moving allowance, and other credits are not included in Net Cash Flow (they are upfront costs, not recurring cashflow).</div>
        <div>* Break-even year (BE) indicates when cumulative cashflow becomes positive.</div>
      </div>
    </div>
  );
});
