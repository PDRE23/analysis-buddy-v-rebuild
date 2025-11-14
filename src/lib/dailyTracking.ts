/**
 * Daily tracking utilities for deal/prospect updates
 */

import type { Deal } from "./types/deal";
import type { DailyUpdate, DailyUpdateConfig, DealUpdateStatus } from "./types/tracking";

const DAILY_UPDATES_KEY = 'bsquared-daily-updates';
const CONFIG_KEY = 'bsquared-daily-tracking-config';

const DEFAULT_CONFIG: DailyUpdateConfig = {
  requireAllActive: true,
  skipWeekends: false,
  skipHolidays: false,
  staleThreshold: 7,
};

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const test = '__localStorage_test__';
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get today's date as YYYY-MM-DD string
 */
function getTodayDateString(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

/**
 * Check if a date is today
 */
function isToday(dateString: string): boolean {
  return dateString === getTodayDateString();
}

/**
 * Check if date is weekend
 */
function isWeekend(dateString: string): boolean {
  const date = new Date(dateString);
  const day = date.getDay();
  return day === 0 || day === 6; // Sunday or Saturday
}

/**
 * Get configuration
 */
export function getConfig(): DailyUpdateConfig {
  if (!isLocalStorageAvailable()) {
    return DEFAULT_CONFIG;
  }

  try {
    const stored = localStorage.getItem(CONFIG_KEY);
    if (stored) {
      return { ...DEFAULT_CONFIG, ...JSON.parse(stored) };
    }
  } catch {
    // Return default on error
  }

  return DEFAULT_CONFIG;
}

/**
 * Save configuration
 */
export function saveConfig(config: DailyUpdateConfig): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (error) {
    console.error('Failed to save daily tracking config:', error);
  }
}

/**
 * Get all daily updates
 */
export function getAllDailyUpdates(): DailyUpdate[] {
  if (!isLocalStorageAvailable()) {
    return [];
  }

  try {
    const stored = localStorage.getItem(DAILY_UPDATES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Return empty array on error
  }

  return [];
}

/**
 * Save daily updates
 */
function saveDailyUpdates(updates: DailyUpdate[]): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    localStorage.setItem(DAILY_UPDATES_KEY, JSON.stringify(updates));
  } catch (error) {
    console.error('Failed to save daily updates:', error);
  }
}

/**
 * Get updates for a specific deal
 */
export function getDealUpdates(dealId: string): DailyUpdate[] {
  const allUpdates = getAllDailyUpdates();
  return allUpdates.filter(update => update.dealId === dealId);
}

/**
 * Get the last update date for a deal
 */
export function getLastUpdateDate(dealId: string): string | undefined {
  const updates = getDealUpdates(dealId);
  if (updates.length === 0) {
    return undefined;
  }

  // Sort by date descending and get the most recent
  const sorted = updates.sort((a, b) => 
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  return sorted[0].date;
}

/**
 * Check if deal has been updated today
 */
export function hasDealBeenUpdatedToday(dealId: string): boolean {
  const lastUpdate = getLastUpdateDate(dealId);
  if (!lastUpdate) {
    return false;
  }
  return isToday(lastUpdate);
}

/**
 * Save a daily update
 */
export function saveDailyUpdate(update: DailyUpdate): void {
  const allUpdates = getAllDailyUpdates();
  
  // Remove any existing update for this deal on this date
  const filtered = allUpdates.filter(
    u => !(u.dealId === update.dealId && u.date === update.date)
  );
  
  // Add the new update
  filtered.push(update);
  
  // Save
  saveDailyUpdates(filtered);
}

/**
 * Get active deals that need updates
 */
export function getDealsNeedingUpdates(
  deals: Deal[],
  userId: string = 'User'
): DealUpdateStatus[] {
  const config = getConfig();
  const today = getTodayDateString();

  // Check if we should skip today (weekends/holidays)
  if (config.skipWeekends && isWeekend(today)) {
    return []; // Skip weekends
  }

  // Filter active deals
  const activeDeals = deals.filter(deal => {
    // Active deals are those with status "Active" or stages not "Closed Won"/"Closed Lost"
    const isActiveStatus = deal.status === "Active";
    const isActiveStage = deal.stage !== "Closed Won" && deal.stage !== "Closed Lost";
    return isActiveStatus || isActiveStage;
  });

  // Check each active deal
  return activeDeals.map(deal => {
    const lastUpdate = getLastUpdateDate(deal.id);
    const daysSinceUpdate = lastUpdate 
      ? Math.floor((new Date(today).getTime() - new Date(lastUpdate).getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    const needsUpdate = !isToday(lastUpdate || '');
    const isStale = daysSinceUpdate >= (config.staleThreshold || 7);

    return {
      dealId: deal.id,
      dealName: deal.clientName,
      lastUpdateDate: lastUpdate,
      needsUpdate,
      isStale,
      daysSinceUpdate: isFinite(daysSinceUpdate) ? daysSinceUpdate : -1,
    };
  });
}

/**
 * Check if user needs to complete daily updates
 */
export function needsDailyUpdates(deals: Deal[]): boolean {
  const dealsNeedingUpdates = getDealsNeedingUpdates(deals);
  return dealsNeedingUpdates.length > 0 && 
         dealsNeedingUpdates.some(deal => deal.needsUpdate);
}

/**
 * Get count of deals needing updates
 */
export function getDealsNeedingUpdatesCount(deals: Deal[]): number {
  const dealsNeedingUpdates = getDealsNeedingUpdates(deals);
  return dealsNeedingUpdates.filter(deal => deal.needsUpdate).length;
}

/**
 * Get count of stale deals (not updated in X days)
 */
export function getStaleDealsCount(deals: Deal[]): number {
  const dealsNeedingUpdates = getDealsNeedingUpdates(deals);
  return dealsNeedingUpdates.filter(deal => deal.isStale).length;
}

