"use client";

/**
 * Autocomplete Input Component
 * Reusable autocomplete component with suggestions
 */

import React, { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { cn } from "@/lib/utils";
import { Check, ChevronDown } from "lucide-react";

export interface AutocompleteOption {
  value: string;
  label: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface AutocompleteInputProps {
  value: string;
  onChange: (value: string) => void;
  options: AutocompleteOption[];
  onSelect?: (option: AutocompleteOption) => void;
  placeholder?: string;
  label?: string;
  className?: string;
  maxSuggestions?: number;
  minChars?: number;
  showDescription?: boolean;
}

export function AutocompleteInput({
  value,
  onChange,
  options,
  onSelect,
  placeholder,
  label,
  className,
  maxSuggestions = 5,
  minChars = 2,
  showDescription = false,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter options based on input
  const filteredOptions = React.useMemo(() => {
    if (!value || value.length < minChars) return [];
    
    const query = value.toLowerCase();
    return options
      .filter(option => 
        option.label.toLowerCase().includes(query) ||
        option.value.toLowerCase().includes(query) ||
        option.description?.toLowerCase().includes(query)
      )
      .slice(0, maxSuggestions);
  }, [value, options, maxSuggestions, minChars]);

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredOptions.length - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === "Enter" && filteredOptions[selectedIndex]) {
        e.preventDefault();
        handleSelect(filteredOptions[selectedIndex]);
      } else if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, filteredOptions, selectedIndex]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.value);
    setIsOpen(false);
    if (onSelect) {
      onSelect(option);
    }
    inputRef.current?.blur();
  };

  const handleFocus = () => {
    if (filteredOptions.length > 0) {
      setIsOpen(true);
    }
  };

  const handleChange = (newValue: string) => {
    onChange(newValue);
    setSelectedIndex(0);
    if (newValue.length >= minChars && filteredOptions.length > 0) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <div className={cn("relative", className)}>
      {label && (
        <label className="block text-sm font-medium mb-1">{label}</label>
      )}
      <div className="relative">
        <Input
          ref={inputRef}
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="pr-8"
        />
        <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      </div>

      {isOpen && filteredOptions.length > 0 && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
        >
          {filteredOptions.map((option, index) => (
            <div
              key={option.value}
              onClick={() => handleSelect(option)}
              className={cn(
                "px-3 py-2 cursor-pointer hover:bg-gray-50 flex items-center justify-between",
                index === selectedIndex && "bg-primary/10"
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium text-sm truncate">{option.label}</div>
                {showDescription && option.description && (
                  <div className="text-xs text-muted-foreground truncate">
                    {option.description}
                  </div>
                )}
              </div>
              {value === option.value && (
                <Check className="h-4 w-4 text-primary flex-shrink-0 ml-2" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

