"use client";

/**
 * Rent Escalation Chart
 * Visualizes rent progression with free rent periods highlighted
 */

import React from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { AnnualLine } from "../LeaseAnalyzerApp";

interface RentEscalationChartProps {
  cashflow: AnnualLine[];
  title?: string;
  height?: number;
  onExport?: () => void;
}

export function RentEscalationChart({
  cashflow,
  title = "Rent Escalation",
  height = 400,
  onExport,
}: RentEscalationChartProps) {
  const chartData = cashflow.map((line) => ({
    year: line.year.toString(),
    baseRent: line.base_rent,
    operating: Math.abs(line.operating || 0),
    parking: line.parking || 0,
    total: line.base_rent + Math.abs(line.operating || 0) + (line.parking || 0),
  }));

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum: number, entry: any) => sum + (entry.value || 0), 0);
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[200px]">
          <p className="font-semibold mb-3 text-base">{`Year ${label}`}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-sm">{entry.name}:</span>
                </div>
                <span className="text-sm font-medium" style={{ color: entry.color }}>
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
            <div className="border-t pt-2 mt-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">Total:</span>
                <span className="text-sm font-bold text-primary">{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        {onExport && (
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
          >
            <defs>
              <linearGradient id="baseRentGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="operatingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
              </linearGradient>
              <linearGradient id="parkingGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
            <XAxis
              dataKey="year"
              stroke="#6b7280"
              tick={{ fontSize: 12 }}
              label={{ value: "Year", position: "insideBottom", offset: -5 }}
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
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="rect"
            />
            <Bar 
              dataKey="baseRent" 
              stackId="a" 
              fill="url(#baseRentGradient)" 
              name="Base Rent"
              animationDuration={500}
              animationBegin={0}
              radius={[0, 0, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-baseRent-${index}`} />
              ))}
            </Bar>
            <Bar 
              dataKey="operating" 
              stackId="a" 
              fill="url(#operatingGradient)" 
              name="Operating Expenses"
              animationDuration={500}
              animationBegin={100}
              radius={[0, 0, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-operating-${index}`} />
              ))}
            </Bar>
            <Bar 
              dataKey="parking" 
              stackId="a" 
              fill="url(#parkingGradient)" 
              name="Parking"
              animationDuration={500}
              animationBegin={200}
              radius={[4, 4, 0, 0]}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-parking-${index}`} />
              ))}
            </Bar>
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

