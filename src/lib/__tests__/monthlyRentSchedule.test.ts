import type { AnalysisMeta } from "@/types";
import { buildMonthlyRentSchedule, normalizeAnalysis } from "@/lib/analysis";

function buildBaseMeta(): AnalysisMeta {
  return {
    id: "monthly-test",
    name: "Monthly Test",
    status: "Draft",
    tenant_name: "Tenant",
    market: "Market",
    rsf: 1200,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2024-12-31",
    },
    operating: {
      escalation_method: "fixed",
      escalation_value: 0,
    },
    rent_schedule: [
      {
        period_start: "2024-01-01",
        period_end: "2024-12-31",
        rent_psf: 30,
      },
    ],
    concessions: {
      abatement_type: "at_commencement",
      abatement_free_rent_months: 0,
      abatement_applies_to: "base_only",
    },
    options: [],
    cashflow_settings: {
      discount_rate: 0.08,
      granularity: "annual",
    },
    proposals: [],
  };
}

describe("buildMonthlyRentSchedule", () => {
  it("handles no abatement vs at-commencement abatement", () => {
    const baseMeta = buildBaseMeta();
    const { normalized: noAbatement } = normalizeAnalysis(baseMeta);
    const baseMonthly = (30 * baseMeta.rsf) / 12;

    const scheduleNoAbatement = buildMonthlyRentSchedule({
      normalized: noAbatement,
      rsf: baseMeta.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    expect(scheduleNoAbatement.summary.free_rent_value).toBe(0);
    expect(scheduleNoAbatement.summary.total_contract_rent).toBe(
      scheduleNoAbatement.summary.total_net_rent
    );

    const abatementMeta = buildBaseMeta();
    abatementMeta.concessions = {
      ...abatementMeta.concessions,
      abatement_free_rent_months: 2,
    };
    const { normalized: withAbatement } = normalizeAnalysis(abatementMeta);

    const scheduleWithAbatement = buildMonthlyRentSchedule({
      normalized: withAbatement,
      rsf: abatementMeta.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    expect(scheduleWithAbatement.months[0].net_rent_due).toBe(0);
    expect(scheduleWithAbatement.months[1].net_rent_due).toBe(0);
    expect(scheduleWithAbatement.months[2].net_rent_due).toBeCloseTo(baseMonthly);
    expect(scheduleWithAbatement.summary.free_rent_value).toBeCloseTo(baseMonthly * 2);
  });

  it("respects include_abatement_in_term toggles", () => {
    const withAbatement = buildBaseMeta();
    withAbatement.lease_term = { years: 1, months: 0, include_abatement_in_term: true };
    withAbatement.concessions = {
      ...withAbatement.concessions,
      abatement_free_rent_months: 2,
    };

    const withoutAbatement = buildBaseMeta();
    withoutAbatement.lease_term = { years: 1, months: 0, include_abatement_in_term: false };
    withoutAbatement.concessions = {
      ...withoutAbatement.concessions,
      abatement_free_rent_months: 2,
    };

    const scheduleWith = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(withAbatement).normalized,
      rsf: withAbatement.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    const scheduleWithout = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(withoutAbatement).normalized,
      rsf: withoutAbatement.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    expect(scheduleWith.months).toHaveLength(14);
    expect(scheduleWithout.months).toHaveLength(12);
  });

  it("applies fixed annual percent escalation", () => {
    const meta = buildBaseMeta();
    meta.key_dates.expiration = "2025-12-31";

    const schedule = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(meta).normalized,
      rsf: meta.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0.03 },
      },
    });

    const baseMonthly = (30 * meta.rsf) / 12;
    expect(schedule.months).toHaveLength(24);
    expect(schedule.months[0].contractual_base_rent).toBeCloseTo(baseMonthly);
    expect(schedule.months[12].contractual_base_rent).toBeCloseTo(baseMonthly * 1.03);
  });

  it("uses custom escalation periods", () => {
    const meta = buildBaseMeta();
    meta.key_dates.expiration = "2025-12-31";
    meta.rent_escalation = {
      escalation_type: "custom",
      escalation_periods: [
        {
          period_start: "2024-01-01",
          period_end: "2024-12-31",
          escalation_percentage: 0.02,
        },
        {
          period_start: "2025-01-01",
          period_end: "2025-12-31",
          escalation_percentage: 0.04,
        },
      ],
    };

    const schedule = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(meta).normalized,
      rsf: meta.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "custom" },
      },
    });

    const baseMonthly = (30 * meta.rsf) / 12;
    expect(schedule.months[12].contractual_base_rent).toBeCloseTo(baseMonthly * 1.02);
  });

  it("documents stub month behavior via end date clamp", () => {
    const meta = buildBaseMeta();
    meta.key_dates.commencement = "2024-01-15";
    meta.key_dates.expiration = "2024-02-13";

    const schedule = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(meta).normalized,
      rsf: meta.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    expect(schedule.months).toHaveLength(1);
    expect(schedule.months[0].start_date).toBe("2024-01-15");
    expect(schedule.months[0].end_date).toBe("2024-02-13");
  });

  it("prefers lease_term-derived term months when provided", () => {
    const withLeaseTerm = buildBaseMeta();
    withLeaseTerm.key_dates.expiration = "2025-12-31";
    withLeaseTerm.lease_term = { years: 1, months: 0, include_abatement_in_term: false };

    const withoutLeaseTerm = buildBaseMeta();
    withoutLeaseTerm.key_dates.expiration = "2025-12-31";
    withoutLeaseTerm.lease_term = undefined;

    const scheduleWith = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(withLeaseTerm).normalized,
      rsf: withLeaseTerm.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    const scheduleWithout = buildMonthlyRentSchedule({
      normalized: normalizeAnalysis(withoutLeaseTerm).normalized,
      rsf: withoutLeaseTerm.rsf,
      rent: {
        base_rent_psf: 30,
        escalation: { type: "fixed_percent", fixed_percent: 0 },
      },
    });

    expect(scheduleWith.months).toHaveLength(12);
    expect(scheduleWithout.months).toHaveLength(24);
  });
});
