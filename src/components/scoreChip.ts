import type { LanguageNotice } from "@/lib/textScript";
import type { Finding, RiskScore } from "@/lib/types";

// "band": the band's own label and colour. "caution": amber (UX-1). "neutral": not green (LANG-2).
export type ScoreChip = { label: string; tone: "band" | "caution" | "neutral" };

export const LOW_REVIEW_LABEL = "Low, review the findings below";
export const NOT_CHECKED_LABEL = "Not checked: most of the text is not in English";
export const PART_CHECKED_LABEL = "Score 0 on the English part. Part of the text was not checked.";
const PART_CHECKED_SUMMARY = "on the English part. Part of the text was not checked.";

// LANG-2 and LANG-3: with a language notice and no finding, the Risk aggregator row says what the
// chip says instead of the server's "No risk indicators found". null: show the server's summary.
export function qualifiedSummary(
  risk: RiskScore,
  findings: Finding[],
  language: LanguageNotice | null,
): string | null {
  if (findings.length > 0 || language === null) return null;
  return language === "most"
    ? `Score ${risk.score} of 100. ${NOT_CHECKED_LABEL}.`
    : `Score ${risk.score} of 100 ${PART_CHECKED_SUMMARY}`;
}

// UX-1: the green "No risk indicators found" chip only for a score of 0 with no finding and no
// warning. A low band with any finding, or a warning only (an info "-W" finding), is not "all
// clear": it gets the amber caution chip. Medium and high keep their band label.
// LANG-2: when most of the checked text is not in English (tier 1) and nothing matched, the rules
// could not read the text, so the green chip becomes a neutral "not checked" one. A finding still
// shows its chip. LANG-3: tier 2 with nothing matched gets the same neutral chip, worded for the
// English part only. With no notice the chip is unchanged.
// UI only: the score, band and findings come from the server unchanged.
export function scoreChip(risk: RiskScore, findings: Finding[], language: LanguageNotice | null = null): ScoreChip {
  if (risk.band === "low" && findings.length > 0) return { label: LOW_REVIEW_LABEL, tone: "caution" };
  if (language === "most" && findings.length === 0) return { label: NOT_CHECKED_LABEL, tone: "neutral" };
  if (language === "part" && findings.length === 0) return { label: PART_CHECKED_LABEL, tone: "neutral" };
  return { label: risk.label, tone: "band" };
}
