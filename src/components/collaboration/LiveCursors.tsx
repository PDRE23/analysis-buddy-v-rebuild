"use client";

/**
 * Live Cursors Component
 * Displays other users' cursors in real-time
 */

import React, { useEffect, useRef } from "react";
import { getCollaborators, subscribeToEvents, type Collaborator } from "@/lib/realtime";
import { cn } from "@/lib/utils";

interface LiveCursorsProps {
  resourceId: string;
  resourceType: "deal" | "analysis" | "note";
  currentUserId: string;
  className?: string;
}

export function LiveCursors({
  resourceId,
  resourceType,
  currentUserId,
  className,
}: LiveCursorsProps) {
  const [collaborators, setCollaborators] = React.useState<Collaborator[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Get initial collaborators
    const updateCollaborators = () => {
      const collabs = getCollaborators(resourceId, resourceType);
      setCollaborators(collabs.filter(c => c.id !== currentUserId));
    };

    updateCollaborators();

    // Subscribe to collaboration events
    const unsubscribe = subscribeToEvents((event) => {
      if (
        event.resourceId === resourceId &&
        event.resourceType === resourceType &&
        event.userId !== currentUserId
      ) {
        updateCollaborators();
      }
    });

    // Poll for updates (in production, this would be WebSocket)
    const interval = setInterval(updateCollaborators, 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [resourceId, resourceType, currentUserId]);

  if (collaborators.length === 0) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("fixed inset-0 pointer-events-none z-50", className)}
    >
      {collaborators.map((collaborator) => {
        if (!collaborator.cursor) return null;

        return (
          <div
            key={collaborator.id}
            className="absolute pointer-events-none"
            style={{
              left: `${collaborator.cursor.x}px`,
              top: `${collaborator.cursor.y}px`,
              transform: "translate(-50%, -50%)",
            }}
          >
            {/* Cursor */}
            <div
              className="relative"
              style={{
                color: collaborator.color,
              }}
            >
              {/* Cursor arrow */}
              <svg
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
                className="drop-shadow-md"
              >
                <path
                  d="M0 0L20 20L15 20L5 10L0 5Z"
                  fill={collaborator.color}
                />
              </svg>
              
              {/* User label */}
              <div
                className="absolute top-5 left-0 px-2 py-1 rounded text-xs text-white whitespace-nowrap"
                style={{
                  backgroundColor: collaborator.color,
                }}
              >
                {collaborator.name}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

