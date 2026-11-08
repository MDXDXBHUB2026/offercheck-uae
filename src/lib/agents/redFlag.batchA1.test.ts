import { describe, expect, it } from "vitest";
import { scoreFindings } from "../scoring";
import { runRedFlagWorker } from "./redFlag";

// Batch A.1: follow-ups to Batch A. Synthetic texts only; no holdout case is read here.
const sources = (text: string) => runRedFlagWorker(text).map((finding) => finding.source);
const scored = (text: string) => {
  const { score, band } = scoreFindings(runRedFlagWorker(text));
  return { score, band, sources: sources(text) };
};

describe("A.1 item 1: a card detail anywhere in the sentence, within 60 characters", () => {
  it.each([
    "Send a photo of your card, front and back.",
    "Upload a picture of your card, showing the expiry date.",
    "Send a scan of the card, with the CVV visible.",
    "Front and back, please send a photo of your card.",
  ])("flags credentials: %j", (text) => {
    expect(scored(text)).toEqual({ score: 60, band: "high", sources: ["RF-002"] });
  });

  it.each([
    ["an ID card", "Send a photo of your ID card, front and back."],
    ["the detail in the next sentence", "Send a photo of your card. We print the front and back of your badge."],
    ["the detail beyond 60 characters", `Send a photo of your card,${" for our records and our onboarding file".repeat(2)}, front and back.`],
  ])("not flagged (%s): %j", (_why, text) => {
    expect(sources(text)).toEqual([]);
  });

  it("negation: never asking for a card photo stays a warning", () => {
    expect(sources("We will never ask for a photo of your card, front and back.")).toEqual(["RF-002-W"]);
  });

  it.each([
    ["the detail in another sentence", "Send a photo of your card. Make sure the CVV is visible."],
    ["no image word", "Snap your card and send it."],
  ])("known residual (%s): %j is not flagged", (_why, text) => {
    expect(sources(text)).toEqual([]);
  });
});

describe("A.1 item 2: a code to enter on a link", () => {
  it.each([
    "Enter the code we send you on the link below.",
    "Click the link and enter the 6-digit code.",
    "Type the OTP into the link we WhatsApp you.",
    "Input the code at www.hr-verify.example.com to confirm.",
    "Submit the verification code at https://jobs.example.com/verify today.",
    "Enter your PIN on WhatsApp to activate your profile.",
  ])("flags credentials: %j", (text) => {
    expect(scored(text)).toEqual({ score: 60, band: "high", sources: ["RF-002"] });
  });

  it.each([
    "Enter the code we send you on our portal.",
    "Enter the code on our careers website to finish your application.",
    "Please type your name in the link form.",
    "The dress code is on the link below.",
    "Enter your details using the link below.",
  ])("not flagged: %j", (text) => {
    expect(sources(text)).toEqual([]);
  });

  it.each([
    "Never enter the code on any link from a stranger.",
    "Do not click unknown links or enter the code they send.",
  ])("negation stays a warning: %j", (text) => {
    expect(sources(text)).toEqual(["RF-002-W"]);
  });

  it.each([
    ["indirect wording", "What number did you get by SMS?"],
    ["a form with no link", "Type the code into the form we emailed you."],
  ])("known residual (%s): %j is not flagged", (_why, text) => {
    expect(sources(text)).toEqual([]);
  });
});

// Owner's probe set before the commit.
describe("A.1 item 2: owner probes", () => {
  it.each([
    ["Don't wait, click the link and enter the code we send you", 60, "high", ["RF-002"]],
    ["Do not click unknown links or enter the code they send", 0, "low", ["RF-002-W"]],
    ["Click the link below and type the OTP", 60, "high", ["RF-002"]],
    // The first sentence is a separate negated warning (0 points); the second is the ask.
    ["Never share your OTP. Click the link and enter the code", 60, "high", ["RF-002", "RF-002-W"]],
  ] as const)("%j scores %i, %s", (text, score, band, expected) => {
    expect(scored(text)).toEqual({ score, band, sources: expected });
  });
});

describe("A.1 item 3: provides as a list head", () => {
  it.each([
    "The company provides visa and medical fees of AED 500.",
    "We provide your flight, accommodation charges of AED 1,500 and transport.",
    "The employer will provide your work permit and insurance fees of AED 800.",
  ])("no fee request: %j", (text) => {
    expect(sources(text)).not.toContain("RF-001");
  });

  it.each([
    "The company provides visa and processing charges AED 2,500.",
    "The company provides visa and training fees of AED 900.",
    "The company provides visa and medical fees of AED 500 payable before joining.",
    "The company sponsors your visa and medical fees of AED 500.",
  ])("still fires: %j", (text) => {
    expect(scored(text)).toMatchObject({ band: "high", sources: ["RF-001"] });
  });

  it("negation: a negated head covers nothing", () => {
    expect(scored("The company never provides visa and medical fees of AED 500.")).toMatchObject({
      band: "high",
      sources: ["RF-001"],
    });
  });

  it.each([
    ["arranges is not a head", "The company arranges visa and medical fees of AED 500."],
    ["sponsors stays out", "The company sponsors your visa and medical fees of AED 500."],
  ])("known residual (%s): %j still scores High", (_why, text) => {
    expect(scored(text)).toMatchObject({ band: "high", sources: ["RF-001"] });
  });
});

describe("A.1 performance on 50,000 characters", () => {
  const SIZE = 50_000;
  const fill = (unit: string) => unit.repeat(Math.ceil(SIZE / unit.length)).slice(0, SIZE);
  it.each([
    ["card, comma", fill("photo of your card, ")],
    ["card, no cue, no stop", fill("photo of your card and ")],
    ["cue then card", fill("front and back, photo of the card ")],
    ["enter the code", fill("enter the code ")],
    ["enter the code, no stop", fill("enter the code on our portal, ")],
    ["link words", fill("link click url www. https:// enter the pin ")],
    ["negated click", fill("do not click links or enter the code ")],
    ["provides chain", `The company provides ${fill("visa and ")}`],
    ["provides before every fee", fill("We provide visa and medical fees of AED 500 and ")],
  ])("%s", (_name, input) => {
    const start = performance.now();
    runRedFlagWorker(input);
    expect(performance.now() - start).toBeLessThan(1000);
  });
});
