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
import {
  buildTenantStrategySummary,
  freeRentToRateEquivalentPsfYr,
  terminationFeeAtMonth,
  termExtensionToAdditionalTiPsf,
  tiToRateEquivalentPsfYr,
  type AmortizationRow,
} from "@/lib/analysis";
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

  const { normalized, issues } = useMemo(() => normalizeAnalysis(baseMeta), [baseMeta]);
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

  const normalizationWarningCount = useMemo(() => issues.length, [issues]);

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
        rsf: overrides?.rsf ?? baseMeta.rsf,
      };
    });
  }, [baseMeta, overridesByName, results]);

  const tenantStrategyRows = useMemo(() => {
    if (scenarioRows.length === 0) return [];
    const baseRow = scenarioRows.find((row) => row.name === "Base Case") ?? scenarioRows[0];

    return scenarioRows
      .map((row) => ({
        ...row,
        tenantStrategySummary: buildTenantStrategySummary(row.result, baseRow.result),
      }))
      .sort(
        (a, b) =>
          a.tenantStrategySummary.totalOccupancyCostNPV - b.tenantStrategySummary.totalOccupancyCostNPV
      );
  }, [scenarioRows]);

  const bestTenantScenario = tenantStrategyRows[0]?.name;

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

  const formatSignedCurrency = (value: number | undefined, fractionDigits = 0) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const formatted = Math.abs(value).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${sign}${formatted}`;
  };

  const formatPercent = (value: number | undefined, fractionDigits = 1) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    return value.toLocaleString(undefined, {
      style: "percent",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
  };

  const formatDeltaWithPercent = (
    delta: number | undefined,
    baseValue: number | undefined,
    fractionDigits = 0,
    percentDigits = 1
  ) => {
    if (delta === undefined || Number.isNaN(delta)) return "—";
    const formattedDelta = formatSignedCurrency(delta, fractionDigits);
    if (baseValue === undefined || Number.isNaN(baseValue) || baseValue === 0) return formattedDelta;
    const percentValue = delta / baseValue;
    return `${formattedDelta} (${formatPercent(percentValue, percentDigits)})`;
  };

  const formatRate = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    return `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}/RSF/Yr`;
  };

  const formatSignedRate = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const formatted = Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${formatted}/RSF/Yr`;
  };

  const formatSignedPsf = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const formatted = Math.abs(value).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return `${sign}$${formatted}/RSF`;
  };

  const formatSignedMonths = (value: number | undefined) => {
    if (value === undefined || Number.isNaN(value)) return "—";
    const sign = value > 0 ? "+" : value < 0 ? "-" : "";
    const formatted = Math.abs(value).toLocaleString(undefined, {
      maximumFractionDigits: 1,
    });
    return `${sign}${formatted}`;
  };

  const formatDate = (value?: string) => formatDateOnlyDisplay(value, "—");

  const resolveTerminationFeeAt36 = (
    row: typeof tenantStrategyRows[number] | undefined
  ): number | undefined => {
    if (!row) return undefined;
    const summaryFee = row.dealSheetSummary?.terminationFeeAt36;
    if (typeof summaryFee === "number" && !Number.isNaN(summaryFee)) return summaryFee;

    const monthlyEconomics = row.monthlyEconomics;
    if (!monthlyEconomics) return undefined;
    const months = monthlyEconomics.rentSchedule.months;
    if (months.length === 0) return undefined;
    const targetIndex = Math.min(months.length - 1, 35);
    const termination = monthlyEconomics.termination;
    const feeAt36 = termination?.feeAt36;
    if (typeof feeAt36 === "number" && !Number.isNaN(feeAt36)) return feeAt36;
    if (typeof termination?.feeAtMonth === "function") {
      const fee = termination.feeAtMonth(targetIndex);
      if (typeof fee === "number" && !Number.isNaN(fee)) return fee;
    }
    const feeByMonth = termination?.feesByMonth?.[targetIndex];
    if (typeof feeByMonth === "number" && !Number.isNaN(feeByMonth)) return feeByMonth;
    const penaltyMonths = termination?.penaltyMonths;
    if (typeof penaltyMonths !== "number" || Number.isNaN(penaltyMonths)) return undefined;

    const currentMonthlyRent = months[targetIndex]?.contractual_base_rent ?? 0;
    const amortSchedule = monthlyEconomics.amortization?.schedule ?? [];
    const fee = terminationFeeAtMonth(amortSchedule, targetIndex, penaltyMonths, currentMonthlyRent);
    if (typeof fee !== "number" || Number.isNaN(fee)) return undefined;
    return fee;
  };

  const baseTenantRow = useMemo(() => {
    if (tenantStrategyRows.length === 0) return undefined;
    return tenantStrategyRows.find((row) => row.name === "Base Case") ?? tenantStrategyRows[0];
  }, [tenantStrategyRows]);

  const bestTenantRow = useMemo(() => {
    if (tenantStrategyRows.length === 0) return undefined;
    return (
      tenantStrategyRows.find((row) => row.name === bestTenantScenario) ?? tenantStrategyRows[0]
    );
  }, [tenantStrategyRows, bestTenantScenario]);

  const baseTerminationFeeAt36 = useMemo(() => {
    return resolveTerminationFeeAt36(baseTenantRow);
  }, [baseTenantRow]);

  const negotiationEquivalencies = useMemo(() => {
    if (!bestTenantRow || !baseTenantRow) return undefined;
    const bestMonthly = bestTenantRow.monthlyEconomics;
    const baseMonthly = baseTenantRow.monthlyEconomics;
    if (!bestMonthly || !baseMonthly) return undefined;

    const rsf = bestTenantRow.rsf;
    if (!rsf || rsf <= 0) return undefined;

    const rentSchedule = bestMonthly.rentSchedule;
    if (rentSchedule.months.length === 0) return undefined;

    const discountRateAnnual = bestMonthly.assumptions.discountRateAnnual;
    const baseTi = baseTenantRow.costs.tiAllowance;
    const bestTi = bestTenantRow.costs.tiAllowance;
    const tiDeltaPsf = (bestTi - baseTi) / rsf;

    const countFreeRentMonths = (monthly: MonthlyEconomics) =>
      monthly.rentSchedule.months.filter((month) => month.net_rent_due <= 0).length;

    const freeRentDeltaMonths = countFreeRentMonths(bestMonthly) - countFreeRentMonths(baseMonthly);
    const termDeltaMonths = bestMonthly.rentSchedule.months.length - baseMonthly.rentSchedule.months.length;

    const tiRateEquivalent =
      tiDeltaPsf !== 0
        ? tiToRateEquivalentPsfYr({
            tiPsf: tiDeltaPsf,
            rsf,
            rentSchedule,
            discountRateAnnual,
          })
        : undefined;

    const freeRentRateEquivalent =
      freeRentDeltaMonths !== 0
        ? freeRentToRateEquivalentPsfYr({
            freeRentMonths: freeRentDeltaMonths,
            rsf,
            rentSchedule,
            discountRateAnnual,
          })
        : undefined;

    const termExtensionTiCapacity =
      termDeltaMonths !== 0
        ? termExtensionToAdditionalTiPsf({
            extensionMonths: termDeltaMonths,
            rsf,
            rentSchedule,
            discountRateAnnual,
          })
        : undefined;

    const lines = [
      tiDeltaPsf !== 0 && tiRateEquivalent !== undefined
        ? {
            key: "ti",
            label: `${formatSignedPsf(tiDeltaPsf)} \u2248 ${formatSignedRate(
              tiRateEquivalent
            )} rate (NPV-equivalent)`,
          }
        : undefined,
      freeRentDeltaMonths !== 0 && freeRentRateEquivalent !== undefined
        ? {
            key: "freeRent",
            label: `${formatSignedMonths(
              freeRentDeltaMonths
            )} months free \u2248 ${formatSignedRate(
              freeRentRateEquivalent
            )} rate (NPV-equivalent)`,
          }
        : undefined,
      termDeltaMonths !== 0 && termExtensionTiCapacity !== undefined
        ? {
            key: "term",
            label: `${formatSignedMonths(termDeltaMonths)} months term \u2248 ${formatSignedPsf(
              termExtensionTiCapacity
            )} additional TI capacity (NPV-equivalent)`,
          }
        : undefined,
    ].filter(Boolean) as Array<{ key: string; label: string }>;

    return lines.length > 0 ? lines : undefined;
  }, [baseTenantRow, bestTenantRow]);

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
              <summary className="cursor-pointer font-medium">Tenant Strategy Snapshot</summary>
              <div className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Assumptions:</span>{" "}
                {assumptionsLine || "—"}
                {normalizationWarningCount > 0 ? (
                  <span className="ml-2">
                    Normalization warnings: {normalizationWarningCount}
                  </span>
                ) : null}
              </div>
              {tenantStrategyRows.length === 0 ? (
                <div className="mt-2 text-xs text-muted-foreground">Not available.</div>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead className="border-b bg-muted/40">
                      <tr>
                        <th className="text-right p-2 font-semibold">Rank</th>
                        <th className="text-left p-2 font-semibold">Scenario</th>
                        <th className="text-right p-2 font-semibold">Total Occupancy Cost NPV</th>
                        <th className="text-right p-2 font-semibold">Δ NPV vs Base</th>
                        <th className="text-right p-2 font-semibold">Δ Free Rent</th>
                        <th className="text-right p-2 font-semibold">Δ LL Contribution</th>
                        <th className="text-right p-2 font-semibold">Δ Termination Fee</th>
                        <th className="text-left p-2 font-semibold">Flags</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tenantStrategyRows.map((row, index) => {
                        const summary = row.tenantStrategySummary;
                        const isBest = row.name === bestTenantScenario;
                        const baseSummary = baseTenantRow?.tenantStrategySummary;
                        return (
                          <React.Fragment key={row.name}>
                            <tr
                              className={`border-b ${isBest ? "bg-emerald-50/60" : "hover:bg-muted/40"}`}
                            >
                              <td className="p-2 text-right">{index + 1}</td>
                              <td className="p-2 font-medium">
                                <div className="flex items-center gap-2">
                                  <span>{row.name}</span>
                                  {isBest ? (
                                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                                      Best for Tenant
                                    </span>
                                  ) : null}
                                </div>
                              </td>
                              <td className="p-2 text-right">
                                {formatCurrency(summary.totalOccupancyCostNPV)}
                              </td>
                              <td className="p-2 text-right">
                                {formatDeltaWithPercent(
                                  summary.deltaVsBase.npvChange,
                                  baseSummary?.totalOccupancyCostNPV
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {formatDeltaWithPercent(
                                  summary.deltaVsBase.freeRentChange,
                                  baseSummary?.freeRentValue
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {formatDeltaWithPercent(
                                  summary.deltaVsBase.llContributionChange,
                                  baseSummary?.llContribution
                                )}
                              </td>
                              <td className="p-2 text-right">
                                {formatDeltaWithPercent(
                                  summary.deltaVsBase.terminationFeeChange,
                                  baseTerminationFeeAt36
                                )}
                              </td>
                              <td className="p-2">
                                {summary.leverageFlags.length === 0 ? (
                                  <span className="text-muted-foreground">—</span>
                                ) : (
                                  <div className="flex flex-wrap gap-1">
                                    {summary.leverageFlags.map((flag) => (
                                      <span
                                        key={flag}
                                        className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground"
                                      >
                                        {flag}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </td>
                            </tr>
                            {isBest ? (
                              <tr className="border-b bg-emerald-50/40">
                                <td colSpan={8} className="p-2 text-xs">
                                  <div className="flex flex-col gap-1">
                                    <div>
                                      <span className="font-semibold text-emerald-700">Talking point:</span>{" "}
                                      {summary.talkingPoint}
                                    </div>
                                    {summary.watchOut ? (
                                      <div className="text-amber-700">
                                        <span className="font-semibold">Watch out:</span>{" "}
                                        {summary.watchOut}
                                      </div>
                                    ) : null}
                                    {negotiationEquivalencies ? (
                                      <div className="mt-2 rounded-md border bg-white/70 p-2 text-[11px] text-muted-foreground">
                                        <div className="mb-1 font-semibold text-foreground">
                                          Negotiation Equivalencies
                                        </div>
                                        <div className="flex flex-col gap-0.5">
                                          {negotiationEquivalencies.map((line) => (
                                            <div key={line.key}>{line.label}</div>
                                          ))}
                                        </div>
                                      </div>
                                    ) : null}
                                  </div>
                                </td>
                              </tr>
                            ) : null}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </details>

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
