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
