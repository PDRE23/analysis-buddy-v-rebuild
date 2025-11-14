"use client";

/**
 * Presence Indicator Component
 * Shows who's currently viewing/editing a resource
 */

import React, { useEffect, useState } from "react";
import { getCollaborators, subscribeToEvents, type Collaborator } from "@/lib/realtime";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface PresenceIndicatorProps {
  resourceId: string;
  resourceType: "deal" | "analysis" | "note";
  currentUserId: string;
  maxVisible?: number;
  className?: string;
}

export function PresenceIndicator({
  resourceId,
  resourceType,
  currentUserId,
  maxVisible = 3,
  className,
}: PresenceIndicatorProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    const updateCollaborators = () => {
      const collabs = getCollaborators(resourceId, resourceType);
      setCollaborators(collabs.filter(c => c.id !== currentUserId));
    };

    updateCollaborators();

    const unsubscribe = subscribeToEvents((event) => {
      if (
        event.resourceId === resourceId &&
        event.resourceType === resourceType
      ) {
        updateCollaborators();
      }
    });

    const interval = setInterval(updateCollaborators, 2000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [resourceId, resourceType, currentUserId]);

  if (collaborators.length === 0) {
    return null;
  }

  const visible = collaborators.slice(0, maxVisible);
  const remaining = collaborators.length - visible.length;

  return (
    <div className={cn("flex items-center gap-1", className)}>
      <TooltipProvider>
        {visible.map((collaborator, index) => (
          <Tooltip key={collaborator.id}>
            <TooltipTrigger asChild>
              <div
                className="relative"
                style={{
                  zIndex: visible.length - index,
                  marginLeft: index > 0 ? "-8px" : "0",
                }}
              >
                <Avatar
                  className="h-6 w-6 border-2 border-white"
                  style={{
                    borderColor: collaborator.color,
                  }}
                >
                  <AvatarFallback
                    className="text-xs"
                    style={{
                      backgroundColor: collaborator.color,
                      color: "white",
                    }}
                  >
                    {collaborator.name
                      .split(" ")
                      .map(n => n[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                {/* Active indicator */}
                <div
                  className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full border-2 border-white"
                  style={{
                    backgroundColor: collaborator.color,
                  }}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>{collaborator.name}</p>
              <p className="text-xs text-muted-foreground">
                {collaborator.cursor?.element || "Viewing"}
              </p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
      
      {remaining > 0 && (
        <div className="h-6 w-6 rounded-full border-2 border-white bg-muted flex items-center justify-center text-xs font-medium ml-1">
          +{remaining}
        </div>
      )}
    </div>
  );
}

