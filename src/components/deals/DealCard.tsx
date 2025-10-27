"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Deal } from "@/lib/types/deal";
import { getPriorityColor, daysSinceUpdate, getDealSummary } from "@/lib/types/deal";
import { Building2, MapPin, Calendar, FileText, MoreVertical, Eye, Edit, Trash2 } from "lucide-react";

interface DealCardProps {
  deal: Deal;
  onView?: (deal: Deal) => void;
  onEdit?: (deal: Deal) => void;
  onDelete?: (deal: Deal) => void;
  isDragging?: boolean;
}

export function DealCard({ deal, onView, onEdit, onDelete, isDragging = false }: DealCardProps) {
  const [showActions, setShowActions] = React.useState(false);
  const daysStale = daysSinceUpdate(deal);

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger view if clicking on action buttons
    if ((e.target as HTMLElement).closest('.deal-actions')) {
      return;
    }
    onView?.(deal);
  };

  return (
    <Card
      className={`
        group cursor-pointer transition-all hover:shadow-lg border-l-4
        ${deal.priority === "High" ? "border-l-red-500" : ""}
        ${deal.priority === "Medium" ? "border-l-yellow-500" : ""}
        ${deal.priority === "Low" ? "border-l-gray-400" : ""}
        ${isDragging ? "opacity-50 rotate-2" : ""}
        ${daysStale > 7 ? "bg-yellow-50" : "bg-white"}
      `}
      onClick={handleCardClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm truncate" title={deal.clientName}>
              {deal.clientName}
            </h3>
            {deal.clientCompany && (
              <p className="text-xs text-gray-500 truncate" title={deal.clientCompany}>
                {deal.clientCompany}
              </p>
            )}
          </div>
          
          <div className="flex items-center gap-1 flex-shrink-0">
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
                className={`
                  p-1 rounded hover:bg-gray-100 transition-opacity
                  ${showActions ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}
                `}
                onClick={() => setShowActions(!showActions)}
              >
                <MoreVertical className="h-4 w-4 text-gray-400" />
              </button>
              
              {showActions && (
                <div className="absolute right-0 top-8 z-50 bg-white rounded-md shadow-lg border border-gray-200 py-1 min-w-[120px]">
                  {onView && (
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onView(deal);
                        setShowActions(false);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                      View
                    </button>
                  )}
                  {onEdit && (
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-gray-50 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(deal);
                        setShowActions(false);
                      }}
                    >
                      <Edit className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      className="w-full px-3 py-1.5 text-sm text-left hover:bg-red-50 text-red-600 flex items-center gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(deal);
                        setShowActions(false);
                      }}
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        {/* Property Address */}
        <div className="flex items-start gap-1.5 text-xs">
          <MapPin className="h-3 w-3 text-gray-400 mt-0.5 flex-shrink-0" />
          <span className="text-gray-600 line-clamp-2">
            {deal.property.address}, {deal.property.city}, {deal.property.state}
          </span>
        </div>

        {/* Deal Summary */}
        <div className="flex items-center gap-1.5 text-xs">
          <Building2 className="h-3 w-3 text-gray-400 flex-shrink-0" />
          <span className="text-gray-600">
            {deal.rsf.toLocaleString()} RSF • {deal.leaseTerm} months
          </span>
        </div>

        {/* Number of Analyses */}
        {deal.analysisIds.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs">
            <FileText className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              {deal.analysisIds.length} {deal.analysisIds.length === 1 ? 'analysis' : 'analyses'}
            </span>
          </div>
        )}

        {/* Expected Close Date */}
        {deal.expectedCloseDate && (
          <div className="flex items-center gap-1.5 text-xs">
            <Calendar className="h-3 w-3 text-gray-400 flex-shrink-0" />
            <span className="text-gray-600">
              Close: {new Date(deal.expectedCloseDate).toLocaleDateString()}
            </span>
          </div>
        )}

        {/* Broker */}
        <div className="flex items-center justify-between pt-1 border-t border-gray-100">
          <span className="text-xs text-gray-500">{deal.broker}</span>
          <span className="text-xs text-gray-400">
            {daysStale === 0 ? 'Today' : daysStale === 1 ? '1 day ago' : `${daysStale} days ago`}
          </span>
        </div>

        {/* Stale warning */}
        {daysStale > 7 && (
          <div className="text-xs text-yellow-700 bg-yellow-100 px-2 py-1 rounded">
            ⚠️ No updates in {daysStale} days
          </div>
        )}

      </CardContent>
    </Card>
  );
}

