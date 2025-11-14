/**
 * Offline Mode Support
 * Cache data and sync when online
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "../components/LeaseAnalyzerApp";
import type { TeamNote } from "./types/teamNotes";

const OFFLINE_STORAGE_KEY = "offline-cache";
const SYNC_QUEUE_KEY = "sync-queue";

export interface OfflineAction {
  id: string;
  type: "create" | "update" | "delete";
  resourceType: "deal" | "analysis" | "note";
  resourceId: string;
  data: unknown;
  timestamp: string;
}

/**
 * Check if device is online
 */
export function isOnline(): boolean {
  return typeof navigator !== "undefined" && navigator.onLine;
}

/**
 * Cache data for offline access
 */
export function cacheData<T>(
  key: string,
  data: T
): void {
  try {
    const cache = getOfflineCache();
    cache[key] = {
      data,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Error caching data:", error);
  }
}

/**
 * Get cached data
 */
export function getCachedData<T>(key: string): T | null {
  try {
    const cache = getOfflineCache();
    const cached = cache[key];
    
    if (!cached) return null;
    
    // Check if cache is stale (older than 24 hours)
    const age = Date.now() - new Date(cached.timestamp).getTime();
    if (age > 24 * 60 * 60 * 1000) {
      delete cache[key];
      localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(cache));
      return null;
    }
    
    return cached.data as T;
  } catch {
    return null;
  }
}

/**
 * Queue action for sync when online
 */
export function queueOfflineAction(action: Omit<OfflineAction, "id" | "timestamp">): void {
  const queue = getSyncQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
  };
  
  queue.push(newAction);
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
}

/**
 * Get sync queue
 */
export function getSyncQueue(): OfflineAction[] {
  try {
    const stored = localStorage.getItem(SYNC_QUEUE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Process sync queue when online
 */
export async function processSyncQueue(): Promise<{
  successful: number;
  failed: number;
  errors: Array<{ actionId: string; error: string }>;
}> {
  if (!isOnline()) {
    return { successful: 0, failed: 0, errors: [] };
  }

  const queue = getSyncQueue();
  if (queue.length === 0) {
    return { successful: 0, failed: 0, errors: [] };
  }

  const results = {
    successful: 0,
    failed: 0,
    errors: [] as Array<{ actionId: string; error: string }>,
  };

  const remaining: OfflineAction[] = [];

  for (const action of queue) {
    try {
      // In production, this would call the actual API
      // For now, simulate sync
      await simulateSync(action);
      results.successful++;
    } catch (error) {
      results.failed++;
      results.errors.push({
        actionId: action.id,
        error: String(error),
      });
      remaining.push(action);
    }
  }

  // Update queue with remaining failed actions
  localStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(remaining));

  return results;
}

async function simulateSync(action: OfflineAction): Promise<void> {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 100));
  
  // In production, would call actual API endpoints
  console.log("Syncing action:", action);
}

/**
 * Get offline cache
 */
function getOfflineCache(): Record<string, { data: unknown; timestamp: string }> {
  try {
    const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

/**
 * Cache deals for offline access
 */
export function cacheDeals(deals: Deal[]): void {
  cacheData("deals", deals);
}

/**
 * Cache analyses for offline access
 */
export function cacheAnalyses(analyses: AnalysisMeta[]): void {
  cacheData("analyses", analyses);
}

/**
 * Cache notes for offline access
 */
export function cacheNotes(notes: TeamNote[]): void {
  cacheData("notes", notes);
}

/**
 * Get cached deals
 */
export function getCachedDeals(): Deal[] | null {
  return getCachedData<Deal[]>("deals");
}

/**
 * Get cached analyses
 */
export function getCachedAnalyses(): AnalysisMeta[] | null {
  return getCachedData<AnalysisMeta[]>("analyses");
}

/**
 * Get cached notes
 */
export function getCachedNotes(): TeamNote[] | null {
  return getCachedData<TeamNote[]>("notes");
}

/**
 * Clear offline cache
 */
export function clearOfflineCache(): void {
  localStorage.removeItem(OFFLINE_STORAGE_KEY);
}

/**
 * Clear sync queue
 */
export function clearSyncQueue(): void {
  localStorage.removeItem(SYNC_QUEUE_KEY);
}

/**
 * Get cache size (for debugging)
 */
export function getCacheSize(): number {
  try {
    const cache = getOfflineCache();
    return JSON.stringify(cache).length;
  } catch {
    return 0;
  }
}

