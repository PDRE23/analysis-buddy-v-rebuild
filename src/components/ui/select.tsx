/**
 * Select component with validation states
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/lib/validation';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: ValidationError | null;
  showError?: boolean;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, showError = false, hint, options, placeholder, className, ...props }, ref) => {
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
        <select
          ref={ref}
          className={cn(
            "flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors",
            "file:border-0 file:bg-transparent file:text-sm file:font-medium",
            "placeholder:text-muted-foreground",
            "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError && "border-destructive focus-visible:ring-destructive",
            className
          )}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
          ))}
        </select>
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

Select.displayName = 'Select';
