"use client";

/**
 * Side-by-side Proposal Comparison Charts
 * Compare multiple proposals visually
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import type { Proposal } from "../LeaseAnalyzerApp";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import { buildAnnualCashflow, effectiveRentPSF, npv } from "../LeaseAnalyzerApp";

interface ComparisonChartProps {
  proposals: Proposal[];
  analysis: AnalysisMeta;
  title?: string;
  chartType?: "bar" | "radar";
  height?: number;
  onExport?: () => void;
}

export function ComparisonChart({
  proposals,
  analysis,
  title = "Proposal Comparison",
  chartType = "bar",
  height = 400,
  onExport,
}: ComparisonChartProps) {
  const [currentChartType, setCurrentChartType] = React.useState<"bar" | "radar">(chartType);

  // Calculate metrics for each proposal
  const comparisonData = proposals.map((proposal) => {
    const cashflow = buildAnnualCashflow(proposal.meta);
    const years = cashflow.length;
    const effectiveRate = effectiveRentPSF(cashflow, proposal.meta.rsf, years);
    const npvValue = npv(cashflow, proposal.meta.cashflow_settings.discount_rate);
    const totalValue = cashflow.reduce((sum, line) => sum + line.net_cash_flow, 0);

    return {
      label: proposal.label || proposal.side,
      side: proposal.side,
      effectiveRate,
      npv: npvValue,
      totalValue,
      tiAllowance: (proposal.meta.concessions?.ti_allowance_psf || 0) * proposal.meta.rsf,
      freeRentMonths: proposal.meta.rent_schedule[0]?.free_rent_months || 0,
    };
  });

  // Format for bar chart
  const barData = comparisonData.map((item) => ({
    name: item.label,
    "Effective Rate": item.effectiveRate,
    "NPV (thousands)": item.npv / 1000,
    "Total Value (millions)": item.totalValue / 1000000,
  }));

  // Format for radar chart
  const radarData = comparisonData.map((item) => {
    // Normalize values to 0-100 scale for radar chart
    const maxEffectiveRate = Math.max(...comparisonData.map((d) => d.effectiveRate));
    const maxNPV = Math.max(...comparisonData.map((d) => d.npv));
    const maxTotalValue = Math.max(...comparisonData.map((d) => d.totalValue));

    return {
      label: item.label,
      EffectiveRate: (item.effectiveRate / maxEffectiveRate) * 100,
      NPV: (item.npv / maxNPV) * 100,
      TotalValue: (item.totalValue / maxTotalValue) * 100,
      TIAllowance: Math.min((item.tiAllowance / 100000) * 100, 100), // Cap at 100k for scale
      FreeRent: (item.freeRentMonths / 12) * 100, // Cap at 12 months for scale
    };
  });

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
        <div className="bg-white border border-gray-200 rounded-lg shadow-xl p-4 min-w-[220px]">
          <p className="font-semibold mb-3 text-base">{label}</p>
          <div className="space-y-2">
            {payload.map((entry: any, index: number) => {
              let formattedValue = "";
              if (entry.name.includes("Rate")) {
                formattedValue = `$${entry.value.toFixed(2)}/SF/yr`;
              } else if (entry.name.includes("thousands")) {
                formattedValue = `$${(entry.value * 1000).toLocaleString()}`;
              } else if (entry.name.includes("millions")) {
                formattedValue = `$${(entry.value * 1000000).toLocaleString()}`;
              } else {
                formattedValue = entry.value.toFixed(2);
              }
              
              return (
                <div key={index} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded"
                      style={{ backgroundColor: entry.color }}
                    />
                    <span className="text-sm">{entry.name}:</span>
                  </div>
                  <span className="text-sm font-medium" style={{ color: entry.color }}>
                    {formattedValue}
                  </span>
                </div>
              );
            })}
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
        <div className="flex items-center gap-2">
          <Button
            variant={currentChartType === "bar" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentChartType("bar")}
            className="text-xs"
          >
            Bar
          </Button>
          <Button
            variant={currentChartType === "radar" ? "default" : "outline"}
            size="sm"
            onClick={() => setCurrentChartType("radar")}
            className="text-xs"
          >
            Radar
          </Button>
          {onExport && (
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {currentChartType === "bar" ? (
            <BarChart
              data={barData}
              margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            >
              <defs>
                <linearGradient id="effectiveRateGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="npvGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.6} />
                </linearGradient>
                <linearGradient id="totalValueGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.9} />
                  <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.6} />
                </linearGradient>
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
                dataKey="Effective Rate" 
                fill="url(#effectiveRateGradient)" 
                radius={[8, 8, 0, 0]}
                animationDuration={500}
                animationBegin={0}
              />
              <Bar 
                dataKey="NPV (thousands)" 
                fill="url(#npvGradient)" 
                radius={[8, 8, 0, 0]}
                animationDuration={500}
                animationBegin={100}
              />
              <Bar 
                dataKey="Total Value (millions)" 
                fill="url(#totalValueGradient)" 
                radius={[8, 8, 0, 0]}
                animationDuration={500}
                animationBegin={200}
              />
            </BarChart>
          ) : (
            <RadarChart data={radarData[0]} width={500} height={400}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis
                dataKey="label"
                tick={{ fontSize: 12 }}
                stroke="#6b7280"
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} stroke="#6b7280" />
              {radarData.map((data, index) => {
                const colors = ["#2563eb", "#10b981", "#f59e0b", "#ef4444"];
                return (
                  <Radar
                    key={index}
                    name={data.label}
                    dataKey="EffectiveRate"
                    stroke={colors[index % colors.length]}
                    fill={colors[index % colors.length]}
                    fillOpacity={0.3}
                    strokeWidth={2}
                    animationDuration={500}
                    animationBegin={index * 100}
                  />
                );
              })}
              <Tooltip 
                content={<CustomTooltip />}
                animationDuration={200}
              />
              <Legend 
                wrapperStyle={{ paddingTop: "20px" }}
              />
            </RadarChart>
          )}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

