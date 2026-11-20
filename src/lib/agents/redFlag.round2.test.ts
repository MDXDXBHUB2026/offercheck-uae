import { describe, expect, it } from "vitest";
import { runManager } from "./manager";

// Phase 8 round 2 (2026-11-20): three gaps found by blind holdout 3 (H53, H38, H36), fixed by tuning.
// Each block has the documented text, the owner's wordings and at least four of our own (two that
// must fire, two look-alikes that must not). Tuned cases: none of them is blind, and the holdout 3
// texts are never the only test.

function outcome(text: string) {
  const result = runManager(text);
  const ids = (info: boolean) =>
    result.findings
      .filter((finding) => (finding.severity === "info") === info)
      .map((finding) => finding.source)
      .sort();
  return { score: result.risk.score, band: result.risk.band, ruleIds: ids(false), infoIds: ids(true) };
}

const ruleIds = (text: string) => outcome(text).ruleIds;

describe("H53: a list of cost words after 'no' is negated as a whole", () => {
  it("documented text scores 0", () => {
    expect(outcome("No deposit, fee or payment is required at any stage")).toMatchObject({
      score: 0,
      band: "low",
      ruleIds: [],
    });
  });

  it.each([
    "No fee, deposit or charge will be taken",
    "We never take any deposit, fee or payment",
    // Our own.
    "No registration fee, deposit or service charge is payable at any time",
    "There is no deposit, fee or payment required from you",
  ])("scores 0: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, band: "low", ruleIds: [] });
  });

  it.each([
    "Pay the fee, deposit and registration charge today",
    "A fee is required, no deposit is needed",
    // Our own: a determiner or an amount starts a new cost, and a closed "no" clause ends the list.
    "No deposit, the fee of AED 500 is required",
    "No deposit is needed, the fee is required before joining",
    "No deposit, fee or payment of AED 300 is required",
  ])("still fires RF-001: %s", (text) => {
    expect(ruleIds(text)).toEqual(["RF-001"]);
  });
});
