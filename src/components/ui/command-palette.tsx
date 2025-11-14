"use client";

/**
 * Command Palette Component
 * Universal command palette with fuzzy search (⌘K / Ctrl+K)
 */

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Input } from "./input";
import { Card } from "./card";
import { Badge } from "./badge";
import {
  Search,
  Building2,
  FileText,
  StickyNote,
  Plus,
  Download,
  Zap,
  Kanban,
  X,
  Command,
  ArrowUp,
  ArrowDown,
  Enter,
  Clock,
} from "lucide-react";
import {
  type CommandPaletteItem,
  searchCommandPalette,
  getRecentItems,
  saveToRecent,
} from "@/lib/commandPalette";
import { cn } from "@/lib/utils";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  items: CommandPaletteItem[];
  onSelectItem?: (item: CommandPaletteItem) => void;
}

const categoryIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  action: Plus,
  deal: Building2,
  analysis: FileText,
  note: StickyNote,
  navigation: Kanban,
  recent: Clock,
};

const categoryLabels: Record<string, string> = {
  action: "Actions",
  deal: "Deals",
  analysis: "Analyses",
  note: "Notes",
  navigation: "Navigation",
  recent: "Recent",
};

export function CommandPalette({
  isOpen,
  onClose,
  items,
  onSelectItem,
}: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentItems, setRecentItems] = useState<CommandPaletteItem[]>([]);

  // Load recent items on mount
  useEffect(() => {
    if (isOpen) {
      setRecentItems(getRecentItems());
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Search results
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Show recent items and common actions when query is empty
      const recent = recentItems.map(item => ({ ...item, category: "recent" as const }));
      const commonActions = items.filter(item => item.category === "action");
      return [...recent, ...commonActions].slice(0, 10);
    }
    
    return searchCommandPalette(items, query);
  }, [items, query, recentItems]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < searchResults.length - 1 ? prev + 1 : prev
        );
        return;
      }

      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
        return;
      }

      if (e.key === "Enter" && searchResults[selectedIndex]) {
        e.preventDefault();
        handleSelectItem(searchResults[selectedIndex]);
        return;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, searchResults, selectedIndex, onClose]);

  // Reset selected index when query changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleSelectItem = useCallback(
    (item: CommandPaletteItem) => {
      // Save to recent
      saveToRecent(item);
      
      // Execute action
      item.action();
      
      // Call optional callback
      if (onSelectItem) {
        onSelectItem(item);
      }
      
      // Close palette
      onClose();
    },
    [onClose, onSelectItem]
  );

  if (!isOpen) return null;

  const IconComponent = categoryIcons[searchResults[selectedIndex]?.category || "action"] || Plus;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <Card className="relative z-50 w-full max-w-2xl shadow-2xl">
        <div className="p-4 border-b">
          <div className="flex items-center gap-3">
            <Search className="h-5 w-5 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search deals, analyses, notes, or actions..."
              className="border-0 shadow-none focus-visible:ring-0 text-lg"
            />
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <kbd className="px-2 py-1 bg-muted rounded">
                {navigator.platform.includes("Mac") ? (
                  <>
                    <Command className="inline h-3 w-3" /> K
                  </>
                ) : (
                  "Ctrl+K"
                )}
              </kbd>
              <span className="text-muted-foreground">to open</span>
            </div>
            <button
              onClick={onClose}
              className="ml-auto p-1 hover:bg-muted rounded"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No results found</p>
              <p className="text-sm mt-2">Try a different search term</p>
            </div>
          ) : (
            <div className="p-2">
              {searchResults.map((item, index) => {
                const ItemIcon = categoryIcons[item.category] || Plus;
                const isSelected = index === selectedIndex;

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors",
                      isSelected
                        ? "bg-primary/10 border border-primary/20"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <ItemIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.label}</span>
                        <Badge
                          variant="secondary"
                          className="text-xs"
                        >
                          {categoryLabels[item.category] || item.category}
                        </Badge>
                      </div>
                      {item.description && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <kbd className="px-1.5 py-0.5 bg-muted rounded">
                          <Enter className="inline h-3 w-3" />
                        </kbd>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {searchResults.length > 0 && (
          <div className="p-3 border-t bg-muted/30">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  <span>Navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <Enter className="h-3 w-3" />
                  <span>Select</span>
                </div>
                <div className="flex items-center gap-1">
                  <kbd className="px-1 py-0.5 bg-background rounded">Esc</kbd>
                  <span>Close</span>
                </div>
              </div>
              <div>
                {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

