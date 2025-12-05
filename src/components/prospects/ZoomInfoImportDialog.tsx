"use client";

import React, { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Prospect } from "@/lib/types/prospect";
import {
  importZoomInfoFile,
  detectColumnMapping,
  type ColumnMapping,
  type ImportResult,
} from "@/lib/zoomInfoImport";
import { Upload, X, CheckCircle2, AlertCircle, FileText, Loader2 } from "lucide-react";

interface ZoomInfoImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: (prospects: Prospect[]) => void;
}

export function ZoomInfoImportDialog({
  isOpen,
  onClose,
  onImportComplete,
}: ZoomInfoImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [mapping, setMapping] = useState<ColumnMapping | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    setFile(selectedFile);
    setImportResult(null);
    setIsProcessing(true);

    try {
      // Parse file to get headers and preview
      let rows: Record<string, string>[];
      const fileName = selectedFile.name.toLowerCase();
      
      if (fileName.endsWith('.csv')) {
        const { parseCSV } = await import('@/lib/zoomInfoImport');
        rows = await parseCSV(selectedFile);
      } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const { parseExcel } = await import('@/lib/zoomInfoImport');
        rows = await parseExcel(selectedFile);
      } else {
        setImportResult({
          success: false,
          prospects: [],
          errors: ['Unsupported file format. Please use CSV or Excel (.xlsx) files.'],
          warnings: [],
        });
        setIsProcessing(false);
        return;
      }

      if (rows.length === 0) {
        setImportResult({
          success: false,
          prospects: [],
          errors: ['File contains no data rows.'],
          warnings: [],
        });
        setIsProcessing(false);
        return;
      }

      // Get headers and detect mapping
      const fileHeaders = Object.keys(rows[0]);
      setHeaders(fileHeaders);
      const detectedMapping = detectColumnMapping(fileHeaders);
      setMapping(detectedMapping);

      // Preview import
      const result = await importZoomInfoFile(selectedFile, detectedMapping);
      setImportResult(result);
    } catch (error) {
      setImportResult({
        success: false,
        prospects: [],
        errors: [error instanceof Error ? error.message : 'Failed to process file'],
        warnings: [],
      });
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, [handleFileSelect]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  }, [handleFileSelect]);

  const handleImport = useCallback(async () => {
    if (!file || !importResult || importResult.prospects.length === 0) return;

    setIsImporting(true);
    try {
      // Import the prospects
      onImportComplete(importResult.prospects);
      onClose();
    } catch (error) {
      console.error('Import failed:', error);
    } finally {
      setIsImporting(false);
    }
  }, [file, importResult, onImportComplete, onClose]);

  const handleReset = useCallback(() => {
    setFile(null);
    setImportResult(null);
    setMapping(null);
    setHeaders([]);
    setIsProcessing(false);
    setIsImporting(false);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Import from ZoomInfo
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Upload a CSV or Excel file exported from ZoomInfo to import prospects
          </p>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {!file ? (
            <div
              className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center hover:border-gray-400 transition-colors cursor-pointer"
              onDrop={handleFileDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => document.getElementById('file-input')?.click()}
            >
              <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Drop file here or click to browse</h3>
              <p className="text-sm text-gray-500 mb-4">
                Supports CSV and Excel (.xlsx) files
              </p>
              <input
                id="file-input"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileInput}
                className="hidden"
              />
              <Button variant="outline">Select File</Button>
            </div>
          ) : (
            <>
              {/* File Info */}
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-gray-600" />
                  <div>
                    <div className="font-medium">{file.name}</div>
                    <div className="text-sm text-gray-500">
                      {(file.size / 1024).toFixed(2)} KB
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={handleReset}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Processing State */}
              {isProcessing && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  <span className="ml-3 text-gray-600">Processing file...</span>
                </div>
              )}

              {/* Import Results */}
              {importResult && !isProcessing && (
                <div className="space-y-4">
                  {/* Summary */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-green-600">
                          {importResult.prospects.length}
                        </div>
                        <div className="text-sm text-gray-600">Valid Prospects</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-red-600">
                          {importResult.errors.length}
                        </div>
                        <div className="text-sm text-gray-600">Errors</div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-4">
                        <div className="text-2xl font-bold text-yellow-600">
                          {importResult.warnings.length}
                        </div>
                        <div className="text-sm text-gray-600">Warnings</div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Preview */}
                  {importResult.prospects.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2">Preview (first 5 prospects)</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <div className="overflow-x-auto max-h-64">
                          <table className="w-full text-sm">
                            <thead className="bg-gray-50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left">Name</th>
                                <th className="px-4 py-2 text-left">Company</th>
                                <th className="px-4 py-2 text-left">Email</th>
                                <th className="px-4 py-2 text-left">Phone</th>
                                <th className="px-4 py-2 text-left">Title</th>
                              </tr>
                            </thead>
                            <tbody>
                              {importResult.prospects.slice(0, 5).map((prospect) => (
                                <tr key={prospect.id} className="border-t">
                                  <td className="px-4 py-2">{prospect.contact.name}</td>
                                  <td className="px-4 py-2">{prospect.contact.company || '-'}</td>
                                  <td className="px-4 py-2">{prospect.contact.email || '-'}</td>
                                  <td className="px-4 py-2">{prospect.contact.phone || '-'}</td>
                                  <td className="px-4 py-2">{prospect.contact.title || '-'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                      {importResult.prospects.length > 5 && (
                        <p className="text-sm text-gray-500 mt-2">
                          ... and {importResult.prospects.length - 5} more prospects
                        </p>
                      )}
                    </div>
                  )}

                  {/* Errors */}
                  {importResult.errors.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-red-600">
                        <AlertCircle className="h-4 w-4" />
                        Errors
                      </h3>
                      <div className="border border-red-200 rounded-lg p-3 bg-red-50 max-h-32 overflow-y-auto">
                        <ul className="text-sm text-red-700 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Warnings */}
                  {importResult.warnings.length > 0 && (
                    <div>
                      <h3 className="font-semibold mb-2 flex items-center gap-2 text-yellow-600">
                        <AlertCircle className="h-4 w-4" />
                        Warnings
                      </h3>
                      <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50 max-h-32 overflow-y-auto">
                        <ul className="text-sm text-yellow-700 space-y-1">
                          {importResult.warnings.map((warning, index) => (
                            <li key={index}>• {warning}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>

        {/* Actions */}
        {importResult && importResult.prospects.length > 0 && (
          <div className="border-t p-4 flex justify-end gap-2">
            <Button variant="outline" onClick={handleReset} disabled={isImporting}>
              Reset
            </Button>
            <Button onClick={handleImport} disabled={isImporting}>
              {isImporting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Import {importResult.prospects.length} Prospects
                </>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}

