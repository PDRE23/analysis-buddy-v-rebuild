/**
 * Enhanced Input component with validation states
 */

import React from 'react';
import { Input } from './input';
import { Label } from './label';
import { cn } from '@/lib/utils';
import { ValidationError } from '@/lib/validation';

interface ValidatedInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: ValidationError | null;
  showError?: boolean;
  hint?: string;
  warning?: ValidationError | null;
  showWarning?: boolean;
}

export const ValidatedInput = React.forwardRef<HTMLInputElement, ValidatedInputProps>(
  ({ label, error, showError = false, warning, showWarning = false, hint, className, ...props }, ref) => {
    const hasError = error && showError;
    const hasWarning = warning && showWarning && !hasError;
    const errorMessage = hasError ? error.message : '';
    const warningMessage = hasWarning ? warning.message : '';

    return (
      <div className="space-y-1">
        {label && (
          <Label htmlFor={props.id} className={cn(
            hasError && "text-destructive",
            hasWarning && "text-yellow-600"
          )}>
            {label}
          </Label>
        )}
        <Input
          ref={ref}
          className={cn(
            hasError && "border-destructive focus-visible:ring-destructive",
            hasWarning && "border-yellow-500 focus-visible:ring-yellow-500",
            className
          )}
          {...props}
        />
        {hasError && (
          <p className="text-sm text-destructive">{errorMessage}</p>
        )}
        {hasWarning && (
          <p className="text-sm text-yellow-600">{warningMessage}</p>
        )}
        {!hasError && !hasWarning && hint && (
          <p className="text-sm text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);

ValidatedInput.displayName = 'ValidatedInput';
