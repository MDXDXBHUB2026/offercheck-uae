import { describe, expect, it } from "vitest";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { runManager } from "./agents/manager";
import { REDACTED, redactSensitive } from "./redact";

// Synthetic numbers only, made up for this test.
describe("redactSensitive (Auto-Redact)", () => {
  it("removes an Emirates ID with or without dashes", () => {
    expect(redactSensitive("ID 784-1990-1234567-1 here").text).toBe(`ID ${REDACTED} here`);
    expect(redactSensitive("ID 784199012345671").count).toBe(1);
  });

  it("removes a UAE IBAN, with or without spaces", () => {
    expect(redactSensitive("IBAN AE070331234567890123456").text).toBe(`IBAN ${REDACTED}`);
    expect(redactSensitive("AE07 0331 2345 6789 0123 456").count).toBe(1);
  });

  it("removes a passport number of one letter and 7 or 8 digits", () => {
    expect(redactSensitive("Passport no. N1234567, valid").text).toBe(`Passport no. ${REDACTED}, valid`);
  });

  it("counts every number it removes and leaves other text alone", () => {
    const { text, count } = redactSensitive("Salary AED 12,000. ID 784-1990-1234567-1, passport K12345678.");
    expect(count).toBe(2);
    expect(text).toContain("Salary AED 12,000.");
  });

  it("is deterministic", () => {
    const input = "784-1990-1234567-1 and A1234567";
    expect(redactSensitive(input)).toEqual(redactSensitive(input));
  });

  it("never adds a finding: the placeholder alone matches no rule", () => {
    expect(runManager(`Hello ${REDACTED} ${REDACTED}`).findings).toEqual([]);
  });

  it("does not change the band of the UI samples", () => {
    for (const sample of SAMPLE_OFFERS) {
      expect(runManager(redactSensitive(sample.text).text).risk.band).toBe(runManager(sample.text).risk.band);
    }
  });
});
