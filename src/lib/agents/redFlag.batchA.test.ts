import { describe, expect, it } from "vitest";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, scoreFindings } from "../scoring";
import { runRedFlagWorker } from "./redFlag";

// Batch A (GAP-1, H21, GAP-7). Synthetic texts only; no holdout case is read here.
const sources = (text: string) => runRedFlagWorker(text).map((finding) => finding.source);
const scored = (text: string) => {
  const { score, band } = scoreFindings(runRedFlagWorker(text));
  return { score, band, sources: sources(text) };
};

describe("Batch A case 1 (GAP-1): an employer named at the start of a list covers its cost items", () => {
  it.each([
    "The company covers visa and medical fees of AED 500.",
    "The company covers visa, medical fees of AED 500 and flights.",
    "We will pay for your visa and the medical fee of AED 300.",
    "The employer covers your flight and accommodation charges of AED 1,500.",
    "The company pays for your work permit and insurance fees of AED 800.",
    "The company covers your Emirates ID and transport costs of AED 400.",
  ])("no fee request: %j", (text) => {
    expect(sources(text)).not.toContain("RF-001");
  });

  // Owner rule: a fee noun in the carried item always fires, and "sponsors" is not a list head.
  it.each([
    "The company sponsors your visa and processing charges AED 2,500.",
    "The company covers visa and processing fees of AED 500.",
    "The company covers your visa and registration fee of AED 300.",
    "The company covers visa, medical and the security deposit of AED 1,000.",
    "The company covers your visa and training fees of AED 900.",
    "The company covers visa and fees of AED 500.",
  ])("fee noun, no cost noun or no list head still fires: %j", (text) => {
    expect(scored(text)).toMatchObject({ band: "high", sources: ["RF-001"] });
  });

  it.each([
    "The company covers visa and you pay the medical fee of AED 500.",
    "The company covers visa and medical fees of AED 500 payable before joining.",
    "The company covers visa and medical fees of AED 500 which must be paid by you.",
    "The company covers visa and medical fees of AED 500 (to be deposited by candidate).",
    "The company covers visa and medical fees of AED 500 upfront.",
    "The company covers visa and medical fees of AED 500, refundable after joining.",
    "The company covers visa and medical fees of AED 500. Transfer AED 500 to confirm your slot.",
  ])("a candidate ask in the text still fires: %j", (text) => {
    expect(sources(text)).toContain("RF-001");
  });

  it("negation: a negated ask stays a warning", () => {
    expect(sources("We never ask you to pay visa or medical fees of AED 500.")).toEqual(["RF-001-W"]);
  });

  it("negation: a negated list head covers nothing", () => {
    expect(scored("We never cover visa and medical fees of AED 500.")).toMatchObject({ band: "high", sources: ["RF-001"] });
  });

  // Known residuals: current behaviour, kept visible. Each one still scores High.
  it.each([
    ["a cover verb outside the list", "The company arranges visa and medical fees of AED 500."],
    ["sponsors is not a list head", "The company sponsors your visa and medical fees of AED 500."],
    ["the head is in an earlier sentence", "We cover the following. Visa and medical fees of AED 500."],
    [
      "the list is longer than the reach",
      `The company covers visa${", flights to your home city every year".repeat(5)} and medical fees of AED 500.`,
    ],
    ["a timing word ends the list", "The company covers your visa and medical fees of AED 500 before joining."],
  ])("known residual (%s): %j still scores High", (_why, text) => {
    expect(scored(text)).toMatchObject({ band: "high", sources: ["RF-001"] });
  });
});

describe("Batch A case 2 (H21): a request to share a code that is sent to you", () => {
  it.each([
    "Please share the code we send you.",
    "Share the 6-digit code we send you so we can verify your profile.",
    "Share the 6-digit code we will send to your phone.",
    "Share the PIN you will receive by SMS.",
    "Forward the OTP we send you.",
    "Reply with the code we text you.",
    "Send us the passcode that we email you.",
    "Share the code you get on WhatsApp.",
  ])("flags credentials: %j", (text) => {
    expect(scored(text)).toMatchObject({ score: 60, band: "high", sources: ["RF-002"] });
  });

  it.each([
    "We will send you a verification code to confirm your email address.",
    "You will receive a one-time code to log in to the careers portal.",
    "Enter the code we send you on our portal.",
    "We will send you the offer letter by email.",
  ])("a code that comes to you with no ask is not flagged: %j", (text) => {
    expect(sources(text)).not.toContain("RF-002");
  });

  it("negation: never share the code stays a warning", () => {
    expect(sources("Never share the code we send you with anyone.")).toEqual(["RF-002-W"]);
  });

  it.each([
    ["indirect wording", "What number did you get by SMS?"],
  ])("known residual (%s): %j is not flagged", (_why, text) => {
    expect(sources(text)).toEqual([]);
  });
});

describe("Batch A case 3 (GAP-7): a request for a photo of a payment card", () => {
  it("the A3 text now scores High with the credentials and documents rules", () => {
    expect(
      scored("Send your passport copy, Emirates ID and a photo of your bank card today, before any interview."),
    ).toEqual({ score: 60, band: "high", sources: ["RF-002", "RF-003"] });
  });

  it.each([
    "Send a photo of your bank card.",
    "Upload a picture of the front and back of your debit card.",
    "Email a scan of your credit card.",
    "WhatsApp us your debit card photo.",
    "Send a photo of your Mastercard.",
    "Upload a copy of your Visa card.",
    "Send a photo of the front and back of your card.",
    "Send a photo of your card showing the CVV and expiry date.",
    "Send a clear picture of your card with the PIN.",
  ])("flags credentials: %j", (text) => {
    expect(sources(text)).toEqual(["RF-002"]);
  });

  it.each([
    ["visa alone", "Send a photo of your visa.", []],
    ["a card with no detail named", "Send a photo of your card.", []],
    ["an ID card", "Send a photo of the front and back of your Emirates ID card.", ["RF-003"]],
    ["a labour card", "Bring a copy of your labour card on the first day.", []],
  ])("not a payment card request (%s): %j", (_why, text, expected) => {
    expect(sources(text)).toEqual(expected);
  });

  it("negation: a card photo the employer never asks for stays a warning", () => {
    expect(sources("We will never ask for a photo of your bank card.")).toEqual(["RF-002-W"]);
  });

  it.each([
    ["no card type", "Snap your card and send it."],
    ["a brand name alone", "Send a photo of your Visa."],
    ["a video", "Send a video of your bank card."],
  ])("known residual (%s): %j is not flagged", (_why, text) => {
    expect(sources(text)).toEqual([]);
  });

  // Band design: decided, no threshold change. A single medium rule still scores 20, Low.
  it("keeps the band thresholds", () => {
    expect([HIGH_BAND_MIN, MEDIUM_BAND_MIN]).toEqual([60, 30]);
    expect(scored("Send your passport copy today.")).toEqual({ score: 20, band: "low", sources: ["RF-003"] });
  });
});

// Every new or changed pattern on 50,000 characters of adversarial input.
describe("Batch A performance", () => {
  const SIZE = 50_000;
  const fill = (unit: string) => unit.repeat(Math.ceil(SIZE / unit.length)).slice(0, SIZE);
  it.each([
    ["list head, and-chain", `The company covers ${fill("visa and ")}`],
    ["list head, comma chain", `The company covers ${fill("visa, ")}medical fees of AED 500`],
    ["list head before every fee", fill("The company covers visa and medical fees of AED 500 and ")],
    ["list head with no stop", fill("company covers medical fee AED 1, ")],
    ["fee nouns", fill("processing medical security fee AED 5 and ")],
    ["sentence stops", fill("covers. fee AED 5 and ")],
    ["code we send", fill("share the code we send ")],
    ["code words", fill("code pin otp passcode we you ")],
    ["share verbs", fill("share forward reply with ")],
    ["photo of", fill("photo of ")],
    ["photo of the front and back of", fill("photo of the front and back of ")],
    ["card cues", fill("photo of your card ")],
    ["cue then card", fill("cvv pin expiry photo of the card ")],
    ["bank card words", fill("bank card debit cards visa card mastercard ")],
  ])("%s", (_name, input) => {
    const start = performance.now();
    runRedFlagWorker(input);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
