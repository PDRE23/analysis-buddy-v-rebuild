/**
 * Cashflow calculation engine
 * Main function: buildAnnualCashflow()
 * 
 * This function builds annual cashflow lines from an AnalysisMeta object.
 * All business logic preserved exactly as-is from v1.
 */

import type { AnalysisMeta, AnnualLine, AnnualLineNumericKey } from "@/types";

/** Apply CPI or fixed escalation to a base value for N periods. */
function escalate(value: number, n: number, method: "fixed" | "cpi" = "fixed", rate = 0, cap?: number): number {
  if (n <= 0) return value;
  const effectiveRate = cap !== undefined ? Math.min(rate, cap) : rate;
  const r = Math.max(0, effectiveRate);
  return value * Math.pow(1 + r, n); // CPI treated as provided rate
}

/** Return number of months overlapping [start, end) within [a,b). */
function overlappingMonths(start: Date, end: Date, a: Date, b: Date): number {
  const s = new Date(Math.max(start.getTime(), a.getTime()));
  const e = new Date(Math.min(end.getTime(), b.getTime()));
  if (e <= s) return 0;
  const months = (e.getFullYear() - s.getFullYear()) * 12 + (e.getMonth() - s.getMonth());
  return Math.max(0, months + 1); // count partial months
}

export function buildAnnualCashflow(a: AnalysisMeta): AnnualLine[] {
  const commencement = new Date(a.key_dates.commencement);
  const expiration = new Date(a.key_dates.expiration);

  const years: number[] = [];
  for (let y = commencement.getFullYear(); y <= expiration.getFullYear(); y++) years.push(y);

  const lines: AnnualLine[] = years.map((y) => ({
    year: y,
    base_rent: 0,
    abatement_credit: 0,
    operating: 0,
    parking: 0,
    other_recurring: 0,
    ti_shortfall: 0,
    transaction_costs: 0,
    amortized_costs: 0,
    subtotal: 0,
    net_cash_flow: 0,
  }));

  const rsf = a.rsf;
  const addToYear = (year: number, field: AnnualLineNumericKey, amount: number) => {
    const row = lines.find((r) => r.year === year);
    if (row) row[field] = (row[field] as number) + amount;
  };

  // Base Rent & Abatement
  const escalationType = a.rent_escalation?.escalation_type || "fixed";
  const baseRent = a.rent_schedule.length > 0 ? a.rent_schedule[0].rent_psf : 0;
  
  if (escalationType === "fixed") {
    // Fixed escalation: use fixed_escalation_percentage or fall back to rent_schedule escalation_percentage
    const fixedEscalationRate = a.rent_escalation?.fixed_escalation_percentage ?? 
                                 (a.rent_schedule[0]?.escalation_percentage ?? 0);
    
    for (const y of years) {
      const ys = new Date(`${y}-01-01T00:00:00`);
      const ye = new Date(`${y}-12-31T23:59:59`);
      const commencement = new Date(a.key_dates.commencement);
      const expiration = new Date(a.key_dates.expiration);
      
      const months = overlappingMonths(commencement, expiration, ys, ye);
      if (months === 0) continue;
      
      // Calculate escalated rent for this year
      const yearsSinceCommencement = y - commencement.getFullYear();
      const escalatedRate = baseRent * Math.pow(1 + fixedEscalationRate, yearsSinceCommencement);
      const annualRentForMonths = (escalatedRate * rsf * months) / 12;
      addToYear(y, "base_rent", annualRentForMonths);
    }
  } else if (escalationType === "custom" && a.rent_escalation?.escalation_periods) {
    // Custom escalation: use escalation periods to determine rate for each year
    for (const y of years) {
      const ys = new Date(`${y}-01-01T00:00:00`);
      const ye = new Date(`${y}-12-31T23:59:59`);
      const commencement = new Date(a.key_dates.commencement);
      const expiration = new Date(a.key_dates.expiration);
      
      const months = overlappingMonths(commencement, expiration, ys, ye);
      if (months === 0) continue;
      
      // Find the escalation period that applies to this year
      let escalationRate = 0;
      let yearsSincePeriodStart = 0;
      
      // Sort periods by start date to find the applicable one
      const sortedPeriods = [...a.rent_escalation.escalation_periods].sort((a, b) => 
        new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      );
      
      for (const period of sortedPeriods) {
        const periodStart = new Date(period.period_start);
        const periodEnd = new Date(period.period_end);
        
        if (y >= periodStart.getFullYear() && y <= periodEnd.getFullYear()) {
          escalationRate = period.escalation_percentage;
          yearsSincePeriodStart = y - periodStart.getFullYear();
          break;
        }
      }
      
      // Calculate escalated rent for this year
      const escalatedRate = baseRent * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      const annualRentForMonths = (escalatedRate * rsf * months) / 12;
      addToYear(y, "base_rent", annualRentForMonths);
    }
  } else {
    // Fallback: use old rent_schedule structure for backward compatibility
    for (const r of a.rent_schedule) {
      const ps = new Date(r.period_start);
      const pe = new Date(r.period_end);
      const periodStartYear = ps.getFullYear();
      
      for (const y of years) {
        const ys = new Date(`${y}-01-01T00:00:00`);
        const ye = new Date(`${y}-12-31T23:59:59`);
        const months = overlappingMonths(ps, pe, ys, ye);
        if (months === 0) continue;
        
        // Calculate escalated rent for this year within the period
        const yearsInPeriod = y - periodStartYear;
        const escalationRate = r.escalation_percentage ?? 0;
        const escalatedRate = r.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
        const annualRentForMonths = (escalatedRate * rsf * months) / 12;
        addToYear(y, "base_rent", annualRentForMonths);
      }
    }
  }

  // Operating pass-throughs
  // For FS: use est_op_ex_psf if provided, otherwise use base rent rate for opex analysis
  // For NNN: use est_op_ex_psf
  let baseOp: number;
  if (a.lease_type === "FS" && !a.operating.est_op_ex_psf) {
    // If no opex specified for FS, use first period base rent as opex portion
    const firstPeriod = a.rent_schedule[0];
    baseOp = firstPeriod ? firstPeriod.rent_psf : 0;
  } else {
    baseOp = a.operating.est_op_ex_psf ?? 0;
  }
  
  const opExEscalationType = a.operating.escalation_type || "fixed";
  const method = a.operating.escalation_method ?? "fixed"; // Keep for backward compatibility
  const startYear = new Date(a.key_dates.commencement).getFullYear();

  // Apply Abatement - handle both "at_commencement" and "custom" modes
  const abatementType = a.concessions?.abatement_type || "at_commencement";
  const commencementDate = new Date(a.key_dates.commencement);
  const commencementYear = commencementDate.getFullYear();
  const commencementMonth = commencementDate.getMonth(); // 0-11

  for (const y of years) {
    let escalatedOp: number;
    
    if (opExEscalationType === "fixed") {
      // Fixed escalation: use escalation_value
      const value = a.operating.escalation_value ?? 0;
      const cap = a.operating.escalation_cap;
      const yearsSinceStart = y - startYear;
      escalatedOp = escalate(baseOp, yearsSinceStart, method, value, cap);
    } else if (opExEscalationType === "custom" && a.operating.escalation_periods) {
      // Custom escalation: find the applicable period for this year
      let escalationRate = 0;
      let yearsSincePeriodStart = 0;
      
      // Sort periods by start date to find the applicable one
      const sortedPeriods = [...a.operating.escalation_periods].sort((a, b) => 
        new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
      );
      
      for (const period of sortedPeriods) {
        const periodStart = new Date(period.period_start);
        const periodEnd = new Date(period.period_end);
        
        if (y >= periodStart.getFullYear() && y <= periodEnd.getFullYear()) {
          escalationRate = period.escalation_percentage;
          yearsSincePeriodStart = y - periodStart.getFullYear();
          break;
        }
      }
      
      // Apply escalation with cap if set
      escalatedOp = baseOp * Math.pow(1 + escalationRate, yearsSincePeriodStart);
      if (a.operating.escalation_cap) {
        const maxEscalated = baseOp * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
        escalatedOp = Math.min(escalatedOp, maxEscalated);
      }
    } else {
      // Fallback: use old escalation_method structure
      const value = a.operating.escalation_value ?? 0;
      const cap = a.operating.escalation_cap;
      const yearsSinceStart = y - startYear;
      escalatedOp = escalate(baseOp, yearsSinceStart, method, value, cap);
    }
    
    if (a.lease_type === "FS") {
      const baseYear = a.base_year ?? startYear;
      const baseYearIndex = Math.max(0, y - baseYear);
      // For FS, calculate base year OpEx using the same escalation logic
      let baseYearOp: number;
      if (opExEscalationType === "fixed") {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, baseYearIndex, method, value, cap);
      } else if (opExEscalationType === "custom" && a.operating.escalation_periods) {
        // Find escalation rate at base year
        const sortedPeriods = [...a.operating.escalation_periods].sort((a, b) => 
          new Date(a.period_start).getTime() - new Date(b.period_start).getTime()
        );
        let escalationRate = 0;
        let yearsSincePeriodStart = 0;
        
        for (const period of sortedPeriods) {
          const periodStart = new Date(period.period_start);
          const periodEnd = new Date(period.period_end);
          if (baseYear >= periodStart.getFullYear() && baseYear <= periodEnd.getFullYear()) {
            escalationRate = period.escalation_percentage;
            yearsSincePeriodStart = baseYear - periodStart.getFullYear();
            break;
          }
        }
        baseYearOp = baseOp * Math.pow(1 + escalationRate, yearsSincePeriodStart);
        if (a.operating.escalation_cap) {
          const maxEscalated = baseOp * Math.pow(1 + a.operating.escalation_cap, yearsSincePeriodStart);
          baseYearOp = Math.min(baseYearOp, maxEscalated);
        }
      } else {
        const value = a.operating.escalation_value ?? 0;
        const cap = a.operating.escalation_cap;
        baseYearOp = escalate(baseOp, baseYearIndex, method, value, cap);
      }
      
      // FS passthrough: tenant pays opex increases above base year
      const passthrough = Math.max(0, escalatedOp - baseYearOp) * rsf;
      addToYear(y, "operating", passthrough);
    } else {
      // NNN lease: tenant pays all opex
      const passthrough = escalatedOp * rsf;
      addToYear(y, "operating", passthrough);
    }

    // Apply abatement for this year
    if (abatementType === "at_commencement") {
      // Apply all free rent months at commencement
      const freeMonths = a.concessions?.abatement_free_rent_months ?? 0;
      const abatementAppliesTo = a.concessions?.abatement_applies_to || "base_only";
      
      if (freeMonths > 0 && y === commencementYear) {
        // Find the rent rate at commencement (first period)
        const firstPeriod = a.rent_schedule[0];
        if (firstPeriod) {
          const rentAtCommencement = firstPeriod.rent_psf;
          const monthsInYear = Math.min(freeMonths, 12 - commencementMonth);
          const baseAbateAmt = (rentAtCommencement * rsf * monthsInYear) / 12;
          addToYear(y, "abatement_credit", -baseAbateAmt);
          
          // If abatement applies to base_plus_nnn, also abate operating expenses
          if (abatementAppliesTo === "base_plus_nnn") {
            const opAbateAmt = (baseOp * rsf * monthsInYear) / 12;
            addToYear(y, "abatement_credit", -opAbateAmt);
          }
        }
      }
    } else if (abatementType === "custom" && a.concessions?.abatement_periods) {
      // Apply abatement based on custom periods
      for (const abatementPeriod of a.concessions.abatement_periods) {
        const apStart = new Date(abatementPeriod.period_start);
        const apEnd = new Date(abatementPeriod.period_end);
        const apStartYear = apStart.getFullYear();
        const apEndYear = apEnd.getFullYear();
        
        // Check if this year overlaps with the abatement period
        if (y >= apStartYear && y <= apEndYear) {
          const ys = new Date(`${y}-01-01T00:00:00`);
          const ye = new Date(`${y}-12-31T23:59:59`);
          const overlapStart = apStart > ys ? apStart : ys;
          const overlapEnd = apEnd < ye ? apEnd : ye;
          
          if (overlapStart <= overlapEnd) {
            // Calculate months of overlap
            const overlapMonths = overlappingMonths(overlapStart, overlapEnd, ys, ye);
            const freeMonths = abatementPeriod.free_rent_months;
            
            if (overlapMonths > 0 && freeMonths > 0) {
              // Find the rent rate for this year (from rent schedule)
              let rentRate = 0;
              for (const r of a.rent_schedule) {
                const rStart = new Date(r.period_start);
                const rEnd = new Date(r.period_end);
                if (y >= rStart.getFullYear() && y <= rEnd.getFullYear()) {
                  const yearsInPeriod = y - rStart.getFullYear();
                  const escalationRate = r.escalation_percentage ?? 0;
                  rentRate = r.rent_psf * Math.pow(1 + escalationRate, yearsInPeriod);
                  break;
                }
              }
              
              // Apply abatement for the overlapping months
              const monthsToAbate = Math.min(freeMonths, overlapMonths);
              const baseAbateAmt = (rentRate * rsf * monthsToAbate) / 12;
              addToYear(y, "abatement_credit", -baseAbateAmt);
              
              // If abatement applies to base_plus_nnn, also abate operating expenses
              if (abatementPeriod.abatement_applies_to === "base_plus_nnn") {
                const opAbateAmt = (escalatedOp * rsf * monthsToAbate) / 12;
                addToYear(y, "abatement_credit", -opAbateAmt);
              }
            }
          }
        }
      }
    }
  }

  // Parking costs (annualized)
  if (a.parking?.monthly_rate_per_stall && a.parking.stalls) {
    const pr = a.parking.monthly_rate_per_stall;
    const stalls = a.parking.stalls;
    const pm = a.parking.escalation_method ?? "fixed";
    const pv = a.parking.escalation_value ?? 0;
    for (let i = 0; i < years.length; i++) {
      const y = years[i];
      const escalatedMonthly = escalate(pr, i, pm, pv);
      addToYear(y, "parking", escalatedMonthly * 12 * stalls);
    }
  }

  // TI Shortfall (one-time cost in year 1)
  if (a.concessions.ti_actual_build_cost_psf !== undefined && a.concessions.ti_allowance_psf !== undefined) {
    const shortfall = Math.max(0, (a.concessions.ti_actual_build_cost_psf - (a.concessions.ti_allowance_psf || 0)) * rsf);
    if (shortfall > 0 && lines.length > 0) {
      const firstYearRow = lines.find((r) => r.year === startYear);
      if (firstYearRow) {
        firstYearRow.ti_shortfall = shortfall;
      }
    }
  }

  // Transaction costs (one-time cost in year 1)
  if (a.transaction_costs?.total) {
    const firstYearRow = lines.find((r) => r.year === startYear);
    if (firstYearRow) {
      firstYearRow.transaction_costs = a.transaction_costs.total;
    }
  }

  // Amortized costs (if financing settings enabled)
  if (a.financing) {
    const termYears = (new Date(a.key_dates.expiration).getTime() - new Date(a.key_dates.commencement).getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    
    // Calculate amortized amounts per year
    const amortizedAmounts: number[] = [];
    let totalToAmortize = 0;
    
    if (a.financing.amortize_ti && a.concessions.ti_allowance_psf) {
      totalToAmortize += (a.concessions.ti_allowance_psf * rsf);
    }
    if (a.financing.amortize_free_rent) {
      // Calculate total free rent value from abatement
      let freeRentValue = 0;
      if (a.concessions?.abatement_type === "at_commencement") {
        const freeMonths = a.concessions.abatement_free_rent_months || 0;
        if (freeMonths > 0 && a.rent_schedule.length > 0) {
          const firstPeriod = a.rent_schedule[0];
          freeRentValue = (freeMonths / 12) * (firstPeriod.rent_psf * rsf);
        }
      } else if (a.concessions?.abatement_type === "custom" && a.concessions.abatement_periods) {
        // Sum up all free rent from custom periods
        for (const period of a.concessions.abatement_periods) {
          // Find rent rate for the period
          let rentRate = 0;
          for (const r of a.rent_schedule) {
            const rStart = new Date(r.period_start);
            const rEnd = new Date(r.period_end);
            const periodStart = new Date(period.period_start);
            if (periodStart >= rStart && periodStart <= rEnd) {
              rentRate = r.rent_psf;
              break;
            }
          }
          freeRentValue += (period.free_rent_months / 12) * (rentRate * rsf);
        }
      }
      totalToAmortize += freeRentValue;
    }
    if (a.financing.amortize_transaction_costs && a.transaction_costs?.total) {
      totalToAmortize += a.transaction_costs.total;
    }
    
    if (totalToAmortize > 0 && termYears > 0) {
      if (a.financing.amortization_method === "present_value" && a.financing.interest_rate) {
        // PV-based amortization
        const rate = a.financing.interest_rate;
        const annualPayment = totalToAmortize * (rate / (1 - Math.pow(1 + rate, -termYears)));
        for (let i = 0; i < Math.ceil(termYears); i++) {
          amortizedAmounts.push(annualPayment);
        }
      } else {
        // Straight-line amortization
        const annualAmount = totalToAmortize / termYears;
        for (let i = 0; i < Math.ceil(termYears); i++) {
          amortizedAmounts.push(annualAmount);
        }
      }
      
      // Apply amortized amounts to cashflow
      for (let i = 0; i < Math.min(amortizedAmounts.length, lines.length); i++) {
        const yearIndex = startYear + i;
        const row = lines.find((r) => r.year === yearIndex);
        if (row) {
          row.amortized_costs = amortizedAmounts[i];
        }
      }
    }
  }

  for (const row of lines) {
    row.subtotal = row.base_rent + row.operating + row.parking + row.other_recurring;
    row.net_cash_flow = row.subtotal + row.abatement_credit + (row.ti_shortfall || 0) + (row.transaction_costs || 0) + (row.amortized_costs || 0);
  }

  return lines;
}

