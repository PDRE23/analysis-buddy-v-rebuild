"use client";

/**
 * Event Creator Component
 * Create calendar events from deals or analyses
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import {
  createEventForDeal,
  createEventForAnalysis,
  createCalendarEvent,
  type CalendarEvent,
} from "@/lib/integrations/calendar";
import type { Deal } from "@/lib/types/deal";
import type { AnalysisMeta } from "@/types";
import { parseDateInput } from "@/lib/dateOnly";

interface EventCreatorProps {
  deal?: Deal;
  analysis?: AnalysisMeta;
  onEventCreated?: (event: CalendarEvent) => void;
  onCancel?: () => void;
}

export function EventCreator({
  deal,
  analysis,
  onEventCreated,
  onCancel,
}: EventCreatorProps) {
  const [eventType, setEventType] = useState<string>("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [duration, setDuration] = useState("60");
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [creating, setCreating] = useState(false);

  React.useEffect(() => {
    if (deal) {
      setLocation(deal.propertyAddress || deal.property.address || "");
      setDescription(`Deal: ${deal.clientName}\nCompany: ${deal.clientCompany || "N/A"}`);
      
      // Set default event types for deals
      if (!eventType) {
        setEventType("follow-up");
      }
    } else if (analysis) {
      setDescription(`Analysis: ${analysis.tenant_name}\nMarket: ${analysis.market || "N/A"}`);
      if (!eventType) {
        setEventType("commencement");
      }
    }
  }, [deal, analysis, eventType]);

  const handleCreate = async () => {
    if (!eventType || !date || !title.trim()) {
      alert("Please fill in all required fields");
      return;
    }

    setCreating(true);
    try {
      let eventData: Omit<CalendarEvent, "id">;

      if (deal) {
        const [hours, minutes] = time.split(":").map(Number);
        const eventDate = parseDateInput(date);
        if (!eventDate) {
          alert("Invalid date");
          return;
        }
        eventDate.setHours(hours, minutes, 0, 0);

        eventData = createEventForDeal(
          deal,
          eventType as "follow-up" | "close-date" | "meeting",
          eventDate,
          title
        );
      } else if (analysis) {
        const eventDataOpt = createEventForAnalysis(
          analysis,
          eventType as "commencement" | "rent-start" | "expiration",
          title
        );
        
        if (!eventDataOpt) {
          alert("Invalid event type for analysis");
          return;
        }
        
        eventData = eventDataOpt;
      } else {
        // Manual event
        const [hours, minutes] = time.split(":").map(Number);
        const startDate = parseDateInput(date);
        if (!startDate) {
          alert("Invalid date");
          return;
        }
        startDate.setHours(hours, minutes, 0, 0);
        const endDate = new Date(startDate.getTime() + parseInt(duration) * 60 * 1000);

        eventData = {
          title,
          description,
          start: startDate,
          end: endDate,
          location: location || undefined,
          allDay: false,
        };
      }

      // Override with custom values if provided
      if (title) eventData.title = title;
      if (description) eventData.description = description;
      if (location) eventData.location = location;

      const created = await createCalendarEvent(eventData);
      
      if (onEventCreated) {
        onEventCreated(created);
      } else {
        alert(`Event created: ${created.title}`);
      }
    } catch (error) {
      alert(`Error creating event: ${error}`);
    } finally {
      setCreating(false);
    }
  };

  const getEventTypeOptions = () => {
    if (deal) {
      return [
        { value: "follow-up", label: "Follow-up" },
        { value: "close-date", label: "Expected Close Date" },
        { value: "meeting", label: "Meeting" },
      ];
    } else if (analysis) {
      return [
        { value: "commencement", label: "Commencement Date" },
        { value: "rent-start", label: "Rent Start Date" },
        { value: "expiration", label: "Expiration Date" },
      ];
    }
    return [];
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Create Calendar Event
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {deal && (
          <div>
            <Label>Deal</Label>
            <div className="text-sm text-muted-foreground mt-1">
              {deal.clientName} - {deal.clientCompany || "N/A"}
            </div>
          </div>)}

        {analysis && (
          <div>
            <Label>Analysis</Label>
            <div className="text-sm text-muted-foreground mt-1">
              {analysis.tenant_name} - {analysis.market || "N/A"}
            </div>
          </div>)}

        <div>
          <Label>Event Type *</Label>
          <select
            value={eventType}
            onChange={(e) => setEventType(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 mt-1"
          >
            <option value="">Select event type</option>
            {getEventTypeOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>Title *</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Event title"
          />
        </div>

        {(!deal || eventType !== "close-date") && (
          <>
            <div>
              <Label>Date *</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
              />
            </div>

            <div>
              <Label>Time</Label>
              <Input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
              />
            </div>

            {!deal && !analysis && (
              <div>
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  placeholder="60"
                />
              </div>
            )}
          </>
        )}

        <div>
          <Label>Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Event location"
          />
        </div>

        <div>
          <Label>Description</Label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2"
            rows={4}
            placeholder="Event description"
          />
        </div>

        <div className="flex gap-2">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button
            onClick={handleCreate}
            disabled={creating || !eventType || !title.trim() || (!deal && !analysis && !date)}
            className="rounded-2xl"
          >
            <Calendar className="h-4 w-4 mr-2" />
            {creating ? "Creating..." : "Create Event"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

