"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Prospect } from "@/lib/types/prospect";
import { getStatusColor, getPriorityColor, searchProspects, getUpcomingFollowUps, isFollowUpOverdue } from "@/lib/prospectUtils";
import { ProspectCard } from "./ProspectCard";
import { ProspectFilters } from "./ProspectFilters";
import { ProspectKanban } from "./ProspectKanban";
import type { ColdCallStage } from "@/lib/types/prospect";
import { 
  Plus, 
  Phone,
  Calendar,
  Upload,
} from "lucide-react";
import { ZoomInfoImportDialog } from "./ZoomInfoImportDialog";

interface ProspectsDashboardProps {
  prospects: Prospect[];
  onViewProspect: (prospect: Prospect) => void;
  onEditProspect: (prospect: Prospect) => void;
  onAddProspect: () => void;
  onScheduleFollowUp: (prospectId: string, followUp: Prospect["followUps"][0]) => void;
  onConvertToDeal: (prospect: Prospect) => void;
  onProspectStageChange?: (prospectId: string, newStage: import("@/lib/types/prospect").ColdCallStage) => void;
  onImportProspects?: (prospects: Prospect[]) => void;
}

type ProspectView = "list" | "cards";

export function ProspectsDashboard({
  prospects,
  onViewProspect,
  onEditProspect,
  onAddProspect,
  onScheduleFollowUp,
  onConvertToDeal,
  onProspectStageChange,
  onImportProspects,
}: ProspectsDashboardProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("");
  const [sourceFilter, setSourceFilter] = useState<string>("");
  const [showImportDialog, setShowImportDialog] = useState(false);

  // Calculate dashboard stats
  const stats = useMemo(() => {
    const activeProspects = prospects.filter(p => 
      p.status !== "Lost" && p.status !== "Not Interested" && p.status !== "Converted to Deal"
    );
    const upcomingFollowUps = getUpcomingFollowUps(prospects);
    const overdueFollowUps = prospects.filter(isFollowUpOverdue);
    
    return {
      totalProspects: prospects.length,
      activeProspects: activeProspects.length,
      upcomingFollowUps: upcomingFollowUps.length,
      overdueFollowUps: overdueFollowUps.length,
    };
  }, [prospects]);

  // Filter and search prospects
  const filteredProspects = useMemo(() => {
    let filtered = [...prospects];

    // Apply search
    if (searchQuery) {
      filtered = searchProspects(filtered, searchQuery);
    }

    // Apply status filter
    if (statusFilter) {
      filtered = filtered.filter(p => p.status === statusFilter);
    }

    // Apply priority filter
    if (priorityFilter) {
      filtered = filtered.filter(p => p.priority === priorityFilter);
    }

    // Apply source filter
    if (sourceFilter) {
      filtered = filtered.filter(p => p.source === sourceFilter);
    }

    return filtered;
  }, [prospects, searchQuery, statusFilter, priorityFilter, sourceFilter]);

  const handleProspectKeyPress = useCallback((e: React.KeyboardEvent<HTMLDivElement>, prospect: Prospect) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewProspect(prospect);
    }
  }, [onViewProspect]);

  const renderListProspect = useCallback((prospect: Prospect) => (
    <div className="px-1 pb-2">
      <div
        className="bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
        onClick={() => onViewProspect(prospect)}
        onKeyDown={(e) => handleProspectKeyPress(e, prospect)}
        role="button"
        tabIndex={0}
        aria-label={`Open prospect ${prospect.contact.name}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-base truncate">
                {prospect.contact.name}
              </h3>
              <Badge className={getStatusColor(prospect.status)} variant="secondary">
                {prospect.status}
              </Badge>
              <Badge variant="outline" className={getPriorityColor(prospect.priority)}>
                {prospect.priority}
              </Badge>
              {prospect.contact.company && (
                <span className="text-sm text-gray-600 truncate">
                  {prospect.contact.company}
                </span>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-gray-600">
              {prospect.contact.email && (
                <>
                  <span>{prospect.contact.email}</span>
                  <span aria-hidden="true">•</span>
                </>
              )}
              {prospect.contact.phone && (
                <>
                  <span>{prospect.contact.phone}</span>
                  <span aria-hidden="true">•</span>
                </>
              )}
              {prospect.nextFollowUpDate && (
                <span className={isFollowUpOverdue(prospect) ? "text-red-600 font-medium" : ""}>
                  Follow-up: {new Date(prospect.nextFollowUpDate).toLocaleDateString()}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [handleProspectKeyPress, onViewProspect]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Cold Call Tracker</h1>
            <p className="text-sm text-gray-600">
              {stats.activeProspects} active prospects • {stats.upcomingFollowUps} upcoming follow-ups
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowImportDialog(true)} 
              variant="outline" 
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              Import from ZoomInfo
            </Button>
            <Button onClick={onAddProspect} className="gap-2">
              <Plus className="h-4 w-4" />
              New Prospect
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Total Prospects
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProspects}</div>
              <p className="text-xs text-gray-500">
                {stats.activeProspects} active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Upcoming Follow-ups
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.upcomingFollowUps}</div>
              <p className="text-xs text-gray-500">
                {stats.overdueFollowUps > 0 && (
                  <span className="text-red-600">{stats.overdueFollowUps} overdue</span>
                )}
                {stats.overdueFollowUps === 0 && "None overdue"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Overdue
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${stats.overdueFollowUps > 0 ? "text-red-600" : ""}`}>
                {stats.overdueFollowUps}
              </div>
              <p className="text-xs text-gray-500">
                Follow-ups overdue
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <ProspectFilters
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          priorityFilter={priorityFilter}
          onPriorityFilterChange={setPriorityFilter}
          sourceFilter={sourceFilter}
          onSourceFilterChange={setSourceFilter}
          prospects={prospects}
        />
      </div>

      {/* Main Content Area - Kanban Board */}
      <div className="flex-1 overflow-hidden p-6">
        {filteredProspects.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <Phone className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {searchQuery || statusFilter || priorityFilter || sourceFilter
                  ? "No prospects match your filters" 
                  : "No prospects yet"}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter || priorityFilter || sourceFilter
                  ? "Try adjusting your filters"
                  : "Create your first prospect to get started"}
              </p>
            </div>
            {!searchQuery && !statusFilter && !priorityFilter && !sourceFilter && (
              <Button onClick={onAddProspect} className="gap-2">
                <Plus className="h-4 w-4" />
                Create Your First Prospect
              </Button>
            )}
          </div>
        ) : (
          <ProspectKanban
            prospects={filteredProspects}
            onProspectStageChange={onProspectStageChange || (() => {})}
            onViewProspect={onViewProspect}
            onEditProspect={onEditProspect}
            onAddProspect={(stage: ColdCallStage) => {
              // Set initial stage when creating from a specific column
              onAddProspect();
            }}
            onScheduleFollowUp={onScheduleFollowUp}
            onConvertToDeal={onConvertToDeal}
          />
        )}
      </div>

      {/* Import Dialog */}
      {showImportDialog && (
        <ZoomInfoImportDialog
          isOpen={showImportDialog}
          onClose={() => setShowImportDialog(false)}
          onImportComplete={(importedProspects) => {
            if (onImportProspects) {
              onImportProspects(importedProspects);
            }
            setShowImportDialog(false);
          }}
        />
      )}
    </div>
  );
}

