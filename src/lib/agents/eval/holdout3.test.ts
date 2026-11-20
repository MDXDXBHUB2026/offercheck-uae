import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOLDOUT_OFFERS } from "./holdout";
import { HOLDOUT_2_OFFERS } from "./holdout2";
import { HOLDOUT_3_OFFERS } from "./holdout3";
import { EVAL_OFFERS } from "./offers";
import { HOLDOUT_3_CASES, HOLDOUT_3_PASS_BAR, HOLDOUT_3_RUN } from "./records";

// Holdout 3 is consumed: it ran once, blind, on 2026-11-20, after the Phase 8 freeze (7b979c9), with
// the rules at ranOnRedFlagSha256. Never run it again and never relabel it. The advisor had read
// docs/defects.md before writing the set, so it is blind to the rule patterns, not to the defect list.
// Its result is the read-only per-case record in records.ts. A later rule change does not update it.
const HOLDOUT_3_HASHES = {
  // sha256 of holdout3.ts with LF line endings.
  fileSha256: "0da40072e24119f5a9768c706e72e877e6b8d38da3d116e1155ac0e39d91b629",
  // redFlag.ts when the set ran: the Phase 8 freeze (656139e, recorded at 7b979c9).
  ranOnRedFlagSha256: "87a170e72f33484a0d81997b9e6030e751634bf63356cef6a72ebb6c3bcc7352",
};

const SOURCE = "src/lib/agents/eval/holdout3.ts";
const sha256 = (file: string) =>
  createHash("sha256")
    .update(readFileSync(join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n"))
    .digest("hex");

// This test guards the set and its record only. It never runs the rules, so a miss cannot be fixed
// by tuning against it.
describe("blind holdout 3", () => {
  it("is unchanged", () => {
    expect(sha256(SOURCE)).toBe(HOLDOUT_3_HASHES.fileSha256);
  });

  it("ran on the frozen rules file, which is unchanged", () => {
    expect(sha256("src/lib/agents/redFlag.ts")).toBe(HOLDOUT_3_HASHES.ranOnRedFlagSha256);
    expect(HOLDOUT_3_HASHES.ranOnRedFlagSha256.startsWith(HOLDOUT_3_RUN.ranOnRedFlagPrefix)).toBe(true);
  });

  it("has 24 unique cases, H35 to H58, that appear in no other set", () => {
    const ids = HOLDOUT_3_OFFERS.map((offer) => offer.id);
    expect(ids).toEqual(Array.from({ length: 24 }, (_, i) => `H${35 + i}`));
    expect(HOLDOUT_3_RUN.cases).toBe(HOLDOUT_3_OFFERS.length);
    const otherTexts = new Set([...EVAL_OFFERS, ...HOLDOUT_OFFERS, ...HOLDOUT_2_OFFERS].map((offer) => offer.text));
    expect(HOLDOUT_3_OFFERS.filter((offer) => otherTexts.has(offer.text))).toEqual([]);
  });

  it("builds H57's two zero-width spaces from escapes and H45's four lines with real line breaks", () => {
    const source = readFileSync(join(process.cwd(), SOURCE), "utf8");
    expect(source).toMatch(/^[ -~\r\n]*$/);
    const text = (id: string) => HOLDOUT_3_OFFERS.find((offer) => offer.id === id)?.text ?? "";
    expect([...text("H57")].filter((char) => char.codePointAt(0) === 0x200b)).toHaveLength(2);
    expect(text("H45").split("\n")).toHaveLength(4);
  });

  it("has a record for every case, with the labels of the set", () => {
    expect(HOLDOUT_3_RUN.status).toBe("consumed");
    expect(HOLDOUT_3_CASES.map((record) => record.id)).toEqual(HOLDOUT_3_OFFERS.map((offer) => offer.id));
    for (const offer of HOLDOUT_3_OFFERS) {
      const record = HOLDOUT_3_CASES.find((entry) => entry.id === offer.id);
      expect(record?.group, offer.id).toBe(offer.group);
      expect(record?.expectedBand, offer.id).toBe(offer.expectedBand);
      expect(record?.expectedRuleIds, offer.id).toEqual(offer.expectedRuleIds);
      const sameRules = [...(record?.ruleIds ?? [])].sort().join() === [...offer.expectedRuleIds].sort().join();
      expect(record?.match, offer.id).toBe(record?.band === offer.expectedBand && sameRules);
    }
  });

  it("derives the strict result and the bar counts from the record", () => {
    const flagged = (id: string) => {
      const record = HOLDOUT_3_CASES.find((entry) => entry.id === id);
      return record !== undefined && (record.band === "medium" || record.band === "high" || record.score > 0);
    };
    const scams = HOLDOUT_3_CASES.filter((r) => r.group === "scam" || r.group === "adversarial");
    const legit = HOLDOUT_3_CASES.filter((r) => r.group === "legit");
    expect(scams).toHaveLength(12);
    expect(legit).toHaveLength(11);
    const count = (n: number, of: number) => `${n} of ${of}`;
    expect(count(HOLDOUT_3_CASES.filter((r) => r.match).length, 24)).toBe(HOLDOUT_3_RUN.strict);
    expect(HOLDOUT_3_PASS_BAR[0].count).toBe(count(scams.filter((r) => flagged(r.id)).length, 12));
    expect(HOLDOUT_3_PASS_BAR[1].count).toBe(count(legit.filter((r) => flagged(r.id)).length, 11));
    expect(HOLDOUT_3_PASS_BAR[2].count).toBe(String(legit.filter((r) => r.band === "high").length));
  });
});
