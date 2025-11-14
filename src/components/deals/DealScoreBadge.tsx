"use client";

/**
 * Deal Score Badge Component
 * Visual indicator for deal score and win probability
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { TrendingUp, TrendingDown, Target, AlertTriangle } from "lucide-react";
import type { DealScore } from "@/lib/dealScoring";
import { cn } from "@/lib/utils";

interface DealScoreBadgeProps {
  score: DealScore;
  size?: "sm" | "md" | "lg";
  showDetails?: boolean;
  className?: string;
}

export function DealScoreBadge({
  score,
  size = "md",
  showDetails = true,
  className,
}: DealScoreBadgeProps) {
  const getScoreColor = (value: number) => {
    if (value >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (value >= 60) return "text-blue-600 bg-blue-50 border-blue-200";
    if (value >= 40) return "text-yellow-600 bg-yellow-50 border-yellow-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const getRiskColor = (risk: string) => {
    if (risk === "low") return "text-green-600";
    if (risk === "medium") return "text-yellow-600";
    return "text-red-600";
  };

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  if (!showDetails) {
    return (
      <Badge
        variant="outline"
        className={cn(
          sizeClasses[size],
          getScoreColor(score.overallScore),
          className
        )}
      >
        <Target className="h-3 w-3 mr-1" />
        {score.overallScore}
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <div className={cn("flex items-center gap-2", className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(sizeClasses[size], getScoreColor(score.overallScore))}
            >
              <Target className="h-3 w-3 mr-1" />
              Score: {score.overallScore}
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-sm">
            <div className="space-y-2">
              <div className="font-semibold">Deal Score Breakdown</div>
              {score.factors.map((factor, index) => (
                <div key={index} className="text-sm">
                  <div className="flex items-center justify-between">
                    <span>{factor.name}</span>
                    <span className="font-medium">{factor.score}</span>
                  </div>
                </div>
              ))}
            </div>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant="outline"
              className={cn(
                sizeClasses[size],
                score.winProbability >= 60 ? "text-green-600 bg-green-50 border-green-200" :
                score.winProbability >= 40 ? "text-yellow-600 bg-yellow-50 border-yellow-200" :
                "text-red-600 bg-red-50 border-red-200"
              )}
            >
              {score.winProbability >= 60 ? (
                <TrendingUp className="h-3 w-3 mr-1" />
              ) : (
                <TrendingDown className="h-3 w-3 mr-1" />
              )}
              {score.winProbability}% Win
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <div className="space-y-1">
              <div className="font-semibold">Win Probability</div>
              <div className="text-sm">
                Based on deal score, stage, and historical data
              </div>
            </div>
          </TooltipContent>
        </Tooltip>

        {score.riskLevel !== "low" && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={cn(
                  sizeClasses[size],
                  getRiskColor(score.riskLevel)
                )}
              >
                <AlertTriangle className="h-3 w-3 mr-1" />
                {score.riskLevel.toUpperCase()} RISK
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div className="text-sm">
                Risk Level: {score.riskLevel}
              </div>
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

