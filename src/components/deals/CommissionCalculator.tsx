"use client";

import React, { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { PercentageInput } from "@/components/ui/percentage-input";
import { 
  calculateCommission, 
  formatCommission, 
  formatPercentage,
  DEFAULT_OFFICE_COMMISSION,
  DEFAULT_RETAIL_COMMISSION,
  DEFAULT_INDUSTRIAL_COMMISSION,
  type CommissionStructure 
} from "@/lib/commission";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { Calculator, DollarSign } from "lucide-react";

interface CommissionCalculatorProps {
  analysis: AnalysisMeta;
  initialStructure?: CommissionStructure;
  onSave?: (structure: CommissionStructure) => void;
}

export function CommissionCalculator({ 
  analysis, 
  initialStructure, 
  onSave 
}: CommissionCalculatorProps) {
  const [structure, setStructure] = useState<CommissionStructure>(
    initialStructure || DEFAULT_OFFICE_COMMISSION
  );

  const result = useMemo(() => {
    return calculateCommission(analysis, structure);
  }, [analysis, structure]);

  const updateStructure = (updates: Partial<CommissionStructure>) => {
    setStructure(prev => ({ ...prev, ...updates }));
  };

  const loadPreset = (preset: 'office' | 'retail' | 'industrial') => {
    switch (preset) {
      case 'office':
        setStructure(DEFAULT_OFFICE_COMMISSION);
        break;
      case 'retail':
        setStructure(DEFAULT_RETAIL_COMMISSION);
        break;
      case 'industrial':
        setStructure(DEFAULT_INDUSTRIAL_COMMISSION);
        break;
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Commission Calculator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Commission Totals Summary */}
        <div className="bg-muted/50 rounded-lg p-4 border">
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-semibold">Total Commission</Label>
            <div className="text-2xl font-bold text-green-600">
              {formatCommission(result.total)}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mt-2">
            <div>Gross Commission:</div>
            <div className="text-right">{formatCommission(result.breakdown.totalCommission)}</div>
            {structure.splitPercentage > 0 && (
              <>
                <div>Split ({formatPercentage(structure.splitPercentage)}):</div>
                <div className="text-right text-destructive">
                  -{formatCommission(result.breakdown.splitAmount)}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Presets */}
        <div>
          <Label>Quick Presets</Label>
          <div className="flex gap-2 mt-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadPreset('office')}
            >
              Office
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadPreset('retail')}
            >
              Retail
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => loadPreset('industrial')}
            >
              Industrial
            </Button>
          </div>
        </div>

        {/* Commission Rates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PercentageInput
            label="Year 1 Brokerage %"
            value={structure.yearOneBrokerage}
            onChange={(value) => updateStructure({ yearOneBrokerage: value || 0 })}
            placeholder="6.0"
            hint="Percentage of year 1 base rent"
          />
          <PercentageInput
            label="Subsequent Years %"
            value={structure.subsequentYears}
            onChange={(value) => updateStructure({ subsequentYears: value || 0 })}
            placeholder="3.0"
            hint="Percentage of years 2+"
          />
          <PercentageInput
            label="Renewal %"
            value={structure.renewalCommission}
            onChange={(value) => updateStructure({ renewalCommission: value || 0 })}
            placeholder="3.0"
            hint="Renewal commission rate"
          />
          <PercentageInput
            label="Expansion %"
            value={structure.expansionCommission}
            onChange={(value) => updateStructure({ expansionCommission: value || 0 })}
            placeholder="6.0"
            hint="Expansion space rate"
          />
        </div>

        {/* Split & Payment */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <PercentageInput
            label="Co-Broker Split %"
            value={structure.splitPercentage}
            onChange={(value) => updateStructure({ splitPercentage: value || 0 })}
            placeholder="0"
            hint="Percentage split with co-broker"
          />
          <PercentageInput
            label="TI Override %"
            value={structure.tiOverride}
            onChange={(value) => updateStructure({ tiOverride: value })}
            placeholder="0"
            hint="Additional % of TI allowance"
          />
        </div>

        {/* Accelerated Payment Toggle */}
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="accelerated"
            checked={structure.acceleratedPayment}
            onChange={(e) => updateStructure({ acceleratedPayment: e.target.checked })}
            className="rounded"
          />
          <Label htmlFor="accelerated" className="cursor-pointer">
            Accelerated Payment (5% discount for upfront payment)
          </Label>
        </div>

        {/* Results */}
        <div className="border-t pt-4 space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold">Commission Breakdown</h3>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-muted-foreground">Year 1 Commission:</div>
            <div className="text-right font-medium">
              {formatCommission(result.breakdown.year1Commission)}
            </div>
            
            <div className="text-muted-foreground">Subsequent Years:</div>
            <div className="text-right font-medium">
              {formatCommission(result.breakdown.subsequentYearsCommission)}
            </div>
            
            {result.breakdown.tiCommission > 0 && (
              <>
                <div className="text-muted-foreground">TI Commission:</div>
                <div className="text-right font-medium">
                  {formatCommission(result.breakdown.tiCommission)}
                </div>
              </>
            )}
            
            <div className="text-muted-foreground font-medium border-t pt-2">
              Gross Commission:
            </div>
            <div className="text-right font-semibold border-t pt-2">
              {formatCommission(result.breakdown.totalCommission)}
            </div>
            
            {structure.splitPercentage > 0 && (
              <>
                <div className="text-muted-foreground">
                  Split ({formatPercentage(structure.splitPercentage)}):
                </div>
                <div className="text-right text-destructive">
                  -{formatCommission(result.breakdown.splitAmount)}
                </div>
              </>
            )}
            
            {structure.acceleratedPayment && result.breakdown.acceleratedTotal && (
              <>
                <div className="text-muted-foreground">Accelerated Total:</div>
                <div className="text-right font-medium">
                  {formatCommission(result.breakdown.acceleratedTotal)}
                </div>
              </>
            )}
            
            <div className="text-muted-foreground font-bold text-base border-t-2 pt-2">
              Net Commission:
            </div>
            <div className="text-right font-bold text-lg text-green-600 border-t-2 pt-2">
              {formatCommission(result.total)}
            </div>
          </div>
        </div>

        {/* Save Button */}
        {onSave && (
          <div className="flex justify-end pt-2">
            <Button onClick={() => onSave(structure)} className="rounded-2xl">
              Save Commission Structure
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

