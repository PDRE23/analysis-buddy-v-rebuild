/**
 * Section completion indicator component
 */

import React from 'react';
import { CheckCircle, AlertCircle, Circle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SectionStatus {
  name: string;
  isComplete: boolean;
  hasWarnings: boolean;
  hasErrors: boolean;
  completionPercentage: number;
}

interface SectionIndicatorProps {
  status: SectionStatus;
  className?: string;
}

export function SectionIndicator({ status, className }: SectionIndicatorProps) {
  const getIcon = () => {
    if (status.hasErrors) {
      return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
    if (status.hasWarnings) {
      return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
    if (status.isComplete) {
      return <CheckCircle className="h-4 w-4 text-green-600" />;
    }
    return <Circle className="h-4 w-4 text-muted-foreground" />;
  };

  const getStatusText = () => {
    if (status.hasErrors) return 'Errors';
    if (status.hasWarnings) return 'Warnings';
    if (status.isComplete) return 'Complete';
    return 'Incomplete';
  };

  const getStatusColor = () => {
    if (status.hasErrors) return 'text-destructive';
    if (status.hasWarnings) return 'text-yellow-600';
    if (status.isComplete) return 'text-green-600';
    return 'text-muted-foreground';
  };

  return (
    <div className={cn("flex items-center gap-2 text-sm", className)}>
      {getIcon()}
      <span className="font-medium">{status.name}</span>
      <span className={cn("text-xs", getStatusColor())}>
        {getStatusText()}
      </span>
      {status.completionPercentage > 0 && status.completionPercentage < 100 && (
        <span className="text-xs text-muted-foreground">
          ({status.completionPercentage}%)
        </span>
      )}
    </div>
  );
}

interface SectionProgressBarProps {
  status: SectionStatus;
  className?: string;
}

export function SectionProgressBar({ status, className }: SectionProgressBarProps) {
  const getBarColor = () => {
    if (status.hasErrors) return 'bg-destructive';
    if (status.hasWarnings) return 'bg-yellow-500';
    if (status.isComplete) return 'bg-green-500';
    return 'bg-muted';
  };

  return (
    <div className={cn("w-full bg-muted rounded-full h-2", className)}>
      <div
        className={cn("h-2 rounded-full transition-all duration-300", getBarColor())}
        style={{ width: `${status.completionPercentage}%` }}
      />
    </div>
  );
}
