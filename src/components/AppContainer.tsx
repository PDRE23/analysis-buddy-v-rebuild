"use client";

import React, { useState, useCallback, useEffect, useMemo } from "react";
import { nanoid } from "nanoid";
import { Button } from "@/components/ui/button";
import LeaseAnalyzerApp from "./LeaseAnalyzerApp";
import { PipelineApp } from "./deals/PipelineApp";
import { TeamNotesApp } from "./team/TeamNotesApp";
import { ProspectsApp } from "./prospects/ProspectsApp";
import { CommandPalette } from "./ui/command-palette";
import { Kanban, FileText, StickyNote, Settings as SettingsIcon, Phone } from "lucide-react";
import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "@/types";
import type { TeamNote } from "@/lib/types/teamNotes";
import type { Prospect } from "@/lib/types/prospect";
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
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { listDealsForUser } from "@/lib/api/deals";
import { listAnalysesForUser } from "@/lib/api/analyses";

type AppView = "pipeline" | "analysis" | "team-notes" | "settings" | "prospects";

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
    if (!isSupabaseConfigured || !supabase || !user) {
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
        // Add timeout wrapper - if Supabase is slow, fall back to local storage
        const dealsPromise = listDealsForUser(supabase, user.id);
        const analysesPromise = listAnalysesForUser(supabase, user.id);
        
        const [remoteDeals, remoteAnalyses] = await Promise.race([
          Promise.all([dealsPromise, analysesPromise]),
          new Promise<[Deal[], AnalysisMeta[]]>((resolve) =>
            setTimeout(() => {
              // Fallback to local storage on timeout
              console.warn("Supabase data load timeout, using local storage");
              resolve([
                ensureDemoDeals(dealStorage.load()),
                storage.load() as AnalysisMeta[],
              ]);
            }, 3000)
          ),
        ]);

        if (cancelled) return;

        setDeals(remoteDeals);
        setAnalyses(remoteAnalyses);
        setNotes(loadTeamNotes());

        // Keep a local cache so offline mode continues to work.
        dealStorage.save(remoteDeals);
        storage.save(remoteAnalyses);
      } catch (error) {
        console.error("Failed to load workspace data, using local storage:", error);
        // Fallback to local storage
        const localDeals = ensureDemoDeals(dealStorage.load());
        const localAnalyses = storage.load() as AnalysisMeta[];
        setDeals(localDeals);
        setAnalyses(localAnalyses);
        setNotes(loadTeamNotes());
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authLoading, supabase, user]);

  // Keyboard shortcut for command palette (Cmd/Ctrl + K)
  useEffect(() => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return;
    
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
      <div className="flex-shrink-0 bg-gradient-to-r from-[#0f1729] via-[#162040] to-[#0f1729] border-b border-white/[0.06] shadow-[0_1px_3px_rgba(0,0,0,0.4)]">
        <div className="px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <h1 className="text-3xl font-bold text-white tracking-tight leading-none">
                B<sup className="text-amber-400 text-lg font-bold">2</sup>
              </h1>
              <div className="hidden sm:block h-5 w-px bg-white/10"></div>
              <span className="text-xs text-slate-400 font-light tracking-wide hidden sm:block uppercase">
                The Broker Tool Built By Brokers
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-white/90">
                  {(user as any)?.user_metadata?.full_name ?? (user as any)?.name ?? user?.email ?? "Broker"}
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.15em] text-slate-500">
                  Workspace Owner
                </span>
              </div>
              <div className="hidden sm:block h-6 w-px bg-white/[0.08]"></div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("settings")}
                className="gap-1.5 text-slate-400 hover:text-white/90 hover:bg-white/[0.06] transition-colors duration-150"
                aria-label="Open workspace settings"
              >
                <SettingsIcon className="h-3.5 w-3.5" aria-hidden="true" />
                <span className="hidden sm:inline text-xs">Settings</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut().catch(console.error)}
                className="gap-1.5 text-slate-400 hover:text-white/90 hover:bg-white/[0.06] transition-colors duration-150"
              >
                <span className="hidden sm:inline text-xs">Sign Out</span>
              </Button>
            </div>
          </div>

          <div className="h-px bg-gradient-to-r from-transparent via-amber-500/20 to-transparent mb-3"></div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentView("prospects")}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors duration-150 relative
                ${currentView === "prospects"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}
              `}
              aria-label="Prospects"
              aria-pressed={currentView === "prospects"}
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Prospects</span>
              {currentView === "prospects" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400/80 rounded-full"></div>
              )}
            </button>

            <button
              onClick={handleBackToPipeline}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors duration-150 relative
                ${currentView === "pipeline"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}
              `}
              aria-label="Pipeline"
              aria-pressed={currentView === "pipeline"}
            >
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
              {currentView === "pipeline" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400/80 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => {
                if (currentView !== "analysis") {
                  setSelectedAnalysisId(null);
                  setCurrentView("analysis");
                }
              }}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors duration-150 relative
                ${currentView === "analysis"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}
              `}
              aria-label="Analyses"
              aria-pressed={currentView === "analysis"}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Analyses</span>
              {currentView === "analysis" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400/80 rounded-full"></div>
              )}
            </button>

            <button
              onClick={() => setCurrentView("team-notes")}
              className={`
                flex items-center gap-2 px-5 py-2 rounded-md font-medium text-sm transition-colors duration-150 relative
                ${currentView === "team-notes"
                  ? "bg-white/10 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-slate-200"}
              `}
              aria-label="Team Notes"
              aria-pressed={currentView === "team-notes"}
            >
              <StickyNote className="h-4 w-4" />
              <span className="hidden sm:inline">Team Notes</span>
              {currentView === "team-notes" && (
                <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400/80 rounded-full"></div>
              )}
            </button>
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

        {currentView === "prospects" && (
          <ProspectsApp
            onConvertToDeal={(prospect: Prospect) => {
              // Convert prospect to deal
              // Create a new deal from prospect data
              const newDeal: Deal = {
                id: nanoid(),
                clientName: prospect.contact.name,
                clientCompany: prospect.contact.company,
                property: {
                  address: "", // Will need to be filled in
                  city: "",
                  state: "",
                },
                stage: "Lead",
                priority: prospect.priority,
                rsf: 0, // Will need to be filled in
                leaseTerm: 0, // Will need to be filled in
                broker: "", // Will need to be filled in
                status: "Active",
                analysisIds: [],
                activities: [
                  {
                    id: nanoid(),
                    timestamp: new Date().toISOString(),
                    type: "note",
                    description: `Converted from prospect: ${prospect.contact.name}`,
                  },
                ],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              };

              // Add deal to deals list
              setDeals(prev => [...prev, newDeal]);
              
              // Navigate to pipeline
              setCurrentView("pipeline");
            }}
          />
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

