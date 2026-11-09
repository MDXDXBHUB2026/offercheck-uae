import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOLDOUT_OFFERS } from "./holdout";
import { EVAL_OFFERS } from "./offers";
import { HOLDOUT_1_RESULT } from "./records";

const HOLDOUT_SHA256 = "6c7ed62f153e04169681e64c18d227dc5a2bb72e3488dbe12cf6626dd3235280";

// Holdout 1 is consumed: it ran once on 2026-11-06 against redFlag.ts sha256 f3570f8f1169ecb2...
// Never run it again and never relabel it. Its result is reported two ways from now on.
// H10 was a real miss, not a band dispute.
// The hash above records the run, so it stays. redFlag.ts is now c4abfc00e371ccfd... (Batch A.1,
// 2026-11-08): score, band and rule ids were compared before and after on all 77 cases, and no
// holdout 1 case changed. That comparison was a guard on the change, not a new holdout result.
// HOLDOUT_1_RESULT (status, run date, rules hash prefix, both results) lives in records.ts, which
// docs/technical-evidence.md copies; records.test.ts keeps it equal to docs/test-report.md.
const REGRESSION_CASES_IN_DEV_EVAL = ["H02", "H10", "H18"];

// This test guards the set only. It never runs the rules: the holdout stays out of the test suite
// so that a failing case cannot be fixed by tuning.
describe("blind holdout", () => {
  it("is unchanged", () => {
    const hash = createHash("sha256").update(JSON.stringify(HOLDOUT_OFFERS)).digest("hex");
    expect(hash).toBe(HOLDOUT_SHA256);
  });

  it("has 18 unique cases, and only the listed regression cases appear in the dev eval", () => {
    expect(new Set(HOLDOUT_OFFERS.map((offer) => offer.id)).size).toBe(18);
    expect(HOLDOUT_1_RESULT.cases).toBe(HOLDOUT_OFFERS.length);
    const devTexts = new Set(EVAL_OFFERS.map((offer) => offer.text));
    const inDevEval = HOLDOUT_OFFERS.filter((offer) => devTexts.has(offer.text));
    expect(inDevEval.map((offer) => offer.id)).toEqual(REGRESSION_CASES_IN_DEV_EVAL);
  });

  it("is marked consumed and reported both ways", () => {
    const docs = readFileSync(join(process.cwd(), "docs", "known-limitations.md"), "utf8");
    expect(HOLDOUT_1_RESULT.status).toBe("consumed");
    expect(docs).toContain(HOLDOUT_1_RESULT.strict);
    expect(docs).toContain(HOLDOUT_1_RESULT.rightRuleCountedAsPass);
  });

  it("builds the zero-width characters from escape sequences", () => {
    const source = readFileSync(join(process.cwd(), "src/lib/agents/eval/holdout.ts"), "utf8");
    const h15 = HOLDOUT_OFFERS.find((offer) => offer.id === "H15");
    expect(source).toMatch(/^[ -~\r\n]*$/);
    expect([...(h15?.text ?? "")].filter((char) => char.codePointAt(0) === 0x200b)).toHaveLength(2);
  });
});
