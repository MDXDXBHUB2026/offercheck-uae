import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { confusion, evaluateAll, evaluateOffer } from "./metrics";
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

  it("computes precision and recall from the results", () => {
    const results = evaluateAll();
    const { truePositives, falsePositives, falseNegatives, trueNegatives } = confusion(results, [
      "medium",
      "high",
    ]);
    expect(truePositives + falsePositives + falseNegatives + trueNegatives).toBe(43);
  });
});
