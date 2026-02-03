"use client";

/**
 * Calendar View Component
 * Display calendar events and sync with external calendars
 */

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus, Download, RefreshCw } from "lucide-react";
import {
  getCalendarEvents,
  getCalendarAccounts,
  createEventForDeal,
  createEventForAnalysis,
  createCalendarEvent,
  syncEventsFromCalendar,
  downloadICalFile,
  type CalendarEvent,
} from "@/lib/integrations/calendar";
import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "@/types";
import { parseDateOnly } from "@/lib/dateOnly";

interface CalendarViewProps {
  deals?: Deal[];
  analyses?: AnalysisMeta[];
  startDate?: Date;
  endDate?: Date;
}

export function CalendarView({ deals, analyses, startDate, endDate }: CalendarViewProps) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [syncing, setSyncing] = useState(false);

  const accounts = getCalendarAccounts();

  useEffect(() => {
    loadEvents();
  }, [startDate, endDate]);

  const loadEvents = () => {
    const loaded = getCalendarEvents({
      startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
      endDate: endDate || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days ahead
    });
    setEvents(loaded);
  };

  const handleSync = async () => {
    if (accounts.length === 0) {
      alert("No calendar accounts connected");
      return;
    }

    setSyncing(true);
    try {
      // Sync from first connected account
      const account = accounts.find(a => a.connected);
      if (account) {
        const synced = await syncEventsFromCalendar(account.email);
        loadEvents(); // Reload events
      }
    } catch (error) {
      alert(`Error syncing calendar: ${error}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleExport = () => {
    downloadICalFile(events, "analysis-buddy-events.ics");
  };

  const handleCreateEventForDeal = async (deal: Deal, type: "follow-up" | "close-date" | "meeting") => {
    if (!deal.expectedCloseDate && type === "close-date") {
      alert("Deal needs an expected close date");
      return;
    }

    const date = type === "close-date" && deal.expectedCloseDate
      ? (parseDateOnly(deal.expectedCloseDate) || new Date())
      : new Date();

    const eventData = createEventForDeal(deal, type, date);
    const created = await createCalendarEvent(eventData);
    loadEvents();
    alert(`Event created: ${created.title}`);
  };

  const handleCreateEventForAnalysis = async (analysis: AnalysisMeta, type: "commencement" | "rent-start" | "expiration") => {
    const eventData = createEventForAnalysis(analysis, type);
    if (!eventData) return;

    const created = await createCalendarEvent(eventData);
    loadEvents();
    alert(`Event created: ${created.title}`);
  };

  // Group events by date
  const eventsByDate = events.reduce((acc, event) => {
    const dateKey = event.start.toLocaleDateString();
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, CalendarEvent[]>);

  const sortedDates = Object.keys(eventsByDate).sort((a, b) => {
    return new Date(a).getTime() - new Date(b).getTime();
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Calendar</h2>
          <p className="text-sm text-muted-foreground mt-1">
            View and manage calendar events
          </p>
        </div>
        <div className="flex items-center gap-2">
          {accounts.length > 0 && (
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? "animate-spin" : ""}`} />
              {syncing ? "Syncing..." : "Sync"}
            </Button>
          )}
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export iCal
          </Button>
        </div>
      </div>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Connected Calendars</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {accounts.map((account) => (
                <Badge key={`${account.provider}-${account.email}`} variant="outline">
                  {account.provider} - {account.email}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Events List */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Events ({events.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sortedDates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No events scheduled</p>
            </div>
          ) : (
            <div className="space-y-6">
              {sortedDates.map((dateKey) => (
                <div key={dateKey}>
                  <div className="font-semibold mb-2 text-sm text-muted-foreground">
                    {new Date(dateKey).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                  <div className="space-y-2">
                    {eventsByDate[dateKey].map((event) => (
                      <div
                        key={event.id}
                        className="p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="font-medium">{event.title}</div>
                            <div className="text-sm text-muted-foreground mt-1">
                              {event.start.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })} - {event.end.toLocaleTimeString("en-US", {
                                hour: "numeric",
                                minute: "2-digit",
                              })}
                            </div>
                            {event.location && (
                              <div className="text-xs text-muted-foreground mt-1">
                                📍 {event.location}
                              </div>
                            )}
                            {event.description && (
                              <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {event.description}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {event.dealId && (
                              <Badge variant="outline" className="text-xs">
                                Deal
                              </Badge>
                            )}
                            {event.analysisId && (
                              <Badge variant="outline" className="text-xs">
                                Analysis
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

