"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prospect } from "@/lib/types/prospect";

interface FollowUpScheduleProps {
  prospects: Prospect[];
  onViewProspect?: (prospect: Prospect) => void;
}

export function FollowUpSchedule({ prospects, onViewProspect }: FollowUpScheduleProps) {
  // Get all prospects with upcoming follow-ups
  const upcomingFollowUps = prospects.filter(p => p.nextFollowUpDate);

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900">Follow Up Schedule</h1>
        <p className="text-sm text-gray-600 mt-1">
          {upcomingFollowUps.length} prospects with scheduled follow-ups
        </p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Follow Up Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Follow Up Schedule view will be implemented here. This will show all scheduled follow-ups in a calendar or list format.
            </p>
            {upcomingFollowUps.length > 0 && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Upcoming Follow-ups:</p>
                <ul className="space-y-2">
                  {upcomingFollowUps.map(prospect => (
                    <li key={prospect.id} className="text-sm">
                      {prospect.contact.name} - {prospect.nextFollowUpDate && new Date(prospect.nextFollowUpDate).toLocaleDateString()}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

