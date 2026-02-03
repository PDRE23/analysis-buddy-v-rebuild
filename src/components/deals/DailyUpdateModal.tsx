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
      
      // Initialize updates object
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

  // Helper function to update deal status in pipeline
  const updateDealStatus = (dealId: string, status: string) => {
    if (!onUpdateDeal) return;
    
    const deal = deals.find(d => d.id === dealId);
    if (!deal) return;

    // Map daily update status to deal status
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

  // Save a single deal update
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

      // Always save a daily update when saving (for stage change, notes, or both)
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
        // Even if no notes or stage change, save as no_update to mark as reviewed
        const dailyUpdate: DailyUpdate = {
          dealId,
          date: today,
          updateType: 'no_update',
          timestamp: now,
          userId,
        };
        saveDailyUpdate(dailyUpdate);
      }

      // Build updated deal object
      updatedDeal = {
        ...deal,
        lastDailyUpdate: today,
        updatedAt: now,
        activities: [...deal.activities],
      };

      // Update notes if provided
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

      // Update deal stage if stage is changed
      if (stageChanged) {
        updatedDeal.stage = update.stage as DealStage;
        updatedDeal.activities.push({
          id: nanoid(),
          timestamp: now,
          type: "stage_change",
          description: `Stage changed to ${update.stage}`,
          userId,
        });
        
        // Also call the stage update callback
        if (onUpdateDealStage) {
          onUpdateDealStage(dealId, update.stage as DealStage);
        }
      }

      // Save the updated deal
      if (updatedDeal && onUpdateDeal) {
        onUpdateDeal(dealId, updatedDeal);
      }

      // Start fade out animation
      setFadingOutDeals(prev => new Set(prev).add(dealId));

      // Remove from list after animation completes
      setTimeout(() => {
        // Get fresh deals list to ensure we have the latest data
        const refreshed = getDealsNeedingUpdates(deals, userId);
        setDealsNeedingUpdates(refreshed);
        setFadingOutDeals(prev => {
          const next = new Set(prev);
          next.delete(dealId);
          return next;
        });

        // Remove the update from local state since it's saved
        setUpdates(prev => {
          const newUpdates = { ...prev };
          delete newUpdates[dealId];
          return newUpdates;
        });

        // Deselect the deal after saving
        setSelectedDealId(null);

        // Check if all deals are now updated
        const stillNeeding = refreshed.filter(d => d.needsUpdate);
        if (stillNeeding.length === 0) {
          onComplete();
        }
      }, 350); // Slightly longer than animation duration to ensure smooth transition
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
      // Step 1: Save all updates the user has made
      const updatesToSave: DailyUpdate[] = [];
      const updatedDealIds = new Set<string>();
      
      for (const dealId in updates) {
        const update = updates[dealId];
        if (update && update.updateType) {
          // Validate required fields
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

      // Save all valid updates
      updatesToSave.forEach(update => {
        saveDailyUpdate(update);
        // Update deal status in pipeline if status update
        if (update.updateType === 'status' && update.status) {
          updateDealStatus(update.dealId, update.status);
        }
      });

      // Step 2: Mark all remaining deals (that still need updates) as "no_update"
      const stillNeeding = getDealsNeedingUpdates(deals, userId).filter(d => d.needsUpdate);
      
      for (const dealStatus of stillNeeding) {
        // Skip deals that were already saved in updatesToSave
        if (!updatedDealIds.has(dealStatus.dealId)) {
          const dailyUpdate: DailyUpdate = {
            dealId: dealStatus.dealId,
            date: today,
            updateType: 'no_update',
            timestamp: new Date().toISOString(),
            userId,
          };
          saveDailyUpdate(dailyUpdate);
          
          // Update deal's lastDailyUpdate field
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

      // Step 3: Mark as completed and close the modal (all deals are now updated)
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
      // Mark all deals that still need updates as "no_update"
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
        
        // Update deal's lastDailyUpdate field
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

      // Mark as completed and close the modal
      markDailyUpdatesCompleted();
      onComplete();
    } catch (error) {
      console.error('Failed to skip updates:', error);
      alert('Failed to skip updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if user has made any changes (notes or stage) to any deal
  const hasAnyChanges = Object.keys(updates).some(dealId => {
    const update = updates[dealId];
    const deal = deals.find(d => d.id === dealId);
    if (!update || !deal) return false;
    
    // Check if notes have been entered (any non-empty notes means user made a change)
    const hasNotes = update.notes !== undefined && update.notes.trim().length > 0;
    
    // Check if stage has been changed (different from original deal stage)
    const stageChanged = update.stage !== undefined && update.stage !== deal.stage;
    
    return hasNotes || stageChanged;
  });

  // Check if there are any valid updates ready to save (with actual changes)
  const hasValidUpdates = Object.keys(updates).some(dealId => {
    const update = updates[dealId];
    const dealStatus = dealsNeedingUpdates.find(d => d.dealId === dealId);
    // Only check deals that still need updates
    if (!dealStatus || !dealStatus.needsUpdate) return false;
    if (!update || !update.updateType) return false;
    // Don't count 'no_update' as a valid update for the bulk save button
    if (update.updateType === 'no_update') return false;
    // If status type is selected, status must be provided
    if (update.updateType === 'status' && !update.status) return false;
    // Count notes or stage changes
    if (update.notes && update.notes.trim().length > 0) return true;
    if (update.stage) return true;
    return false;
  });

  // Count only valid updates that still need to be saved (excluding no_update and deals that are already updated)
  const validUpdatesCount = Object.keys(updates).filter(dealId => {
    const update = updates[dealId];
    const dealStatus = dealsNeedingUpdates.find(d => d.dealId === dealId);
    // Only count if deal still needs update and has a valid update (not just no_update)
    if (!dealStatus || !dealStatus.needsUpdate) return false;
    if (!update || !update.updateType) return false;
    if (update.updateType === 'no_update') return false;
    if (update.updateType === 'status' && !update.status) return false;
    // Count notes or stage changes
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Daily Deal Updates
          </CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Please provide an update for each active deal. If you do not update a deal, it will be assumed there are no updates for that deal.
          </p>
          <div className="flex items-center gap-2 mt-4">
            <Badge variant={allDealsUpdated ? "default" : "secondary"}>
              {updatedCount} of {totalCount} updated
            </Badge>
            {dealsNeedingUpdates.filter(d => d.isStale).length > 0 && (
              <Badge variant="destructive">
                {dealsNeedingUpdates.filter(d => d.isStale).length} stale
              </Badge>
            )}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto space-y-4">
          {dealsNeedingUpdates.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <p className="text-lg font-medium">All deals are up to date!</p>
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
                      isUpdated ? 'bg-green-50 border-green-200' : ''
                    } ${
                      dealStatus.isStale ? 'border-red-200 bg-red-50' : ''
                    } ${
                      isSelected ? 'ring-2 ring-blue-500 border-blue-500' : ''
                    }`}
                  >
                    <CardContent className="py-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{dealStatus.dealName}</h3>
                            {isUpdated && (
                              <CheckCircle2 className="h-4 w-4 text-green-600" />
                            )}
                            {dealStatus.isStale && !isUpdated && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                          </div>
                          {dealStatus.lastUpdateDate && (
                            <p className="text-xs text-gray-500 mt-1">
                              Last update: {formatDateOnlyDisplay(dealStatus.lastUpdateDate)}
                              {dealStatus.daysSinceUpdate >= 0 && (
                                <span> ({dealStatus.daysSinceUpdate} days ago)</span>
                              )}
                            </p>
                          )}
                        </div>
                        {/* Action buttons - always visible */}
                        <div className="flex items-center gap-2 ml-4">
                          {!isUpdated && !isSelected && (
                            <Button
                              size="sm"
                              variant="default"
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
                        <div className="space-y-3 mt-3 border-t pt-3">
                          {/* Deal Stage Selector */}
                          <div>
                            <label className="text-sm font-medium mb-1 block">
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

                          {/* Notes Field */}
                          <div>
                            <label className="text-sm font-medium mb-1 block">
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

                          {/* Action Buttons */}
                          <div className="flex justify-end gap-2 pt-2">
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveSingleDeal(dealStatus.dealId);
                              }}
                              disabled={isSaving}
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

        <div className="border-t p-4 flex justify-between gap-2">
          <Button
            variant="outline"
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
            >
              {isSaving ? 'Saving...' : allDealsUpdated ? 'Save' : validUpdatesCount > 0 ? `Save Updates (${validUpdatesCount} ready)` : 'Save Updates'}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

