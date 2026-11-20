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
