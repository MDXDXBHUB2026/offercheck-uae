import { describe, expect, it } from "vitest";
import { runManager } from "./manager";

// Phase 8, rules v2 cycle, part 1 (2026-11-20). One block per documented defect, through the whole
// run (intake, rules, score), each with the documented example and at least two cases that must fire
// and two look-alikes that must not. Tuned cases: written while fixing, so none of them is blind.

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

describe("GAP-3: a negated ask reaches only its own object", () => {
  it("documented example fires RF-001", () => {
    expect(outcome("We do not require a degree the fee is AED 500")).toMatchObject({
      score: 60,
      band: "high",
      ruleIds: ["RF-001"],
    });
  });

  it.each([
    "We never ask for experience the registration fee is AED 750",
    "You do not need a car the deposit is payable before joining",
  ])("fires on a new cost statement after the negated ask: %s", (text) => {
    expect(ruleIds(text)).toEqual(["RF-001"]);
  });

  it.each([
    "We do not require any fee or deposit",
    "We do not charge a processing fee of AED 500",
    "We never ask for a deposit and no fee is required",
  ])("keeps a negation bound to the cost: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [], infoIds: ["RF-001-W"] });
  });
});
