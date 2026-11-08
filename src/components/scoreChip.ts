import type { Finding, RiskScore } from "@/lib/types";

export type ScoreChip = { label: string; caution: boolean };

export const LOW_REVIEW_LABEL = "Low, review the findings below";

// UX-1: the green "No risk indicators found" chip only for a score of 0 with no finding and no
// warning. A low band with any finding, or a warning only (an info "-W" finding), is not "all
// clear": it gets the amber caution chip. Medium and high keep their band label. UI only: the
// score, band and findings come from the server unchanged.
export function scoreChip(risk: RiskScore, findings: Finding[]): ScoreChip {
  if (risk.band === "low" && findings.length > 0) return { label: LOW_REVIEW_LABEL, caution: true };
  return { label: risk.label, caution: false };
}
