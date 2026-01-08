"use client";

import React, { useState, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import type { Prospect, ProspectStatus } from "@/lib/types/prospect";
import { prospectStorage } from "@/lib/prospectStorage";
import { ProspectsDashboard } from "./ProspectsDashboard";
import { ProspectDetailView } from "./ProspectDetailView";
import { ProspectForm } from "./ProspectForm";
import { ProspectKanban } from "./ProspectKanban";
import { FollowUpSchedule } from "./FollowUpSchedule";
import type { ColdCallStage } from "@/lib/types/prospect";
import { useAuth } from "@/context/AuthContext";
import type { User } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { setProspectStorageUser } from "@/lib/prospectStorage";
import { Button } from "@/components/ui/button";
import { Phone, Calendar } from "lucide-react";

interface ProspectsAppProps {
  onConvertToDeal?: (prospect: Prospect) => void;
}

type View = "cold-call-tracker" | "follow-up-schedule" | "prospect-detail" | "prospect-form";

const FALLBACK_AUDIT_USER: User = {
  id: "system-user",
  email: "system@analysisbuddy.local",
  name: "System",
  role: "admin",
};

export function ProspectsApp({ onConvertToDeal }: ProspectsAppProps) {
  const { user: supabaseUser, supabase } = useAuth();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [currentView, setCurrentView] = useState<View>("cold-call-tracker");
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [auditActor, setAuditActor] = useState<User>(FALLBACK_AUDIT_USER);

  useEffect(() => {
    if (supabaseUser) {
      const transformedUser: User = {
        id: supabaseUser.id,
        email: supabaseUser.email ?? "",
        name:
          ('user_metadata' in supabaseUser && supabaseUser.user_metadata?.full_name) ||
          supabaseUser.email ||
          "User",
        role: "user",
      };
      setAuditActor(transformedUser);
      setProspectStorageUser(supabaseUser.id);
    } else {
      setAuditActor(FALLBACK_AUDIT_USER);
      setProspectStorageUser(null);
    }
  }, [supabaseUser]);

  // Load prospects from storage
  useEffect(() => {
    const loadProspects = () => {
      try {
        const loadedProspects = prospectStorage.load();
        setProspects(loadedProspects);
      } catch (error) {
        console.error("Failed to load prospects:", error);
        setProspects([]);
      }
    };

    loadProspects();
  }, []);

  // Save prospects when they change
  useEffect(() => {
    if (prospects.length >= 0) {
      prospectStorage.save(prospects);
    }
  }, [prospects]);

  const handleViewProspect = useCallback((prospect: Prospect) => {
    setSelectedProspect(prospect);
    setCurrentView("prospect-detail");
  }, []);

  const handleEditProspect = useCallback((prospect: Prospect) => {
    setEditingProspect(prospect);
    setCurrentView("prospect-form");
  }, []);


  const handleAddProspect = useCallback(() => {
    setEditingProspect(null);
    setCurrentView("prospect-form");
  }, []);

  const handleSaveProspect = useCallback((
    prospectData: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "activities" | "followUps"> & { 
      id?: string;
      followUps?: Prospect["followUps"];
    }
  ) => {
    const now = new Date().toISOString();
    let updatedProspectSnapshot: Prospect | null = null;
    let createdProspect: Prospect | null = null;

    if (prospectData.id) {
      setProspects(prevProspects => {
        return prevProspects.map(prospect => {
          if (prospect.id === prospectData.id) {
            const updatedProspect: Prospect = {
              ...prospect, // Preserve all existing fields first
              ...prospectData, // Override with form data
              followUps: prospectData.followUps || prospect.followUps,
              notes: prospectData.notes ?? prospect.notes ?? "", // Ensure notes is always a string
              updatedAt: now,
              activities: [
                ...prospect.activities, // Preserve existing activities
                {
                  id: nanoid(),
                  timestamp: now,
                  type: "note" as const,
                  description: "Prospect information updated",
                },
              ],
            };
            updatedProspectSnapshot = updatedProspect;
            return updatedProspect;
          }
          return prospect;
        });
      });
    } else {
      const newProspect: Prospect = {
        ...prospectData,
        id: nanoid(),
        followUps: prospectData.followUps || [],
        notes: prospectData.notes ?? "", // Ensure notes is always a string
        createdAt: now,
        updatedAt: now,
        activities: [
          {
            id: nanoid(),
            timestamp: now,
            type: "note" as const,
            description: "Prospect created",
          },
        ],
      };

      createdProspect = newProspect;
      setProspects(prev => [...prev, newProspect]);
    }

    if (updatedProspectSnapshot) {
      const snapshot: Prospect = updatedProspectSnapshot;
      logAction(auditActor, "prospect:update", "prospect", {
        resourceId: snapshot.id,
        details: {
          action: "update",
          name: snapshot.contact.name,
        },
      });
    }

    if (createdProspect) {
      logAction(auditActor, "prospect:create", "prospect", {
        resourceId: createdProspect.id,
        details: {
          name: createdProspect.contact.name,
        },
      });
    }

    setEditingProspect(null);
    setCurrentView("cold-call-tracker");
  }, [auditActor]);

  const handleCancelProspectForm = useCallback(() => {
    setEditingProspect(null);
    setCurrentView(selectedProspect ? "prospect-detail" : "cold-call-tracker");
  }, [selectedProspect]);

  const handleBackToDashboard = useCallback(() => {
    setSelectedProspect(null);
    setCurrentView("cold-call-tracker");
  }, []);

  const handleUpdateProspect = useCallback((prospectToUpdate: Prospect) => {
    const now = new Date().toISOString();
    let snapshot: Prospect | null = null;

    setProspects(prevProspects =>
      prevProspects.map(prospect =>
        prospect.id === prospectToUpdate.id
          ? (() => {
              const nextProspect: Prospect = {
                ...prospect,
                ...prospectToUpdate,
                updatedAt: now,
              };
              snapshot = nextProspect;
              return nextProspect;
            })()
          : prospect
      )
    );

    if (snapshot) {
      const prospectSnapshot: Prospect = snapshot;
      logAction(auditActor, "prospect:update", "prospect", {
        resourceId: prospectSnapshot.id,
        details: {
          action: "detail_update",
        },
      });
    }

    if (selectedProspect?.id === prospectToUpdate.id && snapshot) {
      setSelectedProspect(snapshot);
    }
  }, [auditActor, selectedProspect]);

  const handleScheduleFollowUp = useCallback((prospectId: string, followUp: Prospect["followUps"][0]) => {
    setProspects(prevProspects => {
      return prevProspects.map(prospect => {
        if (prospect.id === prospectId) {
          const updatedFollowUps = [...prospect.followUps, followUp];
          const sortedFollowUps = updatedFollowUps.sort((a, b) => 
            new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
          );
          const nextFollowUp = sortedFollowUps.find(fu => !fu.completed);
          
          return {
            ...prospect,
            followUps: sortedFollowUps,
            nextFollowUpDate: nextFollowUp?.scheduledDate,
            updatedAt: new Date().toISOString(),
            activities: [
              ...prospect.activities,
              {
                id: nanoid(),
                timestamp: new Date().toISOString(),
                type: "follow_up" as const,
                description: `Follow-up scheduled: ${followUp.type} on ${new Date(followUp.scheduledDate).toLocaleDateString()}`,
              },
            ],
          };
        }
        return prospect;
      });
    });
  }, []);

  const handleProspectStageChange = useCallback((prospectId: string, newStage: ColdCallStage) => {
    const now = new Date().toISOString();
    setProspects(prevProspects => {
      return prevProspects.map(prospect => {
        if (prospect.id === prospectId) {
          const currentStage = prospect.coldCallStage || "Research";
          
          // Track outreach attempt when moving to Attempt stages
          const outreachAttempts = prospect.outreachAttempts || [];
          const newAttempts = [...outreachAttempts];
          
          if (newStage.startsWith("Attempt")) {
            // Add new attempt record
            const attemptExists = newAttempts.some(a => a.stage === newStage);
            
            if (!attemptExists) {
              newAttempts.push({
                id: nanoid(),
                timestamp: now,
                stage: newStage,
                type: "call", // Default, can be updated later
              });
            }
          }

          const updatedProspect: Prospect = {
            ...prospect,
            coldCallStage: newStage,
            outreachAttempts: newAttempts,
            updatedAt: now,
            activities: [
              ...prospect.activities,
              {
                id: nanoid(),
                timestamp: now,
                type: "status_change" as const,
                description: `Moved from ${currentStage} to ${newStage}`,
              },
            ],
          };

          // If moved to Attempt 4, prompt user about next steps (dead or follow-up)
          if (newStage === "Attempt 4") {
            // This could trigger a modal or notification
            console.log(`Prospect ${prospect.contact.name} has reached Attempt 4. Consider moving to Dead or Follow Up.`);
          }

          return updatedProspect;
        }
        return prospect;
      });
    });

    logAction(auditActor, "prospect:stage_change", "prospect", {
      resourceId: prospectId,
      details: {
        newStage,
      },
    });
  }, [auditActor]);

  const handleConvertToDeal = useCallback((prospect: Prospect) => {
    if (onConvertToDeal) {
      onConvertToDeal(prospect);
      
      // Update prospect status
      setProspects(prevProspects =>
        prevProspects.map(p =>
          p.id === prospect.id
            ? {
                ...p,
                status: "Converted to Deal" as ProspectStatus,
                updatedAt: new Date().toISOString(),
                activities: [
                  ...p.activities,
                  {
                    id: nanoid(),
                    timestamp: new Date().toISOString(),
                    type: "converted" as const,
                    description: "Prospect converted to deal",
                  },
                ],
              }
            : p
        )
      );
      
      // Navigate back to cold call tracker
      setSelectedProspect(null);
      setCurrentView("cold-call-tracker");
    }
  }, [onConvertToDeal]);

  return (
    <div className="h-full flex flex-col">
      {/* Tab Navigation - Only show for main views */}
      {(currentView === "cold-call-tracker" || currentView === "follow-up-schedule") && (
        <div className="flex-shrink-0 border-b bg-white px-6 py-2">
          <div className="flex items-center gap-2">
            <Button
              variant={currentView === "cold-call-tracker" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("cold-call-tracker")}
              className="gap-2"
            >
              <Phone className="h-4 w-4" />
              Cold Call Tracker
            </Button>
            <Button
              variant={currentView === "follow-up-schedule" ? "default" : "ghost"}
              size="sm"
              onClick={() => setCurrentView("follow-up-schedule")}
              className="gap-2"
            >
              <Calendar className="h-4 w-4" />
              Follow Up Schedule
            </Button>
          </div>
        </div>
      )}

      {currentView === "cold-call-tracker" && (
        <ProspectsDashboard
          prospects={prospects}
          onViewProspect={handleViewProspect}
          onEditProspect={handleEditProspect}
          onAddProspect={handleAddProspect}
          onScheduleFollowUp={handleScheduleFollowUp}
          onConvertToDeal={handleConvertToDeal}
          onProspectStageChange={handleProspectStageChange}
          onImportProspects={(importedProspects) => {
            setProspects(prev => [...prev, ...importedProspects]);
            logAction(auditActor, "prospect:import", "prospect", {
              resourceId: "bulk",
              details: {
                count: importedProspects.length,
                source: "ZoomInfo",
              },
            });
          }}
        />
      )}

      {currentView === "follow-up-schedule" && (
        <FollowUpSchedule
          prospects={prospects}
          onViewProspect={handleViewProspect}
        />
      )}

      {currentView === "prospect-detail" && selectedProspect && (
        <ProspectDetailView
          prospect={selectedProspect}
          onBack={handleBackToDashboard}
          onEdit={handleEditProspect}
          onUpdateProspect={handleUpdateProspect}
          onScheduleFollowUp={handleScheduleFollowUp}
          onConvertToDeal={handleConvertToDeal}
        />
      )}

      {currentView === "prospect-form" && (
        <ProspectForm
          prospect={editingProspect || undefined}
          onSave={handleSaveProspect}
          onCancel={handleCancelProspectForm}
        />
      )}
    </div>
  );
}

