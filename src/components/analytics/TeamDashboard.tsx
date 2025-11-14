"use client";

/**
 * Team Analytics Dashboard
 * Overview of team performance and pipeline health
 */

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  Target,
  BarChart3,
} from "lucide-react";
import type { Deal } from "@/lib/types/deal";
import { calculateTeamMetrics } from "@/lib/teamAnalytics";
import { PipelineMetrics } from "./PipelineMetrics";
import { PerformanceMetrics } from "./PerformanceMetrics";

interface TeamDashboardProps {
  deals: Deal[];
  teamMembers?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}

export function TeamDashboard({ deals, teamMembers = [] }: TeamDashboardProps) {
  const metrics = React.useMemo(() => calculateTeamMetrics(deals, teamMembers), [deals, teamMembers]);

  return (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${(metrics.totalPipelineValue / 1000000).toFixed(1)}M
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.activeDeals} active deals
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.winRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.wins} wins / {metrics.totalClosed} closed
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Deal Cycle</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.avgDealCycleDays} days
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Time to close
            </p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.conversionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Lead to proposal
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Pipeline Metrics */}
      <PipelineMetrics deals={deals} />

      {/* Performance Metrics */}
      {teamMembers.length > 0 && (
        <PerformanceMetrics deals={deals} teamMembers={teamMembers} />
      )}
    </div>
  );
}

