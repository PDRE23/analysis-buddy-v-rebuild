"use client";

/**
 * Reminder Badge Component
 * Visual reminder indicators
 */

import React from "react";
import { Badge } from "./badge";
import { Bell, Clock, AlertCircle } from "lucide-react";
import type { Reminder } from "@/lib/reminders";
import { cn } from "@/lib/utils";

interface ReminderBadgeProps {
  reminder: Reminder;
  onClick?: () => void;
  className?: string;
}

export function ReminderBadge({ reminder, onClick, className }: ReminderBadgeProps) {
  const dueDate = new Date(reminder.dueDate);
  const now = new Date();
  const isOverdue = dueDate < now;
  const daysUntil = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  const getVariant = () => {
    if (reminder.completed) return "outline";
    if (isOverdue) return "destructive";
    if (daysUntil <= 1) return "default";
    return "secondary";
  };

  const getLabel = () => {
    if (reminder.completed) return "Completed";
    if (isOverdue) return "Overdue";
    if (daysUntil === 0) return "Today";
    if (daysUntil === 1) return "Tomorrow";
    if (daysUntil <= 7) return `In ${daysUntil} days`;
    return dueDate.toLocaleDateString();
  };

  return (
    <Badge
      variant={getVariant()}
      className={cn("flex items-center gap-1.5 cursor-pointer", className)}
      onClick={onClick}
    >
      {isOverdue && !reminder.completed ? (
        <AlertCircle className="h-3 w-3" />
      ) : (
        <Bell className="h-3 w-3" />
      )}
      <span>{getLabel()}</span>
    </Badge>
  );
}

interface ReminderListProps {
  reminders: Reminder[];
  onComplete?: (reminderId: string) => void;
  onDelete?: (reminderId: string) => void;
  className?: string;
}

export function ReminderList({ reminders, onComplete, onDelete, className }: ReminderListProps) {
  if (reminders.length === 0) {
    return (
      <div className={cn("text-center p-4 text-muted-foreground", className)}>
        <Bell className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No reminders</p>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      {reminders.map((reminder) => (
        <div
          key={reminder.id}
          className={cn(
            "flex items-center justify-between p-3 border rounded-lg",
            reminder.completed && "opacity-50",
            !reminder.completed && "hover:bg-muted/50"
          )}
        >
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <ReminderBadge reminder={reminder} />
              <div>
                <div className="font-medium text-sm">{reminder.title}</div>
                <div className="text-xs text-muted-foreground">{reminder.description}</div>
              </div>
            </div>
          </div>
          {!reminder.completed && (
            <div className="flex items-center gap-2">
              {onComplete && (
                <button
                  onClick={() => onComplete(reminder.id)}
                  className="text-xs text-primary hover:underline"
                >
                  Complete
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(reminder.id)}
                  className="text-xs text-destructive hover:underline"
                >
                  Delete
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

