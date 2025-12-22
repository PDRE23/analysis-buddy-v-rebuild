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
import { getDealsNeedingUpdates, saveDailyUpdate, hasDealBeenUpdatedToday } from "@/lib/dailyTracking";
import { ALL_STAGES } from "@/lib/types/deal";
import { nanoid } from "nanoid";

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

  // Handle "No Changes" button - saves immediately and fades out
  const handleNoChanges = async (dealId: string) => {
    const today = new Date().toISOString().split('T')[0];
    setIsSaving(true);

    try {
      // Save daily update as "no_update"
      const dailyUpdate: DailyUpdate = {
        dealId,
        date: today,
        updateType: 'no_update',
        timestamp: new Date().toISOString(),
        userId,
      };
      saveDailyUpdate(dailyUpdate);

      // Update deal's lastDailyUpdate field
      if (onUpdateDeal) {
        const deal = deals.find(d => d.id === dealId);
        if (deal) {
          const updatedDeal: Deal = {
            ...deal,
            lastDailyUpdate: today,
            updatedAt: new Date().toISOString(),
          };
          onUpdateDeal(dealId, updatedDeal);
        }
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

  // Save a single deal update
  const handleSaveSingleDeal = async (dealId: string) => {
    const today = new Date().toISOString().split('T')[0];
    const update = updates[dealId];
    const deal = deals.find(d => d.id === dealId);
    
    if (!update || !deal) {
      return;
    }

    setIsSaving(true);

    try {
      const now = new Date().toISOString();
      let updatedDeal: Deal | null = null;

      // Save daily update if notes are provided
      if (update.notes) {
        const dailyUpdate: DailyUpdate = {
          dealId,
          date: today,
          updateType: 'notes',
          notes: update.notes,
          timestamp: now,
          userId,
        };
        saveDailyUpdate(dailyUpdate);

        // Update deal's notes field and activities
        updatedDeal = {
          ...deal,
          notes: update.notes, // Update notes field
          lastDailyUpdate: today,
          updatedAt: now,
          activities: [
            ...deal.activities,
            {
              id: nanoid(),
              timestamp: now,
              type: "note",
              description: update.notes,
              userId,
            },
          ],
        };
      } else {
        // Even without notes, update lastDailyUpdate
        updatedDeal = {
          ...deal,
          lastDailyUpdate: today,
          updatedAt: now,
        };
      }

      // Update deal stage if stage is changed
      if (update.stage && deal.stage !== update.stage) {
        if (onUpdateDealStage) {
          onUpdateDealStage(dealId, update.stage as DealStage);
        }
        // Also update in the deal object
        if (updatedDeal) {
          updatedDeal.stage = update.stage as DealStage;
          updatedDeal.activities = [
            ...(updatedDeal.activities || []),
            {
              id: nanoid(),
              timestamp: now,
              type: "stage_change",
              description: `Stage changed to ${update.stage}`,
              userId,
            },
          ];
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
    const today = new Date().toISOString().split('T')[0];
    setIsSaving(true);

    try {
      // Validate all updates before saving
      const updatesToSave: DailyUpdate[] = [];
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

      // Check if all deals are now updated
      const stillNeeding = getDealsNeedingUpdates(deals, userId).filter(d => d.needsUpdate);
      if (stillNeeding.length === 0) {
        onComplete();
      } else {
        // Refresh the list
        setDealsNeedingUpdates(getDealsNeedingUpdates(deals, userId));
        // Clear saved updates from state
        setUpdates({});
      }
    } catch (error) {
      console.error('Failed to save updates:', error);
      alert('Failed to save updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Mark all deals as "no update" and save immediately
  const handleMarkAllAsNoUpdate = async () => {
    const today = new Date().toISOString().split('T')[0];
    setIsSaving(true);

    try {
      // Save all deals that need updates as "no_update"
      const dealsToUpdate = dealsNeedingUpdates.filter(d => d.needsUpdate);
      
      for (const dealStatus of dealsToUpdate) {
        const dailyUpdate: DailyUpdate = {
          dealId: dealStatus.dealId,
          date: today,
          updateType: 'no_update',
          timestamp: new Date().toISOString(),
          userId,
        };
        saveDailyUpdate(dailyUpdate);
      }

      // Complete immediately
      onComplete();
    } catch (error) {
      console.error('Failed to save updates:', error);
      alert('Failed to save updates. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Check if there are any valid updates ready to save
  const hasValidUpdates = Object.keys(updates).some(dealId => {
    const update = updates[dealId];
    if (!update || !update.updateType) return false;
    // If status type is selected, status must be provided
    if (update.updateType === 'status' && !update.status) return false;
    return true;
  });

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
            Please provide an update for each active deal. You can select &ldquo;No update&rdquo; if there&rsquo;s nothing new.
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
          {/* Quick action button to mark all as no update and save */}
          {dealsNeedingCount > 0 && (
            <div className="mt-4">
              <Button
                variant="outline"
                onClick={handleMarkAllAsNoUpdate}
                disabled={isSaving}
                className="w-full sm:w-auto"
              >
                {isSaving ? 'Saving...' : `Mark All as No Update & Save (${dealsNeedingCount} deals)`}
              </Button>
            </div>
          )}
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
                              Last update: {new Date(dealStatus.lastUpdateDate).toLocaleDateString()}
                              {dealStatus.daysSinceUpdate >= 0 && (
                                <span> ({dealStatus.daysSinceUpdate} days ago)</span>
                              )}
                            </p>
                          )}
                        </div>
                        {/* Action buttons - always visible */}
                        <div className="flex items-center gap-2 ml-4">
                          {!isUpdated && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleNoChanges(dealStatus.dealId);
                                }}
                                disabled={isSaving}
                                className="text-xs"
                              >
                                No Changes
                              </Button>
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
                                Open/Edit
                              </Button>
                            </>
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
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNoChanges(dealStatus.dealId);
                              }}
                              disabled={isSaving}
                            >
                              No Changes
                            </Button>
                            <Button
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSaveSingleDeal(dealStatus.dealId);
                              }}
                              disabled={isSaving}
                            >
                              {isSaving ? 'Saving...' : 'Save Changes'}
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
          <Button
            onClick={handleSave}
            disabled={isSaving || !hasValidUpdates}
          >
            {isSaving ? 'Saving...' : allDealsUpdated ? 'Save' : `Save Updates (${Object.keys(updates).length} ready)`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

