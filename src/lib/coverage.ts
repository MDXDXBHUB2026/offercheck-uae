// Batch B Stage 1 (docs/batch-b-design.md): which part of a text the English rules could read.
// Pure, offline and deterministic: no translation, no network, no model. It never changes the
// score or the findings, and the rules and the scoring do not import it (isolation tests).
import { ENGLISH_WORDS, FOREIGN_MARKERS } from "./languageWords";
import { languageNotice, type LanguageNotice } from "./textScript";

// The detector's verdict on the text as typed.
export type Detected = "en" | "mixed" | "non_en";

// What the rules read: all of it, an English translation (a later stage), only the English part,
// or nothing they could read.
export const COVERAGES = ["full", "translated", "partial", "unchecked"] as const;
export type Coverage = (typeof COVERAGES)[number];

// Decision 3: conservative placeholder cut-offs, set so that none of the 77 eval cases changes
// (coverage.test.ts). Not validated on real offers. On the eval cases the lowest share of common
// English words is 0.44 and no case has a marker word.
// Under this many English-letter words the word check abstains: too little to judge.
export const LATIN_MIN_WORDS = 6;
// Not English: at least 2 different marker words making up at least 30% of the words...
export const NON_EN_MIN_DISTINCT = 2;
export const NON_EN_MIN_FOREIGN_SHARE = 0.3;
// ...or fewer than 15% of the words are common English words.
export const NON_EN_MAX_ENGLISH_SHARE = 0.15;
// Mixed: at least 3 different marker words making up at least 10% of the words.
export const MIXED_MIN_DISTINCT = 3;
export const MIXED_MIN_FOREIGN_SHARE = 0.1;

const LATIN_WORD = /\p{Script=Latin}+/gu;

// The word check on English-letter text: other languages typed in English letters. null: abstain.
export function latinVerdict(text: string): Detected | null {
  const tokens = (text.match(LATIN_WORD) ?? []).map((token) => token.toLowerCase());
  if (tokens.length < LATIN_MIN_WORDS) return null;
  let english = 0;
  let foreign = 0;
  const distinct = new Set<string>();
  for (const token of tokens) {
    if (ENGLISH_WORDS.has(token)) english++;
    else if (FOREIGN_MARKERS.has(token)) {
      foreign++;
      distinct.add(token);
    }
  }
  const foreignShare = foreign / tokens.length;
  if (distinct.size >= NON_EN_MIN_DISTINCT && foreignShare >= NON_EN_MIN_FOREIGN_SHARE) return "non_en";
  if (english / tokens.length < NON_EN_MAX_ENGLISH_SHARE) return "non_en";
  if (distinct.size >= MIXED_MIN_DISTINCT && foreignShare >= MIXED_MIN_FOREIGN_SHARE) return "mixed";
  return "en";
}

// Detector A (the script tiers) first, then detector B (the word check) on top.
export function detectLanguage(text: string): Detected {
  const script = languageNotice(text);
  if (script === "most") return "non_en";
  const latin = latinVerdict(text);
  if (script === "part") return latin === "non_en" ? "non_en" : "mixed";
  return latin ?? "en";
}

export function coverageOf(detected: Detected, translated = false): Coverage {
  if (translated) return "translated";
  return detected === "en" ? "full" : detected === "mixed" ? "partial" : "unchecked";
}

// The language notice tier each state shows: the same fixed wording as before.
export function noticeForCoverage(coverage: Coverage): LanguageNotice | null {
  return coverage === "unchecked" ? "most" : coverage === "partial" ? "part" : null;
}
