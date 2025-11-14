"use client";

/**
 * Concessions Value Chart
 * Pie chart or waterfall chart showing TI vs. moving vs. free rent
 */

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import type { PieLabelRenderProps } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import type { AnnualLine } from "../LeaseAnalyzerApp";

interface ConcessionsChartProps {
  analysis: AnalysisMeta;
  cashflow: AnnualLine[];
  title?: string;
  chartType?: "pie" | "waterfall" | "bar";
  height?: number;
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function ConcessionsChart({
  analysis,
  cashflow,
  title = "Concessions Breakdown",
  chartType = "pie",
  height = 400,
}: ConcessionsChartProps) {
  const [currentChartType, setCurrentChartType] = React.useState<"pie" | "waterfall" | "bar">(chartType);

  // Calculate concession values
  const tiAllowance = (analysis.concessions?.ti_allowance_psf || 0) * analysis.rsf;
  const movingAllowance = analysis.concessions?.moving_allowance || 0;
  const otherCredits = analysis.concessions?.other_credits || 0;
  
  // Calculate free rent value (first year base rent * free rent months / 12)
  const firstYearBaseRent = cashflow[0]?.base_rent || 0;
  const freeRentMonths = analysis.rent_schedule[0]?.free_rent_months || 0;
  const freeRentValue = (firstYearBaseRent * freeRentMonths) / 12;

  const pieData = [
    { name: "TI Allowance", value: tiAllowance },
    { name: "Moving Allowance", value: movingAllowance },
    { name: "Free Rent Value", value: freeRentValue },
    { name: "Other Credits", value: otherCredits },
  ].filter((item) => item.value > 0);

  const barData = pieData.map((item) => ({
    name: item.name,
    value: item.value,
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const percentage = ((payload[0].value / totalConcessions) * 100).toFixed(1);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[180px]">
          <p className="font-semibold mb-2 text-base">{payload[0].name}</p>
          <p className="text-lg font-bold text-primary mb-1">
            {formatCurrency(payload[0].value)}
          </p>
          <p className="text-sm text-muted-foreground">
            {percentage}% of total
          </p>
        </div>
      );
    }
    return null;
  };

  const renderPieLabel = ({ name, percent }: PieLabelRenderProps) =>
    `${String(name ?? "Value")}: ${(Number(percent ?? 0) * 100).toFixed(0)}%`;

  const totalConcessions = pieData.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={currentChartType === "pie" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentChartType("pie")}
            className="text-xs"
          >
            Pie
          </Button>
          <Button
            variant={currentChartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentChartType("bar")}
            className="text-xs"
          >
            Bar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mb-4 text-center">
          <div className="text-2xl font-bold text-primary">
            {formatCurrency(totalConcessions)}
          </div>
          <div className="text-sm text-muted-foreground">Total Concessions</div>
        </div>
        
        <ResponsiveContainer width="100%" height={height}>
          {currentChartType === "pie" ? (
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderPieLabel}
                outerRadius={120}
                fill="#8884d8"
                dataKey="value"
                animationDuration={500}
                animationBegin={0}
              >
                {pieData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]}
                    stroke="#fff"
                    strokeWidth={2}
                  />
                ))}
              </Pie>
              <Tooltip 
                content={<CustomTooltip />}
                animationDuration={200}
              />
            </PieChart>
          ) : (
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                {barData.map((entry, index) => (
                  <linearGradient key={`gradient-${index}`} id={`barGradient-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.9} />
                  <stop offset="95%" stopColor={COLORS[index % COLORS.length]} stopOpacity={0.6} />
                </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
              <XAxis
                dataKey="name"
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                stroke="#6b7280"
                tick={{ fontSize: 12 }}
                tickFormatter={formatCurrency}
                label={{ value: "Amount ($)", angle: -90, position: "insideLeft" }}
              />
              <Tooltip 
                content={<CustomTooltip />}
                animationDuration={200}
                cursor={{ fill: "rgba(37, 99, 235, 0.1)" }}
              />
              <Bar 
                dataKey="value" 
                radius={[8, 8, 0, 0]}
                animationDuration={500}
                animationBegin={0}
              >
                {barData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={`url(#barGradient-${index})`}
                  />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

