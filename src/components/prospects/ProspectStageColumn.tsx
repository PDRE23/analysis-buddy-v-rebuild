"use client";

import React from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import type { Prospect } from "@/lib/types/prospect";
import type { ColdCallStage } from "@/lib/types/prospect";

interface ProspectStageColumnProps {
  stage: ColdCallStage;
  prospects: Prospect[];
  onAddProspect?: (stage: ColdCallStage) => void;
  children: React.ReactNode;
}

const STAGE_COLORS: Record<ColdCallStage, string> = {
  "Research": "bg-blue-100 text-blue-800 border-blue-300",
  "Attempt 1": "bg-yellow-100 text-yellow-800 border-yellow-300",
  "Attempt 2": "bg-orange-100 text-orange-800 border-orange-300",
  "Attempt 3": "bg-red-100 text-red-800 border-red-300",
  "Attempt 4": "bg-purple-100 text-purple-800 border-purple-300",
};

export function ProspectStageColumn({ 
  stage, 
  prospects, 
  onAddProspect, 
  children 
}: ProspectStageColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage,
  });

  const stageColor = STAGE_COLORS[stage] || "bg-gray-100 text-gray-800 border-gray-300";

  return (
    <div className="flex flex-col h-full min-w-[280px] max-w-[320px]">
      <Card className="flex flex-col h-full">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Badge className={stageColor} variant="secondary">
                {stage}
              </Badge>
            </CardTitle>
            <Badge variant="outline" className="text-xs">
              {prospects.length}
            </Badge>
          </div>
          {onAddProspect && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddProspect(stage)}
              className="w-full gap-2"
            >
              <Plus className="h-3 w-3" />
              Add Prospect
            </Button>
          )}
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          {/* Droppable Area */}
          <div
            ref={setNodeRef}
            className={`
              flex-1 rounded-lg p-2 transition-colors min-h-[200px] overflow-y-auto
              ${isOver ? 'bg-blue-50 border-2 border-blue-300 border-dashed' : 'bg-gray-50 border-2 border-transparent'}
            `}
            role="list"
            aria-label={`${stage} prospects`}
          >
            <SortableContext
              items={prospects.map(p => p.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {children}
              </div>
            </SortableContext>

            {/* Empty State */}
            {prospects.length === 0 && (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm py-8">
                {isOver ? 'Drop here' : 'No prospects'}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

