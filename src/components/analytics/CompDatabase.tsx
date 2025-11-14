"use client";

/**
 * Comp Database Component
 * Manage comparable properties database
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, MapPin, Building2 } from "lucide-react";
import {
  getComparableProperties,
  saveComparableProperty,
  type ComparableProperty,
} from "@/lib/marketData";

export function CompDatabase() {
  const [comps, setComps] = useState<ComparableProperty[]>(() => getComparableProperties());
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    market: "",
    propertyType: "office" as "office" | "retail" | "industrial" | "medical" | "warehouse",
    rsf: "",
    rentPSF: "",
    leaseTerm: "",
    tiAllowance: "",
    freeRentMonths: "",
    buildingClass: "A" as "A" | "B" | "C" | "N/A",
    yearBuilt: "",
    notes: "",
  });

  const filteredComps = comps.filter(comp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      comp.name.toLowerCase().includes(query) ||
      comp.address.toLowerCase().includes(query) ||
      comp.market.toLowerCase().includes(query)
    );
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newComp = saveComparableProperty({
      name: formData.name,
      address: formData.address,
      market: formData.market,
      propertyType: formData.propertyType,
      rsf: Number(formData.rsf),
      rentPSF: Number(formData.rentPSF),
      leaseTerm: Number(formData.leaseTerm),
      tiAllowance: Number(formData.tiAllowance),
      freeRentMonths: Number(formData.freeRentMonths),
      buildingClass: formData.buildingClass,
      yearBuilt: formData.yearBuilt ? Number(formData.yearBuilt) : undefined,
      notes: formData.notes || undefined,
      createdBy: "current-user", // In production, get from auth
    });

    setComps([...comps, newComp]);
    setShowAddForm(false);
    setFormData({
      name: "",
      address: "",
      market: "",
      propertyType: "office",
      rsf: "",
      rentPSF: "",
      leaseTerm: "",
      tiAllowance: "",
      freeRentMonths: "",
      buildingClass: "A",
      yearBuilt: "",
      notes: "",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Comparable Properties Database</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your comp database for market analysis
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="rounded-2xl"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Comp
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle>Add Comparable Property</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Property Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="market">Market</Label>
                  <Input
                    id="market"
                    value={formData.market}
                    onChange={(e) => setFormData({ ...formData, market: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="propertyType">Property Type</Label>
                  <select
                    id="propertyType"
                    value={formData.propertyType}
                    onChange={(e) => setFormData({ ...formData, propertyType: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="office">Office</option>
                    <option value="retail">Retail</option>
                    <option value="industrial">Industrial</option>
                    <option value="medical">Medical</option>
                    <option value="warehouse">Warehouse</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="rsf">RSF</Label>
                  <Input
                    id="rsf"
                    type="number"
                    value={formData.rsf}
                    onChange={(e) => setFormData({ ...formData, rsf: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="rentPSF">Rent ($/SF/yr)</Label>
                  <Input
                    id="rentPSF"
                    type="number"
                    step="0.01"
                    value={formData.rentPSF}
                    onChange={(e) => setFormData({ ...formData, rentPSF: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="leaseTerm">Lease Term (years)</Label>
                  <Input
                    id="leaseTerm"
                    type="number"
                    value={formData.leaseTerm}
                    onChange={(e) => setFormData({ ...formData, leaseTerm: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="tiAllowance">TI Allowance ($/SF)</Label>
                  <Input
                    id="tiAllowance"
                    type="number"
                    step="0.01"
                    value={formData.tiAllowance}
                    onChange={(e) => setFormData({ ...formData, tiAllowance: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="freeRentMonths">Free Rent (months)</Label>
                  <Input
                    id="freeRentMonths"
                    type="number"
                    value={formData.freeRentMonths}
                    onChange={(e) => setFormData({ ...formData, freeRentMonths: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="buildingClass">Building Class</Label>
                  <select
                    id="buildingClass"
                    value={formData.buildingClass}
                    onChange={(e) => setFormData({ ...formData, buildingClass: e.target.value as any })}
                    className="w-full rounded-md border border-gray-300 px-3 py-2"
                  >
                    <option value="A">Class A</option>
                    <option value="B">Class B</option>
                    <option value="C">Class C</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
                <div>
                  <Label htmlFor="yearBuilt">Year Built (optional)</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    value={formData.yearBuilt}
                    onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full rounded-md border border-gray-300 px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex gap-2">
                <Button type="submit" className="rounded-2xl">
                  Save Comp
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search comps by name, address, or market..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Comp List */}
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{filteredComps.length} Comparable Properties</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredComps.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No comparable properties found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredComps.map((comp) => (
                <div
                  key={comp.id}
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{comp.name}</h3>
                        <Badge variant="outline">{comp.propertyType}</Badge>
                        <Badge variant="outline">Class {comp.buildingClass}</Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                        <MapPin className="h-3 w-3" />
                        {comp.address}, {comp.market}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <div className="text-muted-foreground">RSF</div>
                          <div className="font-medium">{comp.rsf.toLocaleString()}</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Rent</div>
                          <div className="font-medium">${comp.rentPSF.toFixed(2)}/SF</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">Term</div>
                          <div className="font-medium">{comp.leaseTerm} years</div>
                        </div>
                        <div>
                          <div className="text-muted-foreground">TI</div>
                          <div className="font-medium">${comp.tiAllowance.toFixed(2)}/SF</div>
                        </div>
                      </div>
                      {comp.notes && (
                        <div className="text-sm text-muted-foreground mt-2 italic">
                          {comp.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

