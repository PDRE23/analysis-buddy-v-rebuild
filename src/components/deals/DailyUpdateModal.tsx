"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock, Edit, X } from "lucide-react";
import type { Deal, DealStage } from "@/lib/types/deal";
import type { DailyUpdate, DealUpdateStatus } from "@/lib/types/tracking";
import { getDealsNeedingUpdates, saveDailyUpdate, hasDealBeenUpdatedToday, markDailyUpdatesCompleted } from "@/lib/dailyTracking";
import { ALL_STAGES } from "@/lib/types/deal";
import { nanoid } from "nanoid";
import { formatDateOnly, formatDateOnlyDisplay } from "@/lib/dateOnly";

interface DailyUpdateModalProps {
  deals: Deal[];
  isOpen: boolean;
  onComplete: () => void;
  onUpdateDeal?: (dealId: string, updatedDeal: Deal) => void;
  onUpdateDealStage?: (dealId: string, newStage: DealStage) => void;
  userId?: string;
}

export function DailyUpdateModal({
  deals,
  isOpen,
  onComplete,
  onUpdateDeal,
  onUpdateDealStage,
  userId = "User",
}: DailyUpdateModalProps) {
  const [dealsNeedingUpdates, setDealsNeedingUpdates] = useState<DealUpdateStatus[]>([]);
  const [updates, setUpdates] = useState<Record<string, Partial<DailyUpdate & { stage?: DealStage; notes?: string }>>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [selectedDealId, setSelectedDealId] = useState<string | null>(null);
  const [fadingOutDeals, setFadingOutDeals] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen) {
      const dealsNeeding = getDealsNeedingUpdates(deals, userId);
      setDealsNeedingUpdates(dealsNeeding);
      
      const initialUpdates: Record<string, Partial<DailyUpdate>> = {};
      dealsNeeding.forEach(deal => {
        if (deal.needsUpdate) {
          initialUpdates[deal.dealId] = {
            updateType: 'no_update',
          };
        }
      });
      setUpdates(initialUpdates);
      setSelectedDealId(null);
    }
  }, [isOpen, deals, userId]);

  const handleUpdateChange = (dealId: string, field: keyof DailyUpdate | 'stage' | 'notes', value: string) => {
    setUpdates(prev => ({
      ...prev,
      [dealId]: {
        ...prev[dealId],
        [field]: value,
      },
    }));
  };

  const updateDealStatus = (dealId: string, status: string) => {
    if (!onUpdateDeal) return;
    
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    const statusMap: Record<string, Deal["status"]> = {
      "Moving forward": "Active",
      "On hold": "On Hold",
      "Waiting for response": "Active",
      "Negotiating": "Active",
      "Issue": "On Hold",
      "Other": "Active",
    };

    const newStatus = statusMap[status] || deal.status;
    
    if (newStatus !== deal.status) {
      const updatedDeal: Deal = {
        ...deal,
        status: newStatus,
        updatedAt: new Date().toISOString(),
        activities: [
          ...deal.activities,
          {
            id: nanoid(),
            timestamp: new Date().toISOString(),
            type: "note",
            description: `Status updated: ${status}`,
          },
        ],
      };
      onUpdateDeal(dealId, updatedDeal);
    }
  };

  const handleSaveSingleDeal = async (dealId: string) => {
    const today = formatDateOnly(new Date());
    const update = updates[dealId];
    const deal = deals.find(d => d.id === dealId);
    
    if (!update || !deal) {
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      let updatedDeal: Deal | null = null;
      const stageChanged = update.stage && deal.stage !== update.stage;
      const hasNotes = update.notes && update.notes.trim().length > 0;

      if (hasNotes || stageChanged) {
        const dailyUpdate: DailyUpdate = {
          dealId,
          date: today,
          updateType: hasNotes ? 'notes' : 'status',
          notes: update.notes || undefined,
          timestamp: now,
          userId,
        };
        saveDailyUpdate(dailyUpdate);
      } else {
        const dailyUpdate: DailyUpdate = {
          dealId,
          date: today,
          updateType: 'no_update',
          timestamp: now,
          userId,
        };
        saveDailyUpdate(dailyUpdate);
      }

      updatedDeal = {
        ...deal,
        lastDailyUpdate: today,
        updatedAt: now,
        activities: [...deal.activities],
      };

      if (hasNotes && update.notes) {
        updatedDeal.notes = update.notes;
        updatedDeal.activities.push({
          id: nanoid(),
          timestamp: now,
          type: "note",
          description: update.notes,
          userId,
        });
      }

      if (stageChanged) {
        updatedDeal.stage = update.stage as DealStage;
        updatedDeal.activities.push({
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: `Stage changed to ${update.stage}`,
          userId,
        });
        
        if (onUpdateDealStage) {
          onUpdateDealStage(dealId, update.stage as DealStage);
        }
      }

      if (updatedDeal && onUpdateDeal) {
        onUpdateDeal(dealId, updatedDeal);
      }

      setFadingOutDeals(prev => new Set(prev).add(dealId));

      setTimeout(() => {
        const refreshed = getDealsNeedingUpdates(deals, userId);
        setDealsNeedingUpdates(refreshed);
        setFadingOutDeals(prev => {
          const next = new Set(prev);
          next.delete(dealId);
          return next;
        });

        setUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[dealId];
          return newUpdates;
        });

        setSelectedDealId(null);

        const stillNeeding = refreshed.filter(d => d.needsUpdate);
        if (stillNeeding.length === 0) {
          onComplete();
        }
      }, 350);
    } catch (error) {
      console.error('Failed to save update:', error);
      alert('Failed to save update. Please try again.');
      setFadingOutDeals(prev => {
        const next = new Set(prev);
        next.delete(dealId);
        return next;
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    const today = formatDateOnly(new Date());
    setIsSaving(true);

    try {
      const updatesToSave: DailyUpdate[] = [];
      const updatedDealIds = new Set<string>();
      
      for (const dealId in updates) {
        const update = updates[dealId];
        if (update && update.updateType) {
          if (update.updateType === 'status' && !update.status) {
            const dealName = dealsNeedingUpdates.find(d => d.dealId === dealId)?.dealName || 'this deal';
            alert(`Please select a status for ${dealName} before saving.`);
            setIsSaving(false);
            return;
          }

          const dailyUpdate: DailyUpdate = {
            dealId,
            date: today,
            updateType: update.updateType as DailyUpdate['updateType'],
            status: update.status,
            notes: update.notes,
            timestamp: new Date().toISOString(),
            userId,
          };
          updatesToSave.push(dailyUpdate);
          updatedDealIds.add(dealId);
        }
      }

      updatesToSave.forEach(update => {
        saveDailyUpdate(update);
        if (update.updateType === 'status' && update.status) {
          updateDealStatus(update.dealId, update.status);
        }
      });

      const stillNeeding = getDealsNeedingUpdates(deals, userId).filter(d => d.needsUpdate);
      
      for (const dealStatus of stillNeeding) {
        if (!updatedDealIds.has(dealStatus.dealId)) {
          const dailyUpdate: DailyUpdate = {
            dealId: dealStatus.dealId,
            date: today,
            updateType: 'no_update',
            timestamp: new Date().toISOString(),
            userId,
          };
          saveDailyUpdate(dailyUpdate);
          
          if (onUpdateDeal) {
            const deal = deals.find(d => d.id === dealStatus.dealId);
            if (deal) {
              const updatedDeal: Deal = {
                ...deal,
                lastDailyUpdate: today,
                updatedAt: new Date().toISOString(),
              };
              onUpdateDeal(dealStatus.dealId, updatedDeal);
            }
          }
        }
      }

      markDailyUpdatesCompleted();
      onComplete();
    } catch (error) {
      console.error('Failed to save updates:', error);
      alert('Failed to save updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSkip = async () => {
    const today = formatDateOnly(new Date());
    setIsSaving(true);

    try {
      const stillNeeding = getDealsNeedingUpdates(deals, userId).filter(d => d.needsUpdate);
      
      for (const dealStatus of stillNeeding) {
        const dailyUpdate: DailyUpdate = {
          dealId: dealStatus.dealId,
          date: today,
          updateType: 'no_update',
          timestamp: new Date().toISOString(),
          userId,
        };
        saveDailyUpdate(dailyUpdate);
        
        if (onUpdateDeal) {
          const deal = deals.find(d => d.id === dealStatus.dealId);
          if (deal) {
            const updatedDeal: Deal = {
              ...deal,
              lastDailyUpdate: today,
              updatedAt: new Date().toISOString(),
            };
            onUpdateDeal(dealStatus.dealId, updatedDeal);
          }
        }
      }

      markDailyUpdatesCompleted();
      onComplete();
    } catch (error) {
      console.error('Failed to skip updates:', error);
      alert('Failed to skip updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const hasAnyChanges = Object.keys(updates).some(dealId => {
    const update = updates[dealId];
    const deal = deals.find(d => d.id === dealId);
    if (!update || !deal) return false;
    
    const hasNotes = update.notes !== undefined && update.notes.trim().length > 0;
    
    const stageChanged = update.stage !== undefined && update.stage !== deal.stage;
    
    return hasNotes || stageChanged;
  });

  const hasValidUpdates = Object.keys(updates).some(dealId => {
    const update = updates[dealId];
    const dealStatus = dealsNeedingUpdates.find(d => d.dealId === dealId);
    if (!dealStatus || !dealStatus.needsUpdate) return false;
    if (!update || !update.updateType) return false;
    if (update.updateType === 'no_update') return false;
    if (update.updateType === 'status' && !update.status) return false;
    if (update.notes && update.notes.trim().length > 0) return true;
    if (update.stage) return true;
    return false;
  });

  const validUpdatesCount = Object.keys(updates).filter(dealId => {
    const update = updates[dealId];
    const dealStatus = dealsNeedingUpdates.find(d => d.dealId === dealId);
    if (!dealStatus || !dealStatus.needsUpdate) return false;
    if (!update || !update.updateType) return false;
    if (update.updateType === 'no_update') return false;
    if (update.updateType === 'status' && !update.status) return false;
    if (update.notes && update.notes.trim().length > 0) return true;
    if (update.stage) return true;
    return false;
  }).length;

  const allDealsUpdated = dealsNeedingUpdates.filter(d => d.needsUpdate).length === 0;
  const updatedCount = dealsNeedingUpdates.length - dealsNeedingUpdates.filter(d => d.needsUpdate).length;
  const totalCount = dealsNeedingUpdates.length;
  const dealsNeedingCount = dealsNeedingUpdates.filter(d => d.needsUpdate).length;

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col bg-card shadow-2xl rounded-2xl border border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground font-bold text-xl">
            <Clock className="h-5 w-5 text-ring" />
            Daily Deal Updates
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Please provide an update for each active deal. If you do not update a deal, it will be assumed there are no updates for that deal.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Badge className={allDealsUpdated ? "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" : ""} variant={allDealsUpdated ? "default" : "secondary"}>
              {updatedCount} of {totalCount} updated
            </Badge>
            {dealsNeedingUpdates.filter(d => d.isStale).length > 0 && (
              <Badge className="bg-destructive/10 text-destructive border border-destructive/20">
                {dealsNeedingUpdates.filter(d => d.isStale).length} stale
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {dealsNeedingUpdates.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 dark:text-emerald-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-foreground">All deals are up to date!</p>
            </div>
          ) : (
            <>
              {dealsNeedingUpdates.map((dealStatus) => {
                const isUpdated = !dealStatus.needsUpdate;
                const update = updates[dealStatus.dealId] || {};
                const hasUpdate =
                  !!update.updateType && update.updateType !== "no_update";
                const isSelected = selectedDealId === dealStatus.dealId;
                const isFadingOut = fadingOutDeals.has(dealStatus.dealId);
                const deal = deals.find(d => d.id === dealStatus.dealId);

                return (
                  <Card
                    key={dealStatus.dealId}
                    className={`transition-all duration-300 ${
                      isFadingOut ? 'opacity-0 scale-95 -translate-y-2 pointer-events-none' : 'opacity-100 scale-100 translate-y-0'
                    } ${
                      isUpdated ? 'bg-emerald-50/50 dark:bg-emerald-900/10 border border-emerald-200/50 dark:border-emerald-700/20 rounded-xl' : ''
                    } ${
                      dealStatus.isStale ? 'bg-amber-50/50 dark:bg-amber-900/10 border border-amber-200/50 dark:border-amber-700/20 rounded-xl' : ''
                    } ${
                      isSelected ? 'ring-2 ring-ring border-ring' : ''
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">{dealStatus.dealName}</h3>
                            {isUpdated && (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            )}
                            {dealStatus.isStale && !isUpdated && (
                              <AlertCircle className="h-4 w-4 text-destructive" />
                            )}
                          </div>
                          {dealStatus.lastUpdateDate && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last update: {formatDateOnlyDisplay(dealStatus.lastUpdateDate)}
                              {dealStatus.daysSinceUpdate >= 0 && (
                                <span> ({dealStatus.daysSinceUpdate} days ago)</span>
                              )}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          {!isUpdated && !isSelected && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedDealId(dealStatus.dealId === selectedDealId ? null : dealStatus.dealId);
                              }}
                              disabled={isSaving}
                              className="text-xs"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Update
                            </Button>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <div className="space-y-3 mt-3 border-t border-border pt-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block text-foreground">
                              Deal Stage
                            </label>
                            <Select
                              value={(updates[dealStatus.dealId]?.stage as string) || deal?.stage || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateChange(
                                  dealStatus.dealId,
                                  'stage',
                                  e.target.value
                                );
                              }}
                              options={ALL_STAGES.map(stage => ({
                                value: stage,
                                label: stage
                              }))}
                            />
                          </div>

                          <div>
                            <label className="text-sm font-medium mb-1 block text-foreground">
                              Notes
                            </label>
                            <Textarea
                              value={updates[dealStatus.dealId]?.notes || deal?.notes || ''}
                              onChange={(e) => {
                                e.stopPropagation();
                                handleUpdateChange(
                                  dealStatus.dealId,
                                  'notes',
                                  e.target.value
                                );
                              }}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add notes about this deal..."
                              rows={3}
                            />
                          </div>

                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveSingleDeal(dealStatus.dealId);
                              }}
                              disabled={isSaving}
                              className="bg-ring text-primary-foreground hover:bg-ring/90"
                            >
                              {isSaving ? 'Saving...' : 'Save Updates'}
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </CardContent>

        <div className="border-t border-border p-4 flex justify-between gap-2">
          <Button
            variant="ghost"
            onClick={onComplete}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleSkip}
              disabled={isSaving || allDealsUpdated}
            >
              Skip
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || allDealsUpdated}
              className="bg-ring text-primary-foreground hover:bg-ring/90"
            >
              {isSaving ? 'Saving...' : allDealsUpdated ? 'Save' : validUpdatesCount > 0 ? `Save Updates (${validUpdatesCount} ready)` : 'Save Updates'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
