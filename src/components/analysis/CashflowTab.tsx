import React from "react";
import type { AnnualLine, AnalysisMeta, Proposal } from "@/types";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";

export function CashflowTab({ lines, meta, proposals }: { lines: AnnualLine[]; meta: AnalysisMeta; proposals?: Proposal[] }) {
  const [ChartsLoaded, setChartsLoaded] = React.useState(false);
  const [ChartComponents, setChartComponents] = React.useState<{
    CashflowChart?: React.ComponentType<any>;
    RentEscalationChart?: React.ComponentType<any>;
    ConcessionsChart?: React.ComponentType<any>;
  }>({});
  
  React.useEffect(() => {
    Promise.all([
      import("@/components/charts/CashflowChart"),
      import("@/components/charts/RentEscalationChart"),
      import("@/components/charts/ConcessionsChart"),
    ]).then(([Cashflow, RentEscalation, Concessions]) => {
      setChartComponents({
        CashflowChart: Cashflow.CashflowChart,
        RentEscalationChart: RentEscalation.RentEscalationChart,
        ConcessionsChart: Concessions.ConcessionsChart,
      });
      setChartsLoaded(true);
    });
  }, []);
  
  const comparisonProposal = proposals && proposals.length > 1 
    ? proposals.find(p => p.id !== proposals[0].id)
    : undefined;
  const comparisonCashflow = comparisonProposal 
    ? buildAnnualCashflow(comparisonProposal.meta)
    : undefined;

  if (!ChartsLoaded || !ChartComponents.CashflowChart) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading charts...</p>
        </div>
      </div>
    );
  }

  const { CashflowChart, RentEscalationChart, ConcessionsChart } = ChartComponents;

  return (
    <div className="space-y-6">
      {CashflowChart && (
        <CashflowChart
          cashflow={lines}
          title="Annual Cashflow Timeline"
          compareWith={comparisonCashflow}
          compareLabel={comparisonProposal?.label || "Comparison"}
        />
      )}
      {RentEscalationChart && (
        <RentEscalationChart
          cashflow={lines}
          title="Rent Escalation"
        />
      )}
      {ConcessionsChart && (
        <ConcessionsChart
          analysis={meta}
          cashflow={lines}
          title="Concessions Breakdown"
        />
      )}
    </div>
  );
}
