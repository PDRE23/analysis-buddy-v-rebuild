"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Download, Printer, X, CheckCircle2 } from "lucide-react";
import type { ExportConfig } from "@/lib/export/types";
import { DEFAULT_EXPORT_CONFIG } from "@/lib/export/types";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (config: ExportConfig) => Promise<void>;
  onExportExcel: (config: ExportConfig) => Promise<void>;
  onPrint: (config: ExportConfig) => void;
  proposalName: string;
  hasNERData?: boolean;
  hasCommissionData?: boolean;
}

function SectionCheckbox({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
      checked ? 'border-primary/30 bg-primary/5' : 'border-border bg-background hover:bg-muted/30'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="w-4 h-4 rounded border-gray-300 mt-0.5"
      />
      <div>
        <span className="text-sm font-medium block">{label}</span>
        <span className="text-xs text-muted-foreground">{description}</span>
      </div>
    </label>
  );
}

export function ExportDialog({
  isOpen,
  onClose,
  onExportPDF,
  onExportExcel,
  onPrint,
  proposalName,
  hasNERData = false,
  hasCommissionData = false,
}: ExportDialogProps) {
  const [config, setConfig] = useState<ExportConfig>(DEFAULT_EXPORT_CONFIG);
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleExport = async (format: 'pdf' | 'excel' | 'print') => {
    setIsExporting(true);
    setExportSuccess(null);

    try {
      if (format === 'pdf') {
        await onExportPDF(config);
        setExportSuccess('PDF exported successfully!');
      } else if (format === 'excel') {
        await onExportExcel(config);
        setExportSuccess('Excel workbook exported successfully!');
      } else {
        onPrint(config);
        setExportSuccess('Print dialog opened!');
      }
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const updateConfig = (updates: Partial<ExportConfig>) => {
    setConfig({ ...config, ...updates });
  };

  const selectAll = () => {
    setConfig({
      ...config,
      includeLeaseTerms: true,
      includeSummary: true,
      includeMetrics: true,
      includeRentSchedule: true,
      includeCashflow: true,
      includeCharts: true,
      includeNotes: true,
      includeNER: hasNERData,
      includeCommission: hasCommissionData,
    });
  };

  const selectNone = () => {
    setConfig({
      ...config,
      includeLeaseTerms: false,
      includeSummary: false,
      includeMetrics: false,
      includeRentSchedule: false,
      includeCashflow: false,
      includeCharts: false,
      includeNotes: false,
      includeNER: false,
      includeCommission: false,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b bg-muted/30">
          <div>
            <CardTitle className="text-lg">Export Report</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{proposalName}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExporting}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {exportSuccess && (
            <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800 dark:text-green-300">{exportSuccess}</span>
            </div>
          )}

          <div>
            <div className="flex items-center justify-between mb-3">
              <Label className="text-base font-semibold">Include Sections</Label>
              <div className="flex gap-2">
                <button onClick={selectAll} className="text-xs text-primary hover:underline">Select All</button>
                <span className="text-xs text-muted-foreground">|</span>
                <button onClick={selectNone} className="text-xs text-primary hover:underline">Clear All</button>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SectionCheckbox
                label="Lease Terms"
                description="RSF, dates, escalation, TI, parking"
                checked={config.includeLeaseTerms}
                onChange={(v) => updateConfig({ includeLeaseTerms: v })}
              />
              <SectionCheckbox
                label="Financial Summary"
                description="Total value, avg cashflow, concessions"
                checked={config.includeSummary}
                onChange={(v) => updateConfig({ includeSummary: v })}
              />
              <SectionCheckbox
                label="Financial Metrics"
                description="NPV, IRR, yield, equity multiple"
                checked={config.includeMetrics}
                onChange={(v) => updateConfig({ includeMetrics: v })}
              />
              <SectionCheckbox
                label="Rent Schedule"
                description="Period-by-period rent breakdown"
                checked={config.includeRentSchedule}
                onChange={(v) => updateConfig({ includeRentSchedule: v })}
              />
              <SectionCheckbox
                label="Annual Cashflow Table"
                description="Year-by-year cashflow with totals"
                checked={config.includeCashflow}
                onChange={(v) => updateConfig({ includeCashflow: v })}
              />
              <SectionCheckbox
                label="Notes"
                description="Analysis notes and comments"
                checked={config.includeNotes}
                onChange={(v) => updateConfig({ includeNotes: v })}
              />
              <SectionCheckbox
                label="NER Analysis"
                description="Net effective rent breakdown"
                checked={config.includeNER}
                onChange={(v) => updateConfig({ includeNER: v })}
                disabled={!hasNERData}
              />
              <SectionCheckbox
                label="Commission"
                description="Broker commission breakdown"
                checked={config.includeCommission}
                onChange={(v) => updateConfig({ includeCommission: v })}
                disabled={!hasCommissionData}
              />
            </div>
          </div>

          <div>
            <Label className="text-base font-semibold mb-3 block">Page Format (PDF)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Size</Label>
                <select
                  value={config.format}
                  onChange={(e) => updateConfig({ format: e.target.value as 'letter' | 'a4' | 'legal' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                >
                  <option value="letter">Letter (8.5&quot; x 11&quot;)</option>
                  <option value="a4">A4 (210mm x 297mm)</option>
                  <option value="legal">Legal (8.5&quot; x 14&quot;)</option>
                </select>
              </div>
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Orientation</Label>
                <select
                  value={config.orientation}
                  onChange={(e) => updateConfig({ orientation: e.target.value as 'portrait' | 'landscape' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm bg-background"
                >
                  <option value="landscape">Landscape (recommended)</option>
                  <option value="portrait">Portrait</option>
                </select>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <Label className="text-base font-semibold mb-3 block">Export Format</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Button
                onClick={() => handleExport('pdf')}
                disabled={isExporting}
                className="rounded-2xl"
                variant="default"
              >
                <FileDown className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export PDF'}
              </Button>
              <Button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="rounded-2xl"
                variant="default"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Excel'}
              </Button>
              <Button
                onClick={() => handleExport('print')}
                disabled={isExporting}
                className="rounded-2xl"
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          <div className="bg-muted/50 border rounded-lg p-4">
            <div className="text-sm text-muted-foreground">
              <strong>Tips:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                <li>Landscape orientation is best for cashflow tables and PowerPoint slides</li>
                <li>PDF uses the navy/gold styling from the Analysis tab</li>
                <li>Select only the sections you need for a focused presentation</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
