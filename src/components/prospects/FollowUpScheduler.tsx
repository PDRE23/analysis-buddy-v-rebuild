"use client";

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import type { Prospect, FollowUpType } from "@/lib/types/prospect";
import { ALL_FOLLOWUP_TYPES } from "@/lib/types/prospect";
import { nanoid } from "nanoid";
import { X } from "lucide-react";

interface FollowUpSchedulerProps {
  prospect: Prospect;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (followUp: Prospect["followUps"][0]) => void;
}

export function FollowUpScheduler({
  prospect,
  isOpen,
  onClose,
  onSchedule,
}: FollowUpSchedulerProps) {
  const [formData, setFormData] = useState({
    scheduledDate: "",
    scheduledTime: "",
    type: "call" as FollowUpType,
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  if (!isOpen) return null;

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.scheduledDate) {
      newErrors.scheduledDate = "Date is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // Combine date and time
    const dateTime = formData.scheduledTime
      ? `${formData.scheduledDate}T${formData.scheduledTime}:00`
      : `${formData.scheduledDate}T09:00:00`;

    const followUp: Prospect["followUps"][0] = {
      id: nanoid(),
      scheduledDate: new Date(dateTime).toISOString(),
      type: formData.type,
      notes: formData.notes || undefined,
      completed: false,
      reminderSent: false,
    };

    onSchedule(followUp);

    // Reset form
    setFormData({
      scheduledDate: "",
      scheduledTime: "",
      type: "call",
      notes: "",
    });
    setErrors({});
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Schedule Follow-up</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Schedule a follow-up for {prospect.contact.name}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="type">Type</Label>
              <Select
                id="type"
                value={formData.type}
                onChange={(e) => handleChange("type", e.target.value)}
                options={ALL_FOLLOWUP_TYPES.map(type => ({
                  value: type,
                  label: type.charAt(0).toUpperCase() + type.slice(1),
                }))}
              />
            </div>

            <div>
              <Label htmlFor="scheduledDate">
                Date <span className="text-red-500">*</span>
              </Label>
              <Input
                id="scheduledDate"
                type="date"
                value={formData.scheduledDate}
                onChange={(e) => handleChange("scheduledDate", e.target.value)}
                className={errors.scheduledDate ? "border-red-500" : ""}
                min={new Date().toISOString().split('T')[0]}
              />
              {errors.scheduledDate && (
                <p className="text-sm text-red-500 mt-1">{errors.scheduledDate}</p>
              )}
            </div>

            <div>
              <Label htmlFor="scheduledTime">Time (optional)</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={formData.scheduledTime}
                onChange={(e) => handleChange("scheduledTime", e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Add any notes about this follow-up..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit">
                Schedule Follow-up
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

