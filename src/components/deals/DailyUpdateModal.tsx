"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Clock } from "lucide-react";
import type { Deal } from "@/lib/types/deal";
import type { DailyUpdate, DealUpdateStatus } from "@/lib/types/tracking";
import { getDealsNeedingUpdates, saveDailyUpdate, hasDealBeenUpdatedToday } from "@/lib/dailyTracking";
import { nanoid } from "nanoid";

interface DailyUpdateModalProps {
  deals: Deal[];
  isOpen: boolean;
  onComplete: () => void;
  userId?: string;
}

export function DailyUpdateModal({
  deals,
  isOpen,
  onComplete,
  userId = "User",
}: DailyUpdateModalProps) {
  const [dealsNeedingUpdates, setDealsNeedingUpdates] = useState<DealUpdateStatus[]>([]);
  const [updates, setUpdates] = useState<Record<string, Partial<DailyUpdate>>>({});
  const [isSaving, setIsSaving] = useState(false);

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
    }
  }, [isOpen, deals, userId]);

  const handleUpdateChange = (dealId: string, field: keyof DailyUpdate, value: string) => {
    setUpdates(prev => ({
      ...prev,
      [dealId]: {
        ...prev[dealId],
        [field]: value,
      },
    }));
  };

  const handleSave = async () => {
    const today = new Date().toISOString().split('T')[0];
    setIsSaving(true);

    try {
      // Save all updates
      for (const dealId in updates) {
        const update = updates[dealId];
        if (update && update.updateType) {
          const dailyUpdate: DailyUpdate = {
            dealId,
            date: today,
            updateType: update.updateType as DailyUpdate['updateType'],
            status: update.status,
            notes: update.notes,
            timestamp: new Date().toISOString(),
            userId,
          };
          saveDailyUpdate(dailyUpdate);
        }
      }

      // Check if all deals are now updated
      const stillNeeding = getDealsNeedingUpdates(deals, userId).filter(d => d.needsUpdate);
      if (stillNeeding.length === 0) {
        onComplete();
      } else {
        // Refresh the list
        setDealsNeedingUpdates(getDealsNeedingUpdates(deals, userId));
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

                return (
                  <Card
                    key={dealStatus.dealId}
                    className={`${isUpdated ? 'bg-green-50 border-green-200' : ''} ${
                      dealStatus.isStale ? 'border-red-200 bg-red-50' : ''
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
                      </div>

                      {!isUpdated && (
                        <div className="space-y-3">
                          <div>
                            <label className="text-sm font-medium mb-1 block">
                              Update Type
                            </label>
                            <Select
                              value={update.updateType || 'no_update'}
                              onChange={(e) => handleUpdateChange(
                                dealStatus.dealId,
                                'updateType',
                                e.target.value
                              )}
                              options={[
                                { value: 'no_update', label: 'No update' },
                                { value: 'status', label: 'Status update' },
                                { value: 'notes', label: 'Add notes' },
                              ]}
                            />
                          </div>

                          {update.updateType === 'status' && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Status
                              </label>
                              <Select
                                value={update.status || ''}
                                onChange={(e) => handleUpdateChange(
                                  dealStatus.dealId,
                                  'status',
                                  e.target.value
                                )}
                                options={[
                                  { value: 'Moving forward', label: 'Moving forward' },
                                  { value: 'On hold', label: 'On hold' },
                                  { value: 'Waiting for response', label: 'Waiting for response' },
                                  { value: 'Negotiating', label: 'Negotiating' },
                                  { value: 'Issue', label: 'Issue' },
                                  { value: 'Other', label: 'Other' },
                                ]}
                                placeholder="Select status"
                              />
                            </div>
                          )}

                          {(update.updateType === 'notes' || update.updateType === 'status') && (
                            <div>
                              <label className="text-sm font-medium mb-1 block">
                                Notes (optional)
                              </label>
                              <Textarea
                                value={update.notes || ''}
                                onChange={(e) => handleUpdateChange(
                                  dealStatus.dealId,
                                  'notes',
                                  e.target.value
                                )}
                                placeholder="Add any notes about this deal..."
                                rows={2}
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </>
          )}
        </CardContent>

        <div className="border-t p-4 flex justify-end gap-2">
          <Button
            onClick={handleSave}
            disabled={isSaving || !allDealsUpdated}
          >
            {isSaving ? 'Saving...' : allDealsUpdated ? 'Complete' : `Save Updates (${updatedCount}/${totalCount})`}
          </Button>
        </div>
      </Card>
    </div>
  );
}

