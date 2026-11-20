// The recorded results of the three consumed holdouts. Each ran once, on the date below, and must never
// run again, so these are records, not results this code can compute. Every string is copied from
// docs/test-report.md ("Holdout 1 (consumed)", "Holdout 2 (consumed) and the locked pass bar",
// "Holdout 3 (consumed, blind) and the locked pass bar"), docs/holdout2-pass-bar.md and
// docs/holdout3-cases.md; records.test.ts fails if one is missing from those files. Hash prefixes
// only (the first 8 hex characters, as in the test report): the full hashes stay in the holdout tests.
// Moved here from holdout.test.ts and holdout2.test.ts; docs/technical-evidence.md copies them, and
// src/lib/technicalEvidence.test.ts checks that copy.

export type PassBarRow = { item: string; required: string; count: string; source: string };

export const HOLDOUT_1_RESULT = {
  name: "Holdout 1",
  status: "consumed",
  runDate: "2026-11-06",
  // redFlag.ts sha256, first 8 hex characters
  ranOnRedFlagPrefix: "f3570f8f",
  ranOnNote: "which was before the Step 1d fixes",
  cases: 18,
  strict: "11 of 18",
  rightRuleCountedAsPass: "15 of 18",
  realMiss: "H10",
  realMissNote: "was a real miss. It was fixed afterwards and kept as dev case R10, which is now a tuned result.",
  strictFailures: ["H01", "H09", "H14", "H17"],
  strictFailuresNote: "They fired the expected rule but scored high against an expected medium.",
  passBarNote: "No pass bar was set for holdout 1.",
} as const;

export const HOLDOUT_2_RUN = {
  name: "Holdout 2",
  status: "consumed",
  runDate: "2026-11-06",
  // redFlag.ts sha256 when the rules were frozen for the run, first 8 hex characters
  ranOnRedFlagPrefix: "05d05e13",
  cases: 16,
  strict: "15 of 16",
  failureNote: "The one failure is H21, a scam expected high with RF-002, which scored 0.",
  tunedNote: "H21 also passes",
  tunedDetail:
    "This is a tuned result, not a blind one: the fix was made knowing the miss. The blind result above stays 15 of 16, and the pass bar counts below are from the blind run.",
  passBarLocked: "It was locked on 2026-11-06, before the run. The owner applies it; this report gives counts only.",
  noRerun: "Holdout 2 may not be re-run, so these counts cannot be re-checked by running it again.",
} as const;

// The locked bar, as written in docs/holdout2-pass-bar.md (the cases counted and the three items).
export const HOLDOUT_2_BAR_ITEMS = [
  "At least 5 of the 7 scam cases flagged.",
  "At most 1 of the 8 legitimate cases flagged.",
  "No legitimate case flagged high.",
] as const;

export const HOLDOUT_2_BAR_COUNTED = [
  'Scam cases (7): H19, H20, H21, H22, H29, H31, H33. A scam is "flagged" when its band is medium or high.',
  'Legitimate cases (8): H23, H24, H25, H26, H27, H28, H32, H34. A legitimate case is "flagged" when its band is medium or high, or when it scores any points.',
  "H30 (Cyrillic homoglyph) is a stress case. Report it separately. It is not counted in either number.",
] as const;

// The counts against the bar, exactly as in the test report's table, "Derived" labels included.
export const HOLDOUT_2_PASS_BAR: readonly PassBarRow[] = [
  {
    item: "Scam cases flagged (medium or high)",
    required: "at least 5 of 7",
    count: "6 of 7",
    source: "Derived. Only H21 failed, and every other scam case passed at its expected band of medium or high.",
  },
  {
    item: "Legitimate cases flagged (medium or high, or any points)",
    required: "at most 1 of 8",
    count: "0 of 8 by band",
    source:
      'Derived. All 8 passed at their expected band, low, with no rules. The repo does not record each case\'s score, so "any points" cannot be confirmed from files.',
  },
  { item: "Legitimate cases flagged high", required: "0", count: "0", source: "Derived as above" },
  {
    item: "H30, a stress case reported separately",
    required: "not counted",
    count: "passed",
    source:
      '`docs/rules-backlog.md`. RF-001 fired on "fee of AED 500", not on the look-alike word, so this does not show that look-alike letters are handled.',
  },
];

// Holdout 3 ran once, blind, on 2026-11-20, after the Phase 8 freeze (7b979c9). Read-only record of
// that run: holdout3.test.ts never runs the rules, and nothing may re-run the set to refresh this.
export const HOLDOUT_3_RUN = {
  name: "Holdout 3",
  status: "consumed",
  runDate: "2026-11-20",
  // redFlag.ts sha256 when the rules were frozen for the run, first 8 hex characters
  ranOnRedFlagPrefix: "87a170e7",
  cases: 24,
  blindNote:
    "The advisor had read `docs/defects.md` before writing the set, so it is blind to the rule patterns, not to the defect list.",
  strict: "21 of 24",
  failureNote:
    "The three that differ are H36 and H38, scams expected high with RF-001 and RF-002, which scored 0, and H53, a legitimate case expected low, which scored 60, High, with RF-001.",
  passBarLocked: "It was locked on 2026-11-20, before the run. The owner applies it; this report gives counts only.",
  noRerun: "Holdout 3 may not be re-run, so these counts cannot be re-checked by running it again.",
} as const;

// The locked bar, as written in docs/holdout3-cases.md (the cases counted and the three items).
export const HOLDOUT_3_BAR_ITEMS = [
  "At least 10 of the 12 scam cases flagged.",
  "At most 1 of the 11 legitimate cases flagged.",
  "No legitimate case flagged high.",
] as const;

export const HOLDOUT_3_BAR_COUNTED = [
  'Scam cases (12): H35 to H45, and H58. A scam is "flagged" when its band is medium or high.',
  'Legitimate cases (11): H46 to H56. A legitimate case is "flagged" when its band is medium or high, or when it scores any points.',
  "H57 (zero-width characters) is a stress case. Report it separately. It is not counted in either number.",
] as const;

export type Holdout3CaseRecord = {
  id: string;
  group: "scam" | "legit" | "stress" | "adversarial";
  expectedBand: string;
  expectedRuleIds: readonly string[];
  score: number;
  band: string;
  ruleIds: readonly string[];
  infoIds: readonly string[];
  match: boolean;
};

// Each case as the single run gave it: score, band, counted rule ids and 0-point info ids. "match"
// means the band and the counted rule ids equal the label.
export const HOLDOUT_3_CASES: readonly Holdout3CaseRecord[] = [
  { id: "H35", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
  { id: "H36", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 0, band: "low", ruleIds: [], infoIds: [], match: false },
  { id: "H37", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-002"], score: 60, band: "high", ruleIds: ["RF-002"], infoIds: [], match: true },
  { id: "H38", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-002"], score: 0, band: "low", ruleIds: [], infoIds: [], match: false },
  { id: "H39", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-003", "RF-004", "RF-005"], score: 60, band: "high", ruleIds: ["RF-003", "RF-004", "RF-005"], infoIds: [], match: true },
  { id: "H40", group: "scam", expectedBand: "medium", expectedRuleIds: ["RF-003", "RF-005"], score: 40, band: "medium", ruleIds: ["RF-003", "RF-005"], infoIds: [], match: true },
  { id: "H41", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001", "RF-004"], score: 60, band: "high", ruleIds: ["RF-001", "RF-004"], infoIds: [], match: true },
  { id: "H42", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
  { id: "H43", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
  { id: "H44", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-002"], score: 60, band: "high", ruleIds: ["RF-002"], infoIds: [], match: true },
  { id: "H45", group: "scam", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
  { id: "H46", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H47", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H48", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H49", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H50", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H51", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H52", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H53", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: false },
  { id: "H54", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H55", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H56", group: "legit", expectedBand: "low", expectedRuleIds: [], score: 0, band: "low", ruleIds: [], infoIds: [], match: true },
  { id: "H57", group: "stress", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
  { id: "H58", group: "adversarial", expectedBand: "high", expectedRuleIds: ["RF-001"], score: 60, band: "high", ruleIds: ["RF-001"], infoIds: [], match: true },
];

// The counts against the bar, each derived from HOLDOUT_3_CASES above.
export const HOLDOUT_3_PASS_BAR: readonly PassBarRow[] = [
  {
    item: "Scam cases flagged (medium or high)",
    required: "at least 10 of 12",
    count: "10 of 12",
    source: "Per-case record. Not flagged: H36 and H38, each 0, Low, no rule.",
  },
  {
    item: "Legitimate cases flagged (medium or high, or any points)",
    required: "at most 1 of 11",
    count: "1 of 11",
    source: "Per-case record. H53 scored 60, High, RF-001; the other 10 scored 0 with no rule and no info finding.",
  },
  { item: "Legitimate cases flagged high", required: "0", count: "1", source: "Per-case record. H53." },
  {
    item: "H57, a stress case reported separately",
    required: "not counted",
    count: "60, High, RF-001",
    source:
      "Per-case record. Matches its label. The quote is `Pay the registration fee of AED 700 to proceed`: cleaning removed both zero-width spaces.",
  },
];
