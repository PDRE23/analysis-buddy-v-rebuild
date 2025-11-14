"use client";

/**
 * Comparison Slide Component
 * Side-by-side proposal comparison
 */

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Proposal } from "../LeaseAnalyzerApp";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import type { PresentationSlide } from "@/lib/presentationGenerator";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface ComparisonSlideProps {
  slide: PresentationSlide;
  proposals: Proposal[];
  analysis: AnalysisMeta;
}

export function ComparisonSlide({ slide, proposals, analysis }: ComparisonSlideProps) {
  const comparisonData = slide.content.proposals as Array<{
    label: string;
    side: string;
    effectiveRate: number;
    npv: number;
    totalValue: number;
    tiAllowance: number;
    freeRentMonths: number;
  }>;

  if (!comparisonData || comparisonData.length === 0) {
    return <div>No comparison data available</div>;
  }

  // Find best values for highlighting
  const bestEffectiveRate = Math.max(...comparisonData.map(p => p.effectiveRate));
  const bestNPV = Math.max(...comparisonData.map(p => p.npv));
  const bestTotalValue = Math.max(...comparisonData.map(p => p.totalValue));

  return (
    <div className="w-full h-full flex items-center justify-center p-12">
      <Card className="w-full max-w-6xl p-8">
        <h2 className="text-3xl font-bold mb-8 text-center">{slide.title}</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {comparisonData.map((proposal, index) => (
            <Card key={index} className="p-6">
              <div className="mb-4">
                <Badge variant="outline" className="text-lg px-3 py-1">
                  {proposal.label}
                </Badge>
                <div className="text-sm text-muted-foreground mt-2">{proposal.side}</div>
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Effective Rate</span>
                  <div className="flex items-center gap-2">
                    {proposal.effectiveRate === bestEffectiveRate && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-xl font-bold">
                      ${proposal.effectiveRate.toFixed(2)}/SF/yr
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">NPV</span>
                  <div className="flex items-center gap-2">
                    {proposal.npv === bestNPV && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-xl font-bold">
                      ${proposal.npv.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Value</span>
                  <div className="flex items-center gap-2">
                    {proposal.totalValue === bestTotalValue && (
                      <TrendingUp className="h-4 w-4 text-green-500" />
                    )}
                    <span className="text-xl font-bold">
                      ${proposal.totalValue.toLocaleString()}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">TI Allowance</span>
                    <span className="font-medium">${proposal.tiAllowance.toFixed(2)}/SF</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Free Rent</span>
                    <span className="font-medium">{proposal.freeRentMonths} months</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
        
        {/* Recommendation */}
        {comparisonData.length > 0 && (
          <Card className="mt-6 p-6 bg-primary/5 border-primary/20">
            <div className="text-center">
              <div className="text-sm text-muted-foreground mb-2">Recommended</div>
              <div className="text-2xl font-bold">
                {comparisonData.find(p => p.effectiveRate === bestEffectiveRate)?.label || "Best Option"}
              </div>
            </div>
          </Card>
        )}
      </Card>
    </div>
  );
}

