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
import type { Deal, DealStage } from "@/lib/types/deal";
import { ACTIVE_STAGES, ALL_STAGES } from "@/lib/types/deal";
import { StageColumn } from "./StageColumn";
import { DealCard } from "./DealCard";

interface DealKanbanProps {
  deals: Deal[];
  onDealStageChange: (dealId: string, newStage: DealStage) => void;
  onViewDeal?: (deal: Deal) => void;
  onEditDeal?: (deal: Deal) => void;
  onDeleteDeal?: (deal: Deal) => void;
  onAddDeal?: (stage: DealStage) => void;
  showClosedDeals?: boolean;
}

// Sortable wrapper for DealCard
function SortableDealCard({ 
  deal, 
  onView, 
  onEdit, 
  onDelete 
}: { 
  deal: Deal; 
  onView?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: deal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <DealCard
        deal={deal}
        onView={onView}
        onEdit={onEdit}
        onDelete={onDelete}
        isDragging={isDragging}
      />
    </div>
  );
}

export function DealKanban({
  deals,
  onDealStageChange,
  onViewDeal,
  onEditDeal,
  onDeleteDeal,
  onAddDeal,
  showClosedDeals = false,
}: DealKanbanProps) {
  const [activeDeal, setActiveDeal] = useState<Deal | null>(null);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag
      },
    })
  );

  // Determine which stages to show
  const stagesToShow = showClosedDeals ? ALL_STAGES : ACTIVE_STAGES;

  // Group deals by stage
  const dealsByStage = useMemo(() => {
    const grouped: Record<DealStage, Deal[]> = {} as Record<DealStage, Deal[]>;
    
    // Initialize all stages
    stagesToShow.forEach(stage => {
      grouped[stage] = [];
    });

    // Group deals
    deals.forEach(deal => {
      if (grouped[deal.stage]) {
        grouped[deal.stage].push(deal);
      }
    });

    // Sort deals within each stage by updatedAt (most recent first)
    Object.keys(grouped).forEach((stage) => {
      grouped[stage as DealStage].sort((a, b) => {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      });
    });

    return grouped;
  }, [deals, stagesToShow]);

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const deal = deals.find(d => d.id === active.id);
    setActiveDeal(deal || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      setActiveDeal(null);
      return;
    }

    const dealId = active.id as string;
    
    // Check if over.id is a valid stage, otherwise find the deal's stage
    let newStage: DealStage;
    if (stagesToShow.includes(over.id as DealStage)) {
      // Dropped directly on a stage column
      newStage = over.id as DealStage;
    } else {
      // Dropped on another deal - find which stage that deal belongs to
      const targetDeal = deals.find(d => d.id === over.id);
      if (!targetDeal) {
        setActiveDeal(null);
        return;
      }
      newStage = targetDeal.stage;
    }

    // Find the deal being moved
    const deal = deals.find(d => d.id === dealId);
    
    if (deal && deal.stage !== newStage) {
      onDealStageChange(dealId, newStage);
    }

    setActiveDeal(null);
  };

  const handleDragCancel = () => {
    setActiveDeal(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="flex gap-4 pb-4 h-full w-full">
        {stagesToShow.map((stage) => (
          <StageColumn
            key={stage}
            stage={stage}
            deals={dealsByStage[stage]}
            onAddDeal={onAddDeal}
          >
            {dealsByStage[stage].map((deal) => (
              <SortableDealCard
                key={deal.id}
                deal={deal}
                onView={onViewDeal}
                onEdit={onEditDeal}
                onDelete={onDeleteDeal}
              />
            ))}
          </StageColumn>
        ))}
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeDeal ? (
          <DealCard
            deal={activeDeal}
            isDragging={true}
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

