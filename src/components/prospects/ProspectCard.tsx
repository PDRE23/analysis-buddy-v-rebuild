"use client";

import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { Prospect } from "@/lib/types/prospect";
import { getStatusColor, getPriorityColor, isFollowUpOverdue, formatPhoneNumber } from "@/lib/prospectUtils";
import { Phone, Mail, Calendar, MoreVertical, Eye, Edit, AlertCircle, ArrowRight } from "lucide-react";
import { formatDateOnlyDisplay } from "@/lib/dateOnly";

interface ProspectCardProps {
  prospect: Prospect;
  onView?: (prospect: Prospect) => void;
  onEdit?: (prospect: Prospect) => void;
  onScheduleFollowUp?: (prospectId: string, followUp: Prospect["followUps"][0]) => void;
  onConvertToDeal?: (prospect: Prospect) => void;
  isDragging?: boolean;
}

export function ProspectCard({
  prospect,
  onView,
  onEdit,
  onScheduleFollowUp,
  onConvertToDeal,
  isDragging = false,
}: ProspectCardProps) {
  const isOverdue = isFollowUpOverdue(prospect);
  const hasFollowUp = !!prospect.nextFollowUpDate;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger view if clicking on action buttons
    if ((e.target as HTMLElement).closest('.prospect-actions')) {
      return;
    }
    onView?.(prospect);
  };

  const handleCardKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onView?.(prospect);
    }
  };

  return (
    <Card
      className={`cursor-pointer hover:shadow-lg transition-shadow ${
        isOverdue ? "border-red-300 bg-red-50/50" : ""
      } ${isDragging ? "opacity-50 rotate-2" : ""}`}
      onClick={handleCardClick}
      onKeyDown={handleCardKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`View prospect ${prospect.contact.name}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-lg truncate mb-1">
              {prospect.contact.name}
            </h3>
            {prospect.contact.company && (
              <p className="text-sm text-gray-600 truncate mb-2">
                {prospect.contact.company}
              </p>
            )}
            <div className="flex items-center gap-2 flex-wrap">
              <Badge className={getStatusColor(prospect.status)} variant="secondary">
                {prospect.status}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(prospect.priority)}>
                {prospect.priority}
              </Badge>
              {prospect.coldCallStage && (
                <Badge variant="outline" className="text-xs">
                  {prospect.coldCallStage}
                </Badge>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Contact Info */}
        <div className="space-y-1.5 text-sm">
          {prospect.contact.email && (
            <div className="flex items-center gap-2 text-gray-600">
              <Mail className="h-4 w-4 text-gray-400" />
              <span className="truncate">{prospect.contact.email}</span>
            </div>
          )}
          {prospect.contact.phone && (
            <div className="flex items-center gap-2 text-gray-600">
              <Phone className="h-4 w-4 text-gray-400" />
              <span>{formatPhoneNumber(prospect.contact.phone)}</span>
            </div>
          )}
          {prospect.contact.title && (
            <div className="text-gray-600">
              {prospect.contact.title}
            </div>
          )}
        </div>

        {/* Follow-up Info */}
        {hasFollowUp && (
          <div className={`flex items-center gap-2 text-sm p-2 rounded ${
            isOverdue ? "bg-red-100 text-red-800" : "bg-yellow-50 text-yellow-800"
          }`}>
            <Calendar className={`h-4 w-4 ${isOverdue ? "text-red-600" : "text-yellow-600"}`} />
            <span className="font-medium">
              {isOverdue ? "Overdue: " : "Follow-up: "}
              {formatDateOnlyDisplay(prospect.nextFollowUpDate)}
            </span>
            {isOverdue && <AlertCircle className="h-4 w-4 ml-auto" />}
          </div>
        )}

        {/* Source */}
        {prospect.source && (
          <div className="text-xs text-gray-500">
            Source: {prospect.source}
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex items-center gap-2 pt-2 border-t prospect-actions">
          {prospect.contact.phone && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`tel:${prospect.contact.phone}`);
              }}
              className="flex-1"
            >
              <Phone className="h-3 w-3 mr-1" />
              Call
            </Button>
          )}
          {prospect.contact.email && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                window.open(`mailto:${prospect.contact.email}`);
              }}
              className="flex-1"
            >
              <Mail className="h-3 w-3 mr-1" />
              Email
            </Button>
          )}
          {onScheduleFollowUp && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                // This will be handled by the parent component
                // For now, just show a placeholder
              }}
            >
              <Calendar className="h-3 w-3" />
            </Button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t prospect-actions">
          <div className="flex items-center gap-1">
            {onView && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onView(prospect);
                }}
                aria-label="View prospect"
              >
                <Eye className="h-4 w-4" />
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                variant="ghost"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(prospect);
                }}
                aria-label="Edit prospect"
              >
                <Edit className="h-4 w-4" />
              </Button>
              )}
          </div>
          {onConvertToDeal && prospect.status !== "Converted to Deal" && (
            <Button
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onConvertToDeal(prospect);
              }}
              className="gap-1"
            >
              Convert
              <ArrowRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

