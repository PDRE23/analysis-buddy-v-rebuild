/**
 * Scenario Comparison Table Component
 * 
 * Displays a comparison of multiple what-if scenarios using the scenario engine.
 * Shows key metrics (NPV, Effective Rent PSF) for each scenario.
 */

"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisMeta } from "@/types";
import type { ScenarioOverrides } from "@/lib/scenario-engine";
import { analyzeScenarios } from "@/lib/scenario-engine";
import { normalizeAnalysis } from "@/lib/analysis/normalize/normalizeAnalysis";

interface ScenarioComparisonTableProps {
  baseMeta: AnalysisMeta;
}

interface ScenarioDefinition {
  name: string;
  overrides: ScenarioOverrides;
}

export function ScenarioComparisonTable({ baseMeta }: ScenarioComparisonTableProps) {
  const [scenarios, setScenarios] = useState<ScenarioDefinition[]>([]);

  const hasRentSchedule = baseMeta.rent_schedule.length > 0;
  const hasCommencement = Boolean(baseMeta.key_dates.commencement);
  const hasLeaseTerm = Boolean(
    baseMeta.lease_term && (baseMeta.lease_term.years > 0 || baseMeta.lease_term.months > 0)
  );
  const hasRsf = baseMeta.rsf > 0;
  const canComputeScenarios = hasRsf && hasCommencement && hasRentSchedule && hasLeaseTerm;

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
    if (!assumptionsSummary) return "";
    const parts = [
      `Discount ${(assumptionsSummary.discountRateAnnual * 100).toFixed(2)}%`,
      assumptionsSummary.amortRateAnnual !== undefined
        ? `Amort ${(assumptionsSummary.amortRateAnnual * 100).toFixed(2)}%`
        : undefined,
      `Billing ${assumptionsSummary.billingTiming}`,
      assumptionsSummary.escalationMode ? "Escalation mode fixed amount" : undefined,
      assumptionsSummary.rounding ? `Rounding ${assumptionsSummary.rounding}` : undefined,
    ].filter(Boolean) as string[];

    return parts.join(", ");
  }, [assumptionsSummary]);

  const { normalized } = useMemo(() => normalizeAnalysis(baseMeta), [baseMeta]);

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
              <dd className="font-medium">{normalized.dates.commencement ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Rent Start</dt>
              <dd className="font-medium">{normalized.dates.rent_start ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">Expiration</dt>
              <dd className="font-medium">{normalized.dates.expiration ?? "—"}</dd>
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
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2 font-semibold">Scenario</th>
                  <th className="text-right p-2 font-semibold">NPV</th>
                  <th className="text-right p-2 font-semibold">Effective Rent PSF</th>
                </tr>
              </thead>
              <tbody>
                {results.map(({ name, result }) => (
                  <tr key={name} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{name}</td>
                    <td className="p-2 text-right">
                      ${result.metrics.npv.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                    <td className="p-2 text-right">
                      ${result.metrics.effectiveRentPSF.toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                      /SF/yr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
