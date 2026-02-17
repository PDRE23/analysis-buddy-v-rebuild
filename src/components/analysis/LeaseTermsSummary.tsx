import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import type { AnalysisMeta } from "@/types";
import { formatDateOnlyDisplay, parseDateOnly } from "@/lib/dateOnly";
import { calculateLeaseTermParts } from "@/lib/leaseTermCalculations";

const fmtMoney = (v: number) =>
  v.toLocaleString(undefined, { style: "currency", currency: "USD", maximumFractionDigits: 0 });

function Field({ label, value }: { label: string; value: string | React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div className="text-sm font-semibold">{value || "—"}</div>
    </div>
  );
}

export const LeaseTermsSummary = React.memo(function LeaseTermsSummary({ meta }: { meta: AnalysisMeta }) {
  const termParts = React.useMemo(() => calculateLeaseTermParts(meta), [meta]);
  const termDisplay = React.useMemo(() => {
    if (!termParts) return "—";
    const { years, months } = termParts;
    const totalMonths = years * 12 + months;
    const parts: string[] = [];
    if (years > 0) parts.push(`${years} yr${years !== 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} mo${months !== 1 ? "s" : ""}`);
    return `${parts.join(", ")} (${totalMonths} months)`;
  }, [termParts]);

  const startingRentPSF = meta.rent_schedule.length > 0 ? meta.rent_schedule[0].rent_psf : 0;

  const escalationSummary = React.useMemo(() => {
    const re = meta.rent_escalation;
    if (!re) return "—";
    if (re.escalation_type === "custom" && re.escalation_periods?.length) {
      return `Custom (${re.escalation_periods.length} period${re.escalation_periods.length !== 1 ? "s" : ""})`;
    }
    if (re.escalation_mode === "amount" && re.fixed_escalation_amount != null) {
      return `$${re.fixed_escalation_amount.toFixed(2)}/SF/yr fixed`;
    }
    if (re.fixed_escalation_percentage != null) {
      return `${(re.fixed_escalation_percentage * 100).toFixed(1)}% annual`;
    }
    return "—";
  }, [meta.rent_escalation]);

  const abatementSummary = React.useMemo(() => {
    const c = meta.concessions;
    if (c.abatement_type === "at_commencement") {
      const months = c.abatement_free_rent_months || 0;
      if (months <= 0) return "None";
      const appliesTo = c.abatement_applies_to === "base_plus_nnn" ? "base + NNN" : "base rent only";
      return `${months} month${months !== 1 ? "s" : ""} at commencement (${appliesTo})`;
    }
    if (c.abatement_type === "custom" && c.abatement_periods?.length) {
      const totalMonths = c.abatement_periods.reduce((s, p) => s + p.free_rent_months, 0);
      return `Custom — ${totalMonths} month${totalMonths !== 1 ? "s" : ""} across ${c.abatement_periods.length} period${c.abatement_periods.length !== 1 ? "s" : ""}`;
    }
    return "None";
  }, [meta.concessions]);

  const tiPSF = meta.concessions.ti_allowance_psf || 0;
  const tiTotal = tiPSF * meta.rsf;
  const tiShortfall = React.useMemo(() => {
    const actual = meta.concessions.ti_actual_build_cost_psf || 0;
    if (actual <= tiPSF || actual === 0) return 0;
    return (actual - tiPSF) * meta.rsf;
  }, [meta.concessions, meta.rsf, tiPSF]);

  const txTotal = meta.transaction_costs?.total || 0;

  const parkingSummary = React.useMemo(() => {
    const p = meta.parking;
    if (!p || !p.stalls) return null;
    const rate = p.monthly_rate_per_stall || 0;
    let esc = "";
    if (p.escalation_value && p.escalation_value > 0) {
      esc = ` — ${(p.escalation_value * 100).toFixed(1)}% annual escalation`;
    }
    return `${p.stalls} stall${p.stalls !== 1 ? "s" : ""} @ ${fmtMoney(rate)}/mo${esc}`;
  }, [meta.parking]);

  const discountRate = meta.cashflow_settings?.discount_rate || 0.08;

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-3">
        <CardTitle>Lease Terms Summary</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-3">
          <Field label="RSF" value={`${meta.rsf.toLocaleString()} SF`} />
          <Field label="Commencement" value={formatDateOnlyDisplay(meta.key_dates.commencement)} />
          <Field label="Expiration" value={formatDateOnlyDisplay(meta.key_dates.expiration)} />
          <Field label="Term" value={termDisplay} />
          <Field label="Lease Type" value={meta.lease_type === "FS" ? "Full Service Gross" : "Triple Net (NNN)"} />
          {meta.lease_type === "FS" && meta.base_year ? (
            <Field label="Base Year" value={String(meta.base_year)} />
          ) : null}
          <Field label="Starting Rent" value={startingRentPSF > 0 ? `$${startingRentPSF.toFixed(2)}/SF/yr` : "—"} />
          <Field label="Rent Escalation" value={escalationSummary} />
          <Field label="Abatement" value={abatementSummary} />
          <Field label="TI Allowance" value={tiPSF > 0 ? `$${tiPSF.toFixed(2)}/SF (${fmtMoney(tiTotal)})` : "None"} />
          {tiShortfall > 0 && (
            <Field label="TI Shortfall" value={fmtMoney(tiShortfall)} />
          )}
          {txTotal > 0 && (
            <Field label="Transaction Costs" value={fmtMoney(txTotal)} />
          )}
          {parkingSummary && (
            <Field label="Parking" value={parkingSummary} />
          )}
          <Field label="Discount Rate" value={`${(discountRate * 100).toFixed(1)}%`} />
        </div>
      </CardContent>
    </Card>
  );
});
