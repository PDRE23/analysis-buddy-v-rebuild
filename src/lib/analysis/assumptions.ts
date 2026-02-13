export type AnalysisAssumptions = {
  discounting: {
    compounding: "monthly";
    basis: "period_index";
    day_count_basis?: "30/360" | "actual/365";
  };
  rounding: "none" | "cents";
};
