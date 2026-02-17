"use client";

import React, { useMemo, useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, FileDown, Save, Presentation } from "lucide-react";
import { analyzeLease } from "@/lib/analysis-engine";
import { ExportDialog } from "@/components/export/ExportDialog";
import { exportAnalysis } from "@/lib/export";
import { DealLinkDropdown } from "@/components/ui/deal-link-dropdown";
import { NERAnalysisView } from "@/components/analysis/NERAnalysisView";
import { AnalysisTab } from "@/components/analysis/AnalysisTab";
import { CashflowTab } from "@/components/analysis/CashflowTab";
import { ProposalTab } from "@/components/analysis/ProposalTab";
import { KPI } from "@/components/analysis/KPI";
import { CommissionCalculator } from "@/components/deals/CommissionCalculator";
import type { AnalysisMeta, Proposal } from "@/types";
import type { ExportConfig } from "@/lib/export/types";
import type { AnalysisData, CashflowLine } from "@/lib/export/pdf-export";
import type { Deal } from "@/lib/types/deal";

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtRate = (v: number | undefined) => `$${(v ?? 0).toFixed(2)}/SF/yr`;

export function Workspace({
  proposal,
  onBackToBoard,
  onSave,
  deals,
  currentLinkedDeal,
  onLinkToDeal,
  onUnlinkFromDeal,
  onSyncWithDeal,
  onCreateDealFromAnalysis,
  onEnterPresentation,
  onEnterQuickPresentation,
  allProposals,
}: {
  proposal: Proposal;
  onBackToBoard: () => void;
  onSave: (meta: AnalysisMeta) => void;
  deals: Deal[];
  currentLinkedDeal?: Deal | undefined;
  onLinkToDeal: (dealId: string) => void;
  onUnlinkFromDeal: () => void;
  onSyncWithDeal: () => void;
  onCreateDealFromAnalysis: () => void;
  onEnterPresentation?: () => void;
  onEnterQuickPresentation?: () => void;
  allProposals?: Proposal[];
}) {
  const saveRequestRef = useRef<(() => void) | null>(null);
  const meta = proposal.meta;
  const analysisResult = useMemo(() => analyzeLease(meta), [meta]);
  const lines = analysisResult.cashflow;
  const years = analysisResult.years;
  const eff = analysisResult.metrics.effectiveRentPSF;
  const pvV = analysisResult.metrics.npv;

  const [showExportDialog, setShowExportDialog] = useState(false);

  const handleExportPDF = async (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      await exportAnalysis('pdf', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      throw error;
    }
  };

  const handleExportExcel = async (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      await exportAnalysis('excel', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('Excel export failed:', error);
      throw error;
    }
  };

  const handlePrint = (config: ExportConfig) => {
    try {
      const analysisData: AnalysisData = meta as any;
      const cashflowData: CashflowLine[] = lines as any;
      const metrics = { effectiveRate: eff, npv: pvV, totalYears: years };
      
      exportAnalysis('print', analysisData, cashflowData, metrics, config, {
        side: proposal.side,
        label: proposal.label || 'Proposal',
      });
    } catch (error) {
      console.error('Print failed:', error);
      throw error;
    }
  };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 w-full flex-shrink-0">
      {/* Export Dialog */}
      <ExportDialog
        isOpen={showExportDialog}
        onClose={() => setShowExportDialog(false)}
        onExportPDF={handleExportPDF}
        onExportExcel={handleExportExcel}
        onPrint={handlePrint}
        proposalName={`${proposal.side} - ${proposal.label || meta.name}`}
      />

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <Button 
              variant="ghost" 
              onClick={onBackToBoard} 
              size="sm"
              className="h-8 px-2 -ml-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold text-foreground">
                  {meta.name || "Untitled Analysis"}
                </h1>
                {meta.rep_type && (
                  <Badge variant="outline" className="text-xs">
                    {meta.rep_type} Rep
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-sm text-muted-foreground">
                  {proposal.side}
                </span>
                {proposal.label && (
                  <>
                    <span className="text-muted-foreground">•</span>
                    <span className="text-sm text-muted-foreground">
                      {proposal.label}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-2 flex-shrink-0">
            <DealLinkDropdown
              currentDealId={currentLinkedDeal?.id}
              linkedDeal={currentLinkedDeal}
              availableDeals={deals}
              onLinkToDeal={onLinkToDeal}
              onCreateNewDeal={onCreateDealFromAnalysis}
              onUnlink={onUnlinkFromDeal}
              onSyncNow={onSyncWithDeal}
            />
            {onEnterQuickPresentation && (
              <Button
                variant="outline"
                onClick={onEnterQuickPresentation}
                size="sm"
                title="Enter Quick Presentation Mode"
              >
                <Presentation className="h-4 w-4 mr-2" />
                Quick Present
              </Button>
            )}
            {onEnterPresentation && (
              <Button
                variant="default"
                onClick={onEnterPresentation}
                size="sm"
                title="Enter Presentation Mode (Ctrl+P)"
              >
                <Presentation className="h-4 w-4 mr-2" />
                Present
              </Button>
            )}
            <Button 
              variant="default"
              onClick={() => setShowExportDialog(true)}
              size="sm"
              title="Export to PDF, Excel, or Print"
            >
              <FileDown className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Export</span>
            </Button>
            <Button 
              onClick={() => (saveRequestRef.current ? saveRequestRef.current() : onSave(meta))}
              size="sm"
              title="Save changes"
            >
              <Save className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Save</span>
            </Button>
          </div>
        </div>
        <div className="h-px bg-border"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6">
        <KPI
          label="Effective Rate"
          value={fmtRate(eff)}
          hint="Net cash flow per RSF per year (abatement-only credit)."
        />
        <KPI
          label="NPV"
          value={fmtMoney(pvV)}
          hint="Discounted net cash flows at selected rate."
        />
        <KPI
          label="NPV $/SF/yr"
          value={years > 0 && meta.rsf > 0 ? fmtRate(pvV / (meta.rsf * years)) : "$0.00/SF/yr"}
          hint="Net Present Value per square foot per year."
        />
        <KPI label="RSF" value={meta.rsf.toLocaleString()} hint="Rentable square feet." />
      </div>
      </div>

      <div className="flex-1 min-h-0 max-w-7xl mx-auto w-full px-4 pb-4 sm:pb-6">
      <Tabs defaultValue="proposal" className="w-full h-full flex flex-col min-h-0">
        <TabsList className="grid grid-cols-5 w-full flex-shrink-0">
          <TabsTrigger value="proposal" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Lease Terms</span>
            <span className="sm:hidden">Terms</span>
          </TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Analysis</span>
            <span className="sm:hidden">Analysis</span>
          </TabsTrigger>
          <TabsTrigger value="cashflow" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Cashflow</span>
            <span className="sm:hidden">Cash</span>
          </TabsTrigger>
          <TabsTrigger value="ner" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">NER</span>
            <span className="sm:hidden">NER</span>
          </TabsTrigger>
          <TabsTrigger value="commission" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Commission</span>
            <span className="sm:hidden">Comm</span>
          </TabsTrigger>
        </TabsList>
        <TabsContent value="proposal" className="overflow-y-auto flex-1 min-h-0">
          <ProposalTab
            a={meta}
            onSave={onSave}
            onRequestSave={(handler) => {
              saveRequestRef.current = handler;
            }}
            monthlyEconomics={analysisResult.monthlyEconomics}
          />
        </TabsContent>
        <TabsContent value="analysis" className="overflow-y-auto flex-1 min-h-0">
          <AnalysisTab lines={analysisResult.monthlyEconomics?.annualFromMonthly ?? lines} meta={meta} />
        </TabsContent>
        <TabsContent value="cashflow" className="overflow-y-auto flex-1 min-h-0">
          <CashflowTab lines={lines} meta={meta} proposals={allProposals || [proposal]} />
        </TabsContent>
        <TabsContent value="ner" className="overflow-y-auto flex-1 min-h-0">
          <NERAnalysisView
            analysis={meta}
            onSave={(nerAnalysis) => {
              console.log('NER Analysis saved:', nerAnalysis);
            }}
          />
        </TabsContent>
        <TabsContent value="commission" className="overflow-y-auto flex-1 min-h-0">
          <CommissionCalculator
            analysis={meta}
            initialStructure={meta.commissionStructure}
            onSave={(structure) => {
              onSave({ ...meta, commissionStructure: structure });
            }}
          />
        </TabsContent>
      </Tabs>
      </div>
    </div>
  );
}
