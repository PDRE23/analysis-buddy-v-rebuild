"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import LeaseAnalyzerApp from "./LeaseAnalyzerApp";
import { PipelineApp } from "./deals/PipelineApp";
import { TeamNotesApp } from "./team/TeamNotesApp";
import { CommandPalette } from "./ui/command-palette";
import { Kanban, FileText, StickyNote, Settings as SettingsIcon } from "lucide-react";
import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "./LeaseAnalyzerApp";
import type { TeamNote } from "@/lib/types/teamNotes";
import { loadTeamNotes } from "@/lib/teamNotesStorage";
import { ensureDemoDeals } from "@/lib/demoDeals";
import { dealStorage } from "@/lib/dealStorage";
import { storage } from "@/lib/storage";
import {
  type CommandPaletteItem,
  createDealItems,
  createAnalysisItems,
  createNoteItems,
  createActionItems,
} from "@/lib/commandPalette";
import { SettingsApp } from "./settings/SettingsApp";
import { useAuth } from "@/context/AuthContext";
import { listDealsForUser } from "@/lib/api/deals";
import { listAnalysesForUser } from "@/lib/api/analyses";

type AppView = "pipeline" | "analysis" | "team-notes" | "settings";

export function AppContainer() {
  const { user, supabase, signOut, loading: authLoading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>("pipeline");
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);
  const [newAnalysisDealId, setNewAnalysisDealId] = useState<string | null>(null);
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisMeta[]>([]);
  const [notes, setNotes] = useState<TeamNote[]>([]);

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

  // Load data for command palette
  useEffect(() => {
    if (authLoading) {
      return;
    }

    // Fallback: run in local/demo mode when Supabase is not configured or no user is signed in.
    if (!supabase || !user) {
      const localDeals = ensureDemoDeals(dealStorage.load());
      const localAnalyses = storage.load() as AnalysisMeta[];
      setDeals(localDeals);
      setAnalyses(localAnalyses);
      setNotes(loadTeamNotes());
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [remoteDeals, remoteAnalyses] = await Promise.all([
          listDealsForUser(supabase, user.id),
          listAnalysesForUser(supabase, user.id),
        ]);

        if (cancelled) return;

        setDeals(remoteDeals);
        setAnalyses(remoteAnalyses);
        setNotes(loadTeamNotes());

        // Keep a local cache so offline mode continues to work.
        dealStorage.save(remoteDeals);
        storage.save(remoteAnalyses);
      } catch (error) {
        console.error("Failed to load workspace data:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, supabase, user]);

  // Keyboard shortcut for command palette (Cmd/Ctrl + K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.includes("Mac");
      const isModKey = isMac ? e.metaKey : e.ctrlKey;
      
      if (isModKey && e.key === "k") {
        e.preventDefault();
        setShowCommandPalette(prev => !prev);
      }
      
      // Close on Escape
      if (e.key === "Escape" && showCommandPalette) {
        setShowCommandPalette(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showCommandPalette]);

  // Create command palette items
  const commandPaletteItems = useMemo<CommandPaletteItem[]>(() => {
    const items: CommandPaletteItem[] = [];

    // Deal items
    if (deals.length > 0) {
      const dealItems = createDealItems(deals, () => {
        // Navigate to deal detail view
        setCurrentView("pipeline");
        setShowCommandPalette(false);
        // Note: We'd need to pass a callback to PipelineApp to handle deal selection
        // For now, this is a placeholder - will be enhanced when we have better state management
      });
      items.push(...dealItems);
    }

    // Analysis items
    if (analyses.length > 0) {
      const analysisItems = createAnalysisItems(analyses, (analysis) => {
        setSelectedAnalysisId(analysis.id);
        setCurrentView("analysis");
        setShowCommandPalette(false);
      });
      items.push(...analysisItems);
    }

    // Note items
    if (notes.length > 0) {
      const noteItems = createNoteItems(notes, () => {
        setCurrentView("team-notes");
        setShowCommandPalette(false);
        // Note: Would need to pass callback to open specific note
      });
      items.push(...noteItems);
    }

    // Action items
    const actionItems = createActionItems({
      onCreateDeal: () => {
        setCurrentView("pipeline");
        setShowCommandPalette(false);
        // Note: Would need to trigger deal creation in PipelineApp
      },
      onCreateAnalysis: () => {
        handleCreateAnalysis();
        setShowCommandPalette(false);
      },
      onExportAll: () => {
        // Export all analyses
        setShowCommandPalette(false);
        // Note: Would need to implement export functionality
      },
      onShowHotLeads: () => {
        setCurrentView("pipeline");
        setShowCommandPalette(false);
        // Note: Would need to filter deals by priority
      },
      onNavigateToPipeline: () => {
        handleBackToPipeline();
        setShowCommandPalette(false);
      },
      onNavigateToAnalyses: () => {
        setSelectedAnalysisId(null);
        setCurrentView("analysis");
        setShowCommandPalette(false);
      },
      onNavigateToTeamNotes: () => {
        setCurrentView("team-notes");
        setShowCommandPalette(false);
      },
      onNavigateToSettings: () => {
        setCurrentView("settings");
        setShowCommandPalette(false);
      },
    });
    items.push(...actionItems);

    return items;
  }, [deals, analyses, notes, handleCreateAnalysis, handleBackToPipeline]);

  return (
    <div className="h-screen flex flex-col">
      {/* Top Navigation Bar */}
      <div className="flex-shrink-0 bg-white border-b px-6 py-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">B²</h1>
            <span className="text-base text-gray-600 font-medium">The Broker Tool Built By Brokers</span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden flex-col text-right text-xs text-gray-500 sm:flex">
              <span className="font-medium text-gray-700">
                {user?.user_metadata?.full_name ?? user?.email ?? "Broker"}
              </span>
              <span className="text-[0.7rem] uppercase tracking-widest text-gray-400">
                Workspace Owner
              </span>
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
              <Button
                variant={currentView === "team-notes" ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCurrentView("team-notes");
                }}
                className="gap-2"
              >
                <StickyNote className="h-4 w-4" />
                Team Notes
              </Button>
              <Button
                variant={currentView === "settings" ? "default" : "outline"}
                size="sm"
                onClick={() => setCurrentView("settings")}
                className="gap-2"
                aria-label="Open workspace settings"
              >
                <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                Settings
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => signOut().catch(console.error)}
              >
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {currentView === "pipeline" && (
        <PipelineApp
          onViewAnalysis={handleViewAnalysis}
          onCreateAnalysis={handleCreateAnalysis}
          onDealsUpdated={setDeals}
          onAnalysesUpdated={setAnalyses}
        />
        )}

        {currentView === "analysis" && (
          <LeaseAnalyzerApp
            initialAnalysisId={selectedAnalysisId}
            initialDealId={newAnalysisDealId}
          onBackToPipeline={handleBackToPipeline}
          onAnalysesChanged={setAnalyses}
          onDealsChanged={setDeals}
          />
        )}

        {currentView === "team-notes" && (
          <TeamNotesApp userName="User" />
        )}

        {currentView === "settings" && (
          <SettingsApp />
        )}
      </div>

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        items={commandPaletteItems}
      />
    </div>
  );
}

