"use client";

/**
 * Market Comparison Component
 * Compare deal against market averages and comps
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from "recharts";
import {
  getAverageMarketMetrics,
  getComparableProperties,
  calculateCompetitivenessScore,
  type ComparableProperty,
} from "@/lib/marketData";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import { TrendingUp, TrendingDown, Target } from "lucide-react";
import { getFreeRentMonths } from "@/lib/utils";

interface MarketComparisonProps {
  analysis: AnalysisMeta;
  market: string;
}

export function MarketComparison({ analysis, market }: MarketComparisonProps) {
  const [selectedComps, setSelectedComps] = useState<string[]>([]);

  const marketMetrics = getAverageMarketMetrics(market, "office");
  const comps = getComparableProperties({
    market,
    minRSF: analysis.rsf * 0.5,
    maxRSF: analysis.rsf * 1.5,
  });

  const firstYearRent = analysis.rent_schedule[0]?.rent_psf || 0;
  const tiAllowance = analysis.concessions?.ti_allowance_psf || 0;
  // Calculate free rent months from concessions
  const freeRentMonths = getFreeRentMonths(analysis.concessions);

  const competitiveness = marketMetrics
    ? calculateCompetitivenessScore(firstYearRent, tiAllowance, freeRentMonths, marketMetrics)
    : null;

  // Prepare scatter plot data
  const scatterData = comps.map(comp => ({
    rsf: comp.rsf / 1000, // In thousands
    rent: comp.rentPSF,
    name: comp.name,
    buildingClass: comp.buildingClass,
  }));

  // Add current deal to scatter plot
  const currentDealPoint = {
    rsf: analysis.rsf / 1000,
    rent: firstYearRent,
    name: analysis.tenant_name,
    buildingClass: "Current Deal" as const,
  };

  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm">RSF: {(data.rsf * 1000).toLocaleString()}</p>
          <p className="text-sm">Rent: {formatCurrency(data.rent)}/SF</p>
          {data.buildingClass && (
            <p className="text-sm">Class: {data.buildingClass}</p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Competitiveness Score */}
      {competitiveness && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Competitiveness Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center mb-6">
              <div className="text-5xl font-bold text-primary mb-2">
                {competitiveness.score}
              </div>
              <div className="text-sm text-muted-foreground">
                {competitiveness.score >= 80 ? "Highly Competitive" :
                 competitiveness.score >= 60 ? "Competitive" :
                 competitiveness.score >= 40 ? "Moderate" :
                 "Less Competitive"}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Rent</div>
                <div className="text-xl font-semibold">{competitiveness.rentScore}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {competitiveness.breakdown.rent.percentDiff > 0 ? (
                    <span className="text-red-500 flex items-center justify-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {competitiveness.breakdown.rent.percentDiff.toFixed(1)}% above
                    </span>
                  ) : (
                    <span className="text-green-500 flex items-center justify-center gap-1">
                      <TrendingDown className="h-3 w-3" />
                      {Math.abs(competitiveness.breakdown.rent.percentDiff).toFixed(1)}% below
                    </span>
                  )}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">TI Allowance</div>
                <div className="text-xl font-semibold">{competitiveness.tiScore}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {competitiveness.breakdown.tiAllowance.percentDiff > 0 ? (
                    <span className="text-green-500">+{competitiveness.breakdown.tiAllowance.percentDiff.toFixed(1)}%</span>
                  ) : (
                    <span className="text-red-500">{competitiveness.breakdown.tiAllowance.percentDiff.toFixed(1)}%</span>
                  )}
                </div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-1">Free Rent</div>
                <div className="text-xl font-semibold">{competitiveness.freeRentScore}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {competitiveness.breakdown.freeRent.percentDiff > 0 ? (
                    <span className="text-green-500">+{competitiveness.breakdown.freeRent.percentDiff.toFixed(1)}%</span>
                  ) : (
                    <span className="text-red-500">{competitiveness.breakdown.freeRent.percentDiff.toFixed(1)}%</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Market Comparison Chart */}
      {marketMetrics && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Market Comparison</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <div className="text-sm text-muted-foreground mb-1">Your Rent</div>
                <div className="text-2xl font-bold">{formatCurrency(firstYearRent)}/SF</div>
                <div className="text-xs text-muted-foreground mt-1">
                  Market Avg: {formatCurrency(marketMetrics.avgRentPSF)}/SF
                </div>
                {competitiveness && (
                  <div className="text-xs mt-1">
                    {competitiveness.breakdown.rent.percentDiff > 0 ? (
                      <span className="text-red-500">
                        {competitiveness.breakdown.rent.percentDiff.toFixed(1)}% above market
                      </span>
                    ) : (
                      <span className="text-green-500">
                        {Math.abs(competitiveness.breakdown.rent.percentDiff).toFixed(1)}% below market
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div>
                <div className="text-sm text-muted-foreground mb-1">Market Metrics</div>
                <div className="space-y-1 text-sm">
                  <div>Vacancy Rate: {marketMetrics.avgVacancyRate.toFixed(1)}%</div>
                  <div>Absorption: {marketMetrics.avgAbsorptionRate.toFixed(1)}%</div>
                  <div>Avg Lease Term: {marketMetrics.avgLeaseTerm} years</div>
                </div>
              </div>
            </div>

            {/* Scatter Plot */}
            {scatterData.length > 0 && (
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    type="number"
                    dataKey="rsf"
                    name="RSF (thousands)"
                    label={{ value: "RSF (thousands)", position: "insideBottom", offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="rent"
                    name="Rent ($/SF)"
                    label={{ value: "Rent ($/SF)", angle: -90, position: "insideLeft" }}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <ReferenceLine
                    y={marketMetrics.avgRentPSF}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    label={{ value: "Market Avg", position: "top" }}
                  />
                  <Scatter
                    name="Comparables"
                    data={scatterData}
                    fill="#64748b"
                    shape="circle"
                  />
                  <Scatter
                    name="Current Deal"
                    data={[currentDealPoint]}
                    fill="#2563eb"
                    shape="star"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      )}

      {/* Comparable Properties */}
      {comps.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Comparable Properties ({comps.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {comps.slice(0, 5).map((comp) => (
                <div
                  key={comp.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-medium">{comp.name}</div>
                      <div className="text-sm text-muted-foreground">{comp.address}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline">{comp.rsf.toLocaleString()} RSF</Badge>
                        <Badge variant="outline">${comp.rentPSF.toFixed(2)}/SF</Badge>
                        <Badge variant="outline">Class {comp.buildingClass}</Badge>
                      </div>
                    </div>
                    <div className="text-right text-sm">
                      <div className="text-muted-foreground">TI: ${comp.tiAllowance.toFixed(2)}/SF</div>
                      <div className="text-muted-foreground">{comp.freeRentMonths} mo free</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

