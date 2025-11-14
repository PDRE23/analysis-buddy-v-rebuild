"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CurrencyInput } from "@/components/ui/currency-input";
import { PercentageInput } from "@/components/ui/percentage-input";
import type { NERAnalysis } from "@/lib/types/ner";

interface NERDealTermsProps {
  nerData: NERAnalysis;
  onUpdate: (updates: Partial<NERAnalysis>) => void;
}

export function NERDealTerms({ nerData, onUpdate }: NERDealTermsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Deal Terms</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="baseRentYears1to5">Years 1-5 Base Rent ($/RSF)</Label>
            <CurrencyInput
              id="baseRentYears1to5"
              value={nerData.baseRentYears1to5}
              onChange={(value) => onUpdate({ baseRentYears1to5: value })}
            />
          </div>
          <div>
            <Label htmlFor="baseRentYears6toLXD">Years 6-LXD Base Rent ($/RSF)</Label>
            <CurrencyInput
              id="baseRentYears6toLXD"
              value={nerData.baseRentYears6toLXD}
              onChange={(value) => onUpdate({ baseRentYears6toLXD: value })}
            />
          </div>
          <div>
            <Label htmlFor="monthsFree">Months Free</Label>
            <Input
              id="monthsFree"
              type="number"
              value={nerData.monthsFree}
              onChange={(e) => onUpdate({ monthsFree: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="tiNbiValue">TI/NBI Value ($/RSF)</Label>
            <CurrencyInput
              id="tiNbiValue"
              value={nerData.tiNbiValue}
              onChange={(value) => onUpdate({ tiNbiValue: value })}
            />
          </div>
          <div>
            <Label htmlFor="rsf">RSF</Label>
            <Input
              id="rsf"
              type="number"
              value={nerData.rsf}
              onChange={(e) => onUpdate({ rsf: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="termYears">Term (Years)</Label>
            <Input
              id="termYears"
              type="number"
              step="0.25"
              value={nerData.termYears}
              onChange={(e) => onUpdate({ termYears: parseFloat(e.target.value) || 0 })}
            />
          </div>
          <div>
            <Label htmlFor="discountRate">Discount Rate (%)</Label>
            <PercentageInput
              id="discountRate"
              value={nerData.discountRate}
              onChange={(value) => onUpdate({ discountRate: value })}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

