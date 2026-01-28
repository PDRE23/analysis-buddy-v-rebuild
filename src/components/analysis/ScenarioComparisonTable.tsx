/**
 * Scenario Comparison Table Component
 * 
 * Displays a comparison of multiple what-if scenarios using the scenario engine.
 * Shows key metrics (NPV, Effective Rent PSF) for each scenario.
 */

"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AnalysisMeta } from "@/types";
import type { ScenarioOverrides } from "@/lib/scenario-engine";
import { analyzeScenarios } from "@/lib/scenario-engine";

interface ScenarioComparisonTableProps {
  baseMeta: AnalysisMeta;
}

export function ScenarioComparisonTable({ baseMeta }: ScenarioComparisonTableProps) {
  // Define 3 preset scenarios
  const scenarios = useMemo(() => {
    const scenarioList: { name: string; overrides: ScenarioOverrides }[] = [
      {
        name: "Base",
        overrides: {},
      },
      {
        name: "Rent +$2",
        overrides: {
          rent_schedule: baseMeta.rent_schedule.map((period, index) => {
            if (index === 0) {
              // Increase first period rent_psf by 2
              return {
                ...period,
                rent_psf: period.rent_psf + 2,
              };
            }
            return period;
          }),
        },
      },
      {
        name: "More TI (+$10)",
        overrides: {
          concessions: {
            ...baseMeta.concessions,
            ti_allowance_psf: (baseMeta.concessions.ti_allowance_psf || 0) + 10,
          },
        },
      },
    ];

    return scenarioList;
  }, [baseMeta]);

  // Analyze all scenarios
  const scenarioResults = useMemo(() => {
    return analyzeScenarios(baseMeta, scenarios);
  }, [baseMeta, scenarios]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Scenario Comparison</CardTitle>
      </CardHeader>
      <CardContent>
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
              {scenarioResults.map((scenario, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-2 font-medium">{scenario.name}</td>
                  <td className="p-2 text-right">
                    ${scenario.result.metrics.npv.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </td>
                  <td className="p-2 text-right">
                    ${scenario.result.metrics.effectiveRentPSF.toLocaleString(undefined, {
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
      </CardContent>
    </Card>
  );
}
