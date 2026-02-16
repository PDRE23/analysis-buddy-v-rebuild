import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, ArrowLeft, ChevronRight } from "lucide-react";
import { parseDateOnly } from "@/lib/dateOnly";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import type { LeaseType, ProposalSide, Proposal } from "@/types";

const fmtMoney = (v: number | undefined) =>
  (v ?? 0).toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function ProposalsBoard({
  analysis,
  onBack,
  onOpenProposal,
  onNewProposal,
  onReorderProposals,
}: {
  analysis: {
    id: string;
    name: string;
    status: string;
    tenant_name: string;
    market: string;
    rsf: number;
    lease_type: LeaseType;
    rep_type?: "Occupier" | "Landlord";
    proposals: Proposal[];
  };
  onBack: () => void;
  onOpenProposal: (proposalId: string) => void;
  onNewProposal: (side: ProposalSide) => void;
  onReorderProposals?: (proposalIds: string[]) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id && onReorderProposals) {
      const oldIndex = analysis.proposals.findIndex(p => p.id === active.id);
      const newIndex = analysis.proposals.findIndex(p => p.id === over.id);
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(analysis.proposals, oldIndex, newIndex);
        onReorderProposals(reordered.map(p => p.id));
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
    <div className="max-w-[1200px] mx-auto px-4 py-4 sm:py-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack} className="flex-shrink-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <h2 className="text-lg sm:text-xl font-semibold truncate">{analysis.name}</h2>
          {analysis.rep_type && (
            <Badge 
              variant={analysis.rep_type === "Occupier" ? "default" : "outline"} 
              className="text-xs"
            >
              {analysis.rep_type} Rep
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => onNewProposal("Landlord")} className="rounded-2xl flex-1 sm:flex-none">
            +Landlord Counter
          </Button>
          <Button variant="outline" onClick={() => onNewProposal("Tenant")} className="rounded-2xl flex-1 sm:flex-none">
            + Tenant Counter
          </Button>
        </div>
      </div>

      {/* Empty State */}
      {analysis.proposals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
          <div className="mb-4">
            <p className="text-lg font-medium text-muted-foreground mb-2">No proposals yet</p>
            <p className="text-sm text-muted-foreground">
              Create your first proposal to start analyzing this lease
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              onClick={() => onNewProposal("Tenant")} 
              className="rounded-2xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Proposal
            </Button>
          </div>
        </div>
      ) : (
        <>
      {/* Columns - Mobile: Stack, Desktop: Grid */}
      <div className="block sm:hidden space-y-4">
        {analysis.proposals.map((p) => {
          const meta = p.meta;
          return (
            <Card key={p.id} className="rounded-2xl">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {p.side}
                      {p.label ? ` • ${p.label}` : ""}
                    </div>
                    <div className="text-lg font-medium">{meta.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenProposal(p.id)}
                    title="Open details"
                  >
                    Open <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                
                {/* Mobile Input Parameters */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Badge variant="secondary" title="Base Rent" className="text-center">
                    ${meta.rent_schedule?.[0]?.rent_psf || 0}/SF
                  </Badge>
                  <Badge variant="secondary" title="RSF" className="text-center">
                    {meta.rsf.toLocaleString()}
                  </Badge>
                  <Badge variant="secondary" title="Term" className="text-center">
                    {(() => {
                      const expirationDate = parseDateOnly(meta.key_dates.expiration);
                      const commencementDate = parseDateOnly(meta.key_dates.commencement);
                      if (!expirationDate || !commencementDate) return "0";
                      return Math.round(
                        (expirationDate.getTime() - commencementDate.getTime()) /
                          (1000 * 60 * 60 * 24 * 365.25)
                      ).toString();
                    })()} yrs
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Badge variant="outline" title="TI Allowance" className="text-center">
                    ${meta.concessions?.ti_allowance_psf || 0}/SF
                  </Badge>
                  <Badge variant="outline" title="Free Rent" className="text-center">
                    {meta.concessions?.abatement_type === "at_commencement" 
                      ? (meta.concessions?.abatement_free_rent_months || 0)
                      : (meta.concessions?.abatement_periods?.reduce((sum, p) => sum + p.free_rent_months, 0) || 0)} mo
                  </Badge>
                  <Badge variant="outline" title="Moving Allowance" className="text-center">
                    {meta.concessions?.moving_allowance ? 
                      `$${(meta.concessions.moving_allowance / 1000).toFixed(0)}k` : 
                      '$0'
                    }
                  </Badge>
                </div>

                {/* Mobile proposal details */}
                <div className="space-y-3 text-sm">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Lease Type:</span>
                      <div className="font-medium">{meta.lease_type}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">RSF:</span>
                      <div className="font-medium">{meta.rsf.toLocaleString()}</div>
                    </div>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Base Rent (Yr1):</span>
                    <div className="font-medium">
                      {meta.rent_schedule.length > 0 
                        ? fmtMoney(meta.rent_schedule[0].rent_psf * meta.rsf)
                        : "—"
                      }
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="hidden sm:block overflow-auto">
        <SortableContext
          items={analysis.proposals.map(p => p.id)}
          strategy={undefined}
        >
          <div
            className="min-w-[900px] grid"
            style={{ gridTemplateColumns: `repeat(${analysis.proposals.length}, 1fr)` }}
          >

            {/* Proposal columns */}
            {analysis.proposals.map((p) => {
            const meta = p.meta;
            return (
              <div key={p.id} className="border rounded-r-xl -ml-px">
                <div className="p-3 flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">
                      {p.side}
                      {p.label ? ` • ${p.label}` : ""}
                    </div>
                    <div className="text-lg font-medium">{meta.name}</div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onOpenProposal(p.id)}
                    title="Open details"
                  >
                    Open <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
                <div className="px-3 pb-3 grid gap-3">
                  {/* Input Parameters Summary */}
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Base Rent:</span>
                        <span className="font-medium">
                          ${meta.rent_schedule?.[0]?.rent_psf || 0}/SF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">RSF:</span>
                        <span className="font-medium">
                          {meta.rsf.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Term:</span>
                        <span className="font-medium">
                          {(() => {
                            const expirationDate = parseDateOnly(meta.key_dates.expiration);
                            const commencementDate = parseDateOnly(meta.key_dates.commencement);
                            if (!expirationDate || !commencementDate) return "0";
                            return Math.round(
                              (expirationDate.getTime() - commencementDate.getTime()) /
                                (1000 * 60 * 60 * 24 * 365.25)
                            ).toString();
                          })()} yrs
                        </span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">TI Allowance:</span>
                        <span className="font-medium">
                          ${meta.concessions?.ti_allowance_psf || 0}/SF
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Free Rent:</span>
                        <span className="font-medium">
                          {meta.concessions?.abatement_type === "at_commencement" 
                            ? (meta.concessions?.abatement_free_rent_months || 0)
                            : (meta.concessions?.abatement_periods?.reduce((sum, p) => sum + p.free_rent_months, 0) || 0)} mo
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Moving:</span>
                        <span className="font-medium">
                          {meta.concessions?.moving_allowance ? 
                            `$${(meta.concessions.moving_allowance / 1000).toFixed(0)}k` : 
                            '$0'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        </SortableContext>
      </div>
        </>
      )}
    </div>
    </DndContext>
  );
}
