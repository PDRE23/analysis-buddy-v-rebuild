/**
 * Scenario Comparison Table Component
 * 
 * Displays a comparison of multiple what-if scenarios using the scenario engine.
 * Shows monthly economics, deal costs, termination, and schedule previews.
 */

"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DealSheetSummaryCard } from "@/components/analysis/DealSheetSummaryCard";
import type { AnalysisMeta } from "@/types";
import type { ScenarioOverrides } from "@/lib/scenario-engine";
import { terminationFeeAtMonth, type AmortizationRow } from "@/lib/analysis";
import { formatAssumptionsLine } from "@/lib/analysis/assumptions";
import { analyzeScenarios } from "@/lib/scenario-engine";
import { normalizeAnalysis } from "@/lib/analysis/normalize/normalizeAnalysis";
import { formatDateOnlyDisplay } from "@/lib/dateOnly";
import type { MonthlyEconomics } from "@/lib/analysis/scenarioEconomics";

interface ScenarioComparisonTableProps {
  baseMeta: AnalysisMeta;
}

interface ScenarioDefinition {
  name: string;
  overrides: ScenarioOverrides;
}

type DealCostsSummary = MonthlyEconomics["dealCosts"];

export function ScenarioComparisonTable({ baseMeta }: ScenarioComparisonTableProps) {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);

  const { normalized } = useMemo(() => normalizeAnalysis(baseMeta), [baseMeta]);
  const hasRentSchedule = baseMeta.rent_schedule.length > 0;
  const hasCommencement = Boolean(baseMeta.key_dates.commencement);
  const hasLeaseTerm = Boolean(
    baseMeta.lease_term && (baseMeta.lease_term.years > 0 || baseMeta.lease_term.months > 0)
  );
  const hasRsf = baseMeta.rsf > 0;
  const hasNormalizedTerm =
    typeof normalized.dates.term_months_total === "number" &&
    normalized.dates.term_months_total > 0;
  const canComputeScenarios =
    hasRsf && hasCommencement && hasRentSchedule && (hasNormalizedTerm || hasLeaseTerm);

  const results = useMemo(() => {
    if (!canComputeScenarios || scenarios.length === 0) return [];
    return analyzeScenarios(baseMeta, scenarios);
  }, [baseMeta, canComputeScenarios, scenarios]);

  const assumptionsSummary = useMemo(() => {
    if (results.length === 0) return undefined;
    const baseScenario = results.find(({ name }) => name === "Base Case") ?? results[0];
    return baseScenario.result.assumptionsSummary;
  }, [results]);

  const assumptionsLine = useMemo(() => {
    return formatAssumptionsLine(assumptionsSummary);
  }, [assumptionsSummary]);

  const overridesByName = useMemo(() => {
    return new Map(scenarios.map((scenario) => [scenario.name, scenario.overrides]));
  }, [scenarios]);

  const getDealCostsFromMonthly = (monthlyEconomics?: MonthlyEconomics): DealCostsSummary | undefined => {
    if (!monthlyEconomics) return undefined;
    const { dealCosts } = monthlyEconomics;
    const { tiAllowance, leasingCommission, otherCosts, totalLlCost } = dealCosts;
    if (
      typeof tiAllowance !== "number" ||
      Number.isNaN(tiAllowance) ||
      typeof leasingCommission !== "number" ||
      Number.isNaN(leasingCommission) ||
      typeof otherCosts !== "number" ||
      Number.isNaN(otherCosts) ||
      typeof totalLlCost !== "number" ||
      Number.isNaN(totalLlCost)
    ) {
      return undefined;
    }
    return dealCosts;
  };

  const scenarioRows = useMemo(() => {
    return results.map(({ name, result }) => {
      const overrides = overridesByName.get(name);
      const options = overrides?.options ?? baseMeta.options;
      const monthlyEconomics = result.monthlyEconomics;
      const costs =
        getDealCostsFromMonthly(monthlyEconomics) ??
        (() => {
          const concessions = {
            ...baseMeta.concessions,
            ...(overrides?.concessions ?? {}),
          };
          const transactionCosts = {
            ...(baseMeta.transaction_costs ?? {}),
            ...(overrides?.transaction_costs ?? {}),
          };
          const rsf = overrides?.rsf ?? baseMeta.rsf;

          const tiAllowance = (concessions.ti_allowance_psf ?? 0) * rsf;
          const transactionPartsTotal =
            (transactionCosts.legal_fees ?? 0) +
            (transactionCosts.brokerage_fees ?? 0) +
            (transactionCosts.due_diligence ?? 0) +
            (transactionCosts.environmental ?? 0) +
            (transactionCosts.other ?? 0);
          const transactionTotal = transactionCosts.total ?? transactionPartsTotal;
          const leasingCommission = transactionCosts.brokerage_fees ?? 0;
          const otherConcessions =
            (concessions.moving_allowance ?? 0) + (concessions.other_credits ?? 0);
          const otherTransaction = Math.max(0, transactionTotal - leasingCommission);
          const otherCosts = otherConcessions + otherTransaction;
          const totalLlCost = tiAllowance + leasingCommission + otherCosts;

          return {
            tiAllowance,
            leasingCommission,
            otherCosts,
            totalLlCost,
          };
        })();

      const terminationOption = options?.find((option) => option.type === "Termination");
      const fallbackPenaltyMonths =
        terminationOption?.fee_months_of_rent ?? (terminationOption ? 6 : 0);
      const penaltyMonths =
        typeof monthlyEconomics?.termination?.penaltyMonths === "number" &&
        !Number.isNaN(monthlyEconomics.termination.penaltyMonths)
          ? monthlyEconomics.termination.penaltyMonths
          : fallbackPenaltyMonths;

      return {
        name,
        result,
        monthlyEconomics,
        dealSheetSummary: result.dealSheetSummary,
        costs,
        penaltyMonths,
      };
    });
  }, [baseMeta, overridesByName, results]);

  const hasMonthlyEconomics = scenarioRows.some((row) => row.monthlyEconomics);
  const hasAmortization = scenarioRows.some(
    (row) => (row.monthlyEconomics?.amortization?.schedule.length ?? 0) > 0
  );
  const amortizationColumns = [12, 24, 36].filter((month) =>
    scenarioRows.some((row) => (row.monthlyEconomics?.amortization?.schedule.length ?? 0) >= month)
  );
  const showAmortizationEnd = scenarioRows.some(
    (row) => (row.monthlyEconomics?.amortization?.schedule.length ?? 0) > 0
  );

  const formatCurrency = (value: number | undefined, fractionDigits = 0) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    return value.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const formatRate = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}/RSF/Yr`;
  };

  const formatDate = (value?: string) => formatDateOnlyDisplay(value, "—");

  const getAmortizationBalance = (schedule: AmortizationRow[], monthNumber: number) => {
    const row = schedule[monthNumber - 1];
    return row?.ending_balance;
  };

  const getTerminationFee = (
    monthlyEconomics: typeof scenarioRows[number]["monthlyEconomics"] | undefined,
    penaltyMonths: number
  ) => {
    if (!monthlyEconomics) return undefined;
    const months = monthlyEconomics.rentSchedule.months;
    if (months.length === 0) return undefined;
    const targetIndex = Math.min(months.length - 1, 35);
    const currentMonthlyRent = months[targetIndex]?.contractual_base_rent ?? 0;
    const amortSchedule = monthlyEconomics.amortization?.schedule ?? [];
    return terminationFeeAtMonth(amortSchedule, targetIndex, penaltyMonths, currentMonthlyRent);
  };

  const getSchedulePreview = (
    monthlyEconomics: typeof scenarioRows[number]["monthlyEconomics"] | undefined
  ) => {
    const months = monthlyEconomics?.rentSchedule.months ?? [];
    if (months.length <= 6) return months;
    return [...months.slice(0, 3), ...months.slice(-3)];
  };

  const addTestScenarios = () => {
    setScenarios([
      {
        name: "Base Case",
        overrides: {},
      },
      {
        name: "Rent +$2",
        overrides: {
          rent_schedule: baseMeta.rent_schedule.map((row) => ({
            ...row,
            rent_psf: row.rent_psf + 2,
          })),
        },
      },
      {
        name: "More TI (+$10)",
        overrides: {
          concessions: {
            ...baseMeta.concessions,
            ti_allowance_psf: (baseMeta.concessions?.ti_allowance_psf ?? 0) + 10,
          },
        },
      },
    ]);
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <Button
            type="button"
            variant="outline"
            onClick={addTestScenarios}
            disabled={!hasRentSchedule}
          >
            Add Test Scenarios
          </Button>
        </div>
        <div className="mb-4 rounded-lg border bg-muted/20 p-3 text-sm">
          <div className="mb-2 font-semibold">Derived Lease Summary</div>
          <dl className="grid gap-x-6 gap-y-2 md:grid-cols-2">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Commencement</dt>
              <dd className="font-medium">{formatDate(normalized.dates.commencement)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Rent Start</dt>
              <dd className="font-medium">{formatDate(normalized.dates.rent_start)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Expiration</dt>
              <dd className="font-medium">{formatDate(normalized.dates.expiration)}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total Lease Term (months)</dt>
              <dd className="font-medium">
                {normalized.dates.term_months_total ?? "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Total Abatement (months)</dt>
              <dd className="font-medium">{normalized.dates.abatement_months_total}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Rent Escalation Periods</dt>
              <dd className="font-medium">{normalized.rent.escalation_periods.length}</dd>
            </div>
          </dl>
          {assumptionsSummary ? (
            <div className="mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Assumptions:</span>{" "}
              {assumptionsLine}
            </div>
          ) : null}
        </div>
        {!canComputeScenarios ? (
          <p className="text-sm text-yellow-700">
            Complete Lease Terms (RSF, Commencement, Rent Schedule) to compute scenario metrics.
          </p>
        ) : results.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scenarios yet.</p>
        ) : (
          <div className="space-y-4">
            <details open className="rounded-lg border bg-muted/10 p-3">
              <summary className="cursor-pointer font-medium">Deal Sheet Summary</summary>
              <div className="mt-3 grid gap-4 md:grid-cols-2">
                {scenarioRows.map((row) => (
                  <DealSheetSummaryCard
                    key={row.name}
                    title={row.name}
                    summary={row.dealSheetSummary}
                  />
                ))}
              </div>
            </details>

            <details open className="rounded-lg border bg-muted/10 p-3">
              <summary className="cursor-pointer font-medium">Economics (Monthly)</summary>
              {!hasMonthlyEconomics ? (
                <div className="mt-2 text-xs text-muted-foreground">Not available.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-2 font-semibold">Scenario</th>
                        <th className="text-right p-2 font-semibold">Total Net Rent</th>
                        <th className="text-right p-2 font-semibold">Free Rent Value</th>
                        <th className="text-right p-2 font-semibold">NPV of Rent</th>
                        <th className="text-right p-2 font-semibold">Blended Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioRows.map((row) => {
                        if (!row.monthlyEconomics) {
                          return (
                            <tr key={row.name} className="border-b">
                              <td className="p-2 font-medium">{row.name}</td>
                              <td className="p-2 text-right text-muted-foreground" colSpan={4}>
                                Not available
                              </td>
                            </tr>
                          );
                        }
                        const summary = row.monthlyEconomics.rentSchedule.summary;
                        return (
                          <tr key={row.name} className="border-b hover:bg-muted/40">
                            <td className="p-2 font-medium">{row.name}</td>
                            <td className="p-2 text-right">{formatCurrency(summary.total_net_rent)}</td>
                            <td className="p-2 text-right">{formatCurrency(summary.free_rent_value)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.monthlyEconomics.npv)}</td>
                            <td className="p-2 text-right">{formatRate(row.monthlyEconomics.blendedRate)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </details>

            {hasAmortization ? (
              <details className="rounded-lg border bg-muted/10 p-3">
                <summary className="cursor-pointer font-medium">Deal Costs &amp; Amortization</summary>
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-left p-2 font-semibold">Scenario</th>
                        <th className="text-right p-2 font-semibold">TI</th>
                        <th className="text-right p-2 font-semibold">LC</th>
                        <th className="text-right p-2 font-semibold">Other</th>
                        <th className="text-right p-2 font-semibold">Total LL Cost</th>
                        {amortizationColumns.map((month) => (
                          <th key={month} className="text-right p-2 font-semibold">
                            Unamortized M{month}
                          </th>
                        ))}
                        {showAmortizationEnd ? (
                          <th className="text-right p-2 font-semibold">Unamortized End</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {scenarioRows.map((row) => {
                        if (!row.monthlyEconomics) {
                          return (
                            <tr key={row.name} className="border-b">
                              <td className="p-2 font-medium">{row.name}</td>
                              <td className="p-2 text-right text-muted-foreground" colSpan={5 + amortizationColumns.length + (showAmortizationEnd ? 1 : 0)}>
                                Not available
                              </td>
                            </tr>
                          );
                        }

                        const amortSchedule = row.monthlyEconomics.amortization?.schedule ?? [];
                        return (
                          <tr key={row.name} className="border-b hover:bg-muted/40">
                            <td className="p-2 font-medium">{row.name}</td>
                            <td className="p-2 text-right">{formatCurrency(row.costs.tiAllowance)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.costs.leasingCommission)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.costs.otherCosts)}</td>
                            <td className="p-2 text-right">{formatCurrency(row.costs.totalLlCost)}</td>
                            {amortizationColumns.map((month) => {
                              const balance = getAmortizationBalance(amortSchedule, month);
                              return (
                                <td key={month} className="p-2 text-right">
                                  {balance !== undefined ? formatCurrency(balance) : "—"}
                                </td>
                              );
                            })}
                            {showAmortizationEnd ? (
                              <td className="p-2 text-right">
                                {amortSchedule.length > 0
                                  ? formatCurrency(amortSchedule[amortSchedule.length - 1]?.ending_balance)
                                  : "—"}
                              </td>
                            ) : null}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </details>
            ) : null}

            <details className="rounded-lg border bg-muted/10 p-3">
              <summary className="cursor-pointer font-medium">Termination</summary>
              {!hasMonthlyEconomics ? (
                <div className="mt-2 text-xs text-muted-foreground">Not available.</div>
              ) : (
                <>
                  <div className="mt-3 overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="border-b bg-muted/40">
                        <tr>
                          <th className="text-left p-2 font-semibold">Scenario</th>
                          <th className="text-right p-2 font-semibold">Penalty Months</th>
                          <th className="text-right p-2 font-semibold">Termination Fee</th>
                        </tr>
                      </thead>
                      <tbody>
                        {scenarioRows.map((row) => {
                          if (!row.monthlyEconomics) {
                            return (
                              <tr key={row.name} className="border-b">
                                <td className="p-2 font-medium">{row.name}</td>
                                <td className="p-2 text-right text-muted-foreground" colSpan={2}>
                                  Not available
                                </td>
                              </tr>
                            );
                          }
                          const fee = getTerminationFee(row.monthlyEconomics, row.penaltyMonths);
                          return (
                            <tr key={row.name} className="border-b hover:bg-muted/40">
                              <td className="p-2 font-medium">{row.name}</td>
                              <td className="p-2 text-right">{row.penaltyMonths}</td>
                              <td className="p-2 text-right">
                                {fee !== undefined ? formatCurrency(fee) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Termination fee uses month 36 or last month if shorter term.
                  </div>
                </>
              )}
            </details>

            <details className="rounded-lg border bg-muted/10 p-3">
              <summary className="cursor-pointer font-medium">Schedule Preview</summary>
              {!hasMonthlyEconomics ? (
                <div className="mt-2 text-xs text-muted-foreground">Not available.</div>
              ) : (
                <div className="mt-3 space-y-3">
                  {scenarioRows.map((row) => {
                    if (!row.monthlyEconomics) {
                      return (
                        <div key={row.name} className="rounded-md border p-3 text-sm text-muted-foreground">
                          <div className="font-medium text-foreground">{row.name}</div>
                          <div className="mt-1 text-xs">Not available.</div>
                        </div>
                      );
                    }

                    const previewRows = getSchedulePreview(row.monthlyEconomics);
                    return (
                      <div key={row.name} className="rounded-md border p-3">
                        <div className="mb-2 text-sm font-medium">{row.name}</div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-xs">
                            <thead className="border-b bg-muted/40">
                              <tr>
                                <th className="text-left p-2 font-semibold">Month</th>
                                <th className="text-left p-2 font-semibold">Start Date</th>
                                <th className="text-right p-2 font-semibold">Contractual Rent</th>
                                <th className="text-right p-2 font-semibold">Free Rent</th>
                                <th className="text-right p-2 font-semibold">Net Due</th>
                              </tr>
                            </thead>
                            <tbody>
                              {previewRows.map((month) => (
                                <tr key={`${row.name}-${month.period_index}`} className="border-b">
                                  <td className="p-2">M{month.period_index + 1}</td>
                                  <td className="p-2">{formatDate(month.start_date)}</td>
                                  <td className="p-2 text-right">
                                    {formatCurrency(month.contractual_base_rent, 2)}
                                  </td>
                                  <td className="p-2 text-right">
                                    {formatCurrency(month.free_rent_amount, 2)}
                                  </td>
                                  <td className="p-2 text-right">{formatCurrency(month.net_rent_due, 2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
