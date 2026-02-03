/**
 * Daily tracking utilities for deal/prospect updates
 */

import type { Deal } from "./types/deal";
import type { DailyUpdate, DailyUpdateConfig, DealUpdateStatus } from "./types/tracking";
import { formatDateOnly, parseDateOnly } from "./dateOnly";

const DAILY_UPDATES_KEY = 'bsquared-daily-updates';
const CONFIG_KEY = 'bsquared-daily-tracking-config';
const DAILY_UPDATES_COMPLETION_KEY = 'bsquared-daily-updates-completion';

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
  return formatDateOnly(new Date());
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
  const date = parseDateOnly(dateString);
  if (!date) return false;
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
 * Check if daily updates were completed today
 */
export function hasCompletedDailyUpdatesToday(): boolean {
  if (!isLocalStorageAvailable()) {
    return false;
  }

  try {
    const stored = localStorage.getItem(DAILY_UPDATES_COMPLETION_KEY);
    if (stored) {
      const completionDate = stored;
      return isToday(completionDate);
    }
  } catch {
    // Return false on error
  }

  return false;
}

/**
 * Mark daily updates as completed for today
 */
export function markDailyUpdatesCompleted(): void {
  if (!isLocalStorageAvailable()) {
    return;
  }

  try {
    const today = getTodayDateString();
    localStorage.setItem(DAILY_UPDATES_COMPLETION_KEY, today);
  } catch (error) {
    console.error('Failed to mark daily updates as completed:', error);
  }
}

/**
 * Get the last date daily updates were completed
 */
export function getLastDailyUpdatesCompletionDate(): string | undefined {
  if (!isLocalStorageAvailable()) {
    return undefined;
  }

  try {
    const stored = localStorage.getItem(DAILY_UPDATES_COMPLETION_KEY);
    return stored || undefined;
  } catch {
    return undefined;
  }
}

/**
 * Check if user has been away for more than one day
 */
function hasBeenAwayMoreThanOneDay(): boolean {
  const lastCompletion = getLastDailyUpdatesCompletionDate();
  if (!lastCompletion) {
    return true; // Never completed, so show it
  }

  const today = getTodayDateString();
  const lastDate = new Date(lastCompletion);
  const todayDate = new Date(today);
  const diffTime = todayDate.getTime() - lastDate.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  
  // Return true if more than 1 day has passed (2+ days)
  return diffDays > 1;
}

/**
 * Check if user needs to complete daily updates
 * Only shows if:
 * 1. Updates haven't been completed today, AND
 * 2. User has been away for more than one day (or never completed)
 */
export function needsDailyUpdates(deals: Deal[]): boolean {
  // If updates were already completed today, don't show the modal
  if (hasCompletedDailyUpdatesToday()) {
    return false;
  }

  // Only show if user has been away for more than one day
  if (!hasBeenAwayMoreThanOneDay()) {
    return false;
  }

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

