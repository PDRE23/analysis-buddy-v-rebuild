"use client";

import React, { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import type { Deal, DealStage } from "@/lib/types/deal";
import type { AnalysisMeta } from "../LeaseAnalyzerApp";
import { dealStorage } from "@/lib/dealStorage";
import { storage } from "@/lib/storage";
import { ensureDemoDeals } from "@/lib/demoDeals";
import { linkAnalysisToDeal } from "@/lib/dealAnalysisSync";
import { Dashboard } from "./Dashboard";
import { DealDetailView } from "./DealDetailView";
import { DealForm } from "./DealForm";
import { DeleteConfirmationDialog, DeleteConfirmation } from "@/components/ui/delete-confirmation-dialog";

interface PipelineAppProps {
  onViewAnalysis: (analysisId: string) => void;
  onCreateAnalysis?: (dealId?: string) => void;
}

type View = "dashboard" | "deal-detail" | "deal-form";

export function PipelineApp({ onViewAnalysis, onCreateAnalysis }: PipelineAppProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [analyses, setAnalyses] = useState<AnalysisMeta[]>([]);
  const [currentView, setCurrentView] = useState<View>("dashboard");
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null);
  const [editingDeal, setEditingDeal] = useState<Deal | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<DeleteConfirmation | null>(null);

  // Load data on mount
  useEffect(() => {
    const loadedDeals = dealStorage.load();
    const dealsToUse = ensureDemoDeals(loadedDeals);
    
    // If demo deals were created, save them
    if (dealsToUse.length > 0 && loadedDeals.length === 0) {
      dealStorage.save(dealsToUse);
    }
    
    const loadedAnalyses = storage.load() as AnalysisMeta[];
    setDeals(dealsToUse);
    setAnalyses(loadedAnalyses);
  }, []);

  // Auto-save deals whenever they change
  useEffect(() => {
    if (deals.length > 0) {
      dealStorage.save(deals);
    }
  }, [deals]);

  const handleDealStageChange = useCallback((dealId: string, newStage: DealStage) => {
    setDeals(prevDeals => {
      const updatedDeals = prevDeals.map(deal => {
        if (deal.id === dealId) {
          const updatedDeal = {
            ...deal,
            stage: newStage,
            updatedAt: new Date().toISOString(),
          };

          // Add activity
          updatedDeal.activities.push({
            id: nanoid(),
            timestamp: new Date().toISOString(),
            type: "stage_change",
            description: `Deal moved to ${newStage}`,
          });

          return updatedDeal;
        }
        return deal;
      });
      return updatedDeals;
    });
  }, []);

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
        
        // If we're viewing this deal, go back to dashboard
        if (selectedDeal?.id === deal.id) {
          setSelectedDeal(null);
          setCurrentView("dashboard");
        }
      },
      onCancel: () => setDeleteConfirmation(null),
    });
  }, [selectedDeal]);

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

    if (dealData.id) {
      // Update existing deal
      setDeals(prevDeals => {
        return prevDeals.map(deal => {
          if (deal.id === dealData.id) {
            const updatedDeal = {
              ...deal,
              ...dealData,
              updatedAt: now,
            };

            // Add activity for update
            updatedDeal.activities.push({
              id: nanoid(),
              timestamp: now,
              type: "note" as const,
              description: "Deal information updated",
            });

            return updatedDeal;
          }
          return deal;
        });
      });
    } else {
      // Create new deal
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

      setDeals(prevDeals => [...prevDeals, newDeal]);
    }

    setEditingDeal(null);
    setCurrentView("dashboard");
  }, []);

  const handleCancelDealForm = useCallback(() => {
    setEditingDeal(null);
    setCurrentView(selectedDeal ? "deal-detail" : "dashboard");
  }, [selectedDeal]);

  const handleBackToDashboard = useCallback(() => {
    setSelectedDeal(null);
    setCurrentView("dashboard");
  }, []);

  const handleUpdateDeal = useCallback((updatedDeal: Deal) => {
    setDeals(prevDeals => 
      prevDeals.map(deal => 
        deal.id === updatedDeal.id 
          ? { ...updatedDeal, updatedAt: new Date().toISOString() }
          : deal
      )
    );
    // Also update selectedDeal if it's the one being updated
    if (selectedDeal?.id === updatedDeal.id) {
      setSelectedDeal(updatedDeal);
    }
  }, [selectedDeal]);

  const handleLinkAnalysis = useCallback((dealId: string, analysisId: string) => {
    const deal = deals.find(d => d.id === dealId);
    if (deal) {
      const updatedDeal = linkAnalysisToDeal(deal, analysisId);
      dealStorage.update(dealId, updatedDeal);
      setDeals(prev => prev.map(d => d.id === dealId ? updatedDeal : d));
      
      // Update selectedDeal if it's the one being updated
      if (selectedDeal?.id === dealId) {
        setSelectedDeal(updatedDeal);
      }
      
      console.log('✅ Linked analysis', analysisId, 'to deal', dealId);
    }
  }, [deals, selectedDeal]);

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
    </>
  );
}

