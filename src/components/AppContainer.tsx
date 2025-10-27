"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import LeaseAnalyzerApp from "./LeaseAnalyzerApp";
import { PipelineApp } from "./deals/PipelineApp";
import { Kanban, FileText } from "lucide-react";

type AppView = "pipeline" | "analysis";

export function AppContainer() {
  const [currentView, setCurrentView] = useState<AppView>("pipeline");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [newAnalysisDealId, setNewAnalysisDealId] = useState<string | null>(null);

  const handleViewAnalysis = useCallback((analysisId: string) => {
    setSelectedAnalysisId(analysisId);
    setCurrentView("analysis");
  }, []);

  const handleCreateAnalysis = useCallback((dealId?: string) => {
    setNewAnalysisDealId(dealId || null);
    setSelectedAnalysisId(null);
    setCurrentView("analysis");
  }, []);

  const handleBackToPipeline = useCallback(() => {
    setSelectedAnalysisId(null);
    setNewAnalysisDealId(null);
    setCurrentView("pipeline");
  }, []);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-white border-b px-4 py-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-gray-900">Analysis Buddy V2</h1>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant={currentView === "pipeline" ? "default" : "outline"}
              size="sm"
              onClick={handleBackToPipeline}
              className="gap-2"
            >
              <Kanban className="h-4 w-4" />
              Pipeline
            </Button>
            <Button
              variant={currentView === "analysis" ? "default" : "outline"}
              size="sm"
              onClick={() => {
                if (currentView !== "analysis") {
                  setSelectedAnalysisId(null);
                  setCurrentView("analysis");
                }
              }}
              className="gap-2"
            >
              <FileText className="h-4 w-4" />
              Analyses
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "pipeline" && (
          <PipelineApp
            onViewAnalysis={handleViewAnalysis}
            onCreateAnalysis={handleCreateAnalysis}
          />
        )}

        {currentView === "analysis" && (
          <LeaseAnalyzerApp
            initialAnalysisId={selectedAnalysisId}
            initialDealId={newAnalysisDealId}
            onBackToPipeline={handleBackToPipeline}
          />
        )}
      </div>
    </div>
  );
}

