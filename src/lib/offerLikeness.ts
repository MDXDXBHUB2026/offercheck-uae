// Batch A case 4: the check is built for job offers. This finds the signs of one, so the page can
// say when a low-scoring text shows none. Pure and deterministic. It never changes the score or the
// findings, and it is kept apart from the rules, the scoring, Intake and the server.
import type { LanguageNotice } from "./textScript";
import type { RiskBand } from "./types";

export type OfferSignal = "role" | "pay" | "process" | "org";

export const OFFER_SIGNALS: Readonly<Record<OfferSignal, RegExp>> = {
  role: /\b(?:jobs?|positions?|roles?|vacanc(?:y|ies)|openings?|hiring|hired?|recruit\w*|employment|designation|work(?:ing)? hours|shifts?|full[- ]time|part[- ]time|work from home)\b/i,
  pay: /\b(?:salary|salaries|wages?|stipend|compensation|per month|monthly|allowances?|benefits)\b/i,
  process:
    /\b(?:interviews?|apply|applied|applications?|cv|resume|candidates?|applicants?|joining|onboarding|contract|offer letter|selected|shortlisted)\b/i,
  org: /\b(?:company|employer|hr|human resources|recruiter|hiring manager|management)\b/i,
};

// Fixed wording. Nothing from the offer text is ever put into the notice.
export const OFFER_NOTICE =
  "This text has no clear signs of a job offer, such as a role, a salary or an employer. Offer Check is built for job offers, so a low score here says little.";

export function offerSignals(text: string): OfferSignal[] {
  return (Object.keys(OFFER_SIGNALS) as OfferSignal[]).filter((signal) => OFFER_SIGNALS[signal].test(text));
}

// Only for a Low score with no signal at all. Not with the tier 1 language notice, which already
// says the rules could not read the text. A scam that names a job keeps its warning undisturbed.
export function showOfferNotice(
  signals: readonly OfferSignal[],
  band: RiskBand,
  language: LanguageNotice | null,
): boolean {
  return band === "low" && signals.length === 0 && language !== "most";
}
