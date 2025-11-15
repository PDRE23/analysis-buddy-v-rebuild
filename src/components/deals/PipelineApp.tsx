"use client";

import React, { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import type { Deal, DealStage } from "@/lib/types/deal";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import { ensureDemoDeals } from "@/lib/demoDeals";
import { linkAnalysisToDeal } from "@/lib/dealAnalysisSync";
import { dealStorage } from "@/lib/dealStorage";
import { storage } from "@/lib/storage";
import { Dashboard } from "./Dashboard";
import { DealDetailView } from "./DealDetailView";
import { DealForm } from "./DealForm";
import { DeleteConfirmationDialog, DeleteConfirmation } from "@/components/ui/delete-confirmation-dialog";
import { DailyUpdateModal } from "./DailyUpdateModal";
import { needsDailyUpdates } from "@/lib/dailyTracking";
import { cache, cacheKeys } from "@/lib/cache";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import {
  listDealsForUser,
  upsertDealForUser,
  upsertDealsForUser,
  deleteDealForUser,
} from "@/lib/api/deals";
import { listAnalysesForUser } from "@/lib/api/analyses";

interface PipelineAppProps {
  onViewAnalysis: (analysisId: string) => void;
  onCreateAnalysis?: (dealId?: string) => void;
  onDealsUpdated?: (deals: Deal[]) => void;
  onAnalysesUpdated?: (analyses: AnalysisMeta[]) => void;
}

type View = "dashboard" | "deal-detail" | "deal-form";

const FALLBACK_AUDIT_USER: User = {
  id: "system-user",
  email: "system@analysisbuddy.local",
  name: "System",
  role: "admin",
};

export function PipelineApp({
  onViewAnalysis,
  onCreateAnalysis,
  onDealsUpdated,
  onAnalysesUpdated,
}: PipelineAppProps) {
  const { user: supabaseUser, supabase } = useAuth();
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisMeta[]>([]);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);
  const [showDailyUpdateModal, setShowDailyUpdateModal] = useState(false);
  const [auditActor, setAuditActor] = useState<User>(FALLBACK_AUDIT_USER);

  useEffect(() => {
    onDealsUpdated?.(deals);
  }, [deals, onDealsUpdated]);

  useEffect(() => {
    onAnalysesUpdated?.(analyses);
  }, [analyses, onAnalysesUpdated]);

  useEffect(() => {
    if (supabaseUser) {
      const transformedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        name:
          (supabaseUser.user_metadata?.full_name as string | undefined) ||
          supabaseUser.email ||
          "User",
        role: "user",
      };
      setAuditActor(transformedUser);
    } else {
      setAuditActor(FALLBACK_AUDIT_USER);
    }
  }, [supabaseUser]);

  // Load data when the authenticated user changes
  useEffect(() => {
    if (!supabase || !supabaseUser) {
      const localDeals = ensureDemoDeals(dealStorage.load());
      const localAnalyses = storage.load() as AnalysisMeta[];
      setDeals(localDeals);
      setAnalyses(localAnalyses);
      cache.set(cacheKeys.deals(), localDeals);
      localDeals.forEach((deal) => cache.set(cacheKeys.deal(deal.id), deal));
      onDealsUpdated?.(localDeals);
      onAnalysesUpdated?.(localAnalyses);
      setShowDailyUpdateModal(needsDailyUpdates(localDeals));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const [remoteDeals, remoteAnalyses] = await Promise.all([
          listDealsForUser(supabase, supabaseUser.id),
          listAnalysesForUser(supabase, supabaseUser.id),
        ]);

        if (cancelled) return;

        let dealsToUse = remoteDeals;
        if (dealsToUse.length === 0) {
          dealsToUse = ensureDemoDeals([]);
          if (dealsToUse.length > 0) {
            await upsertDealsForUser(supabase, supabaseUser.id, dealsToUse);
          }
        }

        setDeals(dealsToUse);
        setAnalyses(remoteAnalyses);
        cache.set(cacheKeys.deals(), dealsToUse);
        dealsToUse.forEach((deal) => cache.set(cacheKeys.deal(deal.id), deal));

        onDealsUpdated?.(dealsToUse);
        onAnalysesUpdated?.(remoteAnalyses);

        dealStorage.save(dealsToUse);
        storage.save(remoteAnalyses);

        setShowDailyUpdateModal(needsDailyUpdates(dealsToUse));
      } catch (error) {
        console.error("Failed to load deals and analyses from Supabase:", error);
        // Fall back to local storage if Supabase fails (e.g., tables don't exist)
        console.warn("Falling back to local storage...");
        const localDeals = dealStorage.load();
        const localAnalyses = storage.load() as AnalysisMeta[];
        setDeals(localDeals.length > 0 ? localDeals : ensureDemoDeals([]));
        setAnalyses(localAnalyses);
        onDealsUpdated?.(localDeals);
        onAnalysesUpdated?.(localAnalyses);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [supabase, supabaseUser, onDealsUpdated, onAnalysesUpdated]);

  useEffect(() => {
    cache.set(cacheKeys.deals(), deals);
    deals.forEach((deal) => cache.set(cacheKeys.deal(deal.id), deal));
  }, [deals]);

  useEffect(() => {
    if (!supabase || !supabaseUser) {
      dealStorage.save(deals);
    }
  }, [deals, supabase, supabaseUser]);

  const handleDealStageChange = useCallback((dealId: string, newStage: DealStage) => {
    let updatedDealSnapshot: Deal | null = null;
    let previousStage: DealStage | null = null;
    const timestamp = new Date().toISOString();

    setDeals(prevDeals => {
      const updatedDeals = prevDeals.map(deal => {
        if (deal.id === dealId) {
          if (deal.stage === newStage) {
            return deal;
          }

          previousStage = deal.stage;
          const updatedDeal: Deal = {
            ...deal,
            stage: newStage,
            updatedAt: timestamp,
            activities: [
              ...deal.activities,
              {
                id: nanoid(),
                timestamp,
                type: "stage_change" as const,
                description: `Deal moved to ${newStage}`,
              },
            ],
          };

          updatedDealSnapshot = updatedDeal;
          return updatedDeal;
        }
        return deal;
      });
      return updatedDeals;
    });

    if (!updatedDealSnapshot || !previousStage) {
      return;
    }

    const snapshot: Deal = updatedDealSnapshot;
    const fromStage = previousStage;

    cache.set(cacheKeys.deal(snapshot.id), snapshot);
    if (supabase && supabaseUser) {
      upsertDealForUser(supabase, supabaseUser.id, snapshot).catch(
        (error) => console.error("Failed to persist stage change:", error)
      );
    }
    logAction(auditActor, "deal:update", "deal", {
      resourceId: snapshot.id,
      details: {
        action: "stage_change",
        from: fromStage,
        to: newStage,
      },
    });
  }, [auditActor, supabase, supabaseUser]);

  const handleViewDeal = useCallback((deal: Deal) => {
    setSelectedDeal(deal);
    setCurrentView("deal-detail");
  }, []);

  const handleEditDeal = useCallback((deal: Deal) => {
    setEditingDeal(deal);
    setCurrentView("deal-form");
  }, []);

  const handleDeleteDeal = useCallback((deal: Deal) => {
    setDeleteConfirmation({
      title: "Delete Deal",
      message: `Are you sure you want to delete the deal "${deal.clientName}"? This action cannot be undone.`,
      confirmText: "Delete",
      onConfirm: () => {
        setDeals(prevDeals => prevDeals.filter(d => d.id !== deal.id));
        setDeleteConfirmation(null);
        cache.delete(cacheKeys.deal(deal.id));
        if (supabase && supabaseUser) {
          deleteDealForUser(supabase, supabaseUser.id, deal.id).catch((error) =>
            console.error("Failed to delete deal:", error)
          );
        }
        logAction(auditActor, "deal:delete", "deal", {
          resourceId: deal.id,
          details: {
            stage: deal.stage,
          },
        });
        
        // If we're viewing this deal, go back to dashboard
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
          setCurrentView("dashboard");
        }
      },
      onCancel: () => setDeleteConfirmation(null),
    });
  }, [auditActor, selectedDeal, supabase, supabaseUser]);

  const handleAddDeal = useCallback((initialStage?: DealStage) => {
    setEditingDeal({
      id: "",
      clientName: "",
      property: {
        address: "",
        city: "",
        state: "",
      },
      stage: initialStage || "Lead",
      priority: "Medium",
      rsf: 0,
      leaseTerm: 0,
      broker: "",
      status: "Active",
      analysisIds: [],
      activities: [],
      createdAt: "",
      updatedAt: "",
    } as Deal);
    setCurrentView("deal-form");
  }, []);

  const handleSaveDeal = useCallback((dealData: Omit<Deal, "id" | "createdAt" | "updatedAt" | "activities"> & { id?: string }) => {
    const now = new Date().toISOString();
    let updatedDealSnapshot: Deal | null = null;
    let createdDeal: Deal | null = null;

    if (dealData.id) {
      setDeals(prevDeals => {
        return prevDeals.map(deal => {
          if (deal.id === dealData.id) {
            const updatedDeal: Deal = {
              ...deal,
              ...dealData,
              updatedAt: now,
              activities: [
                ...deal.activities,
                {
                  id: nanoid(),
                  timestamp: now,
                  type: "note" as const,
                  description: "Deal information updated",
                },
              ],
            };
            updatedDealSnapshot = updatedDeal;
            return updatedDeal;
          }
          return deal;
        });
      });
    } else {
      const newDeal: Deal = {
        ...dealData,
        id: nanoid(),
        createdAt: now,
        updatedAt: now,
        activities: [
          {
            id: nanoid(),
            timestamp: now,
            type: "note" as const,
            description: "Deal created",
          },
        ],
      };

      createdDeal = newDeal;
      setDeals(prevDeals => [...prevDeals, newDeal]);
    }

    if (updatedDealSnapshot) {
      const snapshot: Deal = updatedDealSnapshot;
      cache.set(cacheKeys.deal(snapshot.id), snapshot);
      if (supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, snapshot).catch(
          (error) => console.error("Failed to update deal:", error)
        );
      }
      logAction(auditActor, "deal:update", "deal", {
        resourceId: snapshot.id,
        details: {
          action: "update",
          stage: snapshot.stage,
        },
      });
    }

    if (createdDeal) {
      cache.set(cacheKeys.deal(createdDeal.id), createdDeal);
      if (supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, createdDeal).catch((error) =>
          console.error("Failed to create deal:", error)
        );
      }
      logAction(auditActor, "deal:create", "deal", {
        resourceId: createdDeal.id,
        details: {
          stage: createdDeal.stage,
        },
      });
    }

    setEditingDeal(null);
    setCurrentView("dashboard");
  }, [auditActor, supabase, supabaseUser]);

  const handleCancelDealForm = useCallback(() => {
    setEditingDeal(null);
    setCurrentView(selectedDeal ? "deal-detail" : "dashboard");
  }, [selectedDeal]);

  const handleBackToDashboard = useCallback(() => {
    setSelectedDeal(null);
    setCurrentView("dashboard");
  }, []);

  const handleUpdateDeal = useCallback((dealToUpdate: Deal) => {
    const now = new Date().toISOString();
    let snapshot: Deal | null = null;

    setDeals(prevDeals =>
      prevDeals.map(deal =>
        deal.id === dealToUpdate.id
          ? (() => {
              const nextDeal: Deal = {
                ...deal,
                ...dealToUpdate,
                updatedAt: now,
              };
              snapshot = nextDeal;
              return nextDeal;
            })()
          : deal
      )
    );

    if (snapshot) {
      const dealSnapshot: Deal = snapshot;
      cache.set(cacheKeys.deal(dealSnapshot.id), dealSnapshot);
      if (supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, dealSnapshot).catch((error) =>
          console.error("Failed to update deal:", error)
        );
      }
      logAction(auditActor, "deal:update", "deal", {
        resourceId: dealSnapshot.id,
        details: {
          action: "detail_update",
        },
      });
    }

    if (selectedDeal?.id === dealToUpdate.id && snapshot) {
      setSelectedDeal(snapshot);
    }
  }, [auditActor, selectedDeal, supabase, supabaseUser]);

  const handleLinkAnalysis = useCallback((dealId: string, analysisId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      const updatedDeal = linkAnalysisToDeal(deal, analysisId);
      setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
      cache.set(cacheKeys.deal(updatedDeal.id), updatedDeal);
      if (supabase && supabaseUser) {
        upsertDealForUser(supabase, supabaseUser.id, updatedDeal).catch((error) =>
          console.error("Failed to link analysis:", error)
        );
      }
      logAction(auditActor, "deal:update", "deal", {
        resourceId: updatedDeal.id,
        details: {
          action: "link_analysis",
          analysisId,
        },
      });
      
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(updatedDeal);
      }
      
      console.log('✅ Linked analysis', analysisId, 'to deal', dealId);
    }
  }, [auditActor, deals, selectedDeal, supabase, supabaseUser]);

  const handleCreateAnalysis = useCallback((dealId: string) => {
    if (onCreateAnalysis) {
      onCreateAnalysis(dealId);
    }
  }, [onCreateAnalysis]);

  // Get analyses for a specific deal
  const getDealAnalyses = useCallback((deal: Deal): AnalysisMeta[] => {
    return analyses.filter(analysis => deal.analysisIds.includes(analysis.id));
  }, [analyses]);

  return (
    <>
      {currentView === "dashboard" && (
        <Dashboard
          deals={deals}
          onDealStageChange={handleDealStageChange}
          onViewDeal={handleViewDeal}
          onEditDeal={handleEditDeal}
          onDeleteDeal={handleDeleteDeal}
          onAddDeal={handleAddDeal}
        />
      )}

      {currentView === "deal-detail" && selectedDeal && (
        <DealDetailView
          deal={selectedDeal}
          analyses={getDealAnalyses(selectedDeal)}
          onBack={handleBackToDashboard}
          onEdit={handleEditDeal}
          onUpdateDeal={handleUpdateDeal}
          onViewAnalysis={onViewAnalysis}
          onCreateAnalysis={handleCreateAnalysis}
          onLinkAnalysis={handleLinkAnalysis}
        />
      )}

      {currentView === "deal-form" && editingDeal && (
        <DealForm
          deal={editingDeal.id ? editingDeal : undefined}
          onSave={handleSaveDeal}
          onCancel={handleCancelDealForm}
        />
      )}

      {deleteConfirmation && (
        <DeleteConfirmationDialog confirmation={deleteConfirmation} />
      )}

      {/* Daily Update Modal */}
      <DailyUpdateModal
        deals={deals}
        isOpen={showDailyUpdateModal}
        onComplete={() => {
          setShowDailyUpdateModal(false);
          if (!supabase || !supabaseUser) return;
          listDealsForUser(supabase, supabaseUser.id)
            .then((freshDeals) => {
              setDeals(freshDeals);
            })
            .catch((error) => console.error("Failed to refresh deals:", error));
        }}
        userId="User"
      />
    </>
  );
}

