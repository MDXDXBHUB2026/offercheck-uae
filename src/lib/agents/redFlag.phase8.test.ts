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

describe("GAP-5: an employer-covers line does not clear the next line", () => {
  it("documented shape: the next line asks the candidate to pay", () => {
    expect(
      outcome("Visa and flights are covered by the company\nThe candidate must transfer AED 900 for processing"),
    ).toMatchObject({ score: 60, band: "high", ruleIds: ["RF-001"] });
  });

  it.each([
    "Flights are paid by the company\nYou settle the medical fee of AED 400",
    "Accommodation is free of charge\nA training fee of AED 650 is due before joining",
  ])("fires on the request on the next line: %j", (text) => {
    expect(ruleIds(text)).toEqual(["RF-001"]);
  });

  it.each([
    "Benefits:\nVisa, medical insurance and air tickets\nare paid by the company\nAccommodation is free of charge",
    "Your visa fee, medical test and Emirates ID\nare covered by the employer",
    "Relocation costs are covered by the company\nYour salary is transferred through WPS every month",
  ])("keeps a multi-line benefits list paid by the employer at 0: %j", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });
});

describe("GAP-6: fee wording aimed at the candidate with no payment verb", () => {
  it("documented example fires RF-001", () => {
    expect(outcome("Do not forget the processing fee")).toMatchObject({
      score: 60,
      band: "high",
      ruleIds: ["RF-001"],
    });
  });

  it.each([
    "Security deposit: AED 2,000",
    "Remember the registration fee before your interview",
    "Please keep the documentation fee ready for Monday",
  ])("fires: %s", (text) => {
    expect(ruleIds(text)).toEqual(["RF-001"]);
  });

  it.each([
    ["Security deposit", []],
    ["No security deposit is required", ["RF-001-W"]],
    ["Do not forget that there is no processing fee", ["RF-001-W"]],
    ["Remember that the registration fee is covered by the company", []],
    ["Do not forget your salary deposit date", []],
  ])("stays 0: %s", (text, infoIds) => {
    expect(outcome(text as string)).toMatchObject({ score: 0, ruleIds: [], infoIds });
  });
});

describe("GAP-4: warning mentions are handled the same way", () => {
  it.each([
    "Beware of agents who charge a fee",
    "Beware of agents asking for a processing fee",
    "There is no agency fee",
    "Watch out for recruiters asking for a deposit",
    "There are no registration charges",
  ])("gives the 0-point information finding and no points: %s", (text) => {
    expect(outcome(text)).toEqual({ score: 0, band: "low", ruleIds: [], infoIds: ["RF-001-W"] });
  });

  it.each([
    "There is no agency fee but pay AED 500 for the medical test",
    "There is no agency fee: AED 500",
    "Beware of delays and pay the processing fee of AED 500 to our agent",
  ])("a real ask beside the warning wording still fires: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 60, band: "high", ruleIds: ["RF-001"] });
  });
});

// GAP-2 is closed by design, not by a rule change: in the documented sentence the employer is the
// payer of the whole list, so 0 is right. The real risk is an ask with its own verb beside it.
describe("GAP-2: a list paid by the employer, and a real ask beside one", () => {
  it.each([
    "The visa fee of AED 500 and flights are paid by the company",
    "The visa fee of AED 500 and the medical fee are paid by the company",
    "The visa fee, medical test and flights are covered by the employer",
  ])("stays 0 when the employer pays the whole list: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });

  it.each([
    "Pay the visa fee of AED 500, and flights are paid by the company",
    "You pay the visa fee of AED 500 and flights are paid by the company",
    "Transfer AED 500 for the visa, and the hotel is paid by the company",
  ])("fires on an ask with its own verb: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 60, band: "high", ruleIds: ["RF-001"] });
  });
});

describe("QA-14: over-matches", () => {
  it.each([
    "Do not trust anyone using hr.fake@gmail.com",
    "Beware of messages from jobs.offer.uae@gmail.com",
    "Scammers use addresses like recruit.dxb@yahoo.com",
  ])("a free email named in a warning gives no RF-005 points: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });

  it.each([
    "Contact us at jobs.hr@gmail.com",
    "Send your CV to hr.jobs@gmail.com, do not trust anyone else",
    "Do not trust anyone except our recruiter at hr.desk@gmail.com",
  ])("the offer's own free-email contact still fires RF-005: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 20, ruleIds: ["RF-005"] });
  });

  it.each([
    "Please reply today if you have any questions about the benefits",
    "Feel free to contact us today with any questions",
    "You may respond today if you need any clarification",
  ])("an invitation to ask questions gives no RF-004 points: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });

  it.each([
    "Reply today or the offer is cancelled",
    "Reply today to confirm your seat",
    "Contact us now to secure your slot",
  ])("pressure to reply still fires RF-004: %s", (text) => {
    expect(outcome(text)).toMatchObject({ score: 20, ruleIds: ["RF-004"] });
  });
});

describe("QA-6: hidden characters and look-alike letters", () => {
  // Built from escape sequences, so this file holds no invisible or look-alike characters.
  const CYR = { a: "а", e: "е", o: "о", i: "і", A: "А" };
  const fullwidth = (text: string) =>
    [...text].map((c) => (c >= "!" && c <= "~" ? String.fromCharCode(c.charCodeAt(0) + 0xfee0) : c)).join("");

  it.each([
    ["Cyrillic letters inside Latin words", `P${CYR.a}y the pr${CYR.o}cessing f${CYR.e}${CYR.e}`],
    ["fullwidth letters", fullwidth("Pay the visa fee")],
    ["a combining grapheme joiner inside fee", "Pay the visa f͏ee"],
    ["invisible operators inside visa fee", "Pay the vi⁡⁢sa f⁣e⁤e"],
  ])("fires RF-001 through %s", (_name, text) => {
    expect(outcome(text)).toMatchObject({ score: 60, band: "high", ruleIds: ["RF-001"] });
  });

  it("quotes the words as typed, look-alike letters and all", () => {
    const text = `P${CYR.a}y the pr${CYR.o}cessing f${CYR.e}${CYR.e}`;
    expect(runManager(text).findings[0].evidence).toEqual([text]);
  });

  it.each([
    ["Russian", "Оплатите сбор AED 500"],
    ["an all-Cyrillic word that looks like pay", "рау the visa"],
    ["Greek", "Πληρωμή τέλους"],
  ])("leaves %s alone and gives no points", (_name, text) => {
    expect(outcome(text)).toMatchObject({ score: 0, ruleIds: [] });
  });
});

describe("QA-11: input made only of hidden characters is empty", () => {
  it("the page blocks it with the existing empty-input reason", async () => {
    const { checkBlockedReason } = await import("../../components/OfferChecker");
    for (const text of ["​​", "﻿ ⁡\n͏"]) {
      expect(checkBlockedReason(text, true)).toBe(checkBlockedReason("", true));
      expect(checkBlockedReason(text, false)).toBe(checkBlockedReason("", false));
    }
    expect(checkBlockedReason("​Pay the fee", true)).toBe("");
  });
});
