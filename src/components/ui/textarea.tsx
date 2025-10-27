/**
 * Textarea component with validation states
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/lib/validation';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: ValidationError | null;
  showError?: boolean;
  hint?: string;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showError = false, hint, className, ...props }, ref) => {
    const hasError = error && showError;
    const errorMessage = hasError ? error.message : '';

    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={props.id} className={cn(
            "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
            hasError && "text-destructive"
          )}>
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          className={cn(
            "flex min-h-[60px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            hasError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        />
        {hasError && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {!hasError && hint && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';
