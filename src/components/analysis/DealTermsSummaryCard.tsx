"use client";

import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AnalysisMeta } from "@/types";

interface DealTermsSummaryCardProps {
  meta: AnalysisMeta;
}

export function DealTermsSummaryCard({ meta }: DealTermsSummaryCardProps) {
  // Calculate lease term
  const leaseTermDisplay = React.useMemo(() => {
    if (!meta.key_dates.commencement || !meta.key_dates.expiration) {
      return "Not set";
    }
    const commencement = new Date(meta.key_dates.commencement);
    const expiration = new Date(meta.key_dates.expiration);
    if (isNaN(commencement.getTime()) || isNaN(expiration.getTime()) || expiration <= commencement) {
      return "Not set";
    }
    const years = (expiration.getTime() - commencement.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const months = Math.round(years * 12);
    const yearPart = Math.floor(years);
    const monthPart = months % 12;
    
    if (yearPart > 0 && monthPart > 0) {
      return `${yearPart} year${yearPart !== 1 ? 's' : ''}, ${monthPart} month${monthPart !== 1 ? 's' : ''}`;
    } else if (yearPart > 0) {
      return `${yearPart} year${yearPart !== 1 ? 's' : ''}`;
    } else {
      return `${monthPart} month${monthPart !== 1 ? 's' : ''}`;
    }
  }, [meta.key_dates]);

  // Calculate base rent
  const baseRentPSF = meta.rent_schedule.length > 0 ? meta.rent_schedule[0].rent_psf : 0;

  // Calculate free rent
  const freeRentDisplay = React.useMemo(() => {
    if (meta.concessions?.abatement_type === "at_commencement") {
      const freeMonths = meta.concessions.abatement_free_rent_months || 0;
      if (freeMonths > 0) {
        const freeRentValue = (freeMonths / 12) * (baseRentPSF * meta.rsf);
        return `${freeMonths} month${freeMonths !== 1 ? 's' : ''} (${freeRentValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`;
      }
      return "None";
    } else if (meta.concessions?.abatement_type === "custom" && meta.concessions.abatement_periods) {
      let totalMonths = 0;
      let totalValue = 0;
      for (const period of meta.concessions.abatement_periods) {
        totalMonths += period.free_rent_months;
        let rentRate = 0;
        for (const r of meta.rent_schedule) {
          const rStart = new Date(r.period_start);
          const rEnd = new Date(r.period_end);
          const periodStart = new Date(period.period_start);
          if (periodStart >= rStart && periodStart <= rEnd) {
            rentRate = r.rent_psf;
            break;
          }
        }
        totalValue += (period.free_rent_months / 12) * (rentRate * meta.rsf);
      }
      if (totalMonths > 0) {
        return `${totalMonths} month${totalMonths !== 1 ? 's' : ''} (${totalValue.toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`;
      }
      return "None";
    }
    return "None";
  }, [meta.concessions, meta.rent_schedule, meta.rsf, baseRentPSF]);

  // Calculate TI
  const tiDisplay = meta.concessions?.ti_allowance_psf 
    ? `$${meta.concessions.ti_allowance_psf.toFixed(2)}/SF (${(meta.concessions.ti_allowance_psf * meta.rsf).toLocaleString(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })})`
    : "None";

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Deal Terms Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <div>
            <Label className="text-xs text-muted-foreground">Rentable Size</Label>
            <div className="text-sm font-semibold">{meta.rsf.toLocaleString()} RSF</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Commencement</Label>
            <div className="text-sm font-semibold">
              {meta.key_dates.commencement 
                ? new Date(meta.key_dates.commencement).toLocaleDateString()
                : "Not set"}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Expiration</Label>
            <div className="text-sm font-semibold">
              {meta.key_dates.expiration 
                ? new Date(meta.key_dates.expiration).toLocaleDateString()
                : "Not set"}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Lease Type</Label>
            <div className="text-sm font-semibold">
              {meta.lease_type === 'FS' ? 'Full Service Gross' : 'Triple Net'}
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Base Rent</Label>
            <div className="text-sm font-semibold">
              ${baseRentPSF.toFixed(2)}/SF/yr
            </div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Lease Term</Label>
            <div className="text-sm font-semibold">{leaseTermDisplay}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Tenant Improvements</Label>
            <div className="text-sm font-semibold">{tiDisplay}</div>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Free Rent</Label>
            <div className="text-sm font-semibold">{freeRentDisplay}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

