import { describe, expect, it } from "vitest";
import { SCAM_OFFER } from "./agents/fixtures";
import { runManager } from "./agents/manager";
import { highlightParts } from "./highlight";

describe("highlightParts", () => {
  it("keeps the text intact: the parts join back to the original", () => {
    const { findings } = runManager(SCAM_OFFER);
    const specs = findings.flatMap((f) => f.evidence.map((quote) => ({ quote, level: "High" as const, label: f.check })));
    const parts = highlightParts(SCAM_OFFER, specs);
    expect(parts.map((part) => part.text).join("")).toBe(SCAM_OFFER);
    expect(parts.filter((part) => part.mark).length).toBeGreaterThan(0);
  });

  // Quotes can repeat or sit inside another quote (the email inside the sentence that holds it), so
  // the check is on characters: every character of every quote lies inside a marked part.
  it("marks every evidence quote of the scam fixture in the text", () => {
    const { findings } = runManager(SCAM_OFFER);
    const quotes = findings.flatMap((f) => f.evidence);
    const parts = highlightParts(SCAM_OFFER, quotes.map((quote) => ({ quote, level: "High", label: "x" })));
    const covered: boolean[] = parts.flatMap((part) => Array.from(part.text, () => Boolean(part.mark)));
    for (const quote of quotes) {
      const at = SCAM_OFFER.toLowerCase().indexOf(quote.trim().toLowerCase());
      expect(at).toBeGreaterThan(-1);
      expect(covered.slice(at, at + quote.trim().length).every(Boolean)).toBe(true);
    }
  });

  it("matches without case, skips very short quotes and quotes not in the text", () => {
    const parts = highlightParts("Pay the FEE now", [
      { quote: "the fee", level: "High", label: "a" },
      { quote: "no", level: "Low", label: "b" },
      { quote: "missing", level: "Low", label: "c" },
    ]);
    expect(parts).toEqual([
      { text: "Pay " },
      { text: "the FEE", mark: { level: "High", label: "a" } },
      { text: " now" },
    ]);
  });

  it("returns markup-looking text as plain text parts", () => {
    const text = "<img src=x onerror=alert(1)> pay a fee";
    const parts = highlightParts(text, [{ quote: "pay a fee", level: "High", label: "a" }]);
    expect(parts[0].text).toBe("<img src=x onerror=alert(1)> ");
  });
});
