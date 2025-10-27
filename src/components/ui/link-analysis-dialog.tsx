"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { AnalysisMeta } from "@/components/LeaseAnalyzerApp";
import { Search, Link, X } from "lucide-react";

interface LinkAnalysisDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onLink: (analysisId: string) => void;
  availableAnalyses: AnalysisMeta[];
  linkedAnalysisIds: string[];
}

export function LinkAnalysisDialog({
  isOpen,
  onClose,
  onLink,
  availableAnalyses,
  linkedAnalysisIds,
}: LinkAnalysisDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");

  if (!isOpen) return null;

  // Filter analyses based on search and exclude already linked ones
  const filteredAnalyses = availableAnalyses.filter(analysis => {
    const matchesSearch = 
      analysis.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.tenant_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      analysis.market.toLowerCase().includes(searchQuery.toLowerCase());
    
    const notAlreadyLinked = !linkedAnalysisIds.includes(analysis.id);
    
    return matchesSearch && notAlreadyLinked;
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-semibold">Link Analysis to Deal</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <div className="p-6 border-b">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search analyses by name, tenant, or market..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Analysis List */}
        <div className="flex-1 overflow-y-auto p-6">
          {filteredAnalyses.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchQuery ? "No analyses match your search" : "No analyses available to link"}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAnalyses.map(analysis => (
                <div
                  key={analysis.id}
                  className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => onLink(analysis.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold">{analysis.name}</h3>
                        <Badge variant="outline">{analysis.status}</Badge>
                      </div>
                      <div className="text-sm text-gray-600 space-y-1">
                        <div><strong>Tenant:</strong> {analysis.tenant_name}</div>
                        <div><strong>Market:</strong> {analysis.market}</div>
                        <div><strong>RSF:</strong> {analysis.rsf.toLocaleString()}</div>
                      </div>
                    </div>
                    <Button size="sm" className="gap-2">
                      <Link className="h-4 w-4" />
                      Link
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
