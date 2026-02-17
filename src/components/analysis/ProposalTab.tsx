"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, AlertCircle, Save, Upload } from "lucide-react";
import { File, X } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useFormValidation } from "@/hooks/useFormValidation";
import { validateAnalysisMeta, getSmartValidationSummary } from "@/lib/analysisValidation";
import { ConfirmationDialog, ConfirmationRequest } from "@/components/ui/confirmation-dialog";
import { ValidatedInput } from "@/components/ui/validated-input";
import { SectionIndicator, SectionProgressBar } from "@/components/ui/section-indicator";
import { getAllSectionStatuses, getOverallCompletionStatus } from "@/lib/sectionCompletion";
import { Select } from "@/components/ui/select";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import { calculateTIShortfall } from "@/lib/calculations";
import { formatDateOnly, parseDateOnly } from "@/lib/dateOnly";
import { getMarketBasedSuggestions } from "@/lib/intelligentDefaults";
import {
  getProposalRecommendations,
  detectMissingInformation,
  detectTimelineConflicts,
} from "@/lib/aiInsights";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  AbatementPeriodRow,
  EscalationPeriodRow,
  OpExEscalationPeriodRow,
  getAbatementMonths,
  calculateExpiration,
  calculateLeaseTermFromDates,
  syncRentScheduleToExpiration,
} from "@/components/analysis/forms";
import type {
  AnalysisMeta,
  LeaseType,
  AbatementPeriod,
  EscalationPeriod,
  OpExEscalationPeriod,
  RentRow,
} from "@/types";
import type { MonthlyEconomics } from "@/lib/analysis/scenarioEconomics";

export function ProposalTab({
  a,
  onSave,
  onRequestSave,
  monthlyEconomics
}: {
  a: AnalysisMeta;
  onSave: (patch: AnalysisMeta) => void;
  onRequestSave?: (handler: () => void) => void;
  monthlyEconomics?: MonthlyEconomics;
}) {
  const [showConfirmation, setShowConfirmation] = React.useState(false);
  const [pendingData, setPendingData] = React.useState<AnalysisMeta | null>(null);
  const [confirmations, setConfirmations] = React.useState<ConfirmationRequest[]>([]);
  
  // Drag and drop sensors for rent schedule
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Handle rent schedule row reordering
  const handleRentScheduleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const activeIndex = parseInt(active.id.toString().replace("rent-row-", ""));
      const overIndex = parseInt(over.id.toString().replace("rent-row-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(local.rent_schedule, activeIndex, overIndex);
        updateField('rent_schedule', reordered);
      }
    }
  };

  const {
    data: local,
    errors,
    updateField,
    handleBlur,
    handleSubmit,
    getFieldError,
    getFieldWarning,
    shouldShowFieldError,
    shouldShowFieldWarning,
    isValid,
    isSubmitting
  } = useFormValidation(
    a,
    validateAnalysisMeta,
    {
      onSubmit: (data) => {
        // Validate before saving
        const validation = validateAnalysisMeta(data);
        if (validation.length > 0) {
          console.warn('Validation errors:', validation);
          // Still allow save but log warnings
        }
        
        // Check for confirmations using smart validation
        const smartValidation = getSmartValidationSummary(data);
        
        if (smartValidation.hasConfirmations && smartValidation.confirmations) {
          setPendingData(data);
          setConfirmations(smartValidation.confirmations);
          setShowConfirmation(true);
          return Promise.resolve(false); // Don't save yet
        }
        
        // No confirmations needed, save directly
        onSave(data);
        return Promise.resolve(true);
      },
      validateOnChange: true,
      validateOnBlur: true
    }
  );

  useEffect(() => {
    if (onRequestSave) {
      onRequestSave(() => {
        void handleSubmit();
      });
    }
  }, [handleSubmit, onRequestSave]);

  // Auto-save on critical field changes (with debounce)
  useEffect(() => {
    // Only auto-save if there are actual changes to critical fields
    const hasChanges = 
      local.name !== a.name || 
      local.tenant_name !== a.tenant_name ||
      local.rsf !== a.rsf ||
      local.market !== a.market;
    
    if (hasChanges && !isSubmitting) {
      const timeoutId = setTimeout(() => {
        // Trigger save for critical field changes
        // Use onSave directly to avoid form submission overhead
        onSave(local);
      }, 1500); // 1.5 second debounce for auto-save
      
      return () => clearTimeout(timeoutId);
    }
  }, [local.name, local.tenant_name, local.rsf, local.market, a.name, a.tenant_name, a.rsf, a.market, isSubmitting, local, onSave]);

  // Confirmation dialog functions
  const handleConfirmationResult = (section: string, confirmed: boolean) => {
    // This will be handled by the confirmation dialog
    console.log(`Section ${section} confirmed: ${confirmed}`);
  };

  const handleProceedAnyway = () => {
    if (pendingData) {
      onSave(pendingData);
      setShowConfirmation(false);
      setPendingData(null);
      setConfirmations([]);
    }
  };

  const handleCancelConfirmation = () => {
    setShowConfirmation(false);
    setPendingData(null);
    setConfirmations([]);
  };

  // Helper functions for nested updates
  const setKeyDates = (patch: Partial<AnalysisMeta["key_dates"]>) => {
    updateField('key_dates', { ...local.key_dates, ...patch });
  };

  const setOperating = (patch: Partial<AnalysisMeta["operating"]>) => {
    updateField('operating', { ...local.operating, ...patch });
  };

  const setParking = (patch: Partial<NonNullable<AnalysisMeta["parking"]>>) => {
    updateField('parking', { ...(local.parking ?? {}), ...patch });
  };

  const setConcessions = (patch: Partial<AnalysisMeta["concessions"]>) => {
    updateField('concessions', { ...local.concessions, ...patch });
  };

  // Abatement period management
  const setAbatementPeriod = (idx: number, patch: Partial<AbatementPeriod>) => {
    const periods = local.concessions.abatement_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  const addAbatementPeriod = () => {
    const periods = local.concessions.abatement_periods || [];
    const newPeriod: AbatementPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      free_rent_months: 0,
      abatement_applies_to: "base_only",
    };
    const updated = [...periods, newPeriod];
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  const deleteAbatementPeriod = (idx: number) => {
    const periods = local.concessions.abatement_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    setConcessions({ abatement_periods: updated });
    
    // Recalculate expiration if lease term exists
    if (local.lease_term && local.key_dates.commencement) {
      const abatementMonths = getAbatementMonths({ ...local.concessions, abatement_periods: updated });
      const expiration = calculateExpiration(
        local.key_dates.commencement,
        local.lease_term.years,
        local.lease_term.months,
        local.lease_term.include_abatement_in_term ?? false,
        abatementMonths
      );
      setKeyDates({ expiration });
    }
  };

  // Escalation period management
  const setEscalationPeriod = (idx: number, patch: Partial<EscalationPeriod>) => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  const addEscalationPeriod = () => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const newPeriod: EscalationPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      escalation_percentage: 0,
    };
    const updated = [...periods, newPeriod];
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  const deleteEscalationPeriod = (idx: number) => {
    const periods = local.rent_escalation?.escalation_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    updateField('rent_escalation', { 
      ...local.rent_escalation, 
      escalation_periods: updated 
    });
  };

  // OpEx Escalation period management
  const setOpExEscalationPeriod = (idx: number, patch: Partial<OpExEscalationPeriod>) => {
    const periods = local.operating.escalation_periods || [];
    const updated = periods.map((p, i) => i === idx ? { ...p, ...patch } : p);
    setOperating({ escalation_periods: updated });
  };

  const addOpExEscalationPeriod = () => {
    const periods = local.operating.escalation_periods || [];
    const newPeriod: OpExEscalationPeriod = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      escalation_percentage: 0,
    };
    const updated = [...periods, newPeriod];
    setOperating({ escalation_periods: updated });
  };

  const deleteOpExEscalationPeriod = (idx: number) => {
    const periods = local.operating.escalation_periods || [];
    const updated = periods.filter((_, i) => i !== idx);
    setOperating({ escalation_periods: updated });
  };

  // Handle OpEx escalation period reordering
  const handleOpExEscalationPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.operating.escalation_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("opex-escalation-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("opex-escalation-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        setOperating({ escalation_periods: reordered });
      }
    }
  };

  // Handle escalation period reordering
  const handleEscalationPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.rent_escalation?.escalation_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("escalation-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("escalation-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        updateField('rent_escalation', { 
          ...local.rent_escalation, 
          escalation_periods: reordered 
        });
      }
    }
  };

  // Handle abatement period reordering
  const handleAbatementPeriodDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const periods = local.concessions.abatement_periods || [];
      const activeIndex = parseInt(active.id.toString().replace("abatement-period-", ""));
      const overIndex = parseInt(over.id.toString().replace("abatement-period-", ""));
      
      if (!isNaN(activeIndex) && !isNaN(overIndex)) {
        const reordered = arrayMove(periods, activeIndex, overIndex);
        setConcessions({ abatement_periods: reordered });
      }
    }
  };

  const setRentRow = (idx: number, patch: Partial<RentRow>) => {
    const rs: RentRow[] = local.rent_schedule.map((row, i) =>
      i === idx ? { ...row, ...patch } : row
    );
    updateField('rent_schedule', rs);
  };

  // Backward compatibility: Initialize rent_escalation from existing rent_schedule if not set
  useEffect(() => {
    if (!local.rent_escalation && local.rent_schedule.length > 0) {
      const firstPeriod = local.rent_schedule[0];
      if (firstPeriod.escalation_percentage !== undefined) {
        updateField('rent_escalation', {
          escalation_type: "fixed",
          fixed_escalation_percentage: firstPeriod.escalation_percentage,
        });
      }
    }
  }, []); // Only run once on mount

  // Backward compatibility: Initialize operating escalation_type from existing data
  useEffect(() => {
    if (!local.operating.escalation_type && local.operating.escalation_value !== undefined) {
      setOperating({ escalation_type: "fixed" });
    }
  }, []); // Only run once on mount

  // Get or create default rent schedule period
  const defaultRentPeriod = local.rent_schedule.length > 0 
    ? local.rent_schedule[0] 
    : {
        period_start: local.key_dates.commencement || "",
        period_end: local.key_dates.expiration || "",
        rent_psf: 0,
        escalation_percentage: 0,
      };

  // Update default rent period when simple form fields change
  const updateDefaultRentPeriod = (updates: Partial<RentRow>) => {
    const updatedPeriod: RentRow = {
      period_start: local.key_dates.commencement || "",
      period_end: local.key_dates.expiration || "",
      rent_psf: defaultRentPeriod.rent_psf,
      escalation_percentage: defaultRentPeriod.escalation_percentage || 0,
      ...updates,
    };

    // Update or create first period
    const newSchedule = local.rent_schedule.length > 0
      ? [updatedPeriod, ...local.rent_schedule.slice(1)]
      : [updatedPeriod];
    
    updateField('rent_schedule', newSchedule);
  };

  // Backward compatibility: Calculate lease_term from existing dates if not set
  useEffect(() => {
    if (!local.lease_term && local.key_dates.commencement && local.key_dates.expiration) {
      const calculated = calculateLeaseTermFromDates(
        local.key_dates.commencement,
        local.key_dates.expiration
      );
      if (calculated) {
        updateField('lease_term', {
          ...calculated,
          include_abatement_in_term: false, // Default to false for backward compatibility
        });
      }
    }
  }, []); // Only run once on mount

  // Sync default period dates when key dates change
  useEffect(() => {
    if (local.rent_schedule.length > 0 && local.key_dates.commencement && local.key_dates.expiration) {
      const firstPeriod = local.rent_schedule[0];
      if (firstPeriod.period_start !== local.key_dates.commencement || 
          firstPeriod.period_end !== local.key_dates.expiration) {
        // Update only the dates, preserve other fields
        const updatedPeriod: RentRow = {
          ...firstPeriod,
          period_start: local.key_dates.commencement,
          period_end: local.key_dates.expiration,
        };
        const newSchedule = [updatedPeriod, ...local.rent_schedule.slice(1)];
        updateField('rent_schedule', newSchedule);
      }
    }
  }, [local.key_dates.commencement, local.key_dates.expiration, local.rent_schedule.length]);

  const addRentRow = () => {
    const newSchedule = [
      ...local.rent_schedule,
      {
        period_start: local.key_dates.expiration,
        period_end: local.key_dates.expiration,
        rent_psf: 0,
        escalation_percentage: 0.03,
        free_rent_months: 0,
        abatement_applies_to: "base_only" as const,
      },
    ];
    updateField('rent_schedule', newSchedule);
  };

  const deleteRentRow = (idx: number) => {
    const newSchedule = local.rent_schedule.filter((_, i) => i !== idx);
    updateField('rent_schedule', newSchedule);
  };

  // Calculate section completion status
  const sectionStatuses = getAllSectionStatuses(local, errors);
  const overallStatus = getOverallCompletionStatus(sectionStatuses);

  // AI Insights
  const marketData = React.useMemo(() => {
    if (local.market) {
      return getMarketBasedSuggestions(local.market);
    }
    return undefined;
  }, [local.market]);

  const proposalRecommendations = React.useMemo(() => {
    return getProposalRecommendations(local, marketData ? {
      avgRentPSF: marketData.rentRate,
      avgFreeRentMonths: marketData.commonTerm,
      avgTIAllowance: marketData.tiAllowance,
      avgTerm: marketData.leaseTerm,
    } : undefined);
  }, [local, marketData]);

  const missingInfo = React.useMemo(() => detectMissingInformation(local), [local]);
  const timelineWarnings = React.useMemo(() => detectTimelineConflicts(local), [local]);

  return (
    <>
      {/* Confirmation dialog */}
      {showConfirmation && (
        <ConfirmationDialog
          confirmations={confirmations}
          onConfirm={handleConfirmationResult}
          onCancel={handleCancelConfirmation}
          onProceedAnyway={handleProceedAnyway}
        />
      )}
      
      {/* Section Completion Overview */}
      <Card className="rounded-2xl mb-4">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Form Completion</span>
            <span className="text-sm font-normal text-muted-foreground">
              {overallStatus.completedSections} of {overallStatus.totalSections} sections complete
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <SectionProgressBar 
              status={{
                name: 'Overall',
                isComplete: overallStatus.overallPercentage === 100,
                hasWarnings: overallStatus.sectionsWithWarnings > 0,
                hasErrors: overallStatus.sectionsWithErrors > 0,
                completionPercentage: overallStatus.overallPercentage
              }}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {sectionStatuses.map((status, index) => (
                <SectionIndicator key={index} status={status} />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="grid md:grid-cols-2 gap-4">
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Basics</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ValidatedInput
              label="Client"
              value={local.name}
              onChange={(e) => updateField('name', e.currentTarget.value)}
              onBlur={() => handleBlur('name')}
              error={getFieldError('name')}
              showError={shouldShowFieldError('name')}
              placeholder="Enter client name"
            />
            <ValidatedInput
              label="Tenant Name"
              value={local.tenant_name ?? ""}
              onChange={(e) => updateField("tenant_name", e.currentTarget.value)}
              onBlur={() => handleBlur("tenant_name")}
              error={getFieldError("tenant_name")}
              showError={shouldShowFieldError("tenant_name")}
              placeholder="Enter tenant name"
            />
            <ValidatedInput
              label="Market"
              value={local.market}
              onChange={(e) => updateField('market', e.currentTarget.value)}
              onBlur={() => handleBlur('market')}
              error={getFieldError('market')}
              showError={shouldShowFieldError('market')}
              placeholder="Enter market"
            />
            <ValidatedInput
              label="RSF"
              type="number"
              value={local.rsf && local.rsf > 0 ? local.rsf : ""}
              onChange={(e) => {
                const newRSF = e.currentTarget.value ? Number(e.currentTarget.value) || 0 : 0;
                updateField('rsf', newRSF);
              }}
              onBlur={() => handleBlur('rsf')}
              error={getFieldError('rsf')}
              warning={getFieldWarning('rsf')}
              showError={shouldShowFieldError('rsf')}
              showWarning={shouldShowFieldWarning('rsf')}
              placeholder="Enter rentable square feet"
              min="1"
              step="1"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <ValidatedInput
              label="Commencement"
              type="date"
              value={local.key_dates.commencement || ""}
              onChange={(e) => {
                const newCommencement = e.currentTarget.value;
                const keyDatesPatch: Partial<AnalysisMeta["key_dates"]> = {
                  commencement: newCommencement
                };

                // Recalculate expiration if lease term exists
                if (local.lease_term) {
                  const abatementMonths = getAbatementMonths(local.concessions);
                  keyDatesPatch.expiration = calculateExpiration(
                    newCommencement,
                    local.lease_term.years,
                    local.lease_term.months,
                    local.lease_term.include_abatement_in_term ?? false,
                    abatementMonths
                  );
                }

                setKeyDates(keyDatesPatch);
              }}
              onBlur={() => handleBlur('key_dates')}
              error={getFieldError('key_dates')}
              showError={shouldShowFieldError('key_dates')}
              placeholder="Select lease commencement"
            />
            
            <div className="space-y-1">
              <Label className="text-sm font-medium leading-none">Lease Term</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <ValidatedInput
                  label="Years"
                  type="number"
                  value={local.lease_term?.years || 0}
                  onChange={(e) => {
                    const years = Number(e.currentTarget.value) || 0;
                    const months = local.lease_term?.months || 0;
                    const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
                    
                    updateField('lease_term', { years, months, include_abatement_in_term: includeAbatement });
                    
                    // Recalculate expiration
                    if (local.key_dates.commencement) {
                      const abatementMonths = getAbatementMonths(local.concessions);
                      const expiration = calculateExpiration(
                        local.key_dates.commencement,
                        years,
                        months,
                        includeAbatement,
                        abatementMonths
                      );
                      setKeyDates({ expiration });
                      
                      // Sync rent schedule period end dates
                      if (local.rent_schedule.length > 0) {
                        const syncedSchedule = syncRentScheduleToExpiration(local.rent_schedule, expiration);
                        updateField('rent_schedule', syncedSchedule);
                      }
                    }
                  }}
                  min="0"
                  placeholder="0"
                />
                <ValidatedInput
                  label="Months"
                  type="number"
                  value={local.lease_term?.months || 0}
                  onChange={(e) => {
                    const months = Number(e.currentTarget.value) || 0;
                    const years = local.lease_term?.years || 0;
                    const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
                    
                    updateField('lease_term', { years, months, include_abatement_in_term: includeAbatement });
                    
                    // Recalculate expiration
                    if (local.key_dates.commencement) {
                      const abatementMonths = getAbatementMonths(local.concessions);
                      const expiration = calculateExpiration(
                        local.key_dates.commencement,
                        years,
                        months,
                        includeAbatement,
                        abatementMonths
                      );
                      setKeyDates({ expiration });
                      
                      // Sync rent schedule period end dates
                      if (local.rent_schedule.length > 0) {
                        const syncedSchedule = syncRentScheduleToExpiration(local.rent_schedule, expiration);
                        updateField('rent_schedule', syncedSchedule);
                      }
                    }
                  }}
                  min="0"
                  max="11"
                  placeholder="0"
                />
              </div>
              {(() => {
                const abatementMonths = getAbatementMonths(local.concessions);
                const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
                if (!includeAbatement || abatementMonths <= 0) return null;
                const baseYears = local.lease_term?.years || 0;
                const baseMonths = local.lease_term?.months || 0;
                const totalMonths = baseYears * 12 + baseMonths + abatementMonths;
                const adjustedYears = Math.floor(totalMonths / 12);
                const adjustedMonths = totalMonths % 12;
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    Adjusted term: {adjustedYears} years {adjustedMonths} months incl. {abatementMonths} months free rent
                  </p>
                );
              })()}
            </div>
          </div>
          
          <div>
            <Label>Expiration (Calculated)</Label>
            <Input
              type="date"
              value={local.key_dates.expiration || ""}
              readOnly
              className="bg-muted cursor-not-allowed"
            />
            {(() => {
              const abatementMonths = getAbatementMonths(local.concessions);
              const includeAbatement = local.lease_term?.include_abatement_in_term ?? false;
              if (abatementMonths > 0) {
                return (
                  <p className="text-xs text-muted-foreground mt-1">
                    {includeAbatement 
                      ? `Includes ${abatementMonths} month${abatementMonths !== 1 ? 's' : ''} of abatement`
                      : `Base term only (${abatementMonths} month${abatementMonths !== 1 ? 's' : ''} abatement not included)`
                    }
                  </p>
                );
              }
              return null;
            })()}
          </div>
          {(() => {
            const abatementMonths = getAbatementMonths(local.concessions);
            if (!local.key_dates.commencement || abatementMonths <= 0) return null;
            const commencementDate = parseDateOnly(local.key_dates.commencement);
            if (!commencementDate) return null;
            const rentStartDate = new Date(commencementDate);
            rentStartDate.setMonth(rentStartDate.getMonth() + abatementMonths);
            return (
              <div>
                <Label>Rent Commencement (Calculated)</Label>
                <Input
                  type="date"
                  value={formatDateOnly(rentStartDate)}
                  readOnly
                  className="bg-muted cursor-not-allowed"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Based on {abatementMonths} month{abatementMonths !== 1 ? "s" : ""} of free rent
                </p>
              </div>
            );
          })()}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select
              label="Lease Type"
              value={local.lease_type || ""}
              onChange={(e) => updateField('lease_type', e.currentTarget.value ? (e.currentTarget.value as LeaseType) : undefined)}
              onBlur={() => handleBlur('lease_type')}
              error={getFieldError('lease_type')}
              showError={shouldShowFieldError('lease_type')}
              placeholder="Select lease type"
              options={[
                { value: 'FS', label: 'Full Service (FS)' },
                { value: 'NNN', label: 'Triple Net (NNN)' },
              ]}
            />
            {local.lease_type === "FS" && (
              <Select
                label="Base Year (FS)"
                value={local.base_year?.toString() ?? ""}
                onChange={(e) => updateField('base_year', e.currentTarget.value ? Number(e.currentTarget.value) : undefined)}
                onBlur={() => handleBlur('base_year')}
                error={getFieldError('base_year')}
                showError={shouldShowFieldError('base_year')}
                placeholder="Select base year"
                options={Array.from({ length: 10 }, (_, i) => {
                  const year = new Date().getFullYear() + i;
                  return { value: year.toString(), label: year.toString() };
                })}
              />
            )}
          </div>
          {/* Validation Summary */}
          {errors.length > 0 && (
            <div className="space-y-2">
              {/* Critical Errors */}
              {errors.filter(e => e.severity === 'error').length > 0 && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-destructive" />
                    <span className="text-sm font-medium text-destructive">
                      {errors.filter(e => e.severity === 'error').length} critical {errors.filter(e => e.severity === 'error').length === 1 ? 'error' : 'errors'}
                    </span>
                  </div>
                  <div className="text-xs text-destructive space-y-1">
                    {errors.filter(e => e.severity === 'error').slice(0, 3).map((error, idx) => (
                      <div key={idx}>• {error.message}</div>
                    ))}
                    {errors.filter(e => e.severity === 'error').length > 3 && (
                      <div>• ... and {errors.filter(e => e.severity === 'error').length - 3} more</div>
                    )}
                  </div>
                </div>
              )}
              
              {/* Warnings */}
              {errors.filter(e => e.severity === 'warning').length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">
                      {errors.filter(e => e.severity === 'warning').length} warning{errors.filter(e => e.severity === 'warning').length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    {errors.filter(e => e.severity === 'warning').slice(0, 3).map((warning, idx) => (
                      <div key={idx}>• {warning.message}</div>
                    ))}
                    {errors.filter(e => e.severity === 'warning').length > 3 && (
                      <div>• ... and {errors.filter(e => e.severity === 'warning').length - 3} more</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button 
              onClick={(e) => handleSubmit(e)} 
              disabled={!isValid || isSubmitting}
              className="rounded-2xl"
            >
              <Save className="mr-2 h-4 w-4" />
              {isSubmitting ? 'Saving...' : 'Save changes'}
            </Button>
            <Button variant="outline" className="rounded-2xl">
              <Upload className="mr-2 h-4 w-4" />
              Attach
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Tenant Improvements, Rent Abatement, and Other Concessions</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CurrencyInput
              label="TI Allowance $/SF"
              value={local.concessions.ti_allowance_psf}
              onChange={(value) => setConcessions({ ti_allowance_psf: value })}
              placeholder="0.00"
              hint="Tenant improvement allowance per square foot"
            />
            <CurrencyInput
              label="TI Actual Cost $/SF"
              value={local.concessions.ti_actual_build_cost_psf}
              onChange={(value) => setConcessions({ ti_actual_build_cost_psf: value })}
              placeholder="0.00"
              hint="Actual cost to build per square foot"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <CurrencyInput
              label="Moving Allowance"
              value={local.concessions.moving_allowance}
              onChange={(value) => setConcessions({ moving_allowance: value })}
              placeholder="0.00"
              hint="Total moving allowance"
            />
            <CurrencyInput
              label="Other Concessions"
              value={local.concessions.other_credits}
              onChange={(value) => setConcessions({ other_credits: value })}
              placeholder="0.00"
              hint="Other tenant credits"
            />
          </div>
          
          {/* Rent Abatement Section */}
          <div className="pt-2 border-t">
            <h3 className="text-sm font-medium mb-2">Rent Abatement</h3>
            <div className="space-y-3">
              <Select
                label="Abatement Type"
                value={local.concessions.abatement_type || "at_commencement"}
                onChange={(e) => {
                  const abatementType = e.currentTarget.value as "at_commencement" | "custom";
                  const concessionsPatch =
                    abatementType === "at_commencement"
                      ? {
                          // Clear custom periods when switching to at_commencement
                          abatement_type: abatementType,
                          abatement_periods: undefined,
                        }
                      : {
                          // Initialize with empty periods array when switching to custom
                          abatement_type: abatementType,
                          abatement_periods: local.concessions.abatement_periods || [],
                        };

                  setConcessions(concessionsPatch);

                  // Recalculate expiration if lease term exists
                  if (local.lease_term && local.key_dates.commencement) {
                    const updatedConcessions = { ...local.concessions, ...concessionsPatch };
                    const abatementMonths = getAbatementMonths(updatedConcessions);
                    const includeAbatement = local.lease_term.include_abatement_in_term ?? false;
                    const expiration = calculateExpiration(
                      local.key_dates.commencement,
                      local.lease_term.years,
                      local.lease_term.months,
                      includeAbatement,
                      abatementMonths
                    );
                    setKeyDates({ expiration });
                  }
                }}
                placeholder="Select abatement type"
                options={[
                  { value: 'at_commencement', label: 'Apply at Commencement' },
                  { value: 'custom', label: 'Custom Abatement' },
                ]}
              />

              {(local.concessions.abatement_type === "at_commencement" || !local.concessions.abatement_type) ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <ValidatedInput
                      label="Free Rent Months"
                      type="number"
                      value={local.concessions.abatement_free_rent_months ?? 0}
                      onChange={(e) => {
                        const newMonths = Number(e.currentTarget.value) || 0;
                        setConcessions({ abatement_free_rent_months: newMonths });
                        
                        // Recalculate expiration if lease term exists
                        if (local.lease_term && local.key_dates.commencement) {
                          const expiration = calculateExpiration(
                            local.key_dates.commencement,
                            local.lease_term.years,
                            local.lease_term.months,
                            local.lease_term.include_abatement_in_term ?? false,
                            newMonths
                          );
                          setKeyDates({ expiration });
                        }
                      }}
                      placeholder="0"
                      min="0"
                      hint="Number of months of free rent at commencement"
                    />
                    <Select
                      label="Abatement Applies To"
                      value={local.concessions.abatement_applies_to || "base_only"}
                      onChange={(e) => setConcessions({ abatement_applies_to: e.currentTarget.value as "base_only" | "base_plus_nnn" })}
                      placeholder="Select abatement type"
                      options={[
                        { value: 'base_only', label: 'Base Rent Only' },
                        { value: 'base_plus_nnn', label: 'Base Rent + NNN' },
                      ]}
                    />
                  </div>
                  
                  {/* Toggle to include abatement months in lease term - Always visible */}
                  {local.lease_term && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id="include-abatement-in-term"
                        checked={local.lease_term.include_abatement_in_term ?? false}
                        onChange={(e) => {
                          const includeAbatement = e.target.checked;
                          const years = local.lease_term?.years || 0;
                          const months = local.lease_term?.months || 0;
                          const abatementMonths = local.concessions.abatement_free_rent_months ?? 0;
                          
                          updateField('lease_term', { 
                            years, 
                            months, 
                            include_abatement_in_term: includeAbatement 
                          });
                          
                          // Recalculate expiration
                          if (local.key_dates.commencement) {
                            const expiration = calculateExpiration(
                              local.key_dates.commencement,
                              years,
                              months,
                              includeAbatement,
                              abatementMonths
                            );
                            setKeyDates({ expiration });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="include-abatement-in-term" className="text-sm font-normal cursor-pointer">
                        Add free rent months to lease term
                      </Label>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Abatement Periods</Label>
                    <Button variant="outline" onClick={addAbatementPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.concessions.abatement_periods && local.concessions.abatement_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleAbatementPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.concessions.abatement_periods.map((_, idx) => `abatement-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.concessions.abatement_periods.map((period, idx) => (
                            <AbatementPeriodRow
                              key={`abatement-period-${idx}`}
                              id={`abatement-period-${idx}`}
                              period={period}
                              idx={idx}
                              setAbatementPeriod={setAbatementPeriod}
                              deleteAbatementPeriod={deleteAbatementPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No abatement periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                  
                  {/* Toggle to include abatement months in lease term - Always visible */}
                  {local.lease_term && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <input
                        type="checkbox"
                        id="include-abatement-in-term-custom"
                        checked={local.lease_term.include_abatement_in_term ?? false}
                        onChange={(e) => {
                          const includeAbatement = e.target.checked;
                          const years = local.lease_term?.years || 0;
                          const months = local.lease_term?.months || 0;
                          const abatementMonths = getAbatementMonths(local.concessions);
                          
                          updateField('lease_term', { 
                            years, 
                            months, 
                            include_abatement_in_term: includeAbatement 
                          });
                          
                          // Recalculate expiration
                          if (local.key_dates.commencement) {
                            const expiration = calculateExpiration(
                              local.key_dates.commencement,
                              years,
                              months,
                              includeAbatement,
                              abatementMonths
                            );
                            setKeyDates({ expiration });
                          }
                        }}
                        className="rounded"
                      />
                      <Label htmlFor="include-abatement-in-term-custom" className="text-sm font-normal cursor-pointer">
                        Add free rent months to lease term
                      </Label>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* TI Shortfall Summary */}
          {local.concessions.ti_actual_build_cost_psf !== undefined && local.concessions.ti_allowance_psf !== undefined && (
            <div className="bg-muted/50 border rounded-lg p-2 mt-2">
              <div className="text-sm font-medium mb-1.5">TI Shortfall Analysis</div>
              {(() => {
                const shortfall = calculateTIShortfall(
                  local.rsf,
                  local.concessions.ti_allowance_psf,
                  local.concessions.ti_actual_build_cost_psf,
                  undefined
                );
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Allowance Total:</span>
                      <div className="font-medium">${shortfall.allowanceTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Actual Cost Total:</span>
                      <div className="font-medium">${shortfall.actualCostTotal.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Tenant Contribution:</span>
                      <div className={`font-medium ${shortfall.tenantContribution > 0 ? 'text-destructive' : 'text-green-600'}`}>
                        ${shortfall.tenantContribution.toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:col-span-2">
        <CardHeader>
          <CardTitle>
            {local.lease_type === "FS" 
              ? "Base Rent, Operating Expense Pass-Throughs, and Parking"
              : "Base Rent, Operating Expenses, and Parking"}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {/* Base Rent Section */}
          <div>
            <h3 className="text-sm font-medium mb-2">Base Rent</h3>
            <div className="space-y-3">
              <CurrencyInput
                label="Base Rent $/SF"
                value={defaultRentPeriod.rent_psf}
                onChange={(value) => updateDefaultRentPeriod({ rent_psf: value || 0 })}
                placeholder="0.00"
                hint="Base rent per square foot per year ($/SF/yr)"
                currency="$/SF"
              />
              
              <Select
                label="Escalation Type"
                value={local.rent_escalation?.escalation_type || "fixed"}
                onChange={(e) => {
                  const escalationType = e.currentTarget.value as "fixed" | "custom";
                  if (escalationType === "fixed") {
                    // Clear custom periods when switching to fixed
                    updateField('rent_escalation', { 
                      escalation_type: escalationType,
                      escalation_periods: undefined 
                    });
                  } else {
                    // Initialize with empty periods array when switching to custom
                    updateField('rent_escalation', { 
                      escalation_type: escalationType,
                      escalation_periods: local.rent_escalation?.escalation_periods || []
                    });
                  }
                }}
                placeholder="Select escalation type"
                options={[
                  { value: 'fixed', label: 'Fixed Annual Escalations' },
                  { value: 'custom', label: 'Custom Escalations' },
                ]}
              />

              {(local.rent_escalation?.escalation_type === "fixed" || !local.rent_escalation?.escalation_type) ? (
                <PercentageInput
                  label="Annual Escalation"
                  value={(local.rent_escalation?.fixed_escalation_percentage ?? (defaultRentPeriod.escalation_percentage ?? 0)) * 100}
                  onChange={(value) => {
                    const escalationPercentage = (value || 0) / 100;
                    updateField('rent_escalation', { 
                      escalation_type: "fixed",
                      fixed_escalation_percentage: escalationPercentage
                    });
                    // Also update the default rent period for backward compatibility
                    updateDefaultRentPeriod({ escalation_percentage: escalationPercentage });
                  }}
                  placeholder="3.0"
                  hint="Annual escalation rate (applies to entire lease term)"
                />
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Escalation Periods</Label>
                    <Button variant="outline" onClick={addEscalationPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.rent_escalation?.escalation_periods && local.rent_escalation.escalation_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleEscalationPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.rent_escalation.escalation_periods.map((_, idx) => `escalation-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.rent_escalation.escalation_periods.map((period, idx) => (
                            <EscalationPeriodRow
                              key={`escalation-period-${idx}`}
                              id={`escalation-period-${idx}`}
                              period={period}
                              idx={idx}
                              setEscalationPeriod={setEscalationPeriod}
                              deleteEscalationPeriod={deleteEscalationPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No escalation periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Operating Expenses Section */}
          <div className="pt-3 border-t">
            <h3 className="text-sm font-medium mb-2">
              {local.lease_type === "FS" ? "Operating Expense Pass-Throughs" : "Operating Expenses"}
            </h3>
            <div className="space-y-3">
              {local.lease_type === "FS" && (
                <div className="flex items-center gap-2 border rounded-lg p-3 bg-muted/50">
                  <input
                    type="checkbox"
                    checked={local.operating.use_manual_pass_through || false}
                    onChange={(e) => setOperating({ use_manual_pass_through: e.target.checked })}
                    className="rounded"
                  />
                  <Label className="text-sm">Use manual pass-through $/SF (flat with optional escalation)</Label>
                </div>
              )}
              {local.lease_type === "FS" && local.operating.use_manual_pass_through && (
                <CurrencyInput
                  label="Manual Pass-Through $/SF"
                  value={local.operating.manual_pass_through_psf}
                  onChange={(value) => setOperating({ manual_pass_through_psf: value })}
                  placeholder="0.00"
                  hint="Flat pass-through per square foot; escalation settings apply below"
                />
              )}
              <CurrencyInput
                label="OpEx $/SF"
                value={local.operating.est_op_ex_psf}
                onChange={(value) => setOperating({ est_op_ex_psf: value })}
                placeholder="0.00"
                disabled={local.lease_type === "FS" && local.operating.use_manual_pass_through}
                hint={
                  local.lease_type === "FS" 
                    ? (local.operating.use_manual_pass_through
                      ? "Base year operating expenses per square foot (ignored when manual pass-through is enabled)"
                      : "Base year operating expenses per square foot (tenant pays increases above this)")
                    : "Estimated operating expenses per square foot"
                }
              />
              
              <Select
                label="Escalation Type"
                value={local.operating.escalation_type || "fixed"}
                onChange={(e) => {
                  const escalationType = e.currentTarget.value as "fixed" | "custom";
                  if (escalationType === "fixed") {
                    // Clear custom periods when switching to fixed
                    setOperating({ 
                      escalation_type: escalationType,
                      escalation_periods: undefined 
                    });
                  } else {
                    // Initialize with empty periods array when switching to custom
                    setOperating({ 
                      escalation_type: escalationType,
                      escalation_periods: local.operating.escalation_periods || []
                    });
                  }
                }}
                placeholder="Select escalation type"
                options={[
                  { value: 'fixed', label: 'Fixed Annual Escalations' },
                  { value: 'custom', label: 'Custom Escalations' },
                ]}
              />

              {(local.operating.escalation_type === "fixed" || !local.operating.escalation_type) ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <PercentageInput
                    label={local.lease_type === "FS" && local.operating.use_manual_pass_through ? "Pass-Through Escalation %" : "OpEx Escalation %"}
                    value={(local.operating.escalation_value ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_value: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Annual escalation rate (fixed percentage)"
                  />
                  <PercentageInput
                    label={local.lease_type === "FS" && local.operating.use_manual_pass_through ? "Pass-Through Escalation Cap" : "OpEx Escalation Cap"}
                    value={(local.operating.escalation_cap ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_cap: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Maximum escalation rate (optional)"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Escalation Periods</Label>
                    <Button variant="outline" onClick={addOpExEscalationPeriod} size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Period
                    </Button>
                  </div>
                  {local.operating.escalation_periods && local.operating.escalation_periods.length > 0 ? (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleOpExEscalationPeriodDragEnd}
                    >
                      <SortableContext
                        items={local.operating.escalation_periods.map((_, idx) => `opex-escalation-period-${idx}`)}
                        strategy={verticalListSortingStrategy}
                      >
                        <div className="space-y-3">
                          {local.operating.escalation_periods.map((period, idx) => (
                            <OpExEscalationPeriodRow
                              key={`opex-escalation-period-${idx}`}
                              id={`opex-escalation-period-${idx}`}
                              period={period}
                              idx={idx}
                              setOpExEscalationPeriod={setOpExEscalationPeriod}
                              deleteOpExEscalationPeriod={deleteOpExEscalationPeriod}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  ) : (
                    <div className="text-sm text-muted-foreground p-4 border rounded-lg text-center">
                      No escalation periods added. Click &quot;Add Period&quot; to create one.
                    </div>
                  )}
                  <PercentageInput
                    label={local.lease_type === "FS" && local.operating.use_manual_pass_through ? "Pass-Through Escalation Cap" : "OpEx Escalation Cap"}
                    value={(local.operating.escalation_cap ?? 0) * 100}
                    onChange={(value) => setOperating({ escalation_cap: (value || 0) / 100 })}
                    placeholder="0.00"
                    hint="Maximum escalation rate (optional, applies to all periods)"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Parking Section */}
          <div className="pt-3 border-t">
            <h3 className="text-sm font-medium mb-2">Parking</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <ValidatedInput
                label="# Spaces"
                type="number"
                value={local.parking?.stalls ?? 0}
                onChange={(e) => setParking({ stalls: Number(e.currentTarget.value) })}
                placeholder="0"
                min="0"
                hint="Number of parking spaces"
              />
              <CurrencyInput
                label="Parking Rate $/stall/mo"
                value={local.parking?.monthly_rate_per_stall}
                onChange={(value) => setParking({ monthly_rate_per_stall: value })}
                placeholder="0.00"
                hint="Monthly parking rate per stall"
              />
              <PercentageInput
                label="Parking Escalation %"
                value={
                  (local.parking?.escalation_value ?? 0) > 1
                    ? (local.parking?.escalation_value ?? 0)
                    : (local.parking?.escalation_value ?? 0) * 100
                }
                onChange={(value) => setParking({ escalation_value: (value || 0) / 100 })}
                placeholder="0.00"
                hint="Annual escalation rate (fixed percentage)"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Transaction Costs</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            <CurrencyInput
              label="Legal Fees"
              value={local.transaction_costs?.legal_fees}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (value || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, legal_fees: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Brokerage Fees"
              value={local.transaction_costs?.brokerage_fees}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (value || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, brokerage_fees: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Due Diligence"
              value={local.transaction_costs?.due_diligence}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (value || 0) + (current.environmental || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, due_diligence: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Environmental"
              value={local.transaction_costs?.environmental}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (value || 0) + (current.other || 0);
                updateField('transaction_costs', { ...current, environmental: value, total });
              }}
              placeholder="0.00"
            />
            <CurrencyInput
              label="Other"
              value={local.transaction_costs?.other}
              onChange={(value) => {
                const current = local.transaction_costs || {};
                const total = (current.legal_fees || 0) + (current.brokerage_fees || 0) + (current.due_diligence || 0) + (current.environmental || 0) + (value || 0);
                updateField('transaction_costs', { ...current, other: value, total });
              }}
              placeholder="0.00"
            />
            <div className="flex items-center gap-2 border rounded-lg p-3 bg-muted/50">
              <Label className="text-sm font-medium">Total:</Label>
              <span className="text-sm font-semibold">
                ${(local.transaction_costs?.total || 0).toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Financing / Amortization</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Amortize Costs</Label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_ti || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_ti: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_free_rent: local.financing?.amortize_free_rent || false,
                      amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize TI Allowance</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_free_rent || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_free_rent: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_ti: local.financing?.amortize_ti || false,
                      amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize Free Rent</Label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={local.financing?.amortize_transaction_costs || false}
                    onChange={(e) => updateField('financing', {
                      ...local.financing,
                      amortize_transaction_costs: e.target.checked,
                      amortization_method: local.financing?.amortization_method || "straight_line",
                      amortize_ti: local.financing?.amortize_ti || false,
                      amortize_free_rent: local.financing?.amortize_free_rent || false,
                    })}
                    className="rounded"
                  />
                  <Label className="text-sm">Amortize Transaction Costs</Label>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Select
                label="Amortization Method"
                value={local.financing?.amortization_method || "straight_line"}
                onChange={(e) => updateField('financing', {
                  ...local.financing,
                  amortization_method: e.currentTarget.value as "straight_line" | "present_value",
                  amortize_ti: local.financing?.amortize_ti || false,
                  amortize_free_rent: local.financing?.amortize_free_rent || false,
                  amortize_transaction_costs: local.financing?.amortize_transaction_costs || false,
                })}
                options={[
                  { value: 'straight_line', label: 'Straight Line' },
                  { value: 'present_value', label: 'Present Value' },
                ]}
              />
              {local.financing?.amortization_method === "present_value" && (
                <PercentageInput
                  label="Interest Rate"
                  value={local.financing?.interest_rate}
                  onChange={(value) => updateField('financing', {
                    ...local.financing,
                    interest_rate: value,
                  })}
                  placeholder="8.0"
                  hint="Interest rate for PV amortization"
                />
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="rounded-2xl md:col-span-2">
        <CardHeader>
          <CardTitle>These notes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Textarea
            value={local.notes || ""}
            onChange={(e) => updateField('notes', e.currentTarget.value)}
            placeholder="Enter notes about this analysis..."
            rows={6}
            className="min-h-[150px]"
          />
          
          <div className="space-y-2">
            <Label>Files</Label>
            <div className="flex flex-wrap gap-2">
              {local.attachedFiles && local.attachedFiles.length > 0 && local.attachedFiles.map((file, idx) => (
                <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-muted rounded-lg">
                  <File className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{file.name}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      const newFiles = local.attachedFiles?.filter((_, i) => i !== idx) || [];
                      updateField('attachedFiles', newFiles);
                    }}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
            <div>
              <input
                type="file"
                id="file-upload"
                accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    const newFiles = files.map(file => ({
                      name: file.name,
                      size: file.size,
                      type: file.type,
                      file: file,
                    }));
                    const existingFiles = local.attachedFiles || [];
                    updateField('attachedFiles', [...existingFiles, ...newFiles]);
                  }
                  // Reset input
                  e.target.value = '';
                }}
                multiple
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => document.getElementById('file-upload')?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Add files
              </Button>
              <p className="text-xs text-muted-foreground mt-1">
                PDF or Word documents (max 10MB per file)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <TerminationPanel monthlyEconomics={monthlyEconomics} />
      </div>
    </>
  );
}

const fmtMoney = (v: number) =>
  v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function TerminationPanel({ monthlyEconomics }: { monthlyEconomics?: MonthlyEconomics }) {
  const termination = monthlyEconomics?.termination;
  const termMonths = monthlyEconomics?.monthlyCashflow.length ?? 0;
  const defaultMonth = termMonths > 36 ? 36 : Math.floor(termMonths / 2);
  const [selectedMonth, setSelectedMonth] = React.useState(defaultMonth);

  React.useEffect(() => {
    const next = termMonths > 36 ? 36 : Math.floor(termMonths / 2);
    setSelectedMonth(next);
  }, [termMonths]);

  if (!termination || !termination.componentsAtMonth) {
    return (
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>Termination</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No termination option modeled.</p>
        </CardContent>
      </Card>
    );
  }

  const comp = termination.componentsAtMonth(selectedMonth);
  const milestones = [12, 24, 36, 60, termMonths - 1].filter(
    (m, i, arr) => m >= 0 && m < termMonths && arr.indexOf(m) === i
  );

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Termination</span>
          <span className="text-lg font-bold text-primary">{fmtMoney(comp.totalFee)}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label className="text-xs text-muted-foreground mb-1 block">
            Month {selectedMonth} of {termMonths - 1}
          </Label>
          <input
            type="range"
            min={0}
            max={termMonths - 1}
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="w-full accent-primary"
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Penalty Months</Label>
            <div className="text-sm font-semibold">{termination.penaltyMonths ?? 0}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Current Monthly Rent</Label>
            <div className="text-sm font-semibold">{fmtMoney(comp.thenCurrentRent)}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Penalty Rent</Label>
            <div className="text-sm font-semibold">{fmtMoney(comp.penaltyRent)}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Unamortized Balance</Label>
            <div className="text-sm font-semibold">{fmtMoney(comp.unamortized)}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Equivalent Months</Label>
            <div className="text-sm font-semibold">{comp.eqMonths.toFixed(1)}</div>
          </div>
        </div>

        {milestones.length > 0 && (
          <div className="pt-2 border-t">
            <Label className="text-xs text-muted-foreground mb-2 block">Fee at Key Months</Label>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left p-1.5 font-medium">Month</th>
                    <th className="text-right p-1.5 font-medium">Penalty</th>
                    <th className="text-right p-1.5 font-medium">Unamortized</th>
                    <th className="text-right p-1.5 font-medium">Total Fee</th>
                  </tr>
                </thead>
                <tbody>
                  {milestones.map((m) => {
                    const c = termination.componentsAtMonth!(m);
                    return (
                      <tr key={m} className="border-b">
                        <td className="p-1.5">{m}{m === termMonths - 1 ? " (end)" : ""}</td>
                        <td className="p-1.5 text-right">{fmtMoney(c.penaltyRent)}</td>
                        <td className="p-1.5 text-right">{fmtMoney(c.unamortized)}</td>
                        <td className="p-1.5 text-right font-medium">{fmtMoney(c.totalFee)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
