/**
 * Calendar Integration
 * Google Calendar, Outlook, and iCal integration
 */

import type { Deal } from "../types/deal";
import type { AnalysisMeta } from "../../components/LeaseAnalyzerApp";
import type { Reminder } from "../reminders";

export type CalendarProvider = "google" | "outlook" | "ical";

export interface CalendarAccount {
  provider: CalendarProvider;
  email: string;
  name: string;
  calendarId?: string; // For Google/Outlook
  connected: boolean;
  lastSync?: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: string[];
  dealId?: string;
  analysisId?: string;
  reminderId?: string;
  allDay?: boolean;
}

const CALENDAR_ACCOUNTS_STORAGE_KEY = "calendar-accounts";
const CALENDAR_EVENTS_STORAGE_KEY = "calendar-events";

/**
 * Connect calendar account
 */
export function connectCalendarAccount(
  provider: CalendarProvider,
  email: string,
  name: string,
  accessToken: string,
  calendarId?: string
): CalendarAccount {
  const accounts = getCalendarAccounts();
  const account: CalendarAccount = {
    provider,
    email,
    name,
    calendarId,
    connected: true,
    lastSync: new Date().toISOString(),
  };

  localStorage.setItem(`calendar-token-${email}`, accessToken);

  const existingIndex = accounts.findIndex(a => a.email === email && a.provider === provider);
  if (existingIndex >= 0) {
    accounts[existingIndex] = account;
  } else {
    accounts.push(account);
  }

  localStorage.setItem(CALENDAR_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  
  return account;
}

/**
 * Get connected calendar accounts
 */
export function getCalendarAccounts(): CalendarAccount[] {
  try {
    const stored = localStorage.getItem(CALENDAR_ACCOUNTS_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Create calendar event
 */
export async function createCalendarEvent(
  event: Omit<CalendarEvent, "id">,
  accountEmail?: string
): Promise<CalendarEvent> {
  // In production, this would:
  // 1. Get access token for calendar account
  // 2. Call Google Calendar API or Outlook API to create event
  // 3. Return created event with ID

  const newEvent: CalendarEvent = {
    ...event,
    id: `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
  };

  // Store locally
  const events = getCalendarEvents();
  events.push(newEvent);
  localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(events));

  return newEvent;
}

/**
 * Create event for deal milestone
 */
export function createEventForDeal(
  deal: Deal,
  type: "follow-up" | "close-date" | "meeting" | "proposal-deadline",
  date: Date,
  title?: string
): Omit<CalendarEvent, "id"> {
  const titles: Record<string, string> = {
    "follow-up": `Follow-up: ${deal.clientName}`,
    "close-date": `Expected Close: ${deal.clientName}`,
    "meeting": `Meeting: ${deal.clientName}`,
    "proposal-deadline": `Proposal Deadline: ${deal.clientName}`,
  };

  return {
    title: title || titles[type] || `Deal: ${deal.clientName}`,
    description: `Deal: ${deal.clientName}\nCompany: ${deal.clientCompany || "N/A"}\nValue: $${(deal.estimatedValue || 0).toLocaleString()}`,
    start: date,
    end: new Date(date.getTime() + 60 * 60 * 1000), // 1 hour default
    location: deal.propertyAddress,
    dealId: deal.id,
    allDay: type === "close-date",
  };
}

/**
 * Create event for analysis milestone
 */
export function createEventForAnalysis(
  analysis: AnalysisMeta,
  type: "commencement" | "rent-start" | "expiration",
  title?: string
): Omit<CalendarEvent, "id"> | null {
  let date: Date | null = null;

  switch (type) {
    case "commencement":
      date = new Date(analysis.key_dates.commencement);
      break;
    case "rent-start":
      // rent_start is optional, use commencement as fallback
      if (analysis.key_dates.rent_start) {
        date = new Date(analysis.key_dates.rent_start);
      } else {
        date = new Date(analysis.key_dates.commencement);
      }
      break;
    case "expiration":
      date = new Date(analysis.key_dates.expiration);
      break;
  }

  if (!date) return null;

  return {
    title: title || `${type === "commencement" ? "Commencement" : type === "rent-start" ? "Rent Start" : "Expiration"}: ${analysis.tenant_name}`,
    description: `Analysis: ${analysis.tenant_name}\nMarket: ${analysis.market || "N/A"}\nRSF: ${analysis.rsf.toLocaleString()}`,
    start: date,
    end: new Date(date.getTime() + 24 * 60 * 60 * 1000), // 1 day for date-based events
    analysisId: analysis.id,
    allDay: true,
  };
}

/**
 * Create event from reminder
 */
export function createEventFromReminder(reminder: Reminder): Omit<CalendarEvent, "id"> {
  return {
    title: reminder.title,
    description: reminder.description,
    start: new Date(reminder.dueDate),
    end: new Date(new Date(reminder.dueDate).getTime() + 60 * 60 * 1000),
    reminderId: reminder.id,
    allDay: false,
  };
}

/**
 * Get calendar events
 */
export function getCalendarEvents(
  filters?: {
    startDate?: Date;
    endDate?: Date;
    dealId?: string;
    analysisId?: string;
  }
): CalendarEvent[] {
  const events = getAllCalendarEvents();
  
  return events.filter(event => {
    if (filters?.startDate && event.start < filters.startDate) return false;
    if (filters?.endDate && event.end > filters.endDate) return false;
    if (filters?.dealId && event.dealId !== filters.dealId) return false;
    if (filters?.analysisId && event.analysisId !== filters.analysisId) return false;
    return true;
  }).sort((a, b) => a.start.getTime() - b.start.getTime());
}

function getAllCalendarEvents(): CalendarEvent[] {
  try {
    const stored = localStorage.getItem(CALENDAR_EVENTS_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((e: any) => ({
      ...e,
      start: new Date(e.start),
      end: new Date(e.end),
    }));
  } catch {
    return [];
  }
}

/**
 * Update calendar event
 */
export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<CalendarEvent | null> {
  // In production, would call calendar API
  
  const events = getAllCalendarEvents();
  const index = events.findIndex(e => e.id === eventId);
  
  if (index === -1) return null;
  
  events[index] = { ...events[index], ...updates };
  localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(events));
  
  return events[index];
}

/**
 * Delete calendar event
 */
export async function deleteCalendarEvent(eventId: string): Promise<boolean> {
  // In production, would call calendar API
  
  const events = getAllCalendarEvents();
  const filtered = events.filter(e => e.id !== eventId);
  localStorage.setItem(CALENDAR_EVENTS_STORAGE_KEY, JSON.stringify(filtered));
  
  return true;
}

/**
 * Sync events from calendar
 * In production, this would fetch events from the calendar API
 */
export async function syncEventsFromCalendar(
  accountEmail: string,
  startDate?: Date,
  endDate?: Date
): Promise<CalendarEvent[]> {
  // In production, this would:
  // 1. Get access token for calendar account
  // 2. Call calendar API to fetch events
  // 3. Parse and store events
  // 4. Link events to deals/analyses if possible
  
  return [];
}

/**
 * Export events to iCal format
 */
export function exportEventsToICal(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Analysis Buddy//Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  events.forEach((event) => {
    const formatDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    lines.push(
      "BEGIN:VEVENT",
      `UID:${event.id}@analysis-buddy`,
      `DTSTART:${formatDate(event.start)}`,
      `DTEND:${formatDate(event.end)}`,
      `SUMMARY:${event.title}`,
      event.description ? `DESCRIPTION:${event.description.replace(/\n/g, "\\n")}` : "",
      event.location ? `LOCATION:${event.location}` : "",
      event.allDay ? "TRANSP:TRANSPARENT" : "",
      "END:VEVENT"
    );
  });

  lines.push("END:VCALENDAR");

  return lines.join("\r\n");
}

/**
 * Download iCal file
 */
export function downloadICalFile(events: CalendarEvent[], filename = "calendar.ics"): void {
  const icalContent = exportEventsToICal(events);
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

