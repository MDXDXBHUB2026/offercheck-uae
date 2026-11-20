import { describe, expect, it } from "vitest";
import { MAX_OFFER_CHARS } from "../types";
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

describe("H38: card number, expiry date or CVV asked for in any order", () => {
  it("documented text fires RF-002", () => {
    expect(outcome("We need your card number, expiry date and CVV to set up your salary account.")).toMatchObject({
      score: 60,
      band: "high",
      ruleIds: ["RF-002"],
    });
  });

  it.each([
    "We need your card number, expiry date and CVV",
    "Please provide the CVV and expiry of your card",
    "Your card details including CVV are needed",
    // Our own.
    "We require your card number and CVV for payroll",
    "Kindly send us the expiry date, card number and CVV",
    "We need your card number and expiry date to add you to payroll",
  ])("fires RF-002: %s", (text) => {
    expect(ruleIds(text)).toContain("RF-002");
  });

  it.each([
    "Never share your card number or CVV with anyone",
    "We will never ask for your CVV",
    // Our own: an ID or labour card, a passport, and a negated need.
    "We need your Emirates ID card number and expiry date",
    "We need your labour card number and its expiry date",
    "We need your passport number and expiry date",
    "Our team will never need your card number or CVV",
  ])("does not fire RF-002: %s", (text) => {
    expect(ruleIds(text)).not.toContain("RF-002");
  });
});

describe("H36: a booking, registration or processing amount the candidate must pay", () => {
  it("documented text fires RF-001", () => {
    expect(
      outcome("A medical test booking amount of 600 dirhams must be paid by the candidate to our agent"),
    ).toMatchObject({ score: 60, band: "high", ruleIds: ["RF-001"] });
  });

  it.each([
    // Our own.
    "The registration amount of AED 450 is payable by the candidate before the interview",
    "A processing amount must be paid by you before visa stamping",
    "The booking charge is to be paid by the candidate at the clinic",
  ])("fires RF-001: %s", (text) => {
    expect(ruleIds(text)).toEqual(["RF-001"]);
  });

  it.each([
    "Medical test cost is paid by the company",
    "The employer pays the booking amount",
    // Our own.
    "The booking amount for the medical test is paid by the company",
    "The registration amount is payable by the employer",
    "Your booking amount has been paid by the company",
  ])("does not fire: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });
});

// Round 2 runtime: every new pattern on long and repeated input at the maximum size, through the whole
// run. Same 1000ms limit as the existing maximum-size tests.
export const ROUND2_FUZZ_INPUTS: [string, string][] = (() => {
  const fill = (unit: string) => unit.repeat(Math.floor(MAX_OFFER_CHARS / unit.length));
  return [
    ["H53 no list, never closed", fill("no deposit, fee, ")],
    ["H53 no list, closed each time", fill("No deposit, fee or payment is required ")],
    ["H53 no list with modifiers", fill("no a b fee, c d fee or e f ")],
    ["H53 list broken by a determiner", fill("No deposit, the fee ")],
    ["H53 fee is required with no list", fill("fee or payment is required, ")],
    ["H38 card number asked, repeated", fill("We need your card number ")],
    ["H38 ask with no card item", fill("need your a b c ")],
    ["H38 expiry asked, cue far away", fill("send us the expiry, ")],
    ["H38 ID card number", fill("need your Emirates ID card number and expiry ")],
    ["H36 booking amount, never paid", fill("booking amount ")],
    ["H36 registration charge with an amount", fill("registration charge of AED 500 ")],
    ["H36 must be paid by the company", fill("processing amount must be paid by the company ")],
  ];
})();

describe("Round 2 runtime", () => {
  it.each(ROUND2_FUZZ_INPUTS)("%s: maximum-size input runs in under 1000ms", (_name, input) => {
    expect(input.length).toBeLessThanOrEqual(MAX_OFFER_CHARS);
    expect(input.length).toBeGreaterThan(MAX_OFFER_CHARS - 60);
    const start = performance.now();
    runManager(input);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
