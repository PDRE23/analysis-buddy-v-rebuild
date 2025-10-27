/**
 * Currency input component with proper formatting
 */

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/lib/validation';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  label?: string;
  error?: ValidationError | null;
  showError?: boolean;
  hint?: string;
  value?: number;
  onChange?: (value: number | undefined) => void;
  currency?: string;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ label, error, showError = false, hint, value, onChange, currency = 'USD', className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = useState(value?.toString() || '');
    
    const hasError = error && showError;
    const errorMessage = hasError ? error.message : '';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      setDisplayValue(inputValue);
      
      // Parse the numeric value
      const numericValue = parseFloat(inputValue);
      onChange?.(isNaN(numericValue) ? undefined : numericValue);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      // Format the value on blur
      if (value !== undefined && !isNaN(value)) {
        setDisplayValue(value.toFixed(2));
      }
      props.onBlur?.(e);
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
          {currency && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {currency}
            </div>
          )}
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

CurrencyInput.displayName = 'CurrencyInput';
