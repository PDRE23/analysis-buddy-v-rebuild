"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ALL_STATUSES, ALL_PRIORITIES } from "@/lib/types/prospect";
import { getUniqueSources } from "@/lib/prospectUtils";
import type { Prospect } from "@/lib/types/prospect";
import { X } from "lucide-react";

interface ProspectFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  priorityFilter: string;
  onPriorityFilterChange: (priority: string) => void;
  sourceFilter: string;
  onSourceFilterChange: (source: string) => void;
  prospects: Prospect[];
}

export function ProspectFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  priorityFilter,
  onPriorityFilterChange,
  sourceFilter,
  onSourceFilterChange,
  prospects,
}: ProspectFiltersProps) {
  const uniqueSources = getUniqueSources(prospects);
  const hasActiveFilters = !!statusFilter || !!priorityFilter || !!sourceFilter;

  const handleClearFilters = () => {
    onStatusFilterChange("");
    onPriorityFilterChange("");
    onSourceFilterChange("");
  };

  return (
    <div className="space-y-3">
      {/* Search Bar */}
      <div className="flex items-center gap-2">
        <Input
          type="text"
          placeholder="Search by name, company, email, or phone..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="flex-1"
        />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          options={[
            { value: "", label: "All Statuses" },
            ...ALL_STATUSES.map(status => ({
              value: status,
              label: status,
            })),
          ]}
          className="w-[180px]"
        />

        <Select
          value={priorityFilter}
          onChange={(e) => onPriorityFilterChange(e.target.value)}
          options={[
            { value: "", label: "All Priorities" },
            ...ALL_PRIORITIES.map(priority => ({
              value: priority,
              label: priority,
            })),
          ]}
          className="w-[180px]"
        />

        {uniqueSources.length > 0 && (
          <Select
            value={sourceFilter}
            onChange={(e) => onSourceFilterChange(e.target.value)}
            options={[
              { value: "", label: "All Sources" },
              ...uniqueSources.map(source => ({
                value: source,
                label: source,
              })),
            ]}
            className="w-[180px]"
          />
        )}

        {hasActiveFilters && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearFilters}
            className="gap-2"
          >
            <X className="h-4 w-4" />
            Clear Filters
          </Button>
        )}
      </div>
    </div>
  );
}

