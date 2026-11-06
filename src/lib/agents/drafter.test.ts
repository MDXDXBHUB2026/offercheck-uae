import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { gateReducer, INITIAL_GATE_FLOW } from "../approvalGate";
import { draftReply } from "./drafter";
import { HOLDOUT_OFFERS } from "./eval/holdout";
import { HOLDOUT_2_OFFERS } from "./eval/holdout2";
import { EVAL_OFFERS } from "./eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "./fixtures";
import { runManager } from "./manager";

const SHINGLE_WORDS = 5;
const OFFER_TEXTS = [
  SCAM_OFFER,
  LEGIT_OFFER,
  ...[...EVAL_OFFERS, ...HOLDOUT_OFFERS, ...HOLDOUT_2_OFFERS].map((offer) => offer.text),
];

function words(text: string): string[] {
  return text.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];
}

function shingles(text: string): string[] {
  const list = words(text);
  return list
    .slice(0, Math.max(0, list.length - SHINGLE_WORDS + 1))
    .map((_word, index) => list.slice(index, index + SHINGLE_WORDS).join(" "));
}

function scoreOnly(text: string) {
  const { findings, risk } = runManager(text);
  return { findings, risk };
}

describe("draftReply", () => {
  it("takes no input, so no offer text can reach it", () => {
    expect(draftReply.length).toBe(0);
    expect(draftReply()).toBe(draftReply());
  });

  it("shares no run of 5 words with any offer in the eval or holdout sets", () => {
    const draft = words(draftReply()).join(" ");
    expect(OFFER_TEXTS.flatMap(shingles).filter((shingle) => draft.includes(shingle))).toEqual([]);
  });

  it("states no verdict on a company", () => {
    expect(draftReply()).not.toMatch(/\b(?:scam|scammer|fraud|fraudulent|fake|illegal|criminal)\b/i);
  });

  it("has no placeholders left to fill", () => {
    expect(draftReply()).not.toMatch(/[{}[\]<>]/);
  });
});

describe("drafter and score", () => {
  it("leaves the score unchanged", () => {
    const before = scoreOnly(SCAM_OFFER);
    const flow = gateReducer(INITIAL_GATE_FLOW, { type: "prepare", at: "t" });
    gateReducer(flow, { type: "approve", copied: true, at: "t" });
    expect(scoreOnly(SCAM_OFFER)).toEqual(before);
  });

  it.each(["src/lib/agents/manager.ts", "src/lib/agents/redFlag.ts", "src/lib/scoring.ts"])(
    "stays out of %s",
    (file) => {
      expect(readFileSync(join(process.cwd(), file), "utf8")).not.toMatch(/drafter|approvalGate/);
    },
  );
});
