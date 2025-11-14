"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface NERSummaryProps {
  summary: {
    ner: number;
    nerWithInterest: number;
    startingNER: number;
  };
}

export function NERSummary({ summary }: NERSummaryProps) {
  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>NER Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">NER</div>
            <div className="text-2xl font-bold text-blue-900">
              {formatCurrency(summary.ner)}
            </div>
            <div className="text-xs text-gray-500 mt-1">per RSF/year</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">NER (with interest)</div>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(summary.nerWithInterest)}
            </div>
            <div className="text-xs text-gray-500 mt-1">per RSF/year</div>
          </div>
          <div className="p-4 bg-red-50 rounded-lg">
            <div className="text-sm text-gray-600 mb-1">Starting NER</div>
            <div className="text-2xl font-bold text-red-900">
              {formatCurrency(summary.startingNER)}
            </div>
            <div className="text-xs text-gray-500 mt-1">per RSF/year</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

