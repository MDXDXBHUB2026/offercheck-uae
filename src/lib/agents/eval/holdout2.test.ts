import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { HOLDOUT_OFFERS } from "./holdout";
import { HOLDOUT_2_OFFERS } from "./holdout2";
import { EVAL_OFFERS } from "./offers";

// Holdout 2 is consumed: it ran once on 2026-11-06, after the rules were frozen at ranOnRedFlagSha256.
// Never run it again and never relabel it. A later rule change does not update this result.
// redFlagSha256Prefix is the current file: sha256 prefix, first 16 hex characters. Changes since the run: one performance-only change (no case
// changed), then Batch A (2026-11-08), which fixed the documented H21 miss. On the 77 cases only H21
// changed (0 to 60, High, RF-002); A.1 changed none. H21 now passes after tuning: a tuned result, not a blind one, so
// the blind result stays 15 of 16. Those comparisons were guards on the changes, not new runs.
const HOLDOUT_2_RUN = {
  status: "consumed",
  fileSha256: "a68da0c26b3fbd4c5813b5b937856ee697090ca42efe7f8d325477cd63fe2ffa",
  ranOnRedFlagSha256: "05d05e13d896352e32624e905fd271fb88a4ada86549ff1dbd522cbda23d41ef",
  // sha256 prefix, first 16 hex characters
  redFlagSha256Prefix: "c4abfc00e371ccfd",
  strict: "15 of 16",
  tunedNote: "H21 also passes",
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
    expect(HOLDOUT_2_RUN.redFlagSha256Prefix).toHaveLength(16);
    expect(docs).toContain(HOLDOUT_2_RUN.strict);
    expect(docs).toContain(HOLDOUT_2_RUN.tunedNote);
  });

  it("records the current rules file", () => {
    const rules = readFileSync(join(process.cwd(), "src/lib/agents/redFlag.ts"), "utf8").replaceAll("\r\n", "\n");
    expect(HOLDOUT_2_RUN.redFlagSha256Prefix).toMatch(/^[0-9a-f]{16}$/);
    expect(createHash("sha256").update(rules).digest("hex").startsWith(HOLDOUT_2_RUN.redFlagSha256Prefix)).toBe(true);
  });
});
