"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Deal, DealStage, DealPriority } from "@/lib/types/deal";
import { ALL_STAGES } from "@/lib/types/deal";
import { X } from "lucide-react";

interface DealFormProps {
  deal?: Deal; // If provided, we're editing; otherwise creating
  onSave: (deal: Omit<Deal, "id" | "createdAt" | "updatedAt" | "activities"> & { id?: string }) => void;
  onCancel: () => void;
}

export function DealForm({ deal, onSave, onCancel }: DealFormProps) {
  const [formData, setFormData] = useState({
    clientName: deal?.clientName || "",
    clientCompany: deal?.clientCompany || "",
    propertyAddress: deal?.property.address || "",
    propertyCity: deal?.property.city || "",
    propertyState: deal?.property.state || "",
    propertyZipCode: deal?.property.zipCode || "",
    propertyBuilding: deal?.property.building || "",
    propertyFloor: deal?.property.floor || "",
    propertySuite: deal?.property.suite || "",
    stage: deal?.stage || ("Lead" as DealStage),
    priority: deal?.priority || ("Medium" as DealPriority),
    rsf: deal?.rsf?.toString() || "",
    leaseTerm: deal?.leaseTerm?.toString() || "",
    expectedCloseDate: deal?.expectedCloseDate?.split("T")[0] || "",
    estimatedValue: deal?.estimatedValue?.toString() || "",
    broker: deal?.broker || "",
    brokerEmail: deal?.brokerEmail || "",
    status: deal?.status || ("Active" as Deal["status"]),
    notes: deal?.notes || "",
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

    if (!formData.clientName.trim()) {
      newErrors.clientName = "Client name is required";
    }
    if (!formData.propertyAddress.trim()) {
      newErrors.propertyAddress = "Property address is required";
    }
    if (!formData.propertyCity.trim()) {
      newErrors.propertyCity = "City is required";
    }
    if (!formData.propertyState.trim()) {
      newErrors.propertyState = "State is required";
    }
    if (!formData.rsf || isNaN(Number(formData.rsf)) || Number(formData.rsf) <= 0) {
      newErrors.rsf = "Valid RSF is required";
    }
    if (!formData.leaseTerm || isNaN(Number(formData.leaseTerm)) || Number(formData.leaseTerm) <= 0) {
      newErrors.leaseTerm = "Valid lease term is required";
    }
    if (!formData.broker.trim()) {
      newErrors.broker = "Broker name is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const dealData = {
      ...(deal?.id ? { id: deal.id } : {}),
      clientName: formData.clientName,
      clientCompany: formData.clientCompany || undefined,
      property: {
        address: formData.propertyAddress,
        city: formData.propertyCity,
        state: formData.propertyState,
        zipCode: formData.propertyZipCode || undefined,
        building: formData.propertyBuilding || undefined,
        floor: formData.propertyFloor || undefined,
        suite: formData.propertySuite || undefined,
      },
      stage: formData.stage,
      priority: formData.priority,
      rsf: Number(formData.rsf),
      leaseTerm: Number(formData.leaseTerm),
      expectedCloseDate: formData.expectedCloseDate || undefined,
      estimatedValue: formData.estimatedValue ? Number(formData.estimatedValue) : undefined,
      broker: formData.broker,
      brokerEmail: formData.brokerEmail || undefined,
      status: formData.status,
      notes: formData.notes || undefined,
      tags: deal?.tags || undefined,
      analysisIds: deal?.analysisIds || [],
    };

    onSave(dealData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{deal ? "Edit Deal" : "New Deal"}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Client Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Client Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="clientName">Client Name *</Label>
                  <Input
                    id="clientName"
                    value={formData.clientName}
                    onChange={(e) => handleChange("clientName", e.target.value)}
                    className={errors.clientName ? "border-red-500" : ""}
                  />
                  {errors.clientName && (
                    <p className="text-xs text-red-500 mt-1">{errors.clientName}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="clientCompany">Company</Label>
                  <Input
                    id="clientCompany"
                    value={formData.clientCompany}
                    onChange={(e) => handleChange("clientCompany", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Property Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Property Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="propertyAddress">Address *</Label>
                  <Input
                    id="propertyAddress"
                    value={formData.propertyAddress}
                    onChange={(e) => handleChange("propertyAddress", e.target.value)}
                    className={errors.propertyAddress ? "border-red-500" : ""}
                  />
                  {errors.propertyAddress && (
                    <p className="text-xs text-red-500 mt-1">{errors.propertyAddress}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="propertyCity">City *</Label>
                    <Input
                      id="propertyCity"
                      value={formData.propertyCity}
                      onChange={(e) => handleChange("propertyCity", e.target.value)}
                      className={errors.propertyCity ? "border-red-500" : ""}
                    />
                    {errors.propertyCity && (
                      <p className="text-xs text-red-500 mt-1">{errors.propertyCity}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="propertyState">State *</Label>
                    <Input
                      id="propertyState"
                      value={formData.propertyState}
                      onChange={(e) => handleChange("propertyState", e.target.value)}
                      className={errors.propertyState ? "border-red-500" : ""}
                    />
                    {errors.propertyState && (
                      <p className="text-xs text-red-500 mt-1">{errors.propertyState}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="propertyZipCode">Zip Code</Label>
                    <Input
                      id="propertyZipCode"
                      value={formData.propertyZipCode}
                      onChange={(e) => handleChange("propertyZipCode", e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="propertyBuilding">Building</Label>
                    <Input
                      id="propertyBuilding"
                      value={formData.propertyBuilding}
                      onChange={(e) => handleChange("propertyBuilding", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertyFloor">Floor</Label>
                    <Input
                      id="propertyFloor"
                      value={formData.propertyFloor}
                      onChange={(e) => handleChange("propertyFloor", e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="propertySuite">Suite</Label>
                    <Input
                      id="propertySuite"
                      value={formData.propertySuite}
                      onChange={(e) => handleChange("propertySuite", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Deal Details */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Deal Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="stage">Stage</Label>
                  <Select
                    id="stage"
                    value={formData.stage}
                    onChange={(e) => handleChange("stage", e.target.value)}
                    options={ALL_STAGES.map(stage => ({ value: stage, label: stage }))}
                  />
                </div>
                <div>
                  <Label htmlFor="priority">Priority</Label>
                  <Select
                    id="priority"
                    value={formData.priority}
                    onChange={(e) => handleChange("priority", e.target.value)}
                    options={[
                      { value: "High", label: "High" },
                      { value: "Medium", label: "Medium" },
                      { value: "Low", label: "Low" },
                    ]}
                  />
                </div>
                <div>
                  <Label htmlFor="rsf">RSF *</Label>
                  <Input
                    id="rsf"
                    type="number"
                    value={formData.rsf}
                    onChange={(e) => handleChange("rsf", e.target.value)}
                    className={errors.rsf ? "border-red-500" : ""}
                  />
                  {errors.rsf && (
                    <p className="text-xs text-red-500 mt-1">{errors.rsf}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="leaseTerm">Lease Term (months) *</Label>
                  <Input
                    id="leaseTerm"
                    type="number"
                    value={formData.leaseTerm}
                    onChange={(e) => handleChange("leaseTerm", e.target.value)}
                    className={errors.leaseTerm ? "border-red-500" : ""}
                  />
                  {errors.leaseTerm && (
                    <p className="text-xs text-red-500 mt-1">{errors.leaseTerm}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="expectedCloseDate">Expected Close Date</Label>
                  <Input
                    id="expectedCloseDate"
                    type="date"
                    value={formData.expectedCloseDate}
                    onChange={(e) => handleChange("expectedCloseDate", e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    value={formData.estimatedValue}
                    onChange={(e) => handleChange("estimatedValue", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Broker Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Broker Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="broker">Broker Name *</Label>
                  <Input
                    id="broker"
                    value={formData.broker}
                    onChange={(e) => handleChange("broker", e.target.value)}
                    className={errors.broker ? "border-red-500" : ""}
                  />
                  {errors.broker && (
                    <p className="text-xs text-red-500 mt-1">{errors.broker}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="brokerEmail">Broker Email</Label>
                  <Input
                    id="brokerEmail"
                    type="email"
                    value={formData.brokerEmail}
                    onChange={(e) => handleChange("brokerEmail", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Additional Information */}
            <div>
              <h3 className="text-sm font-semibold mb-3">Additional Information</h3>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => handleChange("notes", e.target.value)}
                    className="w-full min-h-[100px] rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
              <Button type="submit">
                {deal ? "Update Deal" : "Create Deal"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

