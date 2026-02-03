"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PercentageInput } from "@/components/ui/percentage-input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Copy, X } from "lucide-react";
import { formatDateOnly, parseDateOnly } from "@/lib/dateOnly";

export interface DuplicateOptions {
  newName: string;
  adjustRentPercentage: number; // -50 to +50
  adjustRSF: number;
  adjustTermMonths: number;
  adjustConcessionsPercentage: number; // -50 to +50
  copyNotes: boolean;
}

interface DuplicateDialogProps {
  originalName: string;
  originalRSF: number;
  originalTerm?: number; // in months
  onConfirm: (options: DuplicateOptions) => void;
  onCancel: () => void;
}

export function DuplicateDialog({
  originalName,
  originalRSF,
  originalTerm = 60, // Default 5 years
  onConfirm,
  onCancel,
}: DuplicateDialogProps) {
  const [options, setOptions] = useState<DuplicateOptions>({
    newName: `${originalName} (Scenario 2)`,
    adjustRentPercentage: 0,
    adjustRSF: originalRSF,
    adjustTermMonths: originalTerm,
    adjustConcessionsPercentage: 0,
    copyNotes: true,
  });

  const updateOption = <K extends keyof DuplicateOptions>(
    key: K,
    value: DuplicateOptions[K]
  ) => {
    setOptions(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm(options);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Copy className="h-5 w-5" />
              Duplicate with Variations
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={onCancel}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* New Name */}
            <div>
              <Label htmlFor="newName">New Name *</Label>
              <Input
                id="newName"
                value={options.newName}
                onChange={(e) => updateOption('newName', e.target.value)}
                placeholder="Enter new analysis name"
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {originalName}
              </p>
            </div>

            {/* Rent Adjustment */}
            <div>
              <PercentageInput
                label="Adjust Rent"
                value={options.adjustRentPercentage}
                onChange={(value) => updateOption('adjustRentPercentage', value || 0)}
                placeholder="0"
                hint="Percentage to adjust all rent rates (-50% to +50%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Example: +5% will increase all rent rates by 5%, -10% will decrease by 10%
              </p>
            </div>

            {/* RSF Adjustment */}
            <div>
              <Label htmlFor="adjustRSF">Rentable Square Feet</Label>
              <Input
                id="adjustRSF"
                type="number"
                value={options.adjustRSF}
                onChange={(e) => updateOption('adjustRSF', Number(e.target.value))}
                min="1"
                step="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {originalRSF.toLocaleString()} RSF
              </p>
            </div>

            {/* Lease Term Adjustment */}
            <div>
              <Label htmlFor="adjustTermMonths">Lease Term (Months)</Label>
              <Input
                id="adjustTermMonths"
                type="number"
                value={options.adjustTermMonths}
                onChange={(e) => updateOption('adjustTermMonths', Number(e.target.value))}
                min="1"
                step="1"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Original: {originalTerm} months ({(originalTerm / 12).toFixed(1)} years)
              </p>
            </div>

            {/* Concessions Adjustment */}
            <div>
              <PercentageInput
                label="Adjust Concessions"
                value={options.adjustConcessionsPercentage}
                onChange={(value) => updateOption('adjustConcessionsPercentage', value || 0)}
                placeholder="0"
                hint="Percentage to adjust TI allowance and other concessions (-50% to +50%)"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Applies to TI allowance, moving allowance, and other credits
              </p>
            </div>

            {/* Copy Notes Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="copyNotes"
                checked={options.copyNotes}
                onChange={(e) => updateOption('copyNotes', e.target.checked)}
                className="rounded"
              />
              <Label htmlFor="copyNotes" className="cursor-pointer">
                Copy notes and comments to duplicated analysis
              </Label>
            </div>

            {/* Summary */}
            <div className="border-t pt-4 space-y-2">
              <h4 className="font-medium">Summary of Changes:</h4>
              <ul className="text-sm space-y-1 text-muted-foreground">
                <li>• Name: {options.newName}</li>
                {options.adjustRentPercentage !== 0 && (
                  <li>• Rent: {options.adjustRentPercentage > 0 ? '+' : ''}{options.adjustRentPercentage}%</li>
                )}
                {options.adjustRSF !== originalRSF && (
                  <li>• RSF: {originalRSF.toLocaleString()} → {options.adjustRSF.toLocaleString()}</li>
                )}
                {options.adjustTermMonths !== originalTerm && (
                  <li>• Term: {originalTerm} months → {options.adjustTermMonths} months</li>
                )}
                {options.adjustConcessionsPercentage !== 0 && (
                  <li>• Concessions: {options.adjustConcessionsPercentage > 0 ? '+' : ''}{options.adjustConcessionsPercentage}%</li>
                )}
                <li>• Notes: {options.copyNotes ? 'Will be copied' : 'Will not be copied'}</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit" className="gap-2">
                <Copy className="h-4 w-4" />
                Create Duplicate
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Apply duplication options to an analysis
 */
export function applyDuplicateOptions(
  original: any, // AnalysisMeta
  options: DuplicateOptions
): any {
  const duplicate = structuredClone(original);
  
  // Update name
  duplicate.name = options.newName;
  
  // Update RSF
  duplicate.rsf = options.adjustRSF;
  
  // Adjust rent rates
  if (options.adjustRentPercentage !== 0) {
    const multiplier = 1 + (options.adjustRentPercentage / 100);
    duplicate.rent_schedule = duplicate.rent_schedule.map((row: any) => ({
      ...row,
      rent_psf: row.rent_psf * multiplier,
    }));
  }
  
  // Adjust lease term (update expiration date)
  if (options.adjustTermMonths !== 0) {
    const commencement = parseDateOnly(duplicate.key_dates.commencement);
    if (!commencement) {
      return duplicate;
    }
    const newExpiration = new Date(commencement);
    newExpiration.setMonth(newExpiration.getMonth() + options.adjustTermMonths);
    duplicate.key_dates.expiration = formatDateOnly(newExpiration);
  }
  
  // Adjust concessions
  if (options.adjustConcessionsPercentage !== 0) {
    const multiplier = 1 + (options.adjustConcessionsPercentage / 100);
    if (duplicate.concessions.ti_allowance_psf) {
      duplicate.concessions.ti_allowance_psf *= multiplier;
    }
    if (duplicate.concessions.moving_allowance) {
      duplicate.concessions.moving_allowance *= multiplier;
    }
    if (duplicate.concessions.other_credits) {
      duplicate.concessions.other_credits *= multiplier;
    }
  }
  
  // Handle notes
  if (!options.copyNotes) {
    duplicate.notes = "";
    if (duplicate.detailedNotes) {
      duplicate.detailedNotes = [];
    }
    if (duplicate.comments) {
      duplicate.comments = [];
    }
  }
  
  return duplicate;
}

