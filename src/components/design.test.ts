import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";
import { EVAL_OFFERS } from "@/lib/agents/eval/offers";
import { HOLDOUT_OFFERS } from "@/lib/agents/eval/holdout";
import { HOLDOUT_2_OFFERS } from "@/lib/agents/eval/holdout2";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import type { Finding, Severity } from "@/lib/types";
import { readLimitations } from "./limitations";
import { OfferChecker } from "./OfferChecker";
import { ResultsPanel } from "./ResultsPanel";
import { scoreArithmetic } from "./scoreArithmetic";
import { ScoreGauge } from "./ScoreGauge";

const ALL_TEXTS = [
  SCAM_OFFER,
  LEGIT_OFFER,
  ...[...EVAL_OFFERS, ...HOLDOUT_OFFERS, ...HOLDOUT_2_OFFERS].map((offer) => offer.text),
];

function finding(severity: Severity, source: string): Finding {
  return { agent: "red_flag", check: "x", severity, evidence: [], confidence: "rule", source };
}

describe("score arithmetic", () => {
  // scoreArithmetic returns null whenever its sum does not end on the server's score, so a line
  // for every offer with a counted rule shows that the line and the real score always agree.
  it.each(ALL_TEXTS.map((text, index) => [index, text] as const))(
    "offer %i: a line is shown exactly when a rule counted, and it agrees with the score",
    (_index, text) => {
      const { findings, risk } = runManager(text);
      const counted = findings.some((f) => f.severity !== "info");
      const line = scoreArithmetic(findings, risk);
      expect(line === null).toBe(!counted);
    },
  );

  it("writes the sum, the cap and the high-severity floor in words", () => {
    const risk = (score: number) => ({ score, band: "high" as const, label: "" });
    const four = [finding("high", "a"), finding("medium", "b"), finding("medium", "c"), finding("medium", "d")];
    expect(scoreArithmetic(four, risk(100))).toBe("40 + 20 + 20 + 20 = 100");
    const three = [finding("high", "a"), finding("high", "b"), finding("high", "c")];
    expect(scoreArithmetic(three, risk(100))).toBe("40 + 40 + 40 = 120, capped at 100");
    expect(scoreArithmetic([finding("high", "a"), finding("info", "w")], risk(60))).toBe(
      "40 points from 1 rule, raised to 60 because a high-severity rule matched",
    );
  });

  it("shows nothing rather than a number that disagrees with the server's score", () => {
    expect(scoreArithmetic([finding("medium", "a")], { score: 35, band: "medium", label: "" })).toBeNull();
  });
});

describe("score gauge", () => {
  it("is decorative, and the score and band are text", () => {
    const risk = { score: 80, band: "high" as const, label: "High risk indicators" };
    const html = renderToStaticMarkup(createElement(ScoreGauge, { risk }));
    expect(html).toMatch(/<svg[^>]*aria-hidden="true"/);
    expect(html).toContain(">80<");
    expect(html).toContain("High risk indicators");
  });

  it("draws no value arc for a score of 0", () => {
    const risk = { score: 0, band: "low" as const, label: "No risk indicators found" };
    expect(renderToStaticMarkup(createElement(ScoreGauge, { risk }))).not.toContain("gauge-value");
  });
});

describe("results panel design", () => {
  it("shows no time except the measured durations", () => {
    const result = runManager(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5 }));
    const measured = result.trace.flatMap((step) =>
      step.durationMs === null ? [] : [`${step.durationMs.toFixed(2)} ms`],
    );
    expect((html.match(/\d+(?:\.\d+)? ms/g) ?? []).sort()).toEqual(measured.sort());
    expect(html).toContain("risk indicators, not a verdict");
  });
});

describe("limitations panel", () => {
  it("reads its text from docs/known-limitations.md", () => {
    const doc = readFileSync(join(process.cwd(), "docs", "known-limitations.md"), "utf8");
    const { intro, items } = readLimitations();
    expect(doc).toContain(intro);
    expect(items.length).toBeGreaterThan(0);
    for (const part of items.flat()) expect(doc).toContain(part.text);
  });

  it("is on the page", () => {
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toContain("What this check cannot do");
    expect(html).toContain("Look-alike letters can slip past cleaning.");
  });
});

describe("sample buttons", () => {
  it("are real buttons for the three synthetic samples", () => {
    const html = renderToStaticMarkup(createElement(Home));
    for (const label of ["Fee scam", "Clean offer", "Injection attempt"]) {
      expect(html).toContain(`<button type="button" class="secondary sample">${label}</button>`);
    }
  });

  it("are left out when no samples are given", () => {
    expect(renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }))).not.toContain("samples");
  });
});
