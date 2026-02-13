"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { DealSheetSummary } from "@/lib/analysis/dealSheetSummary";
import {
  DEAL_SHEET_FOOTNOTE,
  buildDealSheetViewModel,
  type DealSheetViewModel,
} from "@/lib/analysis/dealSheetViewModel";

type DealSheetSummaryCardProps = {
  title: string;
  summary?: DealSheetSummary;
  viewModel?: DealSheetViewModel;
  className?: string;
};

const EMPTY_VIEW_MODEL: DealSheetViewModel = {
  termMonthsLabel: "—",
  totalNetRentFormatted: "—",
  freeRentValueFormatted: "—",
  blendedRateFormatted: "—",
  npvRentFormatted: "—",
  totalLlCostFormatted: "—",
  unamortizedAt36Formatted: "—",
  terminationFeeAt36Formatted: "—",
  assumptionsLine: "",
  footnote: DEAL_SHEET_FOOTNOTE,
};

export function DealSheetSummaryCard({
  title,
  summary,
  viewModel,
  className,
}: DealSheetSummaryCardProps) {
  const resolved = viewModel ?? (summary ? buildDealSheetViewModel(summary) : EMPTY_VIEW_MODEL);
  const items = [
    { label: "Term", value: resolved.termMonthsLabel },
    { label: "Total Net Rent", value: resolved.totalNetRentFormatted },
    { label: "Free Rent Value", value: resolved.freeRentValueFormatted },
    { label: "Blended Rate", value: resolved.blendedRateFormatted },
    { label: "NPV of Rent", value: resolved.npvRentFormatted },
    { label: "Total LL Cost", value: resolved.totalLlCostFormatted },
    { label: "Unamortized @ 36", value: resolved.unamortizedAt36Formatted },
    { label: "Termination Fee @ 36", value: resolved.terminationFeeAt36Formatted },
  ];

  return (
    <Card className={cn("rounded-xl border bg-background shadow-sm", className)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <dl className="grid gap-x-6 gap-y-2 text-sm md:grid-cols-2">
          {items.map((item) => (
            <div key={item.label} className="flex items-center justify-between gap-4">
              <dt className="text-muted-foreground">{item.label}</dt>
              <dd className="text-right font-semibold">{item.value}</dd>
            </div>
          ))}
        </dl>
        {resolved.assumptionsLine ? (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Assumptions:</span>{" "}
            {resolved.assumptionsLine}
          </div>
        ) : null}
        <div className="text-xs text-muted-foreground">{resolved.footnote}</div>
      </CardContent>
    </Card>
  );
}
