"use client";

/**
 * Insight Badge Component
 * Visual indicators for deal health scores and insights
 */

import React from "react";
import { Badge } from "./badge";
import { AlertCircle, CheckCircle2, AlertTriangle, Info } from "lucide-react";
import type { DealHealthStatus } from "@/lib/aiInsights";
import { cn } from "@/lib/utils";

interface InsightBadgeProps {
  status: DealHealthStatus;
  score?: number;
  className?: string;
}

export function InsightBadge({ status, score, className }: InsightBadgeProps) {
  const statusConfig = {
    healthy: {
      icon: CheckCircle2,
      label: "Healthy",
      variant: "default" as const,
      color: "text-green-600",
      bgColor: "bg-green-50 border-green-200",
    },
    needs_attention: {
      icon: AlertTriangle,
      label: "Needs Attention",
      variant: "secondary" as const,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50 border-yellow-200",
    },
    at_risk: {
      icon: AlertCircle,
      label: "At Risk",
      variant: "destructive" as const,
      color: "text-red-600",
      bgColor: "bg-red-50 border-red-200",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge
      variant={config.variant}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1",
        config.bgColor,
        config.color,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span>{config.label}</span>
      {score !== undefined && (
        <span className="font-semibold ml-1">({score})</span>
      )}
    </Badge>
  );
}

interface InsightPanelProps {
  title: string;
  insights: Array<{
    type: "recommendation" | "warning" | "info";
    message: string;
    suggestion?: string;
  }>;
  className?: string;
}

export function InsightPanel({ title, insights, className }: InsightPanelProps) {
  if (insights.length === 0) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <h3 className="text-sm font-semibold">{title}</h3>
      <div className="space-y-2">
        {insights.map((insight, index) => {
          const Icon = 
            insight.type === "recommendation" ? Info :
            insight.type === "warning" ? AlertTriangle :
            AlertCircle;

          return (
            <div
              key={index}
              className={cn(
                "flex items-start gap-2 p-3 rounded-lg text-sm",
                insight.type === "warning" && "bg-yellow-50 border border-yellow-200",
                insight.type === "recommendation" && "bg-blue-50 border border-blue-200",
                insight.type === "info" && "bg-gray-50 border border-gray-200"
              )}
            >
              <Icon className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-medium">{insight.message}</p>
                {insight.suggestion && (
                  <p className="text-xs text-muted-foreground mt-1">{insight.suggestion}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

