import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { confusion, evaluateAll, evaluateOffer, type EvalResult } from "./metrics";
import { EVAL_OFFERS } from "./offers";

const covered = EVAL_OFFERS.filter((offer) => !offer.knownMiss);
const knownMisses = EVAL_OFFERS.filter((offer) => offer.knownMiss);

describe("eval set", () => {
  it("has 43 labelled offers with the required mix and unique ids", () => {
    const inGroup = (group: string) => EVAL_OFFERS.filter((offer) => offer.group === group).length;
    expect(EVAL_OFFERS).toHaveLength(43);
    expect(inGroup("scam")).toBeGreaterThanOrEqual(12);
    expect(inGroup("legit")).toBeGreaterThanOrEqual(12);
    expect(inGroup("adversarial")).toBeGreaterThanOrEqual(6);
    expect(new Set(EVAL_OFFERS.map((offer) => offer.id)).size).toBe(43);
  });

  it.each(covered.map((offer) => [offer.id, offer] as const))("%s", (_id, offer) => {
    const { band, ruleIds, infoIds } = evaluateOffer(offer);
    expect({ band, ruleIds, infoIds }).toEqual({
      band: offer.expectedBand,
      ruleIds: [...offer.expectedRuleIds].sort(),
      infoIds: [...(offer.expectedInfoIds ?? [])].sort(),
    });
  });

  // A known miss that starts passing should lose its flag instead of staying listed.
  it.each(knownMisses.map((offer) => [offer.id, offer] as const))(
    "%s is still a known miss",
    (_id, offer) => {
      expect(evaluateOffer(offer).passed).toBe(false);
    },
  );

  it("gives every known miss a reason and lists it in the docs", () => {
    const docs = readFileSync(join(process.cwd(), "docs", "known-limitations.md"), "utf8");
    for (const offer of knownMisses) {
      expect(offer.knownMissReason).toBeTruthy();
      expect(docs).toContain(offer.id);
    }
  });

  // Tuned numbers: the dev eval is the set the rules were tuned on, so these are not blind.
  // Recorded on 2026-11-07 with redFlag.ts sha256 789dc2b29a309409.... A change here needs a reason.
  // Unchanged after Batch A and A.1 (2026-11-08, c4abfc00e371ccfd...): no dev case changed.
  it("matches the recorded tuned precision and recall", () => {
    const results = evaluateAll();
    expect(confusion(results, ["medium", "high"])).toEqual({
      truePositives: 17,
      falsePositives: 1,
      falseNegatives: 1,
      trueNegatives: 24,
      precision: 17 / 18,
      recall: 17 / 18,
    });
  });
});

describe("confusion", () => {
  const result = (scamLike: boolean, band: "low" | "medium" | "high") =>
    ({ offer: { scamLike }, band }) as unknown as EvalResult;

  it("computes precision and recall from a known table", () => {
    const results = [
      result(true, "high"),
      result(true, "medium"),
      result(true, "high"),
      result(true, "low"),
      result(false, "medium"),
      result(false, "low"),
      result(false, "low"),
    ];
    expect(confusion(results, ["medium", "high"])).toEqual({
      truePositives: 3,
      falsePositives: 1,
      falseNegatives: 1,
      trueNegatives: 2,
      precision: 3 / 4,
      recall: 3 / 4,
    });
  });

  it("respects the flagged bands", () => {
    const results = [result(true, "medium"), result(true, "high"), result(false, "medium")];
    const highOnly = confusion(results, ["high"]);
    expect(highOnly.precision).toBe(1);
    expect(highOnly.recall).toBe(1 / 2);
  });
});
