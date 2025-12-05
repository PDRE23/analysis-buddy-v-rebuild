"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Prospect, ProspectStatus, ProspectPriority } from "@/lib/types/prospect";
import { ALL_STATUSES, ALL_PRIORITIES } from "@/lib/types/prospect";
import { X } from "lucide-react";

interface ProspectFormProps {
  prospect?: Prospect;
  onSave: (prospect: Omit<Prospect, "id" | "createdAt" | "updatedAt" | "activities" | "followUps"> & { id?: string }) => void;
  onCancel: () => void;
}

export function ProspectForm({ prospect, onSave, onCancel }: ProspectFormProps) {
  const [formData, setFormData] = useState({
    contactName: prospect?.contact.name || "",
    contactCompany: prospect?.contact.company || "",
    contactEmail: prospect?.contact.email || "",
    contactPhone: prospect?.contact.phone || "",
    contactTitle: prospect?.contact.title || "",
    contactLinkedIn: prospect?.contact.linkedIn || "",
    status: prospect?.status || ("New" as ProspectStatus),
    priority: prospect?.priority || ("Medium" as ProspectPriority),
    source: prospect?.source || "",
    location: prospect?.location || "",
    size: prospect?.size || "",
    notes: prospect?.notes || "",
    tags: prospect?.tags?.join(", ") || "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
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

    if (!formData.contactName.trim()) {
      newErrors.contactName = "Name is required";
    }
    if (!formData.contactEmail.trim() && !formData.contactPhone.trim()) {
      newErrors.contactEmail = "Email or phone is required";
      newErrors.contactPhone = "Email or phone is required";
    }
    if (formData.contactEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contactEmail)) {
      newErrors.contactEmail = "Invalid email format";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const prospectData = {
      ...(prospect?.id ? { id: prospect.id } : {}),
      contact: {
        name: formData.contactName,
        company: formData.contactCompany || undefined,
        email: formData.contactEmail || undefined,
        phone: formData.contactPhone || undefined,
        title: formData.contactTitle || undefined,
        linkedIn: formData.contactLinkedIn || undefined,
      },
      status: formData.status,
      priority: formData.priority,
      source: formData.source || undefined,
      location: formData.location || undefined,
      size: formData.size || undefined,
      notes: formData.notes || "", // Ensure notes is always a string, never undefined
      tags: formData.tags ? formData.tags.split(",").map(t => t.trim()).filter(t => t) : undefined,
      followUps: prospect?.followUps || [],
      // Set initial cold call stage to "Research" for new prospects
      coldCallStage: prospect?.coldCallStage || "Research",
      outreachAttempts: prospect?.outreachAttempts || [],
    };

    onSave(prospectData);
  };

  return (
    <div className="h-full flex flex-col bg-gray-50">
      <div className="flex-shrink-0 border-b bg-white px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">
            {prospect ? "Edit Prospect" : "New Prospect"}
          </h1>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="contactName">
                    Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="contactName"
                    value={formData.contactName}
                    onChange={(e) => handleChange("contactName", e.target.value)}
                    placeholder="John Doe"
                    className={errors.contactName ? "border-red-500" : ""}
                  />
                  {errors.contactName && (
                    <p className="text-sm text-red-500 mt-1">{errors.contactName}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactCompany">Company</Label>
                  <Input
                    id="contactCompany"
                    value={formData.contactCompany}
                    onChange={(e) => handleChange("contactCompany", e.target.value)}
                    placeholder="Acme Corp"
                  />
                </div>

                <div>
                  <Label htmlFor="contactEmail">
                    Email {!formData.contactPhone && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={formData.contactEmail}
                    onChange={(e) => handleChange("contactEmail", e.target.value)}
                    placeholder="john@example.com"
                    className={errors.contactEmail ? "border-red-500" : ""}
                  />
                  {errors.contactEmail && (
                    <p className="text-sm text-red-500 mt-1">{errors.contactEmail}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactPhone">
                    Phone {!formData.contactEmail && <span className="text-red-500">*</span>}
                  </Label>
                  <Input
                    id="contactPhone"
                    type="tel"
                    value={formData.contactPhone}
                    onChange={(e) => handleChange("contactPhone", e.target.value)}
                    placeholder="(555) 123-4567"
                    className={errors.contactPhone ? "border-red-500" : ""}
                  />
                  {errors.contactPhone && (
                    <p className="text-sm text-red-500 mt-1">{errors.contactPhone}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="contactTitle">Title</Label>
                  <Input
                    id="contactTitle"
                    value={formData.contactTitle}
                    onChange={(e) => handleChange("contactTitle", e.target.value)}
                    placeholder="CEO, VP, etc."
                  />
                </div>

                <div>
                  <Label htmlFor="contactLinkedIn">LinkedIn</Label>
                  <Input
                    id="contactLinkedIn"
                    value={formData.contactLinkedIn}
                    onChange={(e) => handleChange("contactLinkedIn", e.target.value)}
                    placeholder="linkedin.com/in/..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader>
              <CardTitle>Status & Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select
                    id="status"
                    value={formData.status}
                    onChange={(e) => handleChange("status", e.target.value)}
                    options={ALL_STATUSES.map(status => ({
                      value: status,
                      label: status,
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    options={ALL_PRIORITIES.map(priority => ({
                      value: priority,
                      label: priority,
                    }))}
                  />
                </div>

                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => handleChange("location", e.target.value)}
                    placeholder="City, State or Address"
                  />
                </div>

                <div>
                  <Label htmlFor="size">Size</Label>
                  <Input
                    id="size"
                    value={formData.size}
                    onChange={(e) => handleChange("size", e.target.value)}
                    placeholder="Company size, office size, or deal size"
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="source">Source</Label>
                  <Input
                    id="source"
                    value={formData.source}
                    onChange={(e) => handleChange("source", e.target.value)}
                    placeholder="LinkedIn, Referral, Cold Call, etc."
                  />
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="tags">Tags</Label>
                  <Input
                    id="tags"
                    value={formData.tags}
                    onChange={(e) => handleChange("tags", e.target.value)}
                    placeholder="comma-separated tags"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Separate multiple tags with commas
                  </p>
                </div>

                <div className="md:col-span-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    placeholder="Add any notes about this prospect..."
                    rows={4}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end gap-2 mt-6">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button type="submit">
              {prospect ? "Update Prospect" : "Create Prospect"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

