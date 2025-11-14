"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NERStartingCalculationProps {
  calc: {
    amortizedFreeRent: number;
    amortizedTI: number;
    startingRent: number;
    startingNER: number;
  };
  startingRent: number;
}

export function NERStartingCalculation({ calc, startingRent }: NERStartingCalculationProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Starting NER Calculation</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
            <span className="font-medium">Starting Rent</span>
            <span className="font-semibold">{formatCurrency(calc.startingRent)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="font-medium">Amortized Free Rent</span>
            <span className="font-semibold text-red-700">
              {formatCurrency(calc.amortizedFreeRent)}
            </span>
          </div>
          <div className="flex justify-between items-center p-3 bg-red-50 rounded">
            <span className="font-medium">Amortized TI</span>
            <span className="font-semibold text-red-700">
              {formatCurrency(calc.amortizedTI)}
            </span>
          </div>
          <div className="flex justify-between items-center p-4 bg-blue-50 rounded border-2 border-blue-200">
            <span className="font-bold text-lg">Starting NER</span>
            <span className="font-bold text-lg text-blue-900">
              {formatCurrency(calc.startingNER)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

