import type { Finding, RiskBand, RiskScore, Severity } from "./types";

export const SEVERITY_WEIGHTS: Record<Severity, number> = {
  high: 40,
  medium: 20,
  low: 10,
  info: 0,
};

const MAX_SCORE = 100;
const HIGH_BAND_MIN = 60;
const MEDIUM_BAND_MIN = 30;

const BAND_LABELS: Record<RiskBand, string> = {
  high: "High risk indicators",
  medium: "Medium risk indicators",
  low: "Low risk indicators",
};

// Deterministic: the score depends only on finding severities, never on an LLM.
// Any high-severity finding puts the offer in the high band on its own.
export function scoreFindings(findings: Finding[]): RiskScore {
  const total = findings.reduce((sum, f) => sum + SEVERITY_WEIGHTS[f.severity], 0);
  const floor = findings.some((f) => f.severity === "high") ? HIGH_BAND_MIN : 0;
  const score = Math.min(Math.max(total, floor), MAX_SCORE);
  const band: RiskBand =
    score >= HIGH_BAND_MIN ? "high" : score >= MEDIUM_BAND_MIN ? "medium" : "low";
  const label = score === 0 ? "No risk indicators found" : BAND_LABELS[band];
  return { score, band, label };
}
