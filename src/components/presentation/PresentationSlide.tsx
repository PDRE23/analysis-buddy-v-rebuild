"use client";

/**
 * Presentation Slide Component
 * Individual slide component with animations
 */

import React from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, MapPin, Calendar, DollarSign, TrendingUp, Gift } from "lucide-react";
import type { PresentationSlide as SlideData } from "@/lib/presentationGenerator";
import type { AnnualLine } from "@/types";
import { cn } from "@/lib/utils";

interface PresentationSlideProps {
  slide: SlideData;
  cashflow?: AnnualLine[];
  className?: string;
}

export function PresentationSlide({ slide, cashflow, className }: PresentationSlideProps) {
  const renderSlideContent = () => {
    switch (slide.type) {
      case "cover":
        return (
          <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
            <div className="text-5xl font-bold">{slide.content.tenantName as string}</div>
            <div className="text-2xl text-muted-foreground">{slide.content.propertyAddress as string}</div>
            <Badge variant="outline" className="text-lg px-4 py-2">
              {slide.content.proposalLabel as string}
            </Badge>
          </div>
        );
        
      case "executive-summary":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Effective Rate</div>
                <div className="text-4xl font-bold">
                  ${((slide.content.effectiveRate as number) || 0).toFixed(2)}/SF/yr
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Net Present Value</div>
                <div className="text-4xl font-bold">
                  ${((slide.content.npv as number) || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">RSF</div>
                <div className="text-4xl font-bold">
                  {((slide.content.rsf as number) || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Lease Term</div>
                <div className="text-4xl font-bold">
                  {slide.content.term as number} years
                </div>
              </Card>
            </div>
          </div>
        );
        
      case "property-overview":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <MapPin className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Market</div>
                </div>
                <div className="text-2xl font-semibold">{slide.content.market as string}</div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Building2 className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">RSF</div>
                </div>
                <div className="text-2xl font-semibold">
                  {(slide.content.rsf as number).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Commencement</div>
                </div>
                <div className="text-xl font-semibold">
                  {new Date(slide.content.commencement as string).toLocaleDateString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Expiration</div>
                </div>
                <div className="text-xl font-semibold">
                  {new Date(slide.content.expiration as string).toLocaleDateString()}
                </div>
              </Card>
            </div>
          </div>
        );
        
      case "financial-summary":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            <div className="grid grid-cols-3 gap-6">
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Year 1 Total</div>
                <div className="text-3xl font-bold">
                  ${((slide.content.year1Total as number) || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">Total Lease Value</div>
                <div className="text-3xl font-bold">
                  ${((slide.content.totalValue as number) || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6">
                <div className="text-sm text-muted-foreground mb-2">NPV</div>
                <div className="text-3xl font-bold">
                  ${((slide.content.npv as number) || 0).toLocaleString()}
                </div>
              </Card>
            </div>
          </div>
        );
        
      case "cashflow":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            {cashflow && (
              <div className="space-y-4">
                {cashflow.map((line, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">{line.year}</div>
                      <div className="text-2xl font-bold">
                        ${line.net_cash_flow.toLocaleString()}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        );
        
      case "concessions":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            <div className="grid grid-cols-2 gap-6">
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Gift className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">TI Allowance</div>
                </div>
                <div className="text-3xl font-bold">
                  ${((slide.content.tiAllowanceTotal as number) || 0).toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground mt-2">
                  ${((slide.content.tiAllowance as number) || 0).toFixed(2)}/SF
                </div>
              </Card>
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <DollarSign className="h-6 w-6 text-muted-foreground" />
                  <div className="text-sm text-muted-foreground">Moving Allowance</div>
                </div>
                <div className="text-3xl font-bold">
                  ${((slide.content.movingAllowance as number) || 0).toLocaleString()}
                </div>
              </Card>
              <Card className="p-6 col-span-2">
                <div className="text-sm text-muted-foreground mb-2">Total Concessions</div>
                <div className="text-4xl font-bold">
                  ${((slide.content.totalConcessions as number) || 0).toLocaleString()}
                </div>
              </Card>
            </div>
          </div>
        );
        
      case "next-steps":
        return (
          <div className="space-y-6">
            <h2 className="text-3xl font-bold mb-6">{slide.title}</h2>
            <div className="space-y-4">
              {(slide.content.actionItems as string[]).map((item, index) => (
                <Card key={index} className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-semibold">
                      {index + 1}
                    </div>
                    <div className="text-lg">{item}</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
        
      default:
        return <div>{slide.title}</div>;
    }
  };

  return (
    <div
      className={cn(
        "w-full h-full flex items-center justify-center p-12",
        className
      )}
    >
      <Card className="w-full max-w-5xl p-8">
        {renderSlideContent()}
      </Card>
    </div>
  );
}

