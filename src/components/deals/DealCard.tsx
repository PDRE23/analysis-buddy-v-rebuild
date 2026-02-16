"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ContextMenuComponent, type ContextMenuGroup } from "@/components/ui/context-menu";
import type { Deal, DealStage } from "@/lib/types/deal";
import { getPriorityColor, daysSinceUpdate, getDealSummary, ALL_STAGES } from "@/lib/types/deal";
import { Building2, MapPin, Calendar, FileText, MoreVertical, Eye, Edit, Trash2, AlertCircle, CheckCircle2, Plus, FileDown, StickyNote, Copy } from "lucide-react";
import { hasDealBeenUpdatedToday, getDealsNeedingUpdates } from "@/lib/dailyTracking";
import { calculateDealHealthScore } from "@/lib/aiInsights";
import { InsightBadge } from "@/components/ui/insight-badge";
import { formatDateOnlyDisplay } from "@/lib/dateOnly";

interface DealCardProps {
  deal: Deal;
  onView?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  onCreateAnalysis?: (deal: Deal) => void;
  onDuplicate?: (deal: Deal) => void;
  onExport?: (deal: Deal) => void;
  onStageChange?: (deal: Deal, stage: DealStage) => void;
  isDragging?: boolean;
}

function DealCardComponent({ 
  deal, 
  onView, 
  onEdit, 
  onDelete, 
  onCreateAnalysis,
  onDuplicate,
  onExport,
  onStageChange,
  isDragging = false 
}: DealCardProps) {
  const daysStale = daysSinceUpdate(deal);
  
  const hasDailyUpdate = hasDealBeenUpdatedToday(deal.id);
  const needsDailyUpdate = !hasDailyUpdate && 
    (deal.status === "Active" || (deal.stage !== "Closed Won" && deal.stage !== "Closed Lost"));
  
  const healthScore = React.useMemo(() => calculateDealHealthScore(deal), [deal]);

  const handleCardClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.deal-actions')) {
      return;
    }
    onView?.(deal);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onView?.(deal);
    }
  };

  const contextMenuGroups: ContextMenuGroup[] = [
    {
      id: "primary",
      actions: [
        ...(onView ? [{
          id: "view",
          label: "View Deal",
          icon: <Eye className="h-4 w-4" />,
          onClick: () => onView(deal),
        }] : []),
        ...(onEdit ? [{
          id: "edit",
          label: "Edit Deal",
          icon: <Edit className="h-4 w-4" />,
          onClick: () => onEdit(deal),
        }] : []),
        ...(onCreateAnalysis ? [{
          id: "create-analysis",
          label: "Create Analysis",
          icon: <Plus className="h-4 w-4" />,
          onClick: () => onCreateAnalysis(deal),
        }] : []),
      ],
    },
    {
      id: "actions",
      actions: [
        ...(onDuplicate ? [{
          id: "duplicate",
          label: "Duplicate Deal",
          icon: <Copy className="h-4 w-4" />,
          onClick: () => onDuplicate(deal),
        }] : []),
        ...(onExport ? [{
          id: "export",
          label: "Export Deal Summary",
          icon: <FileDown className="h-4 w-4" />,
          onClick: () => onExport(deal),
        }] : []),
        ...(onStageChange ? [{
          id: "move-stage",
          label: "Move to Stage...",
          icon: <FileText className="h-4 w-4" />,
          onClick: () => {
            const currentIndex = ALL_STAGES.indexOf(deal.stage);
            const nextStage = ALL_STAGES[(currentIndex + 1) % ALL_STAGES.length];
            onStageChange(deal, nextStage);
          },
        }] : []),
      ],
    },
    ...(onDelete ? [{
      id: "destructive",
      actions: [{
        id: "delete",
        label: "Delete Deal",
        icon: <Trash2 className="h-4 w-4" />,
        onClick: () => onDelete(deal),
        variant: "destructive" as const,
      }],
    }] : []),
  ];

  return (
    <ContextMenuComponent
      trigger={
        <Card
          className={`
            group cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 border-l-4
            ${deal.priority === "High" ? "border-l-destructive" : ""}
            ${deal.priority === "Medium" ? "border-l-ring" : ""}
            ${deal.priority === "Low" ? "border-l-muted-foreground/30" : ""}
            ${isDragging ? "opacity-50 rotate-2" : ""}
            ${daysStale > 7 ? "bg-amber-50 dark:bg-amber-950/20" : "bg-card"}
          `}
          onClick={handleCardClick}
          onKeyDown={handleCardKeyDown}
          role="button"
          tabIndex={0}
          aria-label={`View deal ${deal.clientName}`}
        >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate text-card-foreground" title={deal.clientName}>
              {deal.clientName}
            </h3>
            {deal.clientCompany && (
              <p className="text-xs text-muted-foreground truncate" title={deal.clientCompany}>
                {deal.clientCompany}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0 flex-wrap">
            <InsightBadge status={healthScore.status} score={healthScore.score} />
            {needsDailyUpdate && (
              <Badge variant="destructive" className="text-xs px-1.5 py-0" title="Needs daily update">
                <AlertCircle className="h-3 w-3" />
              </Badge>
            )}
            {hasDailyUpdate && (
              <Badge variant="outline" className="text-xs px-1.5 py-0 bg-green-50 border-green-200" title="Updated today">
                <CheckCircle2 className="h-3 w-3 text-green-600" />
              </Badge>
            )}
            <Badge 
              variant="outline" 
              className={`text-xs px-1.5 py-0 ${getPriorityColor(deal.priority)}`}
            >
              {deal.priority}
            </Badge>
            
            <div 
              className="deal-actions relative"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                className="p-1 rounded hover:bg-muted opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => {
                  e.stopPropagation();
                  onView?.(deal);
                }}
                aria-label="Show deal actions"
                aria-haspopup="menu"
              >
                <MoreVertical className="h-4 w-4 text-muted-foreground/60" />
              </button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <div className="flex items-start gap-1.5 text-xs">
          <MapPin className="h-3 w-3 text-muted-foreground/60 mt-0.5 flex-shrink-0" />
          <span className="text-muted-foreground line-clamp-2">
            {deal.property.address}, {deal.property.city}, {deal.property.state}
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-xs">
          <Building2 className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
          <span className="text-muted-foreground">
            {deal.rsf.toLocaleString()} RSF • {deal.leaseTerm} months
          </span>
        </div>

        {deal.analysisIds.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
            <span className="text-muted-foreground">
              {deal.analysisIds.length} {deal.analysisIds.length === 1 ? 'analysis' : 'analyses'}
            </span>
          </div>
        )}

        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-muted-foreground/60 flex-shrink-0" />
            <span className="text-muted-foreground">
              Close: {formatDateOnlyDisplay(deal.expectedCloseDate)}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <span className="text-xs text-muted-foreground">{deal.broker}</span>
          <span className="text-xs text-muted-foreground/70">
            {daysStale === 0 ? 'Today' : daysStale === 1 ? '1 day ago' : `${daysStale} days ago`}
          </span>
        </div>

        {daysStale > 7 && (
          <div className="text-xs bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 px-2 py-1 rounded">
            ⚠️ No updates in {daysStale} days
          </div>
        )}

      </CardContent>
        </Card>
      }
      groups={contextMenuGroups}
    />
  );
}

export const DealCard = React.memo(DealCardComponent);
DealCard.displayName = "DealCard";
