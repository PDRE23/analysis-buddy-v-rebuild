/**
 * Automated Follow-ups & Reminders
 * Smart reminders and scheduling
 */

import type { Deal } from "./types/deal";
import type { AnalysisMeta } from "@/types";
import { daysSinceUpdate } from "./types/deal";
import { getDerivedRentStartDate } from "./utils";

export type ReminderType = 
  | "deal_update"
  | "proposal_expiration"
  | "commencement_date"
  | "follow_up"
  | "custom";

export interface Reminder {
  id: string;
  type: ReminderType;
  dealId?: string;
  analysisId?: string;
  title: string;
  description: string;
  dueDate: string;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
}

const REMINDERS_STORAGE_KEY = "reminders";

/**
 * Get all reminders
 */
export function getAllReminders(): Reminder[] {
  try {
    const stored = localStorage.getItem(REMINDERS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Create reminder
 */
export function createReminder(reminder: Omit<Reminder, "id" | "createdAt" | "completed">): Reminder {
  const reminders = getAllReminders();
  const newReminder: Reminder = {
    ...reminder,
    id: `reminder-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date().toISOString(),
    completed: false,
  };

  reminders.push(newReminder);
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(reminders));

  return newReminder;
}

/**
 * Complete reminder
 */
export function completeReminder(reminderId: string): void {
  const reminders = getAllReminders();
  const updated = reminders.map(r =>
    r.id === reminderId
      ? { ...r, completed: true, completedAt: new Date().toISOString() }
      : r
  );
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(updated));
}

/**
 * Delete reminder
 */
export function deleteReminder(reminderId: string): void {
  const reminders = getAllReminders();
  const filtered = reminders.filter(r => r.id !== reminderId);
  localStorage.setItem(REMINDERS_STORAGE_KEY, JSON.stringify(filtered));
}

/**
 * Get active reminders
 */
export function getActiveReminders(): Reminder[] {
  const reminders = getAllReminders();
  const now = new Date();
  
  return reminders
    .filter(r => !r.completed && new Date(r.dueDate) >= now)
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
}

/**
 * Get overdue reminders
 */
export function getOverdueReminders(): Reminder[] {
  const reminders = getAllReminders();
  const now = new Date();
  
  return reminders
    .filter(r => !r.completed && new Date(r.dueDate) < now)
    .sort((a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
}

/**
 * Generate smart reminders from deals
 */
export function generateSmartRemindersFromDeals(deals: Deal[]): Reminder[] {
  const reminders: Reminder[] = [];
  const now = new Date();

  deals.forEach((deal) => {
    // Reminder: Deal hasn't been updated in 3+ days
    const daysStale = daysSinceUpdate(deal);
    if (daysStale >= 3 && deal.status === "Active" && deal.stage !== "Closed Won" && deal.stage !== "Closed Lost") {
      reminders.push({
        id: `auto-${deal.id}-update`,
        type: "deal_update",
        dealId: deal.id,
        title: `Update deal: ${deal.clientName}`,
        description: `Deal hasn't been updated in ${daysStale} days`,
        dueDate: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Due tomorrow
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Reminder: Expected close date approaching
    if (deal.expectedCloseDate) {
      const closeDate = new Date(deal.expectedCloseDate);
      const daysUntilClose = (closeDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilClose >= 0 && daysUntilClose <= 7) {
        reminders.push({
          id: `auto-${deal.id}-close`,
          type: "custom",
          dealId: deal.id,
          title: `Expected close date: ${deal.clientName}`,
          description: `Deal is expected to close in ${Math.round(daysUntilClose)} days`,
          dueDate: deal.expectedCloseDate,
          completed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  return reminders;
}

/**
 * Generate reminders from analyses
 */
export function generateSmartRemindersFromAnalyses(analyses: AnalysisMeta[]): Reminder[] {
  const reminders: Reminder[] = [];
  const now = new Date();

  analyses.forEach((analysis) => {
    // Reminder: Commencement date approaching
    const commencement = new Date(analysis.key_dates.commencement);
    const daysUntilCommencement = (commencement.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
    
    if (daysUntilCommencement >= 0 && daysUntilCommencement <= 30) {
      reminders.push({
        id: `auto-${analysis.id}-commencement`,
        type: "commencement_date",
        analysisId: analysis.id,
        title: `Commencement date approaching: ${analysis.tenant_name}`,
        description: `Lease commencement is in ${Math.round(daysUntilCommencement)} days`,
        dueDate: analysis.key_dates.commencement,
        completed: false,
        createdAt: new Date().toISOString(),
      });
    }

    // Reminder: Rent start date (derived from commencement + free rent months)
    const derivedRentStart = getDerivedRentStartDate(analysis);
    if (derivedRentStart) {
      const rentStart = new Date(derivedRentStart);
      const daysUntilRentStart = (rentStart.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysUntilRentStart >= 0 && daysUntilRentStart <= 14) {
        reminders.push({
          id: `auto-${analysis.id}-rent-start`,
          type: "custom",
          analysisId: analysis.id,
          title: `Rent start date: ${analysis.tenant_name}`,
          description: `Rent start is in ${Math.round(daysUntilRentStart)} days`,
          dueDate: derivedRentStart,
          completed: false,
          createdAt: new Date().toISOString(),
        });
      }
    }
  });

  return reminders;
}

/**
 * Export reminders to iCal format
 */
export function exportRemindersToICal(reminders: Reminder[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Analysis Buddy//Reminders//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  reminders.forEach((reminder) => {
    const startDate = new Date(reminder.dueDate).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    const endDate = new Date(new Date(reminder.dueDate).getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";

    lines.push(
      "BEGIN:VEVENT",
      `UID:${reminder.id}@analysis-buddy`,
      `DTSTART:${startDate}`,
      `DTEND:${endDate}`,
      `SUMMARY:${reminder.title}`,
      `DESCRIPTION:${reminder.description}`,
      `STATUS:${reminder.completed ? "COMPLETED" : "CONFIRMED"}`,
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Download iCal file
 */
export function downloadICalFile(reminders: Reminder[], filename = "reminders.ics"): void {
  const icalContent = exportRemindersToICal(reminders);
  const blob = new Blob([icalContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

