import { SAMPLE_OFFERS } from "./sampleOffers";

// The hero's "Example findings" card. Demo data: the values are read from the app's own synthetic
// "Visa fee before joining" sample (sampleOffers.ts), never typed here, so the card and the sample
// cannot drift apart (a test checks it). No rule IDs, law articles, percentages or real employers.

export const HERO_SAMPLE_NAME = "Visa fee before joining";

export type HeroExample = {
  tone: "high" | "medium" | "green";
  label: string;
  // An English template for t(); {0} is filled with arg.
  value: string;
  arg?: string;
};

export function heroSampleText(): string {
  const sample = SAMPLE_OFFERS.find((offer) => offer.name === HERO_SAMPLE_NAME);
  if (!sample) throw new Error(`Sample "${HERO_SAMPLE_NAME}" is missing from sampleOffers.ts`);
  return sample.text;
}

// The amount on the line that asks for a fee, such as "AED 1,950". The salary line is skipped.
export function feeAmount(text: string): string {
  const line = text.split("\n").find((candidate) => /\bfee\b/i.test(candidate)) ?? "";
  const amount = /AED [\d,]+/.exec(line)?.[0];
  if (!amount) throw new Error("The hero sample has no fee amount");
  return amount;
}

// The domain of the sender's address on the From line, such as "gmail.com".
export function senderDomain(text: string): string {
  const from = text.split("\n").find((line) => line.startsWith("From:")) ?? "";
  const domain = /@([a-z0-9.-]+\.[a-z]{2,})/i.exec(from)?.[1];
  if (!domain) throw new Error("The hero sample has no sender address");
  return domain.toLowerCase();
}

export function heroExamples(text: string = heroSampleText()): HeroExample[] {
  return [
    { tone: "high", label: "Fee asked before joining", value: "{0}", arg: feeAmount(text) },
    { tone: "medium", label: "Free email sender", value: "{0} address", arg: senderDomain(text) },
    { tone: "green", label: "MoHRE reference", value: "check on the MoHRE site" },
  ];
}
