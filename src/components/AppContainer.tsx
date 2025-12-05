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
import type { AnalysisMeta } from "./LeaseAnalyzerApp";
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
      {/* Top Navigation Bar - Redesigned */}
      <div className="flex-shrink-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 border-b border-slate-700 shadow-lg">
        <div className="px-6 py-4">
          {/* Top Row: Logo/Branding + User Info + Settings/Sign Out */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-5xl font-extrabold text-white tracking-tight">B²</h1>
              <span className="text-sm text-slate-300 font-medium hidden sm:block">
                The Broker Tool Built By Brokers
              </span>
            </div>
            
            {/* User Info and Actions - Right Side */}
            <div className="flex items-center gap-3">
              <div className="hidden flex-col text-right text-xs text-slate-300 sm:flex">
                <span className="font-medium text-white">
                  {(user as any)?.user_metadata?.full_name ?? (user as any)?.name ?? user?.email ?? "Broker"}
                </span>
                <span className="text-[0.7rem] uppercase tracking-widest text-slate-400">
                  Workspace Owner
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentView("settings")}
                className="gap-2 text-slate-300 hover:text-white hover:bg-slate-700"
                aria-label="Open workspace settings"
              >
                <SettingsIcon className="h-4 w-4" aria-hidden="true" />
                <span className="hidden sm:inline">Settings</span>
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => signOut().catch(console.error)}
                className="gap-2 text-slate-300 hover:text-white hover:bg-slate-700"
              >
                <span className="hidden sm:inline">Sign Out</span>
              </Button>
            </div>
          </div>

          {/* Subtle Divider */}
          <div className="border-t border-slate-700/50 mb-3"></div>

          {/* Main Navigation Tabs - Color Coded */}
          <div className="flex items-center gap-2">
            {/* Prospects Tab - Blue */}
            <button
              onClick={() => setCurrentView("prospects")}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 relative
                ${currentView === "prospects" 
                  ? "bg-blue-600 text-white shadow-lg shadow-blue-500/50 scale-105" 
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]"}
              `}
              aria-label="Prospects"
              aria-pressed={currentView === "prospects"}
            >
              <Phone className="h-4 w-4" />
              <span className="hidden sm:inline">Prospects</span>
              {currentView === "prospects" && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-blue-400 rounded-full"></div>
              )}
            </button>

            {/* Pipeline Tab - Green */}
            <button
              onClick={handleBackToPipeline}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 relative
                ${currentView === "pipeline" 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/50 scale-105" 
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]"}
              `}
              aria-label="Pipeline"
              aria-pressed={currentView === "pipeline"}
            >
              <Kanban className="h-4 w-4" />
              <span className="hidden sm:inline">Pipeline</span>
              {currentView === "pipeline" && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-emerald-400 rounded-full"></div>
              )}
            </button>

            {/* Analyses Tab - Purple */}
            <button
              onClick={() => {
                if (currentView !== "analysis") {
                  setSelectedAnalysisId(null);
                  setCurrentView("analysis");
                }
              }}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 relative
                ${currentView === "analysis" 
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-500/50 scale-105" 
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]"}
              `}
              aria-label="Analyses"
              aria-pressed={currentView === "analysis"}
            >
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Analyses</span>
              {currentView === "analysis" && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-purple-400 rounded-full"></div>
              )}
            </button>

            {/* Team Notes Tab - Orange */}
            <button
              onClick={() => setCurrentView("team-notes")}
              className={`
                flex items-center gap-2 px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 relative
                ${currentView === "team-notes" 
                  ? "bg-orange-600 text-white shadow-lg shadow-orange-500/50 scale-105" 
                  : "bg-slate-700/50 text-slate-300 hover:bg-slate-700 hover:text-white hover:scale-[1.02]"}
              `}
              aria-label="Team Notes"
              aria-pressed={currentView === "team-notes"}
            >
              <StickyNote className="h-4 w-4" />
              <span className="hidden sm:inline">Team Notes</span>
              {currentView === "team-notes" && (
                <div className="absolute -bottom-0.5 left-1/2 transform -translate-x-1/2 w-3/4 h-0.5 bg-orange-400 rounded-full"></div>
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

