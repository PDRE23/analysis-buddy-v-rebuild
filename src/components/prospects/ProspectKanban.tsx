"use client";

import React, { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Prospect } from "@/lib/types/prospect";
import type { ColdCallStage } from "@/lib/types/prospect";
import { COLD_CALL_STAGES } from "@/lib/types/prospect";
import { ProspectStageColumn } from "./ProspectStageColumn";
import { ProspectCard } from "./ProspectCard";

interface ProspectKanbanProps {
  prospects: Prospect[];
  onProspectStageChange: (prospectId: string, newStage: ColdCallStage) => void;
  onViewProspect?: (prospect: Prospect) => void;
  onEditProspect?: (prospect: Prospect) => void;
  onAddProspect?: (stage: ColdCallStage) => void;
  onScheduleFollowUp?: (prospectId: string, followUp: Prospect["followUps"][0]) => void;
  onConvertToDeal?: (prospect: Prospect) => void;
}

// Sortable wrapper for ProspectCard
function SortableProspectCard({ 
  prospect, 
  onView, 
  onEdit,
  onScheduleFollowUp,
  onConvertToDeal,
}: { 
  prospect: Prospect; 
  onView?: (prospect: Prospect) => void;
  onEdit?: (prospect: Prospect) => void;
  onScheduleFollowUp?: (prospectId: string, followUp: Prospect["followUps"][0]) => void;
  onConvertToDeal?: (prospect: Prospect) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: prospect.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ProspectCard
        prospect={prospect}
        onView={onView}
        onEdit={onEdit}
        onScheduleFollowUp={onScheduleFollowUp}
        onConvertToDeal={onConvertToDeal}
        isDragging={isDragging}
      />
    </div>
  );
}

export function ProspectKanban({
  prospects,
  onProspectStageChange,
  onViewProspect,
  onEditProspect,
  onAddProspect,
  onScheduleFollowUp,
  onConvertToDeal,
}: ProspectKanbanProps) {
  const [activeProspect, setActiveProspect] = useState<Prospect | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Group prospects by cold call stage
  const prospectsByStage = useMemo(() => {
    const grouped: Record<ColdCallStage, Prospect[]> = {
      "Research": [],
      "Attempt 1": [],
      "Attempt 2": [],
      "Attempt 3": [],
      "Attempt 4": [],
    };

    // Group prospects
    prospects.forEach(prospect => {
      const stage = prospect.coldCallStage || "Research";
      if (grouped[stage as ColdCallStage]) {
        grouped[stage as ColdCallStage].push(prospect);
      } else {
        // Default to Research if stage is invalid
        grouped["Research"].push(prospect);
      }
    });

    // Sort prospects within each stage by updatedAt (most recent first)
    Object.keys(grouped).forEach((stage) => {
      grouped[stage as ColdCallStage].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });

    return grouped;
  }, [prospects]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const prospect = prospects.find(p => p.id === active.id);
    setActiveProspect(prospect || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveProspect(null);
      return;
    }

    const prospectId = active.id as string;
    
    // Check if over.id is a valid stage, otherwise find the prospect's stage
    let newStage: ColdCallStage;
    if (COLD_CALL_STAGES.includes(over.id as ColdCallStage)) {
      // Dropped directly on a stage column
      newStage = over.id as ColdCallStage;
    } else {
      // Dropped on another prospect - find which stage that prospect belongs to
      const targetProspect = prospects.find(p => p.id === over.id);
      if (!targetProspect) {
        setActiveProspect(null);
        return;
      }
      newStage = (targetProspect.coldCallStage || "Research") as ColdCallStage;
    }

    // Find the prospect being moved
    const prospect = prospects.find(p => p.id === prospectId);
    
    if (prospect) {
      const currentStage = prospect.coldCallStage || "Research";
      if (currentStage !== newStage) {
        onProspectStageChange(prospectId, newStage);
      }
    }

    setActiveProspect(null);
  };

  const handleDragCancel = () => {
    setActiveProspect(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 pb-4 h-full w-full overflow-x-auto">
        {COLD_CALL_STAGES.map((stage) => (
          <ProspectStageColumn
            key={stage}
            stage={stage}
            prospects={prospectsByStage[stage]}
            onAddProspect={onAddProspect}
          >
            {prospectsByStage[stage].map((prospect) => (
              <SortableProspectCard
                key={prospect.id}
                prospect={prospect}
                onView={onViewProspect}
                onEdit={onEditProspect}
                onScheduleFollowUp={onScheduleFollowUp}
                onConvertToDeal={onConvertToDeal}
              />
            ))}
          </ProspectStageColumn>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeProspect ? (
          <div className="opacity-90 rotate-3">
            <ProspectCard
              prospect={activeProspect}
              onView={onViewProspect}
              onEdit={onEditProspect}
              onScheduleFollowUp={onScheduleFollowUp}
              onConvertToDeal={onConvertToDeal}
              isDragging={true}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

