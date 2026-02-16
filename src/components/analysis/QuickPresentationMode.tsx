import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";
import { DealTermsSummaryCard } from "@/components/analysis/DealTermsSummaryCard";
import { YearTable } from "@/components/analysis/YearTable";
import type { AnalysisMeta } from "@/types";

export function QuickPresentationMode({
  meta,
  onClose,
}: {
  meta: AnalysisMeta;
  onClose: () => void;
}) {
  const lines = React.useMemo(() => buildAnnualCashflow(meta), [meta]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground">
      <div className="h-full w-full overflow-auto">
        <div className="max-w-7xl mx-auto w-full px-6 py-6 space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold">Quick Presentation</h1>
            <Button variant="outline" size="sm" onClick={onClose}>
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
          <DealTermsSummaryCard meta={meta} />
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Annual Cashflow</CardTitle>
            </CardHeader>
            <CardContent>
              <YearTable lines={lines} rsf={meta.rsf} meta={meta} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
