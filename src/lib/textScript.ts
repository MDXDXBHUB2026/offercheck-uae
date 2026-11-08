// LANG-1: the rules read English, so text in another script is not checked. This decides which
// fixed notice, if any, to show. Pure and deterministic. It never changes the score or the findings,
// and it is kept apart from the rules, the scoring and Intake's cleaning.

export type LanguageNotice = "most" | "part";

// Tier 1: at least half of the letters are non-Latin. Matches the notice's claim, "most of this text".
export const MOST_NON_LATIN_SHARE = 0.5;
// Tier 2: under half, but at least 10 non-Latin letters. A short Arabic fee demand such as
// "ادفع الرسوم" is 10 letters; a two-word name such as "محمد علي" (7 letters) stays below it, while a
// three-word name can reach it (accepted: a missed demand costs more than a redundant true notice).
// A design choice from a few hand-written sentences, not validated on real data. On the 77 eval
// cases the most in an English case is 1 (H30).
export const PART_MIN_NON_LATIN_LETTERS = 10;

// Fixed wording. Nothing from the offer text is ever put into a notice.
export const LANGUAGE_NOTICES: Record<LanguageNotice, string> = {
  most: "Most of this text is not in English. This check reads English text only, so a low score or a score of 0 does not mean the offer is safe.",
  part: "Part of this text is not in English. This check reads English only, so those parts were not checked.",
};

const LETTER = /\p{L}/gu;
const LATIN = /\p{Script=Latin}/u;

// Counts letters only: digits, emoji, punctuation, spaces and marks are neither Latin nor non-Latin.
export function languageNotice(text: string): LanguageNotice | null {
  let letters = 0;
  let nonLatin = 0;
  for (const [letter] of text.matchAll(LETTER)) {
    letters++;
    if (!LATIN.test(letter)) nonLatin++;
  }
  if (nonLatin === 0) return null;
  if (nonLatin / letters >= MOST_NON_LATIN_SHARE) return "most";
  return nonLatin >= PART_MIN_NON_LATIN_LETTERS ? "part" : null;
}
