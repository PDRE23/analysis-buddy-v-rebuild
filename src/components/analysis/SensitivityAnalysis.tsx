"use client";

/**
 * Sensitivity Analysis Component
 * Tornado charts and what-if analysis
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import {
  performSensitivityAnalysis,
  type SensitivityAnalysis as SensitivityAnalysisType,
} from "@/lib/financialModeling";
import type { AnnualLine, AnalysisMeta } from "@/types";
import { npv } from "@/lib/calculations/metrics-engine";

interface SensitivityAnalysisProps {
  analysis: AnalysisMeta;
  cashflow: AnnualLine[];
}

export function SensitivityAnalysisComponent({ analysis, cashflow }: SensitivityAnalysisProps) {
  const [selectedVariable, setSelectedVariable] = useState<string | null>(null);

  const baseNPV = npv(cashflow, analysis.cashflow_settings.discount_rate);
  const firstYearRent = analysis.rent_schedule[0]?.rent_psf || 0;

  // Define variables for sensitivity analysis
  const variables = [
    {
      name: "Rent Rate",
      baseValue: firstYearRent,
      modifyCashflow: (cf: AnnualLine[], value: number) => {
        return cf.map(line => ({
          ...line,
          base_rent: (value / firstYearRent) * line.base_rent,
          subtotal: line.subtotal + ((value / firstYearRent - 1) * line.base_rent),
          net_cash_flow: line.net_cash_flow + ((value / firstYearRent - 1) * line.base_rent),
        }));
      },
    },
    {
      name: "RSF",
      baseValue: analysis.rsf,
      modifyCashflow: (cf: AnnualLine[], value: number) => {
        const multiplier = value / analysis.rsf;
        return cf.map(line => ({
          ...line,
          base_rent: line.base_rent * multiplier,
          subtotal: line.subtotal * multiplier,
          net_cash_flow: line.net_cash_flow * multiplier,
        }));
      },
    },
    {
      name: "Discount Rate",
      baseValue: analysis.cashflow_settings.discount_rate,
      modifyCashflow: (cf: AnnualLine[], value: number) => {
        // This doesn't modify cashflow, but we'll recalculate NPV with different rate
        return cf;
      },
    },
  ];

  const sensitivityResults = React.useMemo(() => {
    return performSensitivityAnalysis(
      cashflow,
      baseNPV,
      variables.filter(v => v.name !== "Discount Rate"), // Skip discount rate for now
      analysis.cashflow_settings.discount_rate
    );
  }, [cashflow, baseNPV, analysis.cashflow_settings.discount_rate]);

  // Prepare tornado chart data
  const tornadoData = sensitivityResults.map(result => {
    const scenarios = result.scenarios;
    const minNPV = Math.min(...scenarios.map(s => s.npv));
    const maxNPV = Math.max(...scenarios.map(s => s.npv));
    const range = maxNPV - minNPV;

    return {
      variable: result.variable,
      min: minNPV - baseNPV,
      max: maxNPV - baseNPV,
      range: range,
      impact: Math.abs(maxNPV - baseNPV) > Math.abs(minNPV - baseNPV)
        ? maxNPV - baseNPV
        : minNPV - baseNPV,
    };
  }).sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <div className="space-y-6">
      {/* Tornado Chart */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Sensitivity Analysis - Tornado Chart</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart
              data={tornadoData}
              layout="vertical"
              margin={{ top: 20, right: 30, left: 100, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis
                type="number"
                tickFormatter={formatCurrency}
                label={{ value: "NPV Impact ($)", position: "insideBottom", offset: -5 }}
              />
              <YAxis
                type="category"
                dataKey="variable"
                width={80}
              />
              <Tooltip
                formatter={(value: number) => formatCurrency(value)}
              />
              <Legend />
              <Bar dataKey="min" fill="#ef4444" name="Min Impact" />
              <Bar dataKey="max" fill="#10b981" name="Max Impact" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {sensitivityResults.map((result) => (
          <Card key={result.variable} className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg">{result.variable}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {result.scenarios.map((scenario, index) => (
                  <div
                    key={index}
                    className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-medium">{scenario.label}</div>
                      <div className={`font-semibold ${
                        scenario.percentChange > 0 ? "text-green-600" :
                        scenario.percentChange < 0 ? "text-red-600" :
                        "text-gray-600"
                      }`}>
                        {formatCurrency(scenario.npv)}
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Value: {typeof scenario.value === "number" && scenario.value > 100
                        ? formatCurrency(scenario.value)
                        : scenario.value.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {scenario.percentChange > 0 ? "+" : ""}{scenario.percentChange.toFixed(1)}% vs base
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

