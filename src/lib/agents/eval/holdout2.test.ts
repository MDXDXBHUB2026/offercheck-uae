import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOLDOUT_OFFERS } from "./holdout";
import { HOLDOUT_2_OFFERS } from "./holdout2";
import { EVAL_OFFERS } from "./offers";

// Holdout 2 is consumed: it ran once on 2026-11-06, after the rules were frozen at ranOnRedFlagSha256.
// Never run it again and never relabel it. A later rule change does not update this result.
// redFlagSha256 is the current file. The one change since the run was performance-only: band, rule
// ids and info ids were compared before and after on the dev eval and both holdouts, 77 cases, and
// were identical. That comparison was a guard on the change, not a new holdout result.
const HOLDOUT_2_RUN = {
  status: "consumed",
  fileSha256: "a68da0c26b3fbd4c5813b5b937856ee697090ca42efe7f8d325477cd63fe2ffa",
  ranOnRedFlagSha256: "05d05e13d896352e32624e905fd271fb88a4ada86549ff1dbd522cbda23d41ef",
  redFlagSha256: "789dc2b29a30940951257c677bddcb4eaf995bb8a187a19e3583ca51d1ebb76f",
  strict: "15 of 16",
};

const SOURCE = "src/lib/agents/eval/holdout2.ts";

// This test guards the set only. It never runs the rules, so a failing case cannot be fixed by tuning.
describe("blind holdout 2", () => {
  it("is unchanged", () => {
    const source = readFileSync(join(process.cwd(), SOURCE), "utf8").replaceAll("\r\n", "\n");
    expect(createHash("sha256").update(source).digest("hex")).toBe(HOLDOUT_2_RUN.fileSha256);
  });

  it("has 16 unique cases that appear in no other set", () => {
    expect(new Set(HOLDOUT_2_OFFERS.map((offer) => offer.id)).size).toBe(16);
    const otherTexts = new Set([...EVAL_OFFERS, ...HOLDOUT_OFFERS].map((offer) => offer.text));
    expect(HOLDOUT_2_OFFERS.filter((offer) => otherTexts.has(offer.text))).toEqual([]);
  });

  it("builds the look-alike letter from an escape sequence", () => {
    const source = readFileSync(join(process.cwd(), SOURCE), "utf8");
    const h30 = HOLDOUT_2_OFFERS.find((offer) => offer.id === "H30");
    expect(source).toMatch(/^[ -~\r\n]*$/);
    expect([...(h30?.text ?? "")].filter((char) => char.codePointAt(0) === 0x456)).toHaveLength(1);
  });

  it("is marked consumed and its result is in the docs", () => {
    const docs = readFileSync(join(process.cwd(), "docs", "known-limitations.md"), "utf8");
    expect(HOLDOUT_2_RUN.status).toBe("consumed");
    expect(HOLDOUT_2_RUN.redFlagSha256).toHaveLength(64);
    expect(docs).toContain(HOLDOUT_2_RUN.strict);
  });
});
