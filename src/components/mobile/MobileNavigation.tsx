"use client";

/**
 * Mobile Navigation Component
 * Bottom navigation bar for mobile devices
 */

import React from "react";
import { Button } from "@/components/ui/button";
import { Home, FileText, Users, Menu, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type MobileView = "pipeline" | "analysis" | "notes" | "menu";

interface MobileNavigationProps {
  currentView: MobileView;
  onViewChange: (view: MobileView) => void;
  onQuickAction?: () => void;
  className?: string;
}

export function MobileNavigation({
  currentView,
  onViewChange,
  onQuickAction,
  className,
}: MobileNavigationProps) {
  const navItems = [
    { id: "pipeline" as MobileView, label: "Pipeline", icon: Home },
    { id: "analysis" as MobileView, label: "Analysis", icon: FileText },
    { id: "notes" as MobileView, label: "Notes", icon: Users },
    { id: "menu" as MobileView, label: "Menu", icon: Menu },
  ];

  return (
    <nav
      className={cn(
        "fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50",
        "sm:hidden", // Hide on desktop
        className
      )}
    >
      <div className="flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onViewChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 flex-1 h-full",
                "transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className="h-5 w-5" />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Quick Action Button */}
        {onQuickAction && (
          <button
            onClick={onQuickAction}
            className="absolute -top-6 left-1/2 transform -translate-x-1/2"
          >
            <div className="h-12 w-12 rounded-full bg-primary text-white flex items-center justify-center shadow-lg">
              <Plus className="h-6 w-6" />
            </div>
          </button>
        )}
      </div>
    </nav>
  );
}

