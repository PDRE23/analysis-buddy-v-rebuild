"use client";

/**
 * Smart Suggestions Component
 * Displays intelligent suggestions based on patterns and market data
 */

import React from "react";
import { Badge } from "./badge";
import { Button } from "./button";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SmartSuggestion {
  label: string;
  value: string | number;
  description?: string;
  onClick: () => void;
  type?: "default" | "market" | "client" | "date";
}

interface SmartSuggestionsProps {
  suggestions: SmartSuggestion[];
  onDismiss?: () => void;
  className?: string;
}

export function SmartSuggestions({
  suggestions,
  onDismiss,
  className,
}: SmartSuggestionsProps) {
  if (suggestions.length === 0) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Sparkles className="h-3 w-3" />
        <span>Smart Suggestions</span>
        {onDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 px-1 ml-auto"
            onClick={onDismiss}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        {suggestions.map((suggestion, index) => (
          <Button
            key={index}
            variant="outline"
            size="sm"
            onClick={suggestion.onClick}
            className="h-auto py-1.5 px-3 text-xs"
            title={suggestion.description}
          >
            <span className="font-medium">{suggestion.label}:</span>
            <span className="ml-1">
              {typeof suggestion.value === "number"
                ? suggestion.value.toLocaleString()
                : suggestion.value}
            </span>
            {suggestion.description && (
              <Badge variant="secondary" className="ml-2 text-xs">
                {suggestion.description}
              </Badge>
            )}
          </Button>
        ))}
      </div>
    </div>
  );
}

