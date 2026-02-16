"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DealStage, Deal } from "@/lib/types/deal";
import { getStageColor } from "@/lib/types/deal";
import { Plus } from "lucide-react";

interface StageColumnProps {
  stage: DealStage;
  deals: Deal[];
  onAddDeal?: (stage: DealStage) => void;
  children: React.ReactNode;
}

export function StageColumn({ stage, deals, onAddDeal, children }: StageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const totalValue = deals.reduce((sum, deal) => sum + (deal.estimatedValue || 0), 0);

  return (
    <div className="flex flex-col h-full flex-1 min-w-0">
      <div className="flex-shrink-0 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge className={getStageColor(stage)} variant="secondary">
              {stage}
            </Badge>
            <span className="text-sm font-medium text-muted-foreground">
              {deals.length}
            </span>
          </div>
          
          {onAddDeal && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => onAddDeal(stage)}
            aria-label={`Add new deal in ${stage}`}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        {totalValue > 0 && (
          <div className="text-xs text-muted-foreground">
            ${totalValue.toLocaleString()}
          </div>
        )}
      </div>

      <div
        ref={setNodeRef}
        className={`
          flex-1 rounded-lg p-2 transition-colors min-h-[200px]
          ${isOver ? 'bg-ring/10 border-2 border-ring/30 border-dashed' : 'bg-muted/50 border-2 border-transparent'}
        `}
        role="list"
        aria-label={`${stage} deals`}
      >
        <SortableContext
          items={deals.map(d => d.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {children}
          </div>
        </SortableContext>

        {deals.length === 0 && (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            {isOver ? 'Drop here' : 'No deals'}
          </div>
        )}
      </div>
    </div>
  );
}
