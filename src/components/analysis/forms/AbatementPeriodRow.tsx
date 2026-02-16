import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { ValidatedInput } from "@/components/ui/validated-input";
import { Select } from "@/components/ui/select";
import type { AbatementPeriod } from "@/types";

export function AbatementPeriodRow({
  id,
  period,
  idx,
  setAbatementPeriod,
  deleteAbatementPeriod,
}: {
  id: string;
  period: AbatementPeriod;
  idx: number;
  setAbatementPeriod: (idx: number, patch: Partial<AbatementPeriod>) => void;
  deleteAbatementPeriod: (idx: number) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="border rounded-lg p-4 space-y-3"
    >
      <div className="flex items-center justify-between mb-2">
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing flex items-center gap-2 text-xs text-muted-foreground"
        >
          <span>::</span>
          <span>Drag to reorder</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          onClick={() => deleteAbatementPeriod(idx)}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete Period
        </Button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <Label>Period Start</Label>
          <Input
            type="date"
            value={period.period_start}
            onChange={(e) => setAbatementPeriod(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={period.period_end}
            onChange={(e) => setAbatementPeriod(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <ValidatedInput
          label="Free Rent Months"
          type="number"
          value={period.free_rent_months ?? 0}
          onChange={(e) => setAbatementPeriod(idx, { free_rent_months: Number(e.currentTarget.value) || 0 })}
          placeholder="0"
          min="0"
          hint="Number of free rent months in this period"
        />
        <Select
          label="Abatement Applies To"
          value={period.abatement_applies_to || "base_only"}
          onChange={(e) => setAbatementPeriod(idx, { abatement_applies_to: e.currentTarget.value as "base_only" | "base_plus_nnn" })}
          placeholder="Select abatement type"
          options={[
            { value: 'base_only', label: 'Base Rent Only' },
            { value: 'base_plus_nnn', label: 'Base Rent + NNN' },
          ]}
        />
      </div>
    </div>
  );
}
