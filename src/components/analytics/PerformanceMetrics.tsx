"use client";

/**
 * Performance Metrics Component
 * Individual broker performance
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateBrokerMetrics, type BrokerMetrics } from "@/lib/teamAnalytics";
import type { Deal } from "@/lib/types/deal";

interface PerformanceMetricsProps {
  deals: Deal[];
  teamMembers: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export function PerformanceMetrics({ deals, teamMembers }: PerformanceMetricsProps) {
  const brokerMetrics = React.useMemo(() => {
    return teamMembers.map(member => 
      calculateBrokerMetrics(deals, member.id, member.name)
    ).sort((a, b) => b.totalValue - a.totalValue);
  }, [deals, teamMembers]);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Individual Performance</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {brokerMetrics.map((metrics) => (
            <div
              key={metrics.brokerId}
              className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="font-semibold">{metrics.brokerName}</div>
                  <div className="text-sm text-muted-foreground">
                    {metrics.totalDeals} deals • {metrics.activeDeals} active
                  </div>
                </div>
                <Badge variant="outline" className="font-semibold">
                  ${(metrics.totalValue / 1000000).toFixed(1)}M
                </Badge>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Win Rate</div>
                  <div className="font-semibold">{metrics.winRate.toFixed(1)}%</div>
                  <div className="text-xs text-muted-foreground">
                    {metrics.wins}W / {metrics.losses}L
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Deal Size</div>
                  <div className="font-semibold">
                    ${(metrics.avgDealSize / 1000).toFixed(0)}K
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Avg Cycle</div>
                  <div className="font-semibold">{metrics.avgCycleDays} days</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Response Time</div>
                  <div className="font-semibold">{metrics.responseTimeHours}h</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

