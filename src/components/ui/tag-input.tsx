"use client";

import React, { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TagChip, getTagVariant } from "@/components/ui/tag-chip";
import { Plus } from "lucide-react";

interface TagInputProps {
  label?: string;
  tags: string[];
  onChange: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}

// Default preset tags
const PRESET_TAGS = [
  "Hot Lead",
  "Renewal",
  "Expansion",
  "Medical Office",
  "Tech Tenant",
  "Cold Call",
  "Class A",
  "Class B/C",
  "Retail",
  "Industrial",
  "Urgent",
  "VIP Client",
];

export function TagInput({ 
  label, 
  tags, 
  onChange, 
  suggestions = PRESET_TAGS,
  placeholder = "Add tags...",
  maxTags = 10,
}: TagInputProps) {
  const [inputValue, setInputValue] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter suggestions based on input and existing tags
  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  );

  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onChange([...tags, trimmedTag]);
      setInputValue("");
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  const removeTag = (indexToRemove: number) => {
    onChange(tags.filter((_, index) => index !== indexToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && inputValue.trim()) {
      e.preventDefault();
      if (focusedIndex >= 0 && filteredSuggestions[focusedIndex]) {
        addTag(filteredSuggestions[focusedIndex]);
      } else {
        addTag(inputValue);
      }
    } else if (e.key === "Backspace" && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) =>
        prev < filteredSuggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Escape") {
      setShowSuggestions(false);
      setFocusedIndex(-1);
    }
  };

  // Reset focused index when suggestions change
  useEffect(() => {
    setFocusedIndex(-1);
  }, [inputValue]);

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      {/* Existing Tags */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag, index) => (
            <TagChip
              key={index}
              tag={tag}
              variant={getTagVariant(tag)}
              onRemove={() => removeTag(index)}
            />
          ))}
        </div>
      )}

      {/* Input with Suggestions */}
      <div className="relative">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => {
              setInputValue(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => {
              // Delay to allow clicking on suggestions
              setTimeout(() => setShowSuggestions(false), 200);
            }}
            onKeyDown={handleKeyDown}
            placeholder={tags.length >= maxTags ? `Max ${maxTags} tags` : placeholder}
            disabled={tags.length >= maxTags}
            className="pr-10"
          />
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => {
              if (inputValue.trim()) {
                addTag(inputValue);
              }
            }}
            disabled={!inputValue.trim() || tags.length >= maxTags}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Suggestions Dropdown */}
        {showSuggestions && filteredSuggestions.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-auto">
            {filteredSuggestions.map((suggestion, index) => (
              <button
                key={suggestion}
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-muted transition-colors ${
                  index === focusedIndex ? "bg-muted" : ""
                }`}
                onClick={() => addTag(suggestion)}
                onMouseEnter={() => setFocusedIndex(index)}
              >
                <TagChip tag={suggestion} variant={getTagVariant(suggestion)} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-xs text-muted-foreground">
        Type and press Enter to add custom tags, or select from suggestions.
        {tags.length > 0 && ` ${tags.length}/${maxTags} tags used.`}
      </p>
    </div>
  );
}

