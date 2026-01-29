/**
 * Percentage input component with proper formatting
 */

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/lib/validation';

interface PercentageInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: ValidationError | null;
  showError?: boolean;
  hint?: string;
  value?: number;
  onChange?: (value: number | undefined) => void;
  allowDecimals?: boolean;
}

export const PercentageInput = React.forwardRef<HTMLInputElement, PercentageInputProps>(
  ({ label, error, showError = false, hint, value, onChange, allowDecimals = true, className, ...props }, ref) => {
    const formatDisplayValue = (nextValue: number | undefined) => {
      if (nextValue === undefined || Number.isNaN(nextValue)) return '';
      const decimals = allowDecimals ? 2 : 0;
      return nextValue.toFixed(decimals);
    };

    const [displayValue, setDisplayValue] = useState(formatDisplayValue(value));
    const [isFocused, setIsFocused] = useState(false);

    useEffect(() => {
      if (isFocused) return;
      setDisplayValue(formatDisplayValue(value));
    }, [allowDecimals, isFocused, value]);
    
    const hasError = error && showError;
    const errorMessage = hasError ? error.message : '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow only numbers and decimal point
      const sanitizedValue = inputValue.replace(/[^0-9.]/g, '');
      
      // Prevent multiple decimal points
      const parts = sanitizedValue.split('.');
      const finalValue = parts.length > 2 ? parts[0] + '.' + parts.slice(1).join('') : sanitizedValue;
      
      setDisplayValue(finalValue);
      
      // Parse the numeric value
      const numericValue = parseFloat(finalValue);
      onChange?.(isNaN(numericValue) ? undefined : numericValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      // Format the value on blur
      setDisplayValue(formatDisplayValue(value));
      props.onBlur?.(e);
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      props.onFocus?.(e);
    };

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
        <div className="relative">
          <input
            ref={ref}
            type="text"
            inputMode="decimal"
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            onFocus={handleFocus}
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
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
            %
          </div>
        </div>
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

PercentageInput.displayName = 'PercentageInput';
