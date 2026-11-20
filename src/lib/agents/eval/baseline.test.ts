import { describe, expect, it } from "vitest";
import { heroExamples } from "../../../data/heroExamples";
import { SAMPLE_OFFERS } from "../../../data/sampleOffers";
import { LEGIT_OFFER, SCAM_OFFER } from "../fixtures";
import { runManager } from "../manager";
import BASELINE from "./baseline.json";
import { HOLDOUT_OFFERS } from "./holdout";
import { HOLDOUT_2_OFFERS } from "./holdout2";
import { EVAL_OFFERS } from "./offers";

// Phase 8 regression guard (2026-11-20). baseline.json holds score, band, rule ids and info ids for
// every case as they were before the rules v2 cycle, with redFlag.ts at sha256 c4abfc00e371ccfd...
// It never changes. It compares each case with the output the rules gave then, not with a label,
// so it grades nothing: holdouts 1 and 2 stay consumed and their recorded results stand.
// A case may differ from the baseline only when it is listed in CHANGED with the defect that
// explains it and its new outcome; an unlisted change fails here.

type Outcome = { score: number; band: string; ruleIds: string[]; infoIds: string[] };
type SetName = Exclude<keyof typeof BASELINE, "heroExamples">;

const CHANGED: Partial<Record<SetName, Record<string, { defect: string; now: Outcome }>>> = {
  devEval: {
    // The documented GAP-4 example: a third-party warning now gives the 0-point info finding.
    L13: { defect: "GAP-4", now: { score: 0, band: "low", ruleIds: [], infoIds: ["RF-001-W"] } },
  },
};

function outcome(text: string): Outcome {
  const result = runManager(text);
  const ids = (info: boolean) =>
    result.findings
      .filter((finding) => (finding.severity === "info") === info)
      .map((finding) => finding.source)
      .sort();
  return { score: result.risk.score, band: result.risk.band, ruleIds: ids(false), infoIds: ids(true) };
}

const SETS: Record<SetName, readonly { id: string; text: string }[]> = {
  devEval: EVAL_OFFERS,
  holdout1: HOLDOUT_OFFERS,
  holdout2: HOLDOUT_2_OFFERS,
  sampleOffers: SAMPLE_OFFERS,
  agentFixtures: [
    { id: "SCAM_OFFER", text: SCAM_OFFER },
    { id: "LEGIT_OFFER", text: LEGIT_OFFER },
  ],
};

describe("Phase 8 baseline", () => {
  for (const [name, cases] of Object.entries(SETS) as [SetName, readonly { id: string; text: string }[]][]) {
    const baseline = BASELINE[name] as Record<string, Outcome>;

    it(`${name}: covers every case`, () => {
      expect(Object.keys(baseline).sort()).toEqual(cases.map((c) => c.id).sort());
    });

    it.each(cases.map((c) => [c.id, c] as const))(`${name} %s`, (id, c) => {
      const changed = CHANGED[name]?.[id];
      expect(outcome(c.text)).toEqual(changed ? changed.now : baseline[id]);
    });
  }

  it("lists a defect for every explained change, and each one differs from the baseline", () => {
    for (const [name, cases] of Object.entries(CHANGED)) {
      for (const [id, change] of Object.entries(cases ?? {})) {
        expect(change.defect).toMatch(/^(?:GAP|QA)-\d+$/);
        expect(change.now).not.toEqual((BASELINE[name as SetName] as Record<string, Outcome>)[id]);
      }
    }
  });

  it("hero examples are unchanged", () => {
    expect(heroExamples()).toEqual(BASELINE.heroExamples);
  });
});
