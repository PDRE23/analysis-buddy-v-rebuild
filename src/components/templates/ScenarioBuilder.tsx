"use client";

/**
 * Scenario Builder Component
 * What-if analysis tool for creating scenarios
 */

import React, { useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Save, Plus, X, TrendingUp, TrendingDown } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";

import {
  saveScenario,
  getScenariosForAnalysis,
  applyScenarioModifications,
  type Scenario,
} from "@/lib/templates";

import type { AnalysisMeta } from "@/types";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";
import { effectiveRentPSF } from "@/lib/calculations/metrics-engine";
import { npv } from "@/lib/calculations/metrics-engine";

interface ScenarioBuilderProps {
  baseAnalysis: AnalysisMeta;
  onScenarioChange?: (scenario: AnalysisMeta) => void;
  onSave?: (scenario: Scenario) => void;
}

export function ScenarioBuilder({
  baseAnalysis,
  onScenarioChange,
  onSave,
}: ScenarioBuilderProps) {
  const [scenarioName, setScenarioName] = useState("");
  const [modifications, setModifications] = useState<Partial<AnalysisMeta>>({});
  const [savedScenarios, setSavedScenarios] = useState<Scenario[]>(() =>
    getScenariosForAnalysis(baseAnalysis.id)
  );

  // Calculate modified analysis
  const modifiedAnalysis = React.useMemo(() => {
    return applyScenarioModifications(baseAnalysis, modifications);
  }, [baseAnalysis, modifications]);

  // Calculate metrics for both base and modified
  const baseCashflow = React.useMemo(() => buildAnnualCashflow(baseAnalysis), [baseAnalysis]);
  const modifiedCashflow = React.useMemo(() => buildAnnualCashflow(modifiedAnalysis), [modifiedAnalysis]);

  const baseMetrics = {
    effectiveRate: effectiveRentPSF(baseCashflow, baseAnalysis.rsf, baseCashflow.length),
    npv: npv(baseCashflow, baseAnalysis.cashflow_settings.discount_rate),
    totalValue: baseCashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
  };

  const modifiedMetrics = {
    effectiveRate: effectiveRentPSF(modifiedCashflow, modifiedAnalysis.rsf, modifiedCashflow.length),
    npv: npv(modifiedCashflow, modifiedAnalysis.cashflow_settings.discount_rate),
    totalValue: modifiedCashflow.reduce((sum, line) => sum + line.net_cash_flow, 0),
  };

  const handleModification = (field: keyof AnalysisMeta, value: unknown) => {
    setModifications(prev => ({
      ...prev,
      [field]: value,
    }));

    // Notify parent of change
    if (onScenarioChange) {
      const updated = applyScenarioModifications(baseAnalysis, {
        ...modifications,
        [field]: value,
      });
      onScenarioChange(updated);
    }
  };

  const handleSave = () => {
    if (!scenarioName.trim()) {
      alert("Please enter a scenario name");
      return;
    }

    const scenario: Scenario = {
      id: "",
      name: scenarioName,
      baseAnalysisId: baseAnalysis.id,
      modifications,
      createdAt: new Date().toISOString(),
      saved: true,
    };

    const id = saveScenario(scenario);
    const savedScenario = { ...scenario, id };
    
    setSavedScenarios([...savedScenarios, savedScenario]);
    setScenarioName("");
    setModifications({});

    if (onSave) {
      onSave(savedScenario);
    }
  };

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
      {/* Quick Modifications */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>What-If Analysis</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>RSF</Label>
              <Input
                type="number"
                value={modifications.rsf || baseAnalysis.rsf}
                onChange={(e) => handleModification("rsf", Number(e.target.value))}
                placeholder={baseAnalysis.rsf.toString()}
              />
            </div>
            <div>
              <Label>Base Rent ($/SF/yr)</Label>
              <CurrencyInput
                value={modifications.rent_schedule?.[0]?.rent_psf || baseAnalysis.rent_schedule[0]?.rent_psf || 0}
                onChange={(value) => {
                  const newSchedule = [...(baseAnalysis.rent_schedule || [])];
                  if (newSchedule.length > 0) {
                    newSchedule[0] = { ...newSchedule[0], rent_psf: value || 0 };
                  }
                  handleModification("rent_schedule", newSchedule);
                }}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Free Rent (Months)</Label>
              <Input
                type="number"
                value={modifications.rent_schedule?.[0]?.free_rent_months || baseAnalysis.rent_schedule[0]?.free_rent_months || 0}
                onChange={(e) => {
                  const newSchedule = [...(baseAnalysis.rent_schedule || [])];
                  if (newSchedule.length > 0) {
                    newSchedule[0] = { ...newSchedule[0], free_rent_months: Number(e.target.value) };
                  }
                  handleModification("rent_schedule", newSchedule);
                }}
                placeholder="0"
              />
            </div>
            <div>
              <Label>TI Allowance ($/SF)</Label>
              <CurrencyInput
                value={modifications.concessions?.ti_allowance_psf || baseAnalysis.concessions?.ti_allowance_psf || 0}
                onChange={(value) => handleModification("concessions", {
                  ...baseAnalysis.concessions,
                  ti_allowance_psf: value || 0,
                })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label>Discount Rate</Label>
              <PercentageInput
                value={(modifications.cashflow_settings?.discount_rate || baseAnalysis.cashflow_settings.discount_rate) * 100}
                onChange={(value) => handleModification("cashflow_settings", {
                  ...baseAnalysis.cashflow_settings,
                  discount_rate: (value || 0) / 100,
                })}
                placeholder="8.0"
              />
            </div>
          </div>

          {/* Save Scenario */}
          <div className="flex items-end gap-2 pt-4 border-t">
            <div className="flex-1">
              <Label htmlFor="scenarioName">Scenario Name</Label>
              <Input
                id="scenarioName"
                value={scenarioName}
                onChange={(e) => setScenarioName(e.target.value)}
                placeholder="e.g., Lower Rent Scenario"
              />
            </div>
            <Button onClick={handleSave} disabled={!scenarioName.trim()} className="rounded-2xl">
              <Save className="mr-2 h-4 w-4" />
              Save Scenario
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Comparison Metrics */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Effective Rate</div>
              <div className="text-2xl font-bold">
                ${modifiedMetrics.effectiveRate.toFixed(2)}/SF/yr
              </div>
              <div className="text-xs mt-2 flex items-center justify-center gap-1">
                {modifiedMetrics.effectiveRate > baseMetrics.effectiveRate ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={modifiedMetrics.effectiveRate > baseMetrics.effectiveRate ? "text-green-500" : "text-red-500"}>
                  {((modifiedMetrics.effectiveRate - baseMetrics.effectiveRate) / baseMetrics.effectiveRate * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">NPV</div>
              <div className="text-2xl font-bold">
                {formatCurrency(modifiedMetrics.npv)}
              </div>
              <div className="text-xs mt-2 flex items-center justify-center gap-1">
                {modifiedMetrics.npv > baseMetrics.npv ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={modifiedMetrics.npv > baseMetrics.npv ? "text-green-500" : "text-red-500"}>
                  {formatCurrency(modifiedMetrics.npv - baseMetrics.npv)}
                </span>
              </div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Total Value</div>
              <div className="text-2xl font-bold">
                {formatCurrency(modifiedMetrics.totalValue)}
              </div>
              <div className="text-xs mt-2 flex items-center justify-center gap-1">
                {modifiedMetrics.totalValue > baseMetrics.totalValue ? (
                  <TrendingUp className="h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-red-500" />
                )}
                <span className={modifiedMetrics.totalValue > baseMetrics.totalValue ? "text-green-500" : "text-red-500"}>
                  {formatCurrency(modifiedMetrics.totalValue - baseMetrics.totalValue)}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Saved Scenarios */}
      {savedScenarios.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Saved Scenarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedScenarios.map((scenario) => (
                <div
                  key={scenario.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <div className="font-medium">{scenario.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(scenario.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setModifications(scenario.modifications);
                      if (onScenarioChange) {
                        onScenarioChange(applyScenarioModifications(baseAnalysis, scenario.modifications));
                      }
                    }}
                  >
                    Load
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

