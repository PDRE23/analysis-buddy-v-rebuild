"use client";

/**
 * Accessible Button Component
 * Button with proper ARIA attributes and keyboard support
 */

import React from "react";
import { Button } from "./button";
import { cn } from "@/lib/utils";
import { getAccessibleLabel } from "@/lib/accessibility";

interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  label?: string;
  ariaLabel?: string;
  ariaLabelledBy?: string;
  description?: string;
  className?: string;
}

export function AccessibleButton({
  children,
  label,
  ariaLabel,
  ariaLabelledBy,
  description,
  className,
  ...props
}: AccessibleButtonProps) {
  const accessibleProps = getAccessibleLabel(label, ariaLabel, ariaLabelledBy);

  return (
    <>
      <Button
        {...props}
        {...accessibleProps}
        aria-describedby={description ? `${props.id || "button"}-desc` : undefined}
        className={cn(className)}
      >
        {children}
      </Button>
      {description && (
        <span id={`${props.id || "button"}-desc`} className="sr-only">
          {description}
        </span>
      )}
    </>
  );
}

