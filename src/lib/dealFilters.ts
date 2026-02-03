/**
 * Deal filtering and search utilities
 */

import type { Deal, DealStage, DealPriority } from "./types/deal";
import type { AnalysisMeta } from "@/types";
import { parseDateOnly } from "./dateOnly";

export interface DealFilter {
  id: string;
  name: string;
  description?: string;
  predicate: (deal: Deal) => boolean;
  count?: number;
}

export interface SavedFilter extends DealFilter {
  createdAt: string;
  createdBy?: string;
}

/**
 * Quick filter presets
 */
export const QUICK_FILTERS: DealFilter[] = [
  {
    id: 'closing-this-month',
    name: 'Closing This Month',
    description: 'Deals with expected close date within 30 days',
    predicate: (deal) => {
      if (!deal.expectedCloseDate) return false;
      const closeDate = parseDateOnly(deal.expectedCloseDate) ?? new Date(deal.expectedCloseDate);
      const now = new Date();
      const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      return closeDate >= now && closeDate <= thirtyDaysFromNow;
    },
  },
  {
    id: 'high-priority',
    name: 'High Priority',
    description: 'Deals marked as high priority',
    predicate: (deal) => deal.priority === 'High',
  },
  {
    id: 'stale-deals',
    name: 'Stale Deals',
    description: 'Deals not updated in over 30 days',
    predicate: (deal) => {
      const updated = new Date(deal.updatedAt);
      const now = new Date();
      const daysSinceUpdate = (now.getTime() - updated.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceUpdate > 30;
    },
  },
  {
    id: 'active-deals',
    name: 'Active Deals',
    description: 'Deals with active status',
    predicate: (deal) => deal.status === 'Active',
  },
  {
    id: 'has-analyses',
    name: 'Has Analyses',
    description: 'Deals with at least one analysis',
    predicate: (deal) => deal.analysisIds && deal.analysisIds.length > 0,
  },
  {
    id: 'needs-follow-up',
    name: 'Needs Follow-up',
    description: 'Deals with upcoming or overdue follow-ups',
    predicate: (deal) => {
      if (!deal.nextFollowUp) return false;
      const followUpDate = parseDateOnly(deal.nextFollowUp) ?? new Date(deal.nextFollowUp);
      const now = new Date();
      const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      return followUpDate <= sevenDaysFromNow;
    },
  },
];

/**
 * Filter deals by multiple criteria
 */
export interface FilterCriteria {
  stages?: DealStage[];
  priorities?: DealPriority[];
  statuses?: Deal['status'][];
  broker?: string;
  tags?: string[];
  searchQuery?: string;
  customFilters?: string[]; // IDs of custom filters to apply
}

export function filterDeals(deals: Deal[], criteria: FilterCriteria): Deal[] {
  let filtered = [...deals];

  // Filter by stage
  if (criteria.stages && criteria.stages.length > 0) {
    filtered = filtered.filter(deal => criteria.stages!.includes(deal.stage));
  }

  // Filter by priority
  if (criteria.priorities && criteria.priorities.length > 0) {
    filtered = filtered.filter(deal => criteria.priorities!.includes(deal.priority));
  }

  // Filter by status
  if (criteria.statuses && criteria.statuses.length > 0) {
    filtered = filtered.filter(deal => criteria.statuses!.includes(deal.status));
  }

  // Filter by broker
  if (criteria.broker) {
    filtered = filtered.filter(deal => 
      deal.broker.toLowerCase().includes(criteria.broker!.toLowerCase())
    );
  }

  // Filter by tags
  if (criteria.tags && criteria.tags.length > 0) {
    filtered = filtered.filter(deal => 
      deal.tags && criteria.tags!.some(tag => deal.tags!.includes(tag))
    );
  }

  // Filter by search query
  if (criteria.searchQuery && criteria.searchQuery.trim()) {
    const query = criteria.searchQuery.toLowerCase();
    filtered = filtered.filter(deal =>
      deal.clientName.toLowerCase().includes(query) ||
      deal.clientCompany?.toLowerCase().includes(query) ||
      deal.property.address.toLowerCase().includes(query) ||
      deal.property.city.toLowerCase().includes(query) ||
      deal.broker.toLowerCase().includes(query) ||
      deal.notes?.toLowerCase().includes(query) ||
      (deal.tags && deal.tags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  // Apply custom quick filters
  if (criteria.customFilters && criteria.customFilters.length > 0) {
    const filtersToApply = QUICK_FILTERS.filter(f => 
      criteria.customFilters!.includes(f.id)
    );
    
    filtered = filtered.filter(deal =>
      filtersToApply.every(filter => filter.predicate(deal))
    );
  }

  return filtered;
}

/**
 * Search analyses by query
 */
export function searchAnalyses(analyses: AnalysisMeta[], query: string): AnalysisMeta[] {
  if (!query.trim()) return analyses;

  const lowerQuery = query.toLowerCase();
  
  return analyses.filter(analysis =>
    analysis.name.toLowerCase().includes(lowerQuery) ||
    analysis.tenant_name.toLowerCase().includes(lowerQuery) ||
    analysis.market.toLowerCase().includes(lowerQuery) ||
    analysis.notes?.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Get all unique tags from deals
 */
export function getAllTags(deals: Deal[]): string[] {
  const tagsSet = new Set<string>();
  
  deals.forEach(deal => {
    if (deal.tags) {
      deal.tags.forEach(tag => tagsSet.add(tag));
    }
  });
  
  return Array.from(tagsSet).sort();
}

/**
 * Get all unique brokers from deals
 */
export function getAllBrokers(deals: Deal[]): string[] {
  const brokersSet = new Set<string>();
  
  deals.forEach(deal => {
    if (deal.broker) {
      brokersSet.add(deal.broker);
    }
  });
  
  return Array.from(brokersSet).sort();
}

/**
 * Count deals matching filter
 */
export function countDealsForFilter(deals: Deal[], filter: DealFilter): number {
  return deals.filter(filter.predicate).length;
}

/**
 * Get filter counts for all quick filters
 */
export function getFilterCounts(deals: Deal[]): Map<string, number> {
  const counts = new Map<string, number>();
  
  QUICK_FILTERS.forEach(filter => {
    counts.set(filter.id, countDealsForFilter(deals, filter));
  });
  
  return counts;
}

/**
 * Sort deals by various criteria
 */
export type SortField = 
  | 'clientName' 
  | 'updatedAt' 
  | 'createdAt' 
  | 'expectedCloseDate'
  | 'rsf'
  | 'estimatedValue'
  | 'priority';

export type SortDirection = 'asc' | 'desc';

export function sortDeals(
  deals: Deal[], 
  field: SortField, 
  direction: SortDirection = 'asc'
): Deal[] {
  const sorted = [...deals].sort((a, b) => {
    let aVal: any;
    let bVal: any;

    switch (field) {
      case 'clientName':
        aVal = a.clientName.toLowerCase();
        bVal = b.clientName.toLowerCase();
        break;
      case 'updatedAt':
        aVal = new Date(a.updatedAt).getTime();
        bVal = new Date(b.updatedAt).getTime();
        break;
      case 'createdAt':
        aVal = new Date(a.createdAt).getTime();
        bVal = new Date(b.createdAt).getTime();
        break;
      case 'expectedCloseDate':
        aVal = a.expectedCloseDate
          ? (parseDateOnly(a.expectedCloseDate) ?? new Date(a.expectedCloseDate)).getTime()
          : 0;
        bVal = b.expectedCloseDate
          ? (parseDateOnly(b.expectedCloseDate) ?? new Date(b.expectedCloseDate)).getTime()
          : 0;
        break;
      case 'rsf':
        aVal = a.rsf;
        bVal = b.rsf;
        break;
      case 'estimatedValue':
        aVal = a.estimatedValue || 0;
        bVal = b.estimatedValue || 0;
        break;
      case 'priority':
        const priorityMap = { High: 3, Medium: 2, Low: 1 };
        aVal = priorityMap[a.priority];
        bVal = priorityMap[b.priority];
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return direction === 'asc' ? -1 : 1;
    if (aVal > bVal) return direction === 'asc' ? 1 : -1;
    return 0;
  });

  return sorted;
}

/**
 * Group deals by field
 */
export function groupDealsByStage(deals: Deal[]): Map<DealStage, Deal[]> {
  const groups = new Map<DealStage, Deal[]>();
  
  deals.forEach(deal => {
    const existing = groups.get(deal.stage) || [];
    groups.set(deal.stage, [...existing, deal]);
  });
  
  return groups;
}

export function groupDealsByBroker(deals: Deal[]): Map<string, Deal[]> {
  const groups = new Map<string, Deal[]>();
  
  deals.forEach(deal => {
    const existing = groups.get(deal.broker) || [];
    groups.set(deal.broker, [...existing, deal]);
  });
  
  return groups;
}

