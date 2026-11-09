import { noticeForCoverage, type Coverage } from "@/lib/coverage";
import { showOfferNotice, type OfferSignal } from "@/lib/offerLikeness";
import type { LanguageNotice } from "@/lib/textScript";
import type { Finding, RiskBand, RiskScore } from "@/lib/types";

// "band": the band's own label and colour. "caution": amber (UX-1). "neutral": not green (LANG-2).
export type ScoreChip = { label: string; tone: "band" | "caution" | "neutral" };

// The notice that qualifies a result, recorded at check time: tier 1 ("most"), tier 2 ("part"),
// the offer-likeness notice ("offer"), or a check of an English translation ("translated", Batch B;
// no translation runs in Stage 1). null: no notice.
export type Notice = LanguageNotice | "offer" | "translated";

export const LOW_REVIEW_LABEL = "Low, review the findings below";
export const NOT_CHECKED_LABEL = "Not checked: most of the text is not in English";
export const PART_CHECKED_LABEL = "Score 0 on the English part. Part of the text was not checked.";
export const OFFER_UNLIKE_LABEL = "Score 0. This text does not look like a job offer.";
// Batch B decision 5: a translation with no match gets a neutral grey chip, never green.
export const TRANSLATED_NONE_LABEL = "Score 0 on the English translation. A translation can change the meaning.";
const TRANSLATED_SUMMARY = "on the English translation. A translation can change the meaning.";
const PART_CHECKED_SUMMARY = "on the English part. Part of the text was not checked.";
const OFFER_UNLIKE_SUMMARY = "This text does not look like a job offer.";

// OFFER-1: the one place that decides which notice is active. A language notice comes first: its
// wording already says the rules did not read all of the text. Otherwise the offer-likeness notice,
// exactly when its callout is shown (low band, no signal group, no tier 1 notice).
export function activeNotice(
  language: LanguageNotice | null,
  signals: readonly OfferSignal[] | null,
  band: RiskBand,
): Notice | null {
  if (language) return language;
  if (signals && showOfferNotice(signals, band, language)) return "offer";
  return null;
}

// Batch B Stage 1: the notice for a coverage state. A translation comes first; otherwise the
// coverage state's language tier, then the offer-likeness notice, exactly as activeNotice.
export function noticeFor(
  coverage: Coverage,
  signals: readonly OfferSignal[] | null,
  band: RiskBand,
): Notice | null {
  if (coverage === "translated") return "translated";
  return activeNotice(noticeForCoverage(coverage), signals, band);
}

// The invariant, in one place: with any notice active, nothing says all clear. No green tick in
// the Findings card (this function), and no "No risk indicators found" in the chip, the Risk
// aggregator row or the announcement (scoreChip and qualifiedSummary below).
export function allClearShown(notice: Notice | null): boolean {
  return notice === null;
}

// The link to the official reporting channels (/about#report-fraud): medium and high results only,
// and not when the text was not checked (tier 1 shows no score). Display only: it never changes the
// score, the chip or the announcement.
export function reportLinkShown(band: RiskBand, notice: Notice | null): boolean {
  return (band === "medium" || band === "high") && notice !== "most";
}

// LANG-2, LANG-3 and OFFER-1: with a notice and no finding, the Risk aggregator row says what the
// chip says instead of the server's "No risk indicators found". With a notice and a warning only
// (score 0, an info finding), the row takes the chip's amber wording for the same reason.
// null: show the server's summary.
// Batch B decision 4: tier 1 shows no number. With a finding, the row says what matched.
export function qualifiedSummary(risk: RiskScore, findings: Finding[], notice: Notice | null): string | null {
  if (notice === null) return null;
  if (notice === "most") {
    return findings.length > 0
      ? `${NOT_CHECKED_LABEL}. Rules matched in its English words: ${scoreChip(risk, findings, notice).label}.`
      : `${NOT_CHECKED_LABEL}.`;
  }
  if (findings.length > 0) {
    return risk.score === 0 ? `Score 0 of 100: ${scoreChip(risk, findings, notice).label}` : null;
  }
  if (notice === "translated") return `Score ${risk.score} of 100 ${TRANSLATED_SUMMARY}`;
  if (notice === "part") return `Score ${risk.score} of 100 ${PART_CHECKED_SUMMARY}`;
  return `Score ${risk.score} of 100. ${OFFER_UNLIKE_SUMMARY}`;
}

// UX-1: the green "No risk indicators found" chip only for a score of 0 with no finding and no
// warning. A low band with any finding, or a warning only (an info "-W" finding), is not "all
// clear": it gets the amber caution chip. Medium and high keep their band label.
// LANG-2: when most of the checked text is not in English (tier 1) and nothing matched, the rules
// could not read the text, so the green chip becomes a neutral "not checked" one. A finding still
// shows its chip. LANG-3: tier 2 with nothing matched gets the same neutral chip, worded for the
// English part only. OFFER-1: the offer-likeness notice with nothing matched gets the neutral chip
// too. With no notice the chip is unchanged.
// UI only: the score, band and findings come from the server unchanged.
export function scoreChip(risk: RiskScore, findings: Finding[], notice: Notice | null = null): ScoreChip {
  if (risk.band === "low" && findings.length > 0) return { label: LOW_REVIEW_LABEL, tone: "caution" };
  if (findings.length === 0 && notice === "most") return { label: NOT_CHECKED_LABEL, tone: "neutral" };
  if (findings.length === 0 && notice === "part") return { label: PART_CHECKED_LABEL, tone: "neutral" };
  if (findings.length === 0 && notice === "offer") return { label: OFFER_UNLIKE_LABEL, tone: "neutral" };
  if (findings.length === 0 && notice === "translated") return { label: TRANSLATED_NONE_LABEL, tone: "neutral" };
  return { label: risk.label, tone: "band" };
}
