"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { nanoid } from "nanoid";
import { storage } from "@/lib/storage";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { listAnalysesForUser, upsertAnalysesForUser } from "@/lib/api/analyses";
import { listDealsForUser, upsertDealForUser } from "@/lib/api/deals";
import { dealStorage } from "@/lib/dealStorage";
import { ErrorBoundary, useErrorHandler } from "@/components/ErrorBoundary";
import { AsyncErrorBoundary } from "@/components/AsyncErrorBoundary";
import { ClientOnly } from "@/components/ClientOnly";
import { DuplicateDialog, applyDuplicateOptions } from "@/components/ui/duplicate-dialog";
import type { DuplicateOptions } from "@/components/ui/duplicate-dialog";
import { buildAnnualCashflow } from "@/lib/calculations/cashflow-engine";
import { npv, effectiveRentPSF } from "@/lib/calculations/metrics-engine";
import type { 
  LeaseType,
  ProposalSide,
  AnalysisMeta,
  Proposal,
} from "@/types";
import type { Deal } from "@/lib/types/deal";
import { 
  isAnalysisLinkedToDeal,
  linkAnalysisToDeal,
  unlinkAnalysisFromDeal,
  createDealFromAnalysis,
  syncAnalysisToDeal
} from "@/lib/dealAnalysisSync";
import { PresentationMode } from "@/components/presentation/PresentationMode";
import { formatDateOnly, parseDateOnly } from "@/lib/dateOnly";
import { QuickPresentationMode } from "@/components/analysis/QuickPresentationMode";
import { HomeList } from "@/components/analysis/HomeList";
import { ProposalsBoard } from "@/components/analysis/ProposalsBoard";
import { Workspace } from "@/components/analysis/Workspace";

/*************************************************
 * Types & Data Model
 *************************************************/


/*************************************************
 * Utilities
 *************************************************/

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

const fmtRate = (v: number | undefined) => `$${(v ?? 0).toFixed(2)}/SF/yr`;

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/*************************************************
 * Demo Data
 *************************************************/

const baseScenario = (): AnalysisMeta => ({
  id: nanoid(),
  name: "Demo — 20k RSF Class A",
  status: "Draft",
  tenant_name: "Acme Robotics",
  market: "Miami-Dade",
  rsf: 20000,
  lease_type: "FS",
  base_year: 2026,
  key_dates: {
    commencement: "2026-01-01",
    expiration: "2035-12-31",
  },
  operating: {
    est_op_ex_psf: 18,
    escalation_method: "fixed",
    escalation_value: 0.03,
  },
  rent_schedule: [
    { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 48, escalation_percentage: 0.03 },
    { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 51, escalation_percentage: 0.03 },
    { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 55, escalation_percentage: 0.03 },
  ],
  concessions: { 
    ti_allowance_psf: 75, 
    moving_allowance: 250000,
    abatement_type: "at_commencement",
    abatement_free_rent_months: 6,
    abatement_applies_to: "base_plus_nnn",
  },
  parking: { monthly_rate_per_stall: 180, stalls: 40, escalation_method: "fixed", escalation_value: 0.03 },
  options: [
    { type: "Renewal", window_open: "2034-01-01", window_close: "2034-06-30", terms: "+Fair Market with 3% cap" },
  ],
  cashflow_settings: { discount_rate: 0.08, granularity: "annual" },
  proposals: [],
});

const demoProposals = (): Proposal[] => {
  const ll: Proposal = {
    id: nanoid(),
    side: "Landlord",
    label: "LL v1",
    created_at: new Date().toISOString(),
    meta: { ...baseScenario(), name: "Landlord Proposal v1" },
  };
  const tn: Proposal = {
    id: nanoid(),
    side: "Tenant",
    label: "Tenant Counter 1",
    created_at: new Date().toISOString(),
    meta: {
      ...baseScenario(),
      name: "Tenant Counter v1",
      rent_schedule: [
        { period_start: "2026-01-01", period_end: "2028-12-31", rent_psf: 47, escalation_percentage: 0.03 },
        { period_start: "2029-01-01", period_end: "2031-12-31", rent_psf: 50, escalation_percentage: 0.03 },
        { period_start: "2032-01-01", period_end: "2035-12-31", rent_psf: 54, escalation_percentage: 0.03 },
      ],
      concessions: {
        ...baseScenario().concessions,
        abatement_type: "at_commencement",
        abatement_free_rent_months: 3,
        abatement_applies_to: "base_only",
      },
    },
  };
  return [ll, tn];
};

/*************************************************
 * UI Components
 *************************************************/

/*************************************************
 * Main App
 *************************************************/

interface LeaseAnalyzerAppProps {
  initialAnalysisId?: string | null;
  initialDealId?: string | null;
  onBackToPipeline?: () => void;
  onAnalysesChanged?: (analyses: AnalysisMeta[]) => void;
  onDealsChanged?: (deals: Deal[]) => void;
}

export default function LeaseAnalyzerApp({ 
  initialAnalysisId = null, 
  initialDealId = null,
  onBackToPipeline,
  onAnalysesChanged,
  onDealsChanged,
}: LeaseAnalyzerAppProps = {}) {
  const [analyses, setAnalyses] = useState<AnalysisMeta[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialAnalysisId);
  const [selectedProposalId, setSelectedProposalId] = useState<string | null>(null);
  const [pendingNewAnalysisId, setPendingNewAnalysisId] = useState<string | null>(null);
  const processedPendingIdRef = useRef<string | null>(null);
  const [presentationMode, setPresentationMode] = useState(false);
  const [quickPresentationMode, setQuickPresentationMode] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const [storageStats, setStorageStats] = useState<{
    totalAnalyses: number;
    totalProposals: number;
    lastSaved?: string;
    deviceId: string;
    version: string;
    hasBackup: boolean;
  } | null>(null);
  const [showStorageInfo, setShowStorageInfo] = useState(false);
  
  // Duplicate dialog state
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [duplicateSourceAnalysis, setDuplicateSourceAnalysis] = useState<AnalysisMeta | null>(null);
  
  // Error handling
  const { reportError } = useErrorHandler();
  const { user: supabaseUser, supabase } = useAuth();

  const selectedAnalysis = analyses.find((a) => a.id === selectedId) ?? null;
  const selectedProposal = (selectedAnalysis?.proposals as Proposal[])?.find((p) => p.id === selectedProposalId) ?? null;

  // Handle pending new analysis - set selectedId when it appears in the array
  useEffect(() => {
    if (!pendingNewAnalysisId) {
      // Reset ref when pending is cleared
      if (processedPendingIdRef.current) {
        processedPendingIdRef.current = null;
      }
      return;
    }
    
    // Skip if we've already processed this ID
    if (processedPendingIdRef.current === pendingNewAnalysisId) {
      return;
    }
    
    const found = analyses.find((a) => a.id === pendingNewAnalysisId);
    if (found) {
      console.log('🔧 New analysis found in array, setting as selected:', pendingNewAnalysisId);
      // Mark as processed to prevent re-running
      processedPendingIdRef.current = pendingNewAnalysisId;
      // Clear pending first to prevent re-triggering
      setPendingNewAnalysisId(null);
      setSelectedId(pendingNewAnalysisId);
      // Auto-select the base proposal if it exists
      if (found.proposals && found.proposals.length > 0) {
        const baseProposal = found.proposals[0];
        console.log('🔧 Auto-selecting base proposal:', baseProposal.id);
        setSelectedProposalId(baseProposal.id);
      }
    }
  }, [pendingNewAnalysisId, analyses]);

  // Ensure selectedId is set when a new analysis is created
  useEffect(() => {
    // If we have a selectedId but the analysis isn't found yet, wait for it
    if (selectedId && !selectedAnalysis) {
      // The analysis should appear soon, but if it doesn't after a short delay, reset
      const timeout = setTimeout(() => {
        if (!analyses.find((a) => a.id === selectedId)) {
          console.warn('Selected analysis not found, resetting selection');
          setSelectedId(null);
        }
      }, 100);
      return () => clearTimeout(timeout);
    }
  }, [selectedId, selectedAnalysis, analyses]);

  // Track previous analyses to prevent unnecessary parent updates
  const prevAnalysesRef = useRef<AnalysisMeta[]>([]);
  const isInitialMountRef = useRef(true);
  const onAnalysesChangedRef = useRef(onAnalysesChanged);
  
  // Keep callback ref up to date
  useEffect(() => {
    onAnalysesChangedRef.current = onAnalysesChanged;
  }, [onAnalysesChanged]);
  
  // Notify parent of analyses changes - only when content actually changes
  useEffect(() => {
    // Skip on initial mount to prevent unnecessary callback
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      prevAnalysesRef.current = analyses;
      return;
    }
    
    // Compare by serializing key fields to detect actual changes
    const prevSerialized = JSON.stringify(prevAnalysesRef.current.map(a => ({ id: a.id, name: a.name, status: a.status })));
    const currentSerialized = JSON.stringify(analyses.map(a => ({ id: a.id, name: a.name, status: a.status })));
    
    // Only notify if the content actually changed
    if (prevSerialized !== currentSerialized) {
      prevAnalysesRef.current = analyses;
      onAnalysesChangedRef.current?.(analyses);
    }
  }, [analyses]);

  // Track previous deals to prevent unnecessary parent updates
  const prevDealsRef = useRef<Deal[]>([]);
  const isInitialDealsMountRef = useRef(true);
  const onDealsChangedRef = useRef(onDealsChanged);
  
  // Keep callback ref up to date
  useEffect(() => {
    onDealsChangedRef.current = onDealsChanged;
  }, [onDealsChanged]);
  
  // Notify parent of deals changes - only when content actually changes
  useEffect(() => {
    // Skip on initial mount to prevent unnecessary callback
    if (isInitialDealsMountRef.current) {
      isInitialDealsMountRef.current = false;
      prevDealsRef.current = deals;
      return;
    }
    
    // Compare by serializing key fields to detect actual changes
    const prevSerialized = JSON.stringify(prevDealsRef.current.map(d => ({ id: d.id, clientName: d.clientName, stage: d.stage })));
    const currentSerialized = JSON.stringify(deals.map(d => ({ id: d.id, clientName: d.clientName, stage: d.stage })));
    
    // Only notify if the content actually changed
    if (prevSerialized !== currentSerialized) {
      prevDealsRef.current = deals;
      onDealsChangedRef.current?.(deals);
    }
  }, [deals]);

  useEffect(() => {
    if (!supabase || !supabaseUser) {
      dealStorage.save(deals);
    }
  }, [deals, supabase, supabaseUser]);

  // Track if data has been loaded to prevent re-loading
  const hasLoadedDataRef = useRef(false);
  
  // Load data from Supabase/local storage on mount - only run once
  useEffect(() => {
    // Only load data once
    if (hasLoadedDataRef.current) {
      return;
    }
    
    hasLoadedDataRef.current = true;
    
    const loadData = async () => {
      setIsLoading(true); // Ensure loading starts
      try {
        if (!supabase || !supabaseUser) {
          const storedAnalyses = storage.load() as AnalysisMeta[];
          const storedDeals = dealStorage.load();
          if (storedAnalyses.length > 0) {
            setAnalyses(storedAnalyses);
          } else {
            const today = formatDateOnly(new Date());
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "David Barbeito CPA PA",
              status: "Draft" as const,
              tenant_name: "Acme Robotics",
              market: "Miami-Dade",
              rsf: 20000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: formatDateOnly(
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5)
                ),
              },
              operating: {
                est_op_ex_psf: 15.5,
                escalation_method: "fixed",
                escalation_value: 0.03,
              },
              rent_schedule: [
                {
                  period_start: today,
                  period_end: formatDateOnly(
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                  ),
                  rent_psf: 32.0,
                  escalation_percentage: 0.03,
                },
              ],
              concessions: {
                ti_allowance_psf: 45.0,
                moving_allowance: 50000,
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "Demo analysis for testing",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            storage.save([demoAnalysis]);
          }

          setDeals(storedDeals);
          setStorageStats(storage.getStats());
          setLastSaved(new Date().toISOString());
          // Don't return here - let finally block handle setIsLoading(false)
        } else if (isSupabaseConfigured && supabase && supabaseUser) {
          // Add timeout wrapper - if Supabase is slow, fall back to local storage
          let remoteAnalyses: AnalysisMeta[];
          let remoteDeals: Deal[];
          
          try {
            const analysesPromise = listAnalysesForUser(supabase, supabaseUser.id);
            const dealsPromise = listDealsForUser(supabase, supabaseUser.id);
            
            [remoteAnalyses, remoteDeals] = await Promise.race([
              Promise.all([analysesPromise, dealsPromise]),
              new Promise<[AnalysisMeta[], Deal[]]>((resolve) =>
                setTimeout(() => {
                  // Fallback to local storage on timeout
                  console.warn("Supabase data load timeout in LeaseAnalyzerApp, using local storage");
                  const storedAnalyses = storage.load() as AnalysisMeta[];
                  const storedDeals = dealStorage.load();
                  resolve([storedAnalyses, storedDeals]);
                }, 3000)
              ),
            ]);
          } catch (error) {
            // #region agent log
            const requestId = crypto.randomUUID();
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:608',message:'LeaseAnalyzerApp loadData catch block entry',data:{requestId,errorType:typeof error,errorMessage:error instanceof Error?error.message:String(error),isNetworkError:error instanceof Error&&(error.message?.toLowerCase().includes('fetch')||error.message?.toLowerCase().includes('network')||error.message?.toLowerCase().includes('timeout')),hasSupabase:!!supabase,hasSupabaseUser:!!supabaseUser},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            // If Supabase fails, fall back to local storage
            console.warn("Supabase data load failed in LeaseAnalyzerApp, using local storage:", error);
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:611',message:'LeaseAnalyzerApp before loading from local storage',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            const storedAnalyses = storage.load() as AnalysisMeta[];
            const storedDeals = dealStorage.load();
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:614',message:'LeaseAnalyzerApp after loading from local storage',data:{requestId,storedAnalysesCount:storedAnalyses.length,storedDealsCount:storedDeals.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
            remoteAnalyses = storedAnalyses;
            remoteDeals = storedDeals;
            // #region agent log
            fetch('http://127.0.0.1:7242/ingest/cbd4c245-b3ae-4bd5-befa-846cd00012b5',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'LeaseAnalyzerApp.tsx:617',message:'LeaseAnalyzerApp loadData catch block exit',data:{requestId},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
            // #endregion
          }

          if (remoteAnalyses.length > 0) {
            setAnalyses(remoteAnalyses);
            setDeals(remoteDeals);
            storage.save(remoteAnalyses);
            dealStorage.save(remoteDeals);
            setStorageStats({
              totalAnalyses: remoteAnalyses.length,
              totalProposals: remoteAnalyses.reduce(
                (acc, analysis) => acc + (analysis.proposals?.length ?? 0),
                0
              ),
              lastSaved: new Date().toISOString(),
              deviceId: supabaseUser?.id ?? "guest",
              version: "supabase",
              hasBackup: false,
            });
          } else {
            const today = formatDateOnly(new Date());
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "David Barbeito CPA PA",
              status: "Draft" as const,
              tenant_name: "Acme Robotics",
              market: "Miami-Dade",
              rsf: 20000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: formatDateOnly(
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5)
                ),
              },
              operating: {
                est_op_ex_psf: 15.5,
                escalation_method: "fixed",
                escalation_value: 0.03,
              },
              rent_schedule: [
                {
                  period_start: today,
                  period_end: formatDateOnly(
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
                  ),
                  rent_psf: 32.0,
                  escalation_percentage: 0.03,
                },
              ],
              concessions: {
                ti_allowance_psf: 45.0,
                moving_allowance: 50000,
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "Demo analysis for testing",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            setDeals(remoteDeals);

            if (isSupabaseConfigured && supabase && supabaseUser) {
              await upsertAnalysesForUser(supabase, supabaseUser.id, [demoAnalysis]);
            }
            dealStorage.save(remoteDeals);
            storage.save([demoAnalysis]);

            console.log("📁 Initialized with demo data");
            setStorageStats({
              totalAnalyses: 1,
              totalProposals: demoAnalysis.proposals.length,
              lastSaved: new Date().toISOString(),
              deviceId: supabaseUser?.id ?? "guest",
              version: "supabase",
              hasBackup: false,
            });
          }

          setLastSaved(new Date().toISOString());
        }
      } catch (error) {
        console.error("❌ Failed to load data, falling back to local storage:", error);
        reportError(error as Error, "Data loading");

        // Try to load from local storage as fallback
        try {
          const storedAnalyses = storage.load() as AnalysisMeta[];
          const storedDeals = dealStorage.load();
          
          if (storedAnalyses.length > 0) {
            setAnalyses(storedAnalyses);
            setDeals(storedDeals);
            setStorageStats(storage.getStats());
            setLastSaved(new Date().toISOString());
          } else {
            // No local data, create demo
            const today = formatDateOnly(new Date());
            const demoAnalysis: AnalysisMeta = {
              id: nanoid(),
              name: "Demo Analysis",
              status: "Draft" as const,
              tenant_name: "Demo Tenant",
              market: "Demo Market",
              rsf: 10000,
              lease_type: "FS" as LeaseType,
              key_dates: {
                commencement: today,
                expiration: formatDateOnly(
                  new Date(Date.now() + 365 * 24 * 60 * 60 * 1000 * 5)
                ),
              },
              operating: {
          escalation_type: "fixed",
        },
              rent_schedule: [],
        rent_escalation: {
          escalation_type: "fixed",
          fixed_escalation_percentage: 0,
        },
              concessions: {
                abatement_type: "at_commencement",
              },
              options: [],
              cashflow_settings: {
                discount_rate: 0.08,
                granularity: "annual",
              },
              notes: "",
              proposals: demoProposals(),
            };
            setAnalyses([demoAnalysis]);
            setDeals([]);
          }
        } catch (localError) {
          console.error("Failed to load from local storage:", localError);
          // Last resort: empty state
          setAnalyses([]);
          setDeals([]);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [supabase, supabaseUser, reportError]);


  // Auto-save when analyses change (with proper dependency management and reduced frequency)
  useEffect(() => {
    if (!isLoading && analyses.length > 0) {
      // Use a ref to track the latest analyses to prevent race conditions
      const timeoutId = setTimeout(() => {
        (async () => {
          try {
            // Get the latest analyses state at save time
            const latestAnalyses = analyses;
            
            if (isSupabaseConfigured && supabase && supabaseUser) {
              await upsertAnalysesForUser(supabase, supabaseUser.id, latestAnalyses);
            }
            
            const saveResult = storage.save(latestAnalyses);
            if (saveResult.success) {
              setLastSaved(new Date().toISOString());
              setStorageStats({
                totalAnalyses: latestAnalyses.length,
                totalProposals: latestAnalyses.reduce(
                  (acc, analysis) => acc + (analysis.proposals?.length ?? 0),
                  0
                ),
                lastSaved: new Date().toISOString(),
                deviceId: supabaseUser?.id ?? "guest",
                version: supabase && supabaseUser ? "supabase" : "local",
                hasBackup: false,
              });
            } else {
              console.error("❌ Auto-save failed:", saveResult.error);
              reportError(
                new Error(saveResult.error || "Auto-save failed"),
                "Auto-save"
              );
            }
          } catch (error) {
            console.error("❌ Auto-save error:", error);
            reportError(error as Error, "Auto-save");
          }
        })();
      }, 2000); // Reduced from 3000ms to 2000ms for faster saves

      return () => clearTimeout(timeoutId);
    }
  }, [analyses, isLoading, reportError, supabase, supabaseUser]);

  // Derived
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return analyses.filter((a) => !q || a.name.toLowerCase().includes(q) || a.tenant_name.toLowerCase().includes(q));
  }, [analyses, query]);

  const createNewAnalysis = () => {
    console.log('🔧 createNewAnalysis called');
    try {
      const id = nanoid();
      const today = formatDateOnly(new Date());
      console.log('🔧 Generated ID:', id);
      
      const newAnalysis: AnalysisMeta = {
        id,
        name: "",
        status: "Draft",
        tenant_name: "",
        market: "",
        rsf: 0,
        lease_type: "FS",
        rep_type: undefined,
        key_dates: {
          commencement: "",
          expiration: "",
        },
        lease_term: {
          years: 5,
          months: 0,
          include_abatement_in_term: false,
        },
        operating: {
          escalation_type: "fixed",
        },
        rent_schedule: [],
        rent_escalation: {
          escalation_type: "fixed",
          fixed_escalation_percentage: 0,
        },
        concessions: {
          abatement_type: "at_commencement",
        },
        options: [],
        cashflow_settings: {
          discount_rate: 0.08,
          granularity: "annual",
        },
        notes: "",
        proposals: [],
      };
      
      // Auto-create base proposal - default to "Tenant" side
      const baseProposal: Proposal = {
        id: nanoid(),
        side: "Tenant",
        label: "v1",
        created_at: new Date().toISOString(),
        meta: { ...newAnalysis }, // Use the actual analysis data, not demo data
      };
      
      // Add base proposal to the analysis
      newAnalysis.proposals = [baseProposal];
      
      console.log('🔧 Created new analysis with base proposal:', newAnalysis);
      
      // Use pendingNewAnalysisId mechanism to ensure selectedId is set AFTER analyses updates
      // This prevents race conditions where selectedAnalysis might be null
      setPendingNewAnalysisId(id);
      
      // Update state; persistence handled by auto-save
      setAnalyses((prev) => {
        const updated = [newAnalysis, ...prev];
        console.log('🔧 Updated analyses array:', updated);
        
        // Also save to Supabase if available (async)
        if (supabase && supabaseUser) {
          upsertAnalysesForUser(supabase, supabaseUser.id, updated).catch((error) =>
            console.error("Failed to sync new analysis:", error)
          );
        }
        
        return updated;
      });
      
    } catch (error) {
      console.error('❌ Error in createNewAnalysis:', error);
      reportError(error as Error, 'Create New Analysis');
    }
  };

  const duplicate = (id: string) => {
    const src = analyses.find((a) => a.id === id);
    if (!src) return;
    setDuplicateSourceAnalysis(src);
    setDuplicateDialogOpen(true);
  };

  const handleDuplicateConfirm = (options: DuplicateOptions) => {
    if (!duplicateSourceAnalysis) return;
    
    try {
      // Calculate original term in months
      const commencement = parseDateOnly(duplicateSourceAnalysis.key_dates.commencement);
      const expiration = parseDateOnly(duplicateSourceAnalysis.key_dates.expiration);
      if (!commencement || !expiration) {
        throw new Error("Invalid key dates in duplicate source analysis");
      }
      const originalTermMonths = Math.round(
        (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
      );
      
      // Create duplicate with applied options
      const copy = applyDuplicateOptions(duplicateSourceAnalysis, options);
      copy.id = nanoid();
      
      setAnalyses((prev) => [copy, ...prev]);
      setDuplicateDialogOpen(false);
      setDuplicateSourceAnalysis(null);
    } catch (error) {
      console.error('❌ Error duplicating analysis:', error);
      reportError(error as Error, 'Duplicate Analysis');
      alert('Failed to duplicate analysis. Please try again.');
    }
  };

  const handleDuplicateCancel = () => {
    setDuplicateDialogOpen(false);
    setDuplicateSourceAnalysis(null);
  };

  const remove = (id: string) => setAnalyses((prev) => prev.filter((a) => a.id !== id));

  // Deal linking handlers
  const handleLinkAnalysisToDeal = useCallback((analysisId: string, dealId: string) => {
    try {
      const deal = deals.find(d => d.id === dealId);
      if (!deal) {
        console.error('Deal not found:', dealId);
        return;
      }

      // Link analysis to deal
      const updatedDeal = linkAnalysisToDeal(deal, analysisId);
      setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
          console.error("Failed to link analysis to deal:", error)
        );
      }
      
      console.log('✅ Linked analysis', analysisId, 'to deal', dealId);
    } catch (error) {
      console.error('Error linking analysis to deal:', error);
      reportError(error as Error, 'Link analysis to deal');
    }
  }, [deals, reportError, supabase, supabaseUser]);

  const handleUnlinkAnalysisFromDeal = useCallback((analysisId: string) => {
    try {
      const linkedDeal = isAnalysisLinkedToDeal(analysisId, deals);
      if (linkedDeal) {
        const updatedDeal = unlinkAnalysisFromDeal(linkedDeal, analysisId);
        setDeals(prev => prev.map(d => d.id === linkedDeal.id ? updatedDeal : d));
        if (isSupabaseConfigured && supabase && supabaseUser) {
          upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
            console.error("Failed to unlink analysis from deal:", error)
          );
        }
        console.log('✅ Unlinked analysis', analysisId, 'from deal');
      }
    } catch (error) {
      console.error('Error unlinking analysis from deal:', error);
      reportError(error as Error, 'Unlink analysis from deal');
    }
  }, [deals, reportError, supabase, supabaseUser]);

  const handleSyncAnalysisToDeal = useCallback((analysisId: string) => {
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      const linkedDeal = isAnalysisLinkedToDeal(analysisId, deals);
      
      if (!analysis || !linkedDeal) {
        console.error('Cannot sync - analysis or deal not found');
        return;
      }

      // Sync analysis data to deal
      const updatedDeal = syncAnalysisToDeal(linkedDeal, analyses);
      setDeals(prev => prev.map(d => d.id === linkedDeal.id ? updatedDeal : d));
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
          console.error("Failed to sync analysis to deal:", error)
        );
      }
      
      console.log('✅ Synced analysis to deal');
    } catch (error) {
      console.error('Error syncing analysis to deal:', error);
      reportError(error as Error, 'Sync analysis to deal');
    }
  }, [analyses, deals, reportError, supabase, supabaseUser]);

  const handleCreateDealFromAnalysis = useCallback((analysisId: string) => {
    try {
      const analysis = analyses.find(a => a.id === analysisId);
      if (!analysis) {
        console.error('Analysis not found:', analysisId);
        return;
      }

      // Create new deal from analysis
      const dealData = createDealFromAnalysis(analysis, {
        id: nanoid(),
        stage: "Proposal",
        priority: "Medium",
        status: "Active",
        broker: "Your Name",
        activities: [{
          id: nanoid(),
          timestamp: new Date().toISOString(),
          type: "analysis_added",
          description: `Analysis "${analysis.name}" linked to deal`,
        }],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      const newDeal = dealData as Deal;
      setDeals(prev => [...prev, newDeal]);
      if (isSupabaseConfigured && supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, newDeal).catch((error) =>
          console.error("Failed to create deal from analysis:", error)
        );
      }
      
      console.log('✅ Created new deal from analysis:', newDeal.id);
    } catch (error) {
      console.error('Error creating deal from analysis:', error);
      reportError(error as Error, 'Create deal from analysis');
    }
  }, [analyses, reportError, supabase, supabaseUser]);

  const upsertProposal = useCallback((analysisId: string, proposal: Proposal) => {
    try {
      setAnalyses((prev) =>
        prev.map((a) => {
          if (a.id !== analysisId) return a;
          const currentProposals = (a.proposals as Proposal[]) || [];
          const exists = currentProposals.some((p) => p.id === proposal.id);
          return {
            ...a,
            proposals: exists
              ? currentProposals.map((p) => (p.id === proposal.id ? proposal : p))
              : [proposal, ...currentProposals],
          };
        })
      );
    } catch (error) {
      console.error('Error updating proposal:', error);
      reportError(error as Error, 'Update proposal');
      throw error; // Re-throw so caller can handle
    }
  }, [reportError]);

  const createProposal = (side: ProposalSide) => {
    // Use selectedAnalysis directly since it's computed from current state
    // This ensures we always have the latest data
    if (!selectedAnalysis) {
      console.warn('❌ Cannot create proposal: no analysis selected');
      console.warn('   selectedId:', selectedId);
      console.warn('   analyses count:', analyses.length);
      console.warn('   analyses ids:', analyses.map(a => a.id));
      console.warn('   pendingNewAnalysisId:', pendingNewAnalysisId);
      return;
    }
    
    // Count existing proposals of this side to number the new one
    const existingProposalsOfSide = (selectedAnalysis.proposals as Proposal[]).filter(p => p.side === side);
    const versionNumber = existingProposalsOfSide.length + 1;
    
    // Create proposal using the actual analysis data, not demo data
    const p: Proposal = {
      id: nanoid(),
      side,
      label: `${side} v${versionNumber}`,
      created_at: new Date().toISOString(),
      meta: {
        ...selectedAnalysis, // Use the actual analysis data
        name: `${selectedAnalysis.name} - ${side} v${versionNumber}`, // Update name to reflect proposal
      },
    };
    
    console.log('🔧 Creating proposal:', p, 'for analysis:', selectedAnalysis.id);
    upsertProposal(selectedAnalysis.id, p);
    setSelectedProposalId(p.id);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your lease analyses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full bg-background flex flex-col overflow-hidden">
      {/* Duplicate Dialog */}
      {duplicateDialogOpen && duplicateSourceAnalysis && (
        <DuplicateDialog
          originalName={duplicateSourceAnalysis.name}
          originalRSF={duplicateSourceAnalysis.rsf}
          originalTerm={(() => {
            const expirationDate = parseDateOnly(duplicateSourceAnalysis.key_dates.expiration);
            const commencementDate = parseDateOnly(duplicateSourceAnalysis.key_dates.commencement);
            if (!expirationDate || !commencementDate) return 0;
            return Math.round(
              (expirationDate.getTime() - commencementDate.getTime()) /
                (1000 * 60 * 60 * 24 * 30.44)
            );
          })()}
          onConfirm={handleDuplicateConfirm}
          onCancel={handleDuplicateCancel}
        />
      )}
      
      {/* Enhanced save status indicator with storage info */}
      <ClientOnly fallback={
        <div className="fixed bottom-4 right-4 z-50">
          <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg px-3 py-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>💾 Loading...</span>
            </div>
          </div>
        </div>
      }>
        {lastSaved && (
          <div className="fixed bottom-4 right-4 z-50">
            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border rounded-lg px-3 py-1 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>💾 Saved {new Date(lastSaved).toLocaleTimeString()}</span>
                {storageStats?.hasBackup && (
                  <span className="text-green-600" title="Backup available">🔄</span>
                )}
                <button
                  onClick={() => setShowStorageInfo(!showStorageInfo)}
                  className="text-blue-600 hover:text-blue-800"
                  title="Storage info"
                >
                  ℹ️
                </button>
              </div>
              
              {showStorageInfo && storageStats && (
                <div className="mt-2 pt-2 border-t border-muted text-xs space-y-1">
                  <div>Analyses: {storageStats.totalAnalyses}</div>
                  <div>Proposals: {storageStats.totalProposals}</div>
                  <div>Version: {storageStats.version}</div>
                  <div>Device: {storageStats.deviceId.slice(-8)}</div>
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        const result = storage.createBackup();
                        if (result.success) {
                          alert('Backup created successfully');
                          setStorageStats(storage.getStats());
                        } else {
                          alert('Backup failed: ' + result.error);
                        }
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Create Backup
                    </button>
                    <button
                      onClick={() => {
                        const result = storage.restoreFromBackup();
                        if (result.success) {
                          alert('Data restored from backup');
                          window.location.reload();
                        } else {
                          alert('Restore failed: ' + result.error);
                        }
                      }}
                      className="text-orange-600 hover:text-orange-800"
                    >
                      Restore
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </ClientOnly>
      
      {!selectedAnalysis ? (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error loading analyses list</p>
                <Button onClick={() => window.location.reload()}>Reload Page</Button>
              </div>
            </div>
          }
        >
          <HomeList
            list={list}
            query={query}
            setQuery={setQuery}
            onNew={createNewAnalysis}
            onOpen={(id) => {
              setSelectedId(id);
              setSelectedProposalId(null);
            }}
            onDuplicate={duplicate}
            onDelete={remove}
          />
        </ErrorBoundary>
      ) : !selectedProposal ? (
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error loading proposals board</p>
                <Button onClick={() => setSelectedId(null)}>Back to List</Button>
              </div>
            </div>
          }
        >
          <ProposalsBoard
            analysis={selectedAnalysis}
            onBack={() => setSelectedId(null)}
            onOpenProposal={(pid) => setSelectedProposalId(pid)}
            onNewProposal={createProposal}
            onReorderProposals={(proposalIds) => {
              const reorderedProposals = proposalIds
                .map(id => selectedAnalysis.proposals.find(p => p.id === id))
                .filter((p): p is Proposal => p !== undefined);
              
              setAnalyses(prev =>
                prev.map(a =>
                  a.id === selectedAnalysis.id
                    ? { ...a, proposals: reorderedProposals }
                    : a
                )
              );
            }}
          />
        </ErrorBoundary>
      ) : (
        <AsyncErrorBoundary
          fallback={
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <p className="text-destructive mb-4">Error in workspace</p>
                <Button onClick={() => setSelectedProposalId(null)}>Back to Proposals</Button>
              </div>
            </div>
          }
        >
          <div className="h-full flex flex-col overflow-hidden">
          {quickPresentationMode && selectedProposal ? (
            <QuickPresentationMode
              meta={selectedProposal.meta}
              onClose={() => setQuickPresentationMode(false)}
            />
          ) : presentationMode && selectedProposal ? (
            <PresentationMode
              proposal={selectedProposal}
              analysis={selectedAnalysis}
              proposals={selectedAnalysis.proposals}
              onClose={() => setPresentationMode(false)}
            />
          ) : (
            <Workspace
              proposal={selectedProposal}
              onBackToBoard={() => setSelectedProposalId(null)}
              onSave={(updatedMeta) => {
                try {
                  // Update the proposal with new meta
                  const updatedProposal = { ...selectedProposal, meta: updatedMeta };
                  upsertProposal(selectedAnalysis.id, updatedProposal);
                  
                  // Also update the analysis meta if this is the base scenario
                  // This ensures the analysis list reflects changes immediately
                  if (selectedProposal.label === 'Base') {
                    setAnalyses((prev) =>
                      prev.map((a) => {
                        if (a.id === selectedAnalysis.id) {
                          return { ...a, ...updatedMeta };
                        }
                        return a;
                      })
                    );
                  }
                } catch (error) {
                  console.error('Failed to save proposal:', error);
                  reportError(error as Error, 'Save proposal');
                  alert('Failed to save proposal. Please try again.');
                }
              }}
              deals={deals}
              currentLinkedDeal={isAnalysisLinkedToDeal(selectedAnalysis.id, deals)}
              onLinkToDeal={(dealId) => handleLinkAnalysisToDeal(selectedAnalysis.id, dealId)}
              onUnlinkFromDeal={() => handleUnlinkAnalysisFromDeal(selectedAnalysis.id)}
              onSyncWithDeal={() => handleSyncAnalysisToDeal(selectedAnalysis.id)}
              onCreateDealFromAnalysis={() => handleCreateDealFromAnalysis(selectedAnalysis.id)}
              onEnterPresentation={() => setPresentationMode(true)}
              onEnterQuickPresentation={() => setQuickPresentationMode(true)}
              allProposals={selectedAnalysis.proposals}
            />
          )}
          </div>
        </AsyncErrorBoundary>
      )}
    </div>
  );
}

/*************************************************
 * Export Hooks (stubs)
 *************************************************/

// TODO: Implement server routes to export a PDF (Playwright) and Excel (xlsx) using the `lines` output
// and the source AnalysisMeta for each proposal. Keep annual breakdown in Excel for single- or multi-scenario.

/*************************************************
 * Lightweight Runtime Tests (console.assert)
 *************************************************/

(function runLightTests() {
  try {
    const a = baseScenario();
    const lines = buildAnnualCashflow(a);
    // TEST 1: FS base-year passthrough for first year should be ~0
    const y0 = lines[0];
    console.assert((y0?.operating ?? 0) >= -1 && (y0?.operating ?? 0) < 1, "FS base-year year-1 passthrough should be ~0");

    // TEST 2: NPV should be finite
    const pv = npv(lines, a.cashflow_settings.discount_rate);
    console.assert(Number.isFinite(pv), "NPV should be finite");

    // TEST 3: Effective rate should be finite
    const eff = effectiveRentPSF(lines, a.rsf, lines.length);
    console.assert(Number.isFinite(eff), "Effective rate should be finite");
  } catch (e) {
    console.warn("Light tests encountered an error:", e);
  }
})();


