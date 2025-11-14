/**
 * Daily tracking types for deal/prospect updates
 */

export interface DailyUpdate {
  dealId: string;
  date: string; // ISO date (YYYY-MM-DD)
  status?: string; // Status update
  notes?: string; // Quick notes
  updateType: 'status' | 'no_update' | 'notes';
  timestamp: string; // ISO datetime
  userId: string;
}

export interface DailyUpdateConfig {
  reminderTime?: string; // e.g., "09:00" (24-hour format)
  requireAllActive?: boolean; // Require updates for all active deals
  skipWeekends?: boolean;
  skipHolidays?: boolean;
  staleThreshold?: number; // Days before highlighting as stale (default 7)
}

export interface DealUpdateStatus {
  dealId: string;
  dealName: string;
  lastUpdateDate?: string; // ISO date
  needsUpdate: boolean;
  isStale: boolean; // Haven't updated in X days
  daysSinceUpdate: number;
}

