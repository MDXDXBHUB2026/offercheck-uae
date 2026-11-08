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
import { PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "./publicLimitations";
import { OfferChecker, resultAnnouncement } from "./OfferChecker";
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

// UX-1 (post-deploy manual test A4): a low band with a finding or a warning showed the green chip,
// which can read as "safe". The green "No risk indicators found" chip is kept only for a score of
// 0 with no finding and no warning. Synthetic texts.
describe("score chip states (UX-1)", () => {
  const A4_TEXT = "Reply within 2 hours or this offer is cancelled. Only 3 slots left.";
  const WARNING_ONLY = "Beware of agents who charge a fee.";
  const MEDIUM_TEXT = "Send your passport copy. Reply within 2 hours.";
  const REVIEW = "Low, review the findings below";
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf("results-main"));
  const chipOf = (text: string) => {
    const result = runManager(text);
    const side = scoreSide(renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5 })));
    return { result, side, chip: side.match(/<p class="chip score-label">([^<]*)<\/p>/)?.[1] };
  };

  it("A4 scores 20, low, with RF-004 only", () => {
    const result = runManager(A4_TEXT);
    expect(result.risk).toMatchObject({ score: 20, band: "low" });
    expect(result.findings.filter((f) => f.severity !== "info").map((f) => f.source)).toEqual(["RF-004"]);
  });

  it("score 0, no finding, no warning: the green 'No risk indicators found' chip", () => {
    const { result, side, chip } = chipOf(LEGIT_OFFER);
    expect(result.risk.score).toBe(0);
    expect(result.findings).toEqual([]);
    expect(chip).toBe("No risk indicators found");
    expect(side).not.toContain("score-caution");
  });

  it("low with a finding: the amber chip, never 'No risk indicators found'", () => {
    const { result, side, chip } = chipOf(A4_TEXT);
    expect(result.risk.band).toBe("low");
    expect(chip).toBe(REVIEW);
    expect(side).toContain("score-caution");
    expect(side).not.toContain("No risk indicators found");
    expect(side).not.toContain("Low risk indicators");
  });

  it("low with a warning only (score 0): the amber chip, never 'No risk indicators found'", () => {
    const { result, side, chip } = chipOf(WARNING_ONLY);
    expect(result.risk.score).toBe(0);
    expect(result.findings.length).toBeGreaterThan(0);
    expect(result.findings.every((f) => f.severity === "info" && f.source.endsWith("-W"))).toBe(true);
    expect(chip).toBe(REVIEW);
    expect(side).toContain("score-caution");
    expect(side).not.toContain("No risk indicators found");
  });

  it("medium: the medium chip, unchanged", () => {
    const { result, side, chip } = chipOf(MEDIUM_TEXT);
    expect(result.risk.band).toBe("medium");
    expect(chip).toBe("Medium risk indicators");
    expect(side).not.toContain("score-caution");
  });

  it("high: the high chip, unchanged", () => {
    const { result, side, chip } = chipOf(SCAM_OFFER);
    expect(result.risk.band).toBe("high");
    expect(chip).toBe("High risk indicators");
    expect(side).not.toContain("score-caution");
  });

  it("keeps 'risk indicators, not a verdict' on the score card in every state", () => {
    for (const text of [LEGIT_OFFER, A4_TEXT, WARNING_ONLY, MEDIUM_TEXT, SCAM_OFFER]) {
      expect(chipOf(text).side).toContain("risk indicators, not a verdict");
    }
  });

  it("announces the same wording as the chip to screen readers", () => {
    for (const text of [LEGIT_OFFER, A4_TEXT, WARNING_ONLY, MEDIUM_TEXT, SCAM_OFFER]) {
      const { result, chip } = chipOf(text);
      expect(resultAnnouncement(result)).toBe(`Results ready. Score ${result.risk.score} of 100: ${chip}.`);
    }
  });

  it("styles the caution chip and arc with the amber tokens", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.score-caution \.score-label \{\s*background: var\(--medium-bg\);\s*color: var\(--medium\);/);
    expect(css).toMatch(/\.score-caution \.gauge-value \{\s*stroke: var\(--medium\);/);
  });
});

// LANG-2 (live retest of an Arabic fee demand): mostly non-English text scored 0 and showed the green
// "No risk indicators found" chip, which reads as "safe" although the rules could not read the text.
// In tier 1 the green chip becomes a neutral one. Tier 2 and tier-free results are unchanged.
describe("score chip with the language notice (LANG-2)", () => {
  const ARABIC_FEE = "يرجى دفع 750 درهم لتأكيد الوظيفة";
  const A4_TEXT = "Reply within 2 hours or this offer is cancelled. Only 3 slots left.";
  const NEUTRAL = "Not checked: most of the text is not in English";
  const REVIEW = "Low, review the findings below";
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf("results-main"));
  const emptyCard = (html: string) => html.match(/class="[^"]*empty-state[^"]*">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
  const render = (text: string, languageNotice: "most" | "part" | null) => {
    const result = runManager(text);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice }));
    const side = scoreSide(html);
    return { result, html, side, chip: side.match(/<p class="chip score-label">([^<]*)<\/p>/)?.[1] };
  };

  it("tier 1 with no finding: the neutral chip, never the green one, and the empty line says the rules could not read it", () => {
    for (const text of [ARABIC_FEE, EVAL_OFFERS.find((offer) => offer.id === "S12")!.text]) {
      const { result, html, side, chip } = render(text, "most");
      expect(result.risk.score).toBe(0);
      expect(result.findings).toEqual([]);
      expect(chip).toBe(NEUTRAL);
      expect(side).toContain("score-neutral");
      expect(side).not.toContain("score-caution");
      expect(html).not.toContain("No risk indicators found");
      // Round 2: the Risk aggregator row says the same as the chip. The server's trace is unchanged.
      expect(aggregatorRow(html)).toContain(`Score 0 of 100. ${NEUTRAL}.`);
      expect(result.trace.find((step) => step.agent === "risk_aggregator")?.summary).toBe(
        "Score 0 of 100: No risk indicators found",
      );
      const empty = emptyCard(html);
      expect(empty).toContain("The 5 rules read English only, so they could not check most of this text.");
      expect(empty).toContain("This does not confirm that the offer is genuine.");
      expect(empty).not.toContain("None of the 5 rules matched.");
      // No green tick beside a line that says the text was not checked.
      expect(empty).not.toContain("<svg");
    }
  });

  it("the Risk aggregator row shows the server's summary in every other case", () => {
    const cases: [string, "most" | "part" | null][] = [
      [A4_TEXT, "most"],
      [SCAM_OFFER, "most"],
      [LEGIT_OFFER, "part"],
      [ARABIC_FEE, "part"],
      [LEGIT_OFFER, null],
      [ARABIC_FEE, null],
      [A4_TEXT, null],
      [SCAM_OFFER, null],
    ];
    for (const [text, tier] of cases) {
      const { result, html } = render(text, tier);
      const summary = result.trace.find((step) => step.agent === "risk_aggregator")?.summary;
      expect(summary).toMatch(/^Score \d+ of 100: /);
      expect(aggregatorRow(html)).toBe(summary);
    }
  });

  it("tier 1 leaves the score, band and findings unchanged", () => {
    const plain = runManager(ARABIC_FEE);
    const shown = render(ARABIC_FEE, "most").result;
    expect({ risk: shown.risk, findings: shown.findings }).toEqual({ risk: plain.risk, findings: plain.findings });
    expect(shown.risk.label).toBe("No risk indicators found");
  });

  it("tier 1 with a finding keeps the finding chip", () => {
    expect(render(A4_TEXT, "most").chip).toBe(REVIEW);
    expect(render(A4_TEXT, "most").side).toContain("score-caution");
    expect(render(SCAM_OFFER, "most").chip).toBe("High risk indicators");
    for (const text of [A4_TEXT, SCAM_OFFER]) expect(render(text, "most").side).not.toContain("score-neutral");
  });

  it("tier 2 keeps the current chip and empty line, plus the notice", () => {
    const { side, html, chip } = render(LEGIT_OFFER, "part");
    expect(chip).toBe("No risk indicators found");
    expect(side).not.toContain("score-neutral");
    expect(side).toContain("Part of this text is not in English.");
    expect(emptyCard(html)).toContain("None of the 5 rules matched.");
    expect(emptyCard(html)).toContain("<svg");
    expect(render(A4_TEXT, "part").chip).toBe(REVIEW);
  });

  it("no notice keeps the current chip and empty line", () => {
    const { side, html, chip } = render(LEGIT_OFFER, null);
    expect(chip).toBe("No risk indicators found");
    expect(side).not.toContain("score-neutral");
    expect(emptyCard(html)).toContain("None of the 5 rules matched.");
    expect(emptyCard(html)).toContain("<svg");
  });

  it("announces the neutral wording to screen readers in tier 1 only", () => {
    const result = runManager(ARABIC_FEE);
    expect(resultAnnouncement(result, "most")).toBe(`Results ready. Score 0 of 100: ${NEUTRAL}.`);
    expect(resultAnnouncement(result, "part")).toBe("Results ready. Score 0 of 100: No risk indicators found.");
    expect(resultAnnouncement(result)).toBe("Results ready. Score 0 of 100: No risk indicators found.");
    expect(resultAnnouncement(runManager(A4_TEXT), "most")).toBe(`Results ready. Score 20 of 100: ${REVIEW}.`);
  });

  it("styles the neutral chip with ink on fill, no green", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.score-neutral \.score-label \{\s*background: var\(--fill\);\s*color: var\(--ink\);/);
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

// COPY-1: the page shows plain-language copy from publicLimitations.ts. The internal detail (file
// paths, defect ids, phases) stays in docs/known-limitations.md.
describe("limitations panel (COPY-1)", () => {
  const publicText = [PUBLIC_LIMITS_INTRO, ...PUBLIC_LIMITS.flatMap((item) => [item.title, item.text])];
  const FORBIDDEN = ["docs/", "QA defect", "Phase", "Intake v2", "RF-", "LANG-", "COPY-", "holdout", "rules-backlog", "known-limitations", "`"];

  it.each(FORBIDDEN)("public text contains no %j", (term) => {
    for (const text of publicText) expect(text.toLowerCase()).not.toContain(term.toLowerCase());
  });

  it("public text is plain ASCII: straight quotes and hyphens, no other script", () => {
    for (const text of publicText) expect(text).toMatch(/^[\x20-\x7E]+$/);
  });

  it("has one public item per bullet in the doc section, so no limitation is dropped", () => {
    expect(PUBLIC_LIMITS).toHaveLength(8);
    expect(readLimitations().items).toHaveLength(PUBLIC_LIMITS.length);
  });

  it("the page shows the intro and all 8 items, and none of the doc's internal text", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const panel = html.slice(html.indexOf('aria-labelledby="limits-heading"'));
    expect(panel).toContain("What this check cannot do");
    expect(panel).toContain(`<p>${escapeHtml(PUBLIC_LIMITS_INTRO)}</p>`);
    for (const item of PUBLIC_LIMITS) {
      expect(panel).toContain(`<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.text)}</li>`);
    }
    expect(panel.match(/<li>/g)).toHaveLength(8);
    for (const term of ["docs/", "QA defect", "Intake v2", "<code>"]) expect(panel).not.toContain(term);
  });
});

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

describe("sample buttons", () => {
  it("are real buttons for the three synthetic samples", () => {
    const html = renderToStaticMarkup(createElement(Home));
    // Step 5: each button carries a visible "Synthetic" tag after its name.
    for (const label of ["Fee scam", "Clean offer", "Injection attempt"]) {
      expect(html).toContain(
        `<button type="button" class="sample"><span>${label}</span><span class="sample-tag">Synthetic</span></button>`,
      );
    }
  });

  // S4-4: the buttons sit in a group with an accessible name.
  it("sit in a labelled group", () => {
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toContain('role="group" aria-labelledby="samples-label"');
    expect(html).toMatch(/<span id="samples-label"[^>]*>Try a synthetic sample<\/span>/);
  });

  it("are left out when no samples are given", () => {
    expect(renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }))).not.toContain("samples");
  });
});
