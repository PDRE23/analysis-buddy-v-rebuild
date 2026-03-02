import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { X } from "lucide-react";
import { analyzeLease } from "@/lib/analysis-engine";
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
  const analysisResult = React.useMemo(() => analyzeLease(meta), [meta]);
  const lines = analysisResult.monthlyEconomics?.annualFromMonthly ?? analysisResult.cashflow;
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const innerRef = React.useRef<HTMLDivElement>(null);
  const [scale, setScale] = React.useState(1);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  React.useEffect(() => {
    const wrapper = wrapperRef.current;
    const inner = innerRef.current;
    if (!wrapper || !inner) return;

    const measure = () => {
      inner.style.transform = 'none';
      inner.style.width = '100%';
      const table = inner.querySelector('table');
      if (!table) return;
      const tableWidth = table.scrollWidth;
      const containerWidth = wrapper.clientWidth;
      if (tableWidth > containerWidth && containerWidth > 0) {
        const s = containerWidth / tableWidth;
        setScale(Math.max(0.5, s));
      } else {
        setScale(1);
      }
    };

    const ro = new ResizeObserver(measure);
    ro.observe(wrapper);
    const table = inner.querySelector('table');
    if (table) ro.observe(table);
    const timer = setTimeout(measure, 100);
    document.fonts?.ready?.then(measure);

    return () => {
      ro.disconnect();
      clearTimeout(timer);
    };
  }, [lines.length]);

  const needsCompact = lines.length > 9;

  return (
    <div className="fixed inset-0 z-50 bg-background text-foreground">
      <div className="h-full w-full overflow-auto">
        <div className="w-full px-6 py-6 space-y-6">
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
            <CardContent className={needsCompact ? 'px-2' : ''}>
              <div ref={wrapperRef} style={{ overflowX: 'auto' }}>
                <div
                  ref={innerRef}
                  style={{
                    transform: scale < 1 ? `scale(${scale})` : 'none',
                    transformOrigin: 'top left',
                    width: scale < 1 ? `${100 / scale}%` : '100%',
                  }}
                >
                  <YearTable lines={lines} rsf={meta.rsf} meta={meta} compact={needsCompact} />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
