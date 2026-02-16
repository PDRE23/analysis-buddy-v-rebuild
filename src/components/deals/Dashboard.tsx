"use client";

import React, { useCallback, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Deal, DealStage, DealView } from "@/lib/types/deal";
import { getStageColor } from "@/lib/types/deal";
import { DealKanban } from "./DealKanban";
import { FilterBar } from "./FilterBar";
import { 
  Plus, 
  LayoutList, 
  Kanban, 
  TrendingUp,
  Clock,
} from "lucide-react";
import { VirtualizedList } from "@/components/ui/virtualized-list";

interface DashboardProps {
  deals: Deal[];
  onDealStageChange: (dealId: string, newStage: DealStage) => void;
  onViewDeal: (deal: Deal) => void;
  onEditDeal: (deal: Deal) => void;
  onDeleteDeal: (deal: Deal) => void;
  onAddDeal: (stage?: DealStage) => void;
  onOpenStatusUpdates?: () => void;
}

export function Dashboard({
  deals,
  onDealStageChange,
  onViewDeal,
  onEditDeal,
  onDeleteDeal,
  onAddDeal,
  onOpenStatusUpdates,
}: DashboardProps) {
  const [view, setView] = useState<DealView>("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [showClosedDeals, setShowClosedDeals] = useState(false);
  const [previousView, setPreviousView] = useState<DealView>("kanban");

  const handleDealKeyPress = useCallback((e: React.KeyboardEvent<HTMLDivElement>, deal: Deal) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onViewDeal(deal);
    }
  }, [onViewDeal]);

  const renderListDeal = useCallback((deal: Deal) => (
    <div className="px-1 pb-2">
      <div
        className="bg-card border border-border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/40"
        onClick={() => onViewDeal(deal)}
        onKeyDown={(e) => handleDealKeyPress(e, deal)}
        role="button"
        tabIndex={0}
        aria-label={`Open deal ${deal.clientName}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="font-semibold text-base truncate text-foreground">
                {deal.clientName}
              </h3>
              <Badge className={getStageColor(deal.stage)} variant="secondary">
                {deal.stage}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {deal.priority}
              </Badge>
            </div>
            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
              <span>{deal.property.address}, {deal.property.city}</span>
              <span aria-hidden="true">•</span>
              <span>{deal.rsf.toLocaleString()} RSF</span>
              <span aria-hidden="true">•</span>
              <span>{deal.broker}</span>
            </div>
          </div>
          <div className="text-right">
            {deal.estimatedValue && (
              <div className="font-semibold text-foreground">
                ${(deal.estimatedValue / 1000).toFixed(0)}K
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {deal.analysisIds.length} {deal.analysisIds.length === 1 ? "analysis" : "analyses"}
            </div>
          </div>
        </div>
      </div>
    </div>
  ), [handleDealKeyPress, onViewDeal]);

  const stats = useMemo(() => {
    const activeDeals = deals.filter(d => d.status === "Active");
    const totalValue = activeDeals.reduce((sum, d) => sum + (d.estimatedValue || 0), 0);
    const avgDealSize = activeDeals.length > 0 ? totalValue / activeDeals.length : 0;

    return {
      totalDeals: deals.length,
      activeDeals: activeDeals.length,
      totalValue,
      avgDealSize,
    };
  }, [deals]);

  const filteredDeals = useMemo(() => {
    let filtered = [...deals];

    if (showClosedDeals) {
      filtered = filtered.filter(d => d.stage === "Closed Won" || d.stage === "Closed Lost");
    } else {
      filtered = filtered.filter(d => d.stage !== "Closed Won" && d.stage !== "Closed Lost");
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(deal =>
        deal.clientName.toLowerCase().includes(query) ||
        deal.property.address.toLowerCase().includes(query) ||
        deal.property.city.toLowerCase().includes(query) ||
        deal.property.state.toLowerCase().includes(query) ||
        deal.broker.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [deals, searchQuery, showClosedDeals]);

  const shouldVirtualize = filteredDeals.length > 25;
  const listItemHeight = 152;
  const listContainerHeight = Math.max(Math.min(filteredDeals.length, 6) * listItemHeight, listItemHeight);

  const recentActivities = useMemo(() => {
    const activities: Array<{ deal: Deal; activity: typeof deals[0]["activities"][0] }> = [];
    
    deals.forEach(deal => {
      deal.activities.forEach(activity => {
        activities.push({ deal, activity });
      });
    });

    return activities
      .sort((a, b) => new Date(b.activity.timestamp).getTime() - new Date(a.activity.timestamp).getTime())
      .slice(0, 10);
  }, [deals]);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b border-border bg-card px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Deal Pipeline</h1>
            <p className="text-sm text-muted-foreground">
              {stats.activeDeals} active deals • ${(stats.totalValue / 1000).toFixed(0)}K pipeline value
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            {onOpenStatusUpdates && (
              <Button 
                onClick={onOpenStatusUpdates} 
                variant="outline" 
                className="gap-2"
              >
                <Clock className="h-4 w-4" />
                Daily Deal Updates
              </Button>
            )}
            <Button onClick={() => onAddDeal()} className="gap-2 bg-ring text-primary-foreground hover:bg-ring/90">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Card className="border-l-4 border-l-ring">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Pipeline Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">${(stats.totalValue / 1000).toFixed(0)}K</div>
              <p className="text-xs text-muted-foreground">
                Avg: ${(stats.avgDealSize / 1000).toFixed(0)}K per deal
              </p>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-primary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Kanban className="h-4 w-4" />
                Active Deals
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-card-foreground">{stats.activeDeals}</div>
              <p className="text-xs text-muted-foreground">
                {stats.totalDeals - stats.activeDeals} closed
              </p>
            </CardContent>
          </Card>
        </div>

        <FilterBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        <div className="flex items-center gap-2 mt-3">
          <div className="flex items-center gap-2">
            <Button
              variant={view === "kanban" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("kanban")}
              aria-label="Switch to Kanban view"
              aria-pressed={view === "kanban"}
            >
              <Kanban className="h-4 w-4" />
            </Button>
            <Button
              variant={view === "list" ? "default" : "outline"}
              size="sm"
              onClick={() => setView("list")}
              aria-label="Switch to list view"
              aria-pressed={view === "list"}
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>

          <Button
            variant={showClosedDeals ? "default" : "outline"}
            size="sm"
            onClick={() => {
              if (!showClosedDeals) {
                setPreviousView(view);
                setView("list");
                setShowClosedDeals(true);
              } else {
                setView(previousView);
                setShowClosedDeals(false);
              }
            }}
            aria-pressed={showClosedDeals}
          >
            {showClosedDeals ? "Hide" : "Show"} Closed
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-6">
        {filteredDeals.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="mb-4">
              <Kanban className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {searchQuery 
                  ? "No deals match your search" 
                  : "No deals yet"}
              </h3>
              <p className="text-muted-foreground mb-6">
                {searchQuery
                  ? "Try adjusting your search"
                  : "Create your first deal to get started"}
              </p>
            </div>
            {!searchQuery && (
              <Button onClick={() => onAddDeal()} className="gap-2 bg-ring text-primary-foreground hover:bg-ring/90">
                <Plus className="h-4 w-4" />
                Create Your First Deal
              </Button>
            )}
          </div>
        ) : (
          <>
            {showClosedDeals ? (
              <div className="overflow-y-auto">
                <div className="mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Closed Deals ({filteredDeals.length})
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {filteredDeals.filter(d => d.stage === "Closed Won").length} won • {filteredDeals.filter(d => d.stage === "Closed Lost").length} lost
                  </p>
                </div>
                {shouldVirtualize ? (
                  <VirtualizedList
                    items={filteredDeals}
                    itemHeight={listItemHeight}
                    containerHeight={listContainerHeight}
                    overscan={4}
                    renderItem={(item) => renderListDeal(item)}
                  />
                ) : (
                  filteredDeals.map((deal) => (
                    <React.Fragment key={deal.id}>
                      {renderListDeal(deal)}
                    </React.Fragment>
                  ))
                )}
              </div>
            ) : (
              <>
                {view === "kanban" && (
                  <DealKanban
                    deals={filteredDeals}
                    onDealStageChange={onDealStageChange}
                    onViewDeal={onViewDeal}
                    onEditDeal={onEditDeal}
                    onDeleteDeal={onDeleteDeal}
                    onAddDeal={(stage) => onAddDeal(stage)}
                    showClosedDeals={showClosedDeals}
                  />
                )}

                {view === "list" && (
                  <div className="overflow-y-auto">
                    {shouldVirtualize ? (
                      <VirtualizedList
                        items={filteredDeals}
                        itemHeight={listItemHeight}
                        containerHeight={listContainerHeight}
                        overscan={4}
                        renderItem={(item) => renderListDeal(item)}
                      />
                    ) : (
                      filteredDeals.map((deal) => (
                        <React.Fragment key={deal.id}>
                          {renderListDeal(deal)}
                        </React.Fragment>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
