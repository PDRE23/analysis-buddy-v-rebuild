"use client";

/**
 * Context Menu Component
 * Reusable context menu using Radix UI for right-click actions
 */

import React from "react";
import * as ContextMenuPrimitive from "@radix-ui/react-context-menu";
import { cn } from "@/lib/utils";

const ContextMenu = ContextMenuPrimitive.Root;
const ContextMenuTrigger = ContextMenuPrimitive.Trigger;
const ContextMenuContent = ContextMenuPrimitive.Content;
const ContextMenuItem = ContextMenuPrimitive.Item;
const ContextMenuSeparator = ContextMenuPrimitive.Separator;
const ContextMenuSub = ContextMenuPrimitive.Sub;
const ContextMenuSubTrigger = ContextMenuPrimitive.SubTrigger;
const ContextMenuSubContent = ContextMenuPrimitive.SubContent;

export interface ContextMenuAction {
  id: string;
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "destructive";
  separator?: boolean;
}

export interface ContextMenuGroup {
  id: string;
  label?: string;
  actions: ContextMenuAction[];
}

interface ContextMenuProps {
  trigger: React.ReactNode;
  groups: ContextMenuGroup[];
  onOpenChange?: (open: boolean) => void;
}

export function ContextMenuComponent({
  trigger,
  groups,
  onOpenChange,
}: ContextMenuProps) {
  return (
    <ContextMenu onOpenChange={onOpenChange}>
      <ContextMenuTrigger asChild>
        {trigger}
      </ContextMenuTrigger>
      <ContextMenuContent
        className="min-w-[200px] bg-white border border-gray-200 rounded-lg shadow-lg p-1 z-50"
      >
        {groups.map((group, groupIndex) => (
          <React.Fragment key={group.id}>
            {group.label && (
              <div className="px-2 py-1.5 text-xs font-semibold text-gray-500">
                {group.label}
              </div>
            )}
            {group.actions.map((action, actionIndex) => (
              <React.Fragment key={action.id}>
                {actionIndex > 0 && action.separator && (
                  <ContextMenuSeparator className="my-1 bg-gray-200" />
                )}
                <ContextMenuItem
                  disabled={action.disabled}
                  onClick={action.onClick}
                  className={cn(
                    "px-2 py-1.5 text-sm rounded cursor-pointer flex items-center gap-2",
                    "focus:bg-gray-100 focus:outline-none",
                    action.disabled && "opacity-50 cursor-not-allowed",
                    action.variant === "destructive" && "text-red-600 focus:bg-red-50"
                  )}
                >
                  {action.icon && <span className="h-4 w-4">{action.icon}</span>}
                  <span>{action.label}</span>
                </ContextMenuItem>
              </React.Fragment>
            ))}
            {groupIndex < groups.length - 1 && (
              <ContextMenuSeparator className="my-1 bg-gray-200" />
            )}
          </React.Fragment>
        ))}
      </ContextMenuContent>
    </ContextMenu>
  );
}

// Export all primitives for advanced usage
export {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubTrigger,
  ContextMenuSubContent,
};

