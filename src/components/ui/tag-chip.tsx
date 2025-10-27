"use client";

import React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagChipProps {
  tag: string;
  onRemove?: () => void;
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const variantStyles = {
  default: "bg-gray-100 text-gray-800 border-gray-300",
  primary: "bg-blue-100 text-blue-800 border-blue-300",
  success: "bg-green-100 text-green-800 border-green-300",
  warning: "bg-yellow-100 text-yellow-800 border-yellow-300",
  danger: "bg-red-100 text-red-800 border-red-300",
};

const sizeStyles = {
  sm: "text-xs px-2 py-0.5",
  md: "text-sm px-2.5 py-1",
  lg: "text-base px-3 py-1.5",
};

export function TagChip({ 
  tag, 
  onRemove, 
  variant = 'default', 
  size = 'sm',
  className 
}: TagChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border font-medium",
        variantStyles[variant],
        sizeStyles[size],
        className
      )}
    >
      {tag}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="hover:opacity-70 transition-opacity ml-0.5"
          aria-label={`Remove ${tag} tag`}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Get tag variant based on preset tags
 */
export function getTagVariant(tag: string): TagChipProps['variant'] {
  const lowerTag = tag.toLowerCase();
  
  if (lowerTag.includes('hot') || lowerTag.includes('urgent')) {
    return 'danger';
  }
  if (lowerTag.includes('renewal') || lowerTag.includes('expansion')) {
    return 'primary';
  }
  if (lowerTag.includes('closed') || lowerTag.includes('won')) {
    return 'success';
  }
  if (lowerTag.includes('cold') || lowerTag.includes('stale')) {
    return 'warning';
  }
  
  return 'default';
}

