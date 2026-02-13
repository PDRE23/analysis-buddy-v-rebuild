import type { AnalysisMeta } from "@/types";
import { normalizeAnalysis } from "@/lib/analysis/normalize/normalizeAnalysis";
import { normalizeOpExEscalations } from "@/lib/analysis/normalize/normalizeEscalations";
import { normalizeRentEscalations } from "@/lib/analysis/normalize/normalizeEscalations";
import { calculateLeaseTermParts } from "@/lib/leaseTermCalculations";
import { getDerivedRentStartDate } from "@/lib/utils";
import { parseDateOnly } from "@/lib/dateOnly";

function buildBaseMeta(): AnalysisMeta {
  return {
    id: "test-id",
    name: "Test Analysis",
    status: "Draft",
    tenant_name: "Test Tenant",
    market: "Test Market",
    rsf: 10000,
    lease_type: "FS",
    key_dates: {
      commencement: "2024-01-01",
      expiration: "2024-12-31",
    },
    operating: {
      escalation_method: "fixed",
      escalation_value: 0.03,
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

function calculateLeaseTermFromDatesExpected(
  commencement: string,
  expiration: string
): { years: number; months: number } | null {
  if (!commencement || !expiration) return null;
  const start = parseDateOnly(commencement);
  const end = parseDateOnly(expiration);
  if (!start || !end) return null;

  let years = end.getFullYear() - start.getFullYear();
  let months = end.getMonth() - start.getMonth();

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  if (end.getDate() === new Date(end.getFullYear(), end.getMonth() + 1, 0).getDate()) {
    months += 1;
    if (months >= 12) {
      years += 1;
      months -= 12;
    }
  }

  return { years, months };
}

function resolveFixedRentEscalation(meta: AnalysisMeta): number {
  return (
    meta.rent_escalation?.fixed_escalation_percentage ??
    meta.rent_schedule[0]?.escalation_percentage ??
    0
  );
}

describe("normalizeAnalysis rent_start derivation", () => {
  it("matches derived rent_start with no abatement", () => {
    const meta = buildBaseMeta();
    meta.concessions = {
      ...meta.concessions,
      abatement_free_rent_months: 0,
    };
    meta.key_dates = {
      ...meta.key_dates,
      rent_start: undefined,
    };

    const { normalized } = normalizeAnalysis(meta);
    expect(normalized.dates.rent_start).toBe(getDerivedRentStartDate(meta));
    expect(normalized.dates.rent_start).toBe("2024-01-01");
  });

  it("matches derived rent_start with at-commencement abatement", () => {
    const meta = buildBaseMeta();
    meta.concessions = {
      ...meta.concessions,
      abatement_free_rent_months: 2,
    };
    meta.key_dates = {
      ...meta.key_dates,
      rent_start: undefined,
    };

    const { normalized } = normalizeAnalysis(meta);
    expect(normalized.dates.rent_start).toBe(getDerivedRentStartDate(meta));
    expect(normalized.dates.rent_start).toBe("2024-03-01");
  });

  it("does not change rent_start when include_abatement_in_term toggles", () => {
    const metaOn = buildBaseMeta();
    metaOn.concessions = {
      ...metaOn.concessions,
      abatement_free_rent_months: 3,
    };
    metaOn.lease_term = {
      years: 1,
      months: 0,
      include_abatement_in_term: true,
    };

    const metaOff = {
      ...metaOn,
      lease_term: {
        years: 1,
        months: 0,
        include_abatement_in_term: false,
      },
    };

    expect(normalizeAnalysis(metaOn).normalized.dates.rent_start).toBe(getDerivedRentStartDate(metaOn));
    expect(normalizeAnalysis(metaOff).normalized.dates.rent_start).toBe(getDerivedRentStartDate(metaOff));
    expect(normalizeAnalysis(metaOn).normalized.dates.rent_start).toBe(
      normalizeAnalysis(metaOff).normalized.dates.rent_start
    );
  });
});

describe("normalizeAnalysis lease term resolution", () => {
  it("resolves from lease_term", () => {
    const meta = buildBaseMeta();
    meta.concessions = {
      ...meta.concessions,
      abatement_free_rent_months: 3,
    };
    meta.lease_term = {
      years: 1,
      months: 6,
      include_abatement_in_term: true,
    };

    const expected = calculateLeaseTermParts(meta);
    const { normalized } = normalizeAnalysis(meta);
    expect(expected).not.toBeNull();
    if (expected) {
      const expectedTotal = expected.years * 12 + expected.months;
      expect(normalized.dates.term_years).toBe(expected.years);
      expect(normalized.dates.term_months_remainder).toBe(expected.months);
      expect(normalized.dates.term_months_total).toBe(expectedTotal);
    }
  });

  it("resolves from commencement and expiration when lease_term is missing", () => {
    const meta = buildBaseMeta();
    meta.key_dates = {
      commencement: "2024-01-01",
      expiration: "2025-12-31",
    };
    meta.lease_term = undefined;

    const expected = calculateLeaseTermFromDatesExpected(
      meta.key_dates.commencement,
      meta.key_dates.expiration
    );
    const { normalized } = normalizeAnalysis(meta);
    expect(expected).not.toBeNull();
    if (expected) {
      const expectedTotal = expected.years * 12 + expected.months;
      expect(normalized.dates.term_years).toBe(expected.years);
      expect(normalized.dates.term_months_remainder).toBe(expected.months);
      expect(normalized.dates.term_months_total).toBe(expectedTotal);
    }
  });
});

describe("normalize escalation periods", () => {
  it("normalizes fixed rent and op-ex escalation using fallback rules", () => {
    const meta = buildBaseMeta();
    meta.rent_escalation = {
      escalation_type: "fixed",
      fixed_escalation_percentage: 0.02,
    };
    meta.rent_schedule = [
      {
        period_start: "2024-01-01",
        period_end: "2024-12-31",
        rent_psf: 30,
        escalation_percentage: 0.05,
      },
    ];
    meta.operating = {
      ...meta.operating,
      escalation_type: "fixed",
      escalation_value: 0.04,
    };

    const rentPeriods = normalizeRentEscalations(meta);
    const opExPeriods = normalizeOpExEscalations(meta);
    expect(rentPeriods).toHaveLength(1);
    expect(opExPeriods).toHaveLength(1);
    expect(rentPeriods[0].escalation_percentage).toBe(resolveFixedRentEscalation(meta));
    expect(rentPeriods[0].period_start).toBe(meta.key_dates.commencement);
    expect(rentPeriods[0].period_end).toBe(meta.key_dates.expiration);
    expect(opExPeriods[0].escalation_percentage).toBe(meta.operating.escalation_value);
  });

  it("passes through custom escalation periods", () => {
    const meta = buildBaseMeta();
    meta.rent_escalation = {
      escalation_type: "custom",
      escalation_periods: [
        {
          period_start: "2024-01-01",
          period_end: "2024-12-31",
          escalation_percentage: 0.03,
        },
        {
          period_start: "2025-01-01",
          period_end: "2025-12-31",
          escalation_percentage: 0.02,
        },
      ],
    };
    meta.operating = {
      ...meta.operating,
      escalation_type: "custom",
      escalation_periods: [
        {
          period_start: "2024-01-01",
          period_end: "2024-12-31",
          escalation_percentage: 0.01,
        },
      ],
    };

    expect(normalizeRentEscalations(meta)).toEqual(meta.rent_escalation.escalation_periods);
    expect(normalizeOpExEscalations(meta)).toEqual(meta.operating.escalation_periods);
  });
});
