"use client";

/**
 * Risk Dashboard Component
 * Identify and manage at-risk deals
 */

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, TrendingDown, Target } from "lucide-react";
import type { Deal } from "@/lib/types/deal";
import { getDealScore, assessDealRisk, type RiskAssessment } from "@/lib/dealScoring";
import { DealScoreBadge } from "../deals/DealScoreBadge";

interface RiskDashboardProps {
  deals: Deal[];
}

export function RiskDashboard({ deals }: RiskDashboardProps) {
  const riskAssessments = useMemo(() => {
    return deals
      .filter(d => d.status === "Active" && d.stage !== "Closed Won" && d.stage !== "Closed Lost")
      .map(deal => {
        const score = getDealScore(deal, deals);
        const risk = assessDealRisk(deal, score);
        return {
          deal,
          score,
          risk,
        };
      })
      .sort((a, b) => {
        // Sort by risk level (high first) then by win probability (low first)
        const riskOrder = { high: 3, medium: 2, low: 1 };
        const riskDiff = riskOrder[b.risk.level] - riskOrder[a.risk.level];
        if (riskDiff !== 0) return riskDiff;
        return a.score.winProbability - b.score.winProbability;
      });
  }, [deals]);

  const highRiskDeals = riskAssessments.filter(r => r.risk.level === "high");
  const mediumRiskDeals = riskAssessments.filter(r => r.risk.level === "medium");
  const lowRiskDeals = riskAssessments.filter(r => r.risk.level === "low");

  const getRiskBadge = (level: string) => {
    const config = {
      high: { color: "destructive", label: "High Risk" },
      medium: { color: "secondary", label: "Medium Risk" },
      low: { color: "default", label: "Low Risk" },
    };
    const { color, label } = config[level as keyof typeof config] || config.medium;
    return (
      <Badge variant={color as any} className="flex items-center gap-1">
        <AlertTriangle className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="rounded-2xl border-red-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-red-600">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{highRiskDeals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Deals requiring attention</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-yellow-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-yellow-600">Medium Risk</CardTitle>
            <TrendingDown className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{mediumRiskDeals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Deals to monitor</p>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-green-600">Low Risk</CardTitle>
            <Target className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{lowRiskDeals.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Deals on track</p>
          </CardContent>
        </Card>
      </div>

      {/* High Risk Deals */}
      {highRiskDeals.length > 0 && (
        <Card className="rounded-2xl border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              High Risk Deals ({highRiskDeals.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {highRiskDeals.map(({ deal, score, risk }) => (
                <div
                  key={deal.id}
                  className="p-4 border border-red-200 rounded-lg bg-red-50/50"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{deal.clientName}</h3>
                        {getRiskBadge(risk.level)}
                        <DealScoreBadge score={score} size="sm" showDetails={false} />
                      </div>
                      <div className="text-sm text-muted-foreground mb-3">
                        {deal.clientCompany} • {deal.stage} • ${(deal.estimatedValue || 0).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  {/* Risk Factors */}
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Risk Factors:</div>
                    {risk.factors.map((factor, index) => (
                      <div
                        key={index}
                        className="text-sm p-2 bg-white rounded border border-red-100"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium text-red-600">{factor.factor}</div>
                            <div className="text-muted-foreground mt-1">{factor.description}</div>
                            <div className="text-xs text-primary mt-1 italic">
                              → {factor.recommendation}
                            </div>
                          </div>
                          <Badge
                            variant={factor.severity === "high" ? "destructive" : "secondary"}
                            className="ml-2"
                          >
                            {factor.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Medium Risk Deals */}
      {mediumRiskDeals.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Medium Risk Deals ({mediumRiskDeals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mediumRiskDeals.slice(0, 5).map(({ deal, score, risk }) => (
                <div
                  key={deal.id}
                  className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{deal.clientName}</span>
                        {getRiskBadge(risk.level)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {deal.stage} • Win Probability: {score.winProbability}%
                      </div>
                      {risk.factors.length > 0 && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {risk.factors[0].factor}: {risk.factors[0].description}
                        </div>
                      )}
                    </div>
                    <DealScoreBadge score={score} size="sm" showDetails={false} />
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

