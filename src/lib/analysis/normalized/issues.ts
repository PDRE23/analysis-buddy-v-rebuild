import type { NormalizationIssue } from "./types";

export function assertNoBlockingIssues(issues: NormalizationIssue[]): void {
  const blocking = issues.filter((issue) => issue.severity === "error");
  if (blocking.length === 0) return;

  const details = blocking
    .map((issue) => {
      const field = issue.field ? ` (${issue.field})` : "";
      return `${issue.code}${field}: ${issue.message}`;
    })
    .join("; ");

  throw new Error(`Blocking normalization issues: ${details}`);
}
