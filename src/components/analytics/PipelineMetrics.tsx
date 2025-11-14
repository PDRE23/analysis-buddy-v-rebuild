"use client";

/**
 * Pipeline Metrics Component
 * Stage distribution and pipeline visualization
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { Deal } from "@/lib/types/deal";
import { ALL_STAGES } from "@/lib/types/deal";

interface PipelineMetricsProps {
  deals: Deal[];
}

export function PipelineMetrics({ deals }: PipelineMetricsProps) {
  const stageData = React.useMemo(() => {
    const stageCounts: Record<string, number> = {};
    const stageValues: Record<string, number> = {};

    deals.forEach(deal => {
      const stage = deal.stage;
      stageCounts[stage] = (stageCounts[stage] || 0) + 1;
      stageValues[stage] = (stageValues[stage] || 0) + (deal.estimatedValue || 0);
    });

    return ALL_STAGES.map(stage => ({
      stage: stage.replace(/([A-Z])/g, " $1").trim(),
      count: stageCounts[stage] || 0,
      value: (stageValues[stage] || 0) / 1000000, // Convert to millions
    }));
  }, [deals]);

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(1)}M`;
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Pipeline by Stage</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={stageData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
            <XAxis
              dataKey="stage"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={100}
            />
            <YAxis
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              tickFormatter={(value) => value.toString()}
            />
            <Tooltip
              formatter={(value: number, name: string) => {
                if (name === "value") {
                  return formatCurrency(value);
                }
                return value;
              }}
            />
            <Legend />
            <Bar dataKey="count" fill="#2563eb" name="Deal Count" radius={[8, 8, 0, 0]} />
            <Bar dataKey="value" fill="#10b981" name="Value (Millions)" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

