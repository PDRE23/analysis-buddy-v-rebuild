import type { MonthlyCashflowLine, MonthlyEconomics } from "./scenarioEconomics";

export type ScenarioDriver = {
  label: string;
  key: string;
  delta: number;
  note?: string;
};

export type ScenarioComparison = {
  baseNpv: number;
  scenarioNpv: number;
  npvDelta: number;
  baseTotalCashflow: number;
  scenarioTotalCashflow: number;
  totalCashflowDelta: number;
  topDrivers: ScenarioDriver[];
};

const DRIVER_BUCKETS: { label: string; key: string; extract: (m: MonthlyCashflowLine) => number }[] = [
  { label: "Base Rent", key: "base_rent", extract: (m) => m.base_rent },
  { label: "Free Rent / Abatement", key: "abatement_credit", extract: (m) => m.abatement_credit },
  { label: "Operating", key: "operating", extract: (m) => m.operating },
  { label: "Parking", key: "parking", extract: (m) => m.parking },
  { label: "Amortized", key: "amortized_costs", extract: (m) => m.amortized_costs },
  {
    label: "One-time Costs",
    key: "one_time_costs",
    extract: (m) => m.ti_shortfall + m.transaction_costs,
  },
  { label: "Other Recurring", key: "other_recurring", extract: (m) => m.other_recurring },
];

function sumField(cashflow: MonthlyCashflowLine[], extract: (m: MonthlyCashflowLine) => number): number {
  let total = 0;
  for (const m of cashflow) total += extract(m);
  return total;
}

export function computeScenarioDrivers(
  baseCashflow: MonthlyCashflowLine[],
  scenarioCashflow: MonthlyCashflowLine[],
  topN = 3
): ScenarioDriver[] {
  const drivers: ScenarioDriver[] = [];

  for (const bucket of DRIVER_BUCKETS) {
    const baseSum = sumField(baseCashflow, bucket.extract);
    const scenarioSum = sumField(scenarioCashflow, bucket.extract);
    const delta = scenarioSum - baseSum;
    if (Math.abs(delta) < 0.01) continue;
    drivers.push({
      label: bucket.label,
      key: bucket.key,
      delta,
    });
  }

  drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return drivers.slice(0, topN);
}

export function compareScenarios(
  base: MonthlyEconomics,
  scenario: MonthlyEconomics,
  topN = 3
): ScenarioComparison {
  const baseTotalCashflow = base.monthlyCashflow.reduce((s, m) => s + m.net_cash_flow, 0);
  const scenarioTotalCashflow = scenario.monthlyCashflow.reduce((s, m) => s + m.net_cash_flow, 0);
  const topDrivers = computeScenarioDrivers(base.monthlyCashflow, scenario.monthlyCashflow, topN);

  return {
    baseNpv: base.npv,
    scenarioNpv: scenario.npv,
    npvDelta: scenario.npv - base.npv,
    baseTotalCashflow,
    scenarioTotalCashflow,
    totalCashflowDelta: scenarioTotalCashflow - baseTotalCashflow,
    topDrivers,
  };
}
