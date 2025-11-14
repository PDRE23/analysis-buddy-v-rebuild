"use client";

/**
 * Branding Settings Component
 * Configure company logo, colors, fonts, and contact info for exports
 */

import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, X, Save } from "lucide-react";

export interface BrandingConfig {
  companyName: string;
  logo?: string; // Base64 or URL
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  contactInfo: {
    name: string;
    email: string;
    phone?: string;
    address?: string;
  };
  footerText?: string;
}

const BRANDING_STORAGE_KEY = "branding-config";

const DEFAULT_BRANDING: BrandingConfig = {
  companyName: "",
  primaryColor: "#2563eb",
  secondaryColor: "#64748b",
  fontFamily: "Inter",
  contactInfo: {
    name: "",
    email: "",
    phone: "",
    address: "",
  },
};

export function BrandingSettings() {
  const [branding, setBranding] = useState<BrandingConfig>(() => {
    try {
      const stored = localStorage.getItem(BRANDING_STORAGE_KEY);
      return stored ? JSON.parse(stored) : DEFAULT_BRANDING;
    } catch {
      return DEFAULT_BRANDING;
    }
  });

  const [logoPreview, setLogoPreview] = useState<string | null>(branding.logo || null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setBranding(prev => ({ ...prev, logo: base64 }));
      setLogoPreview(base64);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBranding(prev => ({ ...prev, logo: undefined }));
    setLogoPreview(null);
  };

  const handleSave = () => {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(branding));
    alert("Branding settings saved!");
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Branding & Customization</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Company Name */}
        <div>
          <Label htmlFor="companyName">Company Name</Label>
          <Input
            id="companyName"
            value={branding.companyName}
            onChange={(e) => setBranding(prev => ({ ...prev, companyName: e.target.value }))}
            placeholder="Your Company Name"
          />
        </div>

        {/* Logo Upload */}
        <div>
          <Label>Company Logo</Label>
          <div className="mt-2 flex items-center gap-4">
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Company logo"
                  className="h-20 w-auto object-contain border rounded-lg p-2"
                />
                <button
                  onClick={handleRemoveLogo}
                  className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 text-center">No logo</p>
              </div>
            )}
            <div>
              <Input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <Button
                variant="outline"
                onClick={() => document.getElementById("logo-upload")?.click()}
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload Logo
              </Button>
            </div>
          </div>
        </div>

        {/* Colors */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="primaryColor">Primary Color</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="primaryColor"
                type="color"
                value={branding.primaryColor}
                onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                className="w-16 h-10"
              />
              <Input
                value={branding.primaryColor}
                onChange={(e) => setBranding(prev => ({ ...prev, primaryColor: e.target.value }))}
                placeholder="#2563eb"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="secondaryColor">Secondary Color</Label>
            <div className="flex items-center gap-2 mt-2">
              <Input
                id="secondaryColor"
                type="color"
                value={branding.secondaryColor}
                onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                className="w-16 h-10"
              />
              <Input
                value={branding.secondaryColor}
                onChange={(e) => setBranding(prev => ({ ...prev, secondaryColor: e.target.value }))}
                placeholder="#64748b"
              />
            </div>
          </div>
        </div>

        {/* Font */}
        <div>
          <Label htmlFor="fontFamily">Font Family</Label>
          <select
            id="fontFamily"
            value={branding.fontFamily}
            onChange={(e) => setBranding(prev => ({ ...prev, fontFamily: e.target.value }))}
            className="w-full mt-2 rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="Inter">Inter</option>
            <option value="Arial">Arial</option>
            <option value="Helvetica">Helvetica</option>
            <option value="Times New Roman">Times New Roman</option>
            <option value="Georgia">Georgia</option>
          </select>
        </div>

        {/* Contact Info */}
        <div className="space-y-4">
          <Label>Contact Information</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contactName">Contact Name</Label>
              <Input
                id="contactName"
                value={branding.contactInfo.name}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, name: e.target.value }
                }))}
                placeholder="John Doe"
              />
            </div>
            <div>
              <Label htmlFor="contactEmail">Email</Label>
              <Input
                id="contactEmail"
                type="email"
                value={branding.contactInfo.email}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, email: e.target.value }
                }))}
                placeholder="john@company.com"
              />
            </div>
            <div>
              <Label htmlFor="contactPhone">Phone</Label>
              <Input
                id="contactPhone"
                value={branding.contactInfo.phone || ""}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, phone: e.target.value }
                }))}
                placeholder="(555) 123-4567"
              />
            </div>
            <div>
              <Label htmlFor="contactAddress">Address</Label>
              <Input
                id="contactAddress"
                value={branding.contactInfo.address || ""}
                onChange={(e) => setBranding(prev => ({
                  ...prev,
                  contactInfo: { ...prev.contactInfo, address: e.target.value }
                }))}
                placeholder="123 Main St, City, State ZIP"
              />
            </div>
          </div>
        </div>

        {/* Footer Text */}
        <div>
          <Label htmlFor="footerText">Custom Footer Text</Label>
          <Input
            id="footerText"
            value={branding.footerText || ""}
            onChange={(e) => setBranding(prev => ({ ...prev, footerText: e.target.value }))}
            placeholder="Optional custom footer text for exports"
          />
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} className="rounded-2xl">
            <Save className="mr-2 h-4 w-4" />
            Save Branding Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Get branding configuration from storage
 */
export function getBrandingConfig(): BrandingConfig {
  try {
    const stored = localStorage.getItem(BRANDING_STORAGE_KEY);
    return stored ? JSON.parse(stored) : DEFAULT_BRANDING;
  } catch {
    return DEFAULT_BRANDING;
  }
}

