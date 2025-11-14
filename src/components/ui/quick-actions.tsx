"use client";

/**
 * Quick Actions Component
 * Quick action buttons for common workflows
 */

import React from "react";
import { Button } from "./button";
import { Card } from "./card";
import { FileDown, Mail, Copy, Plus, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export interface QuickAction {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  shortcut?: string;
  variant?: "default" | "outline" | "ghost";
  disabled?: boolean;
}

interface QuickActionsProps {
  actions: QuickAction[];
  className?: string;
  orientation?: "horizontal" | "vertical";
}

export function QuickActions({
  actions,
  className,
  orientation = "horizontal",
}: QuickActionsProps) {
  return (
    <div
      className={cn(
        "flex gap-2",
        orientation === "vertical" && "flex-col",
        className
      )}
    >
      {actions.map((action) => (
        <Button
          key={action.id}
          variant={action.variant || "outline"}
          size="sm"
          onClick={action.onClick}
          disabled={action.disabled}
          className="gap-2"
          title={action.shortcut ? `${action.label} (${action.shortcut})` : action.label}
        >
          {action.icon}
          <span>{action.label}</span>
          {action.shortcut && (
            <kbd className="ml-1 px-1.5 py-0.5 bg-muted rounded text-xs">
              {action.shortcut}
            </kbd>
          )}
        </Button>
      ))}
    </div>
  );
}

/**
 * Floating Quick Actions Button
 * Shows a floating action button that expands to show quick actions
 */
interface FloatingQuickActionsProps {
  actions: QuickAction[];
  position?: "bottom-right" | "bottom-left" | "top-right" | "top-left";
}

export function FloatingQuickActions({
  actions,
  position = "bottom-right",
}: FloatingQuickActionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const positionClasses = {
    "bottom-right": "bottom-6 right-6",
    "bottom-left": "bottom-6 left-6",
    "top-right": "top-6 right-6",
    "top-left": "top-6 left-6",
  };

  return (
    <div className={`fixed ${positionClasses[position]} z-40`}>
      {isOpen && (
        <Card className="mb-2 p-2 shadow-lg">
          <QuickActions actions={actions} orientation="vertical" />
        </Card>
      )}
      <Button
        size="lg"
        className="rounded-full shadow-lg"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Zap className="h-5 w-5" />
      </Button>
    </div>
  );
}

