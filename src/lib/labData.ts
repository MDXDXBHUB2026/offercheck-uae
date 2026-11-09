// Roadmap Phase 3: the Test Lab's data, one object for the page and for /lab/results.json.
// Server only: it runs the real rules (src/lib/agents/redFlag.ts through runManager), so it must never
// be imported by a "use client" file. It is computed when the site is built, from the case files:
// - the dev eval (src/lib/agents/eval/offers.ts) is run live through the same pipeline as the Check
//   page, with no translation and no network call;
// - the two holdouts are consumed and are never run again: their recorded results come from
//   src/lib/agents/eval/records.ts, and this file does not import the holdout case files;
// - the synthetic language samples are run through the same coverage function as the Check page.
import { runManager } from "./agents/manager";
import { confusion, evaluateOffer, type Confusion } from "./agents/eval/metrics";
import { EVAL_OFFERS, type EvalOffer } from "./agents/eval/offers";
import {
  HOLDOUT_1_RESULT,
  HOLDOUT_2_BAR_COUNTED,
  HOLDOUT_2_BAR_ITEMS,
  HOLDOUT_2_PASS_BAR,
  HOLDOUT_2_RUN,
  type PassBarRow,
} from "./agents/eval/records";
import { RULES } from "./agents/redFlag";
import { COVERAGES, coverageOf, detectLanguage, type Coverage } from "./coverage";
import { ENGLISH_EDGE_CASES, LATIN_NON_ENGLISH, ROMAN_ARABIC_FEE_SCAM, type LanguageSample } from "./languageSamples";
import type { RiskBand } from "./types";

export const DEV_EVAL_LABEL = "Dev eval: tuned on, not blind";
export const HOLDOUT_LABEL = "Blind when run, now consumed";
export const SYNTHETIC_LABEL = "Synthetic";
export const FLAGGED_BANDS: RiskBand[] = ["medium", "high"];

export const DOES_NOT_PROVE = [
  "Every case is synthetic: written for this project, not taken from real offers.",
  "The samples are small.",
  "The rules were tuned on the dev eval, so its results are not blind.",
  "Both holdouts are consumed: they were blind when they ran once, and are no longer blind.",
  "Nothing here is validated on real-world offers or real scam data.",
  "The rules read English only.",
  "The quality of machine translation is not measured.",
] as const;

export const LANGUAGE_NOTE =
  "A small synthetic sample, not validated by a native speaker. It shows the state each text gets; it does not measure how well languages are detected in real offers.";

export type CaseRow = {
  id: string;
  group: EvalOffer["group"];
  scamLike: boolean;
  expectedBand: RiskBand;
  actualBand: RiskBand;
  score: number;
  expectedRuleIds: string[];
  actualRuleIds: string[];
  expectedInfoIds: string[];
  actualInfoIds: string[];
  passed: boolean;
  knownMiss: boolean;
  knownMissReason: string | null;
};

export type GroupCount = { group: string; cases: number; passed: number; failed: number; knownMisses: number };

export type RuleHit = { ruleId: string; check: string; scamCases: number; nonScamCases: number };

export type LabConfusion = Omit<Confusion, "precision" | "recall"> & {
  flaggedBands: RiskBand[];
  precision: number | null;
  recall: number | null;
};

export type LanguageRow = { id: string; language: string; label: string; coverage: Coverage };

export type LabData = {
  devEval: {
    label: string;
    source: string;
    cases: number;
    passed: number;
    failed: number;
    knownMisses: number;
    groups: GroupCount[];
    confusion: LabConfusion;
    ruleHits: RuleHit[];
    rows: CaseRow[];
  };
  holdouts: {
    label: string;
    holdout1: typeof HOLDOUT_1_RESULT;
    holdout2: typeof HOLDOUT_2_RUN;
    holdout2Bar: { items: readonly string[]; counted: readonly string[]; counts: readonly PassBarRow[] };
  };
  language: {
    label: string;
    note: string;
    rows: LanguageRow[];
    counts: { coverage: Coverage; count: number }[];
  };
  doesNotProve: readonly string[];
};

function finite(value: number): number | null {
  return Number.isFinite(value) ? value : null;
}

export function buildLabData(
  cases: readonly EvalOffer[] = EVAL_OFFERS,
  samples: readonly LanguageSample[] = [ROMAN_ARABIC_FEE_SCAM, ...ENGLISH_EDGE_CASES, ...LATIN_NON_ENGLISH],
): LabData {
  const results = cases.map((offer) => evaluateOffer(offer));
  const rows: CaseRow[] = results.map((result) => ({
    id: result.offer.id,
    group: result.offer.group,
    scamLike: result.offer.scamLike,
    expectedBand: result.offer.expectedBand,
    actualBand: result.band,
    score: runManager(result.offer.text).risk.score,
    expectedRuleIds: [...result.offer.expectedRuleIds].sort(),
    actualRuleIds: result.ruleIds,
    expectedInfoIds: [...(result.offer.expectedInfoIds ?? [])].sort(),
    actualInfoIds: result.infoIds,
    passed: result.passed,
    knownMiss: result.offer.knownMiss === true,
    knownMissReason: result.offer.knownMissReason ?? null,
  }));

  const groups = [...new Set(rows.map((row) => row.group))].map((group) => {
    const inGroup = rows.filter((row) => row.group === group);
    return {
      group,
      cases: inGroup.length,
      passed: inGroup.filter((row) => row.passed).length,
      failed: inGroup.filter((row) => !row.passed).length,
      knownMisses: inGroup.filter((row) => row.knownMiss).length,
    };
  });

  const matrix = confusion(results, FLAGGED_BANDS);

  const ruleHits = RULES.map((rule) => ({
    ruleId: rule.id,
    check: rule.check,
    scamCases: rows.filter((row) => row.scamLike && row.actualRuleIds.includes(rule.id)).length,
    nonScamCases: rows.filter((row) => !row.scamLike && row.actualRuleIds.includes(rule.id)).length,
  }));

  const languageRows = samples.map((sample) => ({
    id: sample.id,
    language: sample.language,
    label: SYNTHETIC_LABEL,
    coverage: coverageOf(detectLanguage(sample.text)),
  }));

  return {
    devEval: {
      label: DEV_EVAL_LABEL,
      source: "src/lib/agents/eval/offers.ts",
      cases: rows.length,
      passed: rows.filter((row) => row.passed).length,
      failed: rows.filter((row) => !row.passed).length,
      knownMisses: rows.filter((row) => row.knownMiss).length,
      groups,
      confusion: {
        ...matrix,
        flaggedBands: FLAGGED_BANDS,
        precision: finite(matrix.precision),
        recall: finite(matrix.recall),
      },
      ruleHits,
      rows,
    },
    holdouts: {
      label: HOLDOUT_LABEL,
      holdout1: HOLDOUT_1_RESULT,
      holdout2: HOLDOUT_2_RUN,
      holdout2Bar: { items: HOLDOUT_2_BAR_ITEMS, counted: HOLDOUT_2_BAR_COUNTED, counts: HOLDOUT_2_PASS_BAR },
    },
    language: {
      label: SYNTHETIC_LABEL,
      note: LANGUAGE_NOTE,
      rows: languageRows,
      counts: COVERAGES.map((coverage) => ({
        coverage,
        count: languageRows.filter((row) => row.coverage === coverage).length,
      })),
    },
    doesNotProve: DOES_NOT_PROVE,
  };
}

// The one data object for the page and the JSON route, built from the real case files.
export function getLabData(): LabData {
  return buildLabData();
}
