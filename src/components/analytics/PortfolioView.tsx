"use client";

/**
 * Portfolio View Component
 * Aggregate view of all deals with portfolio metrics
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  calculatePortfolioMetrics,
  calculatePortfolioTrends,
  analyzeDiversification,
  type PortfolioMetrics,
  type DiversificationAnalysis,
} from "@/lib/portfolioAnalysis";
import type { Deal } from "@/lib/types/deal";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

interface PortfolioViewProps {
  deals: Deal[];
}

export function PortfolioView({ deals }: PortfolioViewProps) {
  const metrics = React.useMemo(() => calculatePortfolioMetrics(deals), [deals]);
  const trends = React.useMemo(() => calculatePortfolioTrends(deals, 12), [deals]);
  const diversification = React.useMemo(() => analyzeDiversification(metrics), [metrics]);

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
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.totalPipelineValue)}</div>
            <p className="text-xs text-muted-foreground mt-1">{metrics.activeDeals} active deals</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Average Deal Size</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(metrics.averageDealSize)}</div>
            <p className="text-xs text-muted-foreground mt-1">Median: {formatCurrency(metrics.medianDealSize)}</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total RSF</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.totalRSF.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Avg: {Math.round(metrics.averageRSF).toLocaleString()}/deal</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Markets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Object.keys(metrics.marketDistribution).length}</div>
            <p className="text-xs text-muted-foreground mt-1">Active markets</p>
          </CardContent>
        </Card>
      </div>

      {/* Portfolio Trends */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Portfolio Trends (12 Months)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={formatCurrency} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="totalValue" stroke="#2563eb" strokeWidth={2} name="Pipeline Value" />
              <Line type="monotone" dataKey="averageDealSize" stroke="#10b981" strokeWidth={2} name="Avg Deal Size" />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Diversification Analysis */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Diversification Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Market Diversification</div>
              <div className="text-2xl font-bold mb-2">{diversification.marketDiversification.score}</div>
              <Badge variant="outline">{diversification.marketDiversification.concentration}</Badge>
              {diversification.marketDiversification.recommendations.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {diversification.marketDiversification.recommendations[0]}
                </div>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Client Diversification</div>
              <div className="text-2xl font-bold mb-2">{diversification.clientDiversification.score}</div>
              <Badge variant="outline">{diversification.clientDiversification.concentration}</Badge>
              {diversification.clientDiversification.recommendations.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {diversification.clientDiversification.recommendations[0]}
                </div>
              )}
            </div>

            <div className="p-4 border rounded-lg">
              <div className="text-sm text-muted-foreground mb-2">Geographic Diversification</div>
              <div className="text-2xl font-bold mb-2">{diversification.geographicDiversification.score}</div>
              <Badge variant="outline">{diversification.geographicDiversification.concentration}</Badge>
              {diversification.geographicDiversification.recommendations.length > 0 && (
                <div className="text-xs text-muted-foreground mt-2">
                  {diversification.geographicDiversification.recommendations[0]}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Market Distribution */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Market Distribution</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {Object.entries(metrics.marketDistribution)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([market, value]) => (
                <div key={market} className="flex items-center justify-between p-2 border rounded">
                  <span className="font-medium">{market}</span>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {formatCurrency(value)} ({(value / metrics.totalPipelineValue * 100).toFixed(1)}%)
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

