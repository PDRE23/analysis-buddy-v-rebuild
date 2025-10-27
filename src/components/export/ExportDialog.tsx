/**
 * Export configuration dialog
 */

"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDown, Download, Printer, X, CheckCircle2 } from "lucide-react";
import type { ExportConfig, BrandingConfig } from "@/lib/export/types";
import { DEFAULT_EXPORT_CONFIG } from "@/lib/export/types";

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExportPDF: (config: ExportConfig) => Promise<void>;
  onExportExcel: (config: ExportConfig) => Promise<void>;
  onPrint: (config: ExportConfig) => void;
  proposalName: string;
}

export function ExportDialog({
  isOpen,
  onClose,
  onExportPDF,
  onExportExcel,
  onPrint,
  proposalName,
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
      
      // Clear success message after 3 seconds
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between border-b">
          <CardTitle>Export Options</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={isExporting}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        
        <CardContent className="p-6 space-y-6">
          {/* Success message */}
          {exportSuccess && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">{exportSuccess}</span>
            </div>
          )}
          
          {/* Proposal name */}
          <div>
            <Label className="text-base font-semibold">Exporting: {proposalName}</Label>
          </div>
          
          {/* Content options */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Include Sections</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeSummary}
                  onChange={(e) => updateConfig({ includeSummary: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Property Summary</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeMetrics}
                  onChange={(e) => updateConfig({ includeMetrics: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Financial Metrics</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeRentSchedule}
                  onChange={(e) => updateConfig({ includeRentSchedule: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Rent Schedule</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCashflow}
                  onChange={(e) => updateConfig({ includeCashflow: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Cashflow Analysis</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeCharts}
                  onChange={(e) => updateConfig({ includeCharts: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Charts & Graphs</span>
              </label>
              
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.includeNotes}
                  onChange={(e) => updateConfig({ includeNotes: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300"
                />
                <span className="text-sm">Notes</span>
              </label>
            </div>
          </div>
          
          {/* Page format (PDF only) */}
          <div>
            <Label className="text-base font-semibold mb-3 block">Page Format (PDF)</Label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Size</Label>
                <select
                  value={config.format}
                  onChange={(e) => updateConfig({ format: e.target.value as 'letter' | 'a4' | 'legal' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="letter">Letter (8.5&quot; × 11&quot;)</option>
                  <option value="a4">A4 (210mm × 297mm)</option>
                  <option value="legal">Legal (8.5&quot; × 14&quot;)</option>
                </select>
              </div>
              
              <div>
                <Label className="text-sm text-muted-foreground mb-1 block">Orientation</Label>
                <select
                  value={config.orientation}
                  onChange={(e) => updateConfig({ orientation: e.target.value as 'portrait' | 'landscape' })}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                >
                  <option value="portrait">Portrait</option>
                  <option value="landscape">Landscape</option>
                </select>
              </div>
            </div>
          </div>
          
          {/* Export buttons */}
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
                {isExporting ? 'Exporting...' : 'PDF'}
              </Button>
              
              <Button
                onClick={() => handleExport('excel')}
                disabled={isExporting}
                className="rounded-2xl"
                variant="default"
              >
                <Download className="mr-2 h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Excel'}
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
          
          {/* Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="text-sm text-blue-800">
              <strong>💡 Tips:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>PDF is great for sharing and presentations</li>
                <li>Excel allows editing and custom calculations</li>
                <li>Print creates a clean, browser-optimized layout</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

