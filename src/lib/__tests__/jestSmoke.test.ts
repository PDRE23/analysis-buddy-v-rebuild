import type { AnalysisMeta } from "@/types";
import { fmtMoney } from "@/lib/calculations";

describe("jest smoke", () => {
  it("loads TS/ESM modules with path aliases", () => {
    const meta: AnalysisMeta = {
      id: "smoke",
      name: "Smoke",
      status: "Draft",
      tenant_name: "Tenant",
      market: "Market",
      rsf: 1000,
      lease_type: "FS",
      key_dates: { commencement: "2024-01-01", expiration: "2024-12-31" },
      operating: { escalation_method: "fixed", escalation_value: 0 },
      rent_schedule: [{ period_start: "2024-01-01", period_end: "2024-12-31", rent_psf: 30 }],
      concessions: { abatement_type: "at_commencement", abatement_free_rent_months: 0, abatement_applies_to: "base_only" },
      options: [],
      cashflow_settings: { discount_rate: 0.08, granularity: "annual" },
      proposals: [],
    };

    expect(meta.lease_type).toBe("FS");
    expect(fmtMoney(1000)).toBe("$1,000");
  });
});
