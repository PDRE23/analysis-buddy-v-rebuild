import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Trash2 } from "lucide-react";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import type { RentRow } from "@/types";

export function RentScheduleRow({
  id,
  row,
  idx,
  setRentRow,
  deleteRentRow,
}: {
  id: string;
  row: RentRow;
  idx: number;
  setRentRow: (idx: number, patch: Partial<RentRow>) => void;
  deleteRentRow: (idx: number) => void;
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
          onClick={() => deleteRentRow(idx)}
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
            value={row.period_start}
            onChange={(e) => setRentRow(idx, { period_start: e.currentTarget.value })}
          />
        </div>
        <div>
          <Label>Period End</Label>
          <Input
            type="date"
            value={row.period_end}
            onChange={(e) => setRentRow(idx, { period_end: e.currentTarget.value })}
          />
        </div>
        <CurrencyInput
          label="Base Rent $/SF"
          value={row.rent_psf}
          onChange={(value) => setRentRow(idx, { rent_psf: value || 0 })}
          placeholder="0.00"
          currency="$/SF"
        />
        <PercentageInput
          label="Annual Escalation"
          value={(row.escalation_percentage ?? 0) * 100}
          onChange={(value) => setRentRow(idx, { escalation_percentage: (value || 0) / 100 })}
          placeholder="3.0"
        />
      </div>
    </div>
  );
}
