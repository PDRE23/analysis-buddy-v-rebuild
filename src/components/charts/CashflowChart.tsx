"use client";

/**
 * Enhanced Cashflow Timeline Chart
 * Interactive line/area chart with hover details, zoom, and comparison
 */

import React, { useState } from "react";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Zoom,
  Pan,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import type { AnnualLine } from "../LeaseAnalyzerApp";

interface CashflowChartProps {
  cashflow: AnnualLine[];
  title?: string;
  compareWith?: AnnualLine[];
  compareLabel?: string;
  height?: number;
  onExport?: () => void;
}

export function CashflowChart({
  cashflow,
  title = "Annual Cashflow Timeline",
  compareWith,
  compareLabel = "Comparison",
  height = 400,
  onExport,
}: CashflowChartProps) {
  const [isZoomed, setIsZoomed] = useState(false);
  const [showArea, setShowArea] = useState(true);

  // Format data for Recharts
  const chartData = cashflow.map((line) => ({
    year: line.year.toString(),
    netCashFlow: line.net_cash_flow,
    subtotal: line.subtotal,
    baseRent: line.base_rent,
    operating: line.operating || 0,
    parking: line.parking || 0,
    concessions: line.concessions || 0,
  }));

  const compareData = compareWith?.map((line) => ({
    year: line.year.toString(),
    netCashFlow: line.net_cash_flow,
    subtotal: line.subtotal,
  }));

  // Merge comparison data if provided
  const mergedData = compareData
    ? chartData.map((item, index) => ({
        ...item,
        compareNetCashFlow: compareData[index]?.netCashFlow,
        compareSubtotal: compareData[index]?.subtotal,
      }))
    : chartData;

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
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4">
          <p className="font-semibold mb-2">{`Year ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const ChartComponent = showArea ? AreaChart : LineChart;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>{title}</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowArea(!showArea)}
            className="text-xs"
          >
            {showArea ? "Line" : "Area"}
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport} className="text-xs">
              <Download className="h-3 w-3 mr-1" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          <ChartComponent
            data={mergedData}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="cashflowGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
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
              label={{ value: "Net Cash Flow ($)", angle: -90, position: "insideLeft" }}
            />
            <Tooltip 
              content={<CustomTooltip />}
              animationDuration={200}
              cursor={{ stroke: "#2563eb", strokeWidth: 2 }}
            />
            <Legend 
              wrapperStyle={{ paddingTop: "20px" }}
              iconType="line"
            />
            <ReferenceLine y={0} stroke="#9ca3af" strokeDasharray="3 3" />
            <Zoom />
            <Pan />
            
            {showArea ? (
              <>
                <Area
                  type="monotone"
                  dataKey="netCashFlow"
                  stroke="#2563eb"
                  strokeWidth={2}
                  fill="url(#cashflowGradient)"
                  name="Net Cash Flow"
                  animationDuration={500}
                  animationBegin={0}
                />
                {compareWith && (
                  <Area
                    type="monotone"
                    dataKey="compareNetCashFlow"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="#10b981"
                    fillOpacity={0.15}
                    name={`${compareLabel} - Net Cash Flow`}
                    strokeDasharray="5 5"
                    animationDuration={500}
                    animationBegin={100}
                  />
                )}
              </>
            ) : (
              <>
                <Line
                  type="monotone"
                  dataKey="netCashFlow"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "#2563eb", strokeWidth: 2 }}
                  activeDot={{ r: 8, fill: "#2563eb", stroke: "#fff", strokeWidth: 2 }}
                  name="Net Cash Flow"
                  animationDuration={500}
                  animationBegin={0}
                />
                {compareWith && (
                  <Line
                    type="monotone"
                    dataKey="compareNetCashFlow"
                    stroke="#10b981"
                    strokeWidth={3}
                    strokeDasharray="5 5"
                    dot={{ r: 4, fill: "#10b981", strokeWidth: 2 }}
                    activeDot={{ r: 8, fill: "#10b981", stroke: "#fff", strokeWidth: 2 }}
                    name={`${compareLabel} - Net Cash Flow`}
                    animationDuration={500}
                    animationBegin={100}
                  />
                )}
              </>
            )}
            
            <Brush dataKey="year" height={30} stroke="#9ca3af" />
          </ChartComponent>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

