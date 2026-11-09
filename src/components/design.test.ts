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
import { languageNotice } from "@/lib/textScript";
import { offerSignals } from "@/lib/offerLikeness";
import { activeNotice } from "./scoreChip";
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
  const TICK = 'd="M6.5 10.5l2.5 2.5 4.5-5"';
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
      // Batch B Stage 1, decision 4: no number for unchecked text.
      expect(aggregatorRow(html)).toBe(`${NEUTRAL}.`);
      expect(side).toContain('<span class="score-value score-not-checked">Not checked</span>');
      expect(result.trace.find((step) => step.agent === "risk_aggregator")?.summary).toBe(
        "Score 0 of 100: No risk indicators found",
      );
      const empty = emptyCard(html);
      expect(empty).toContain("The 5 rules read English only, so they could not check most of this text.");
      expect(empty).toContain("This does not confirm that the offer is genuine.");
      expect(empty).not.toContain("None of the 5 rules matched.");
      // No green tick beside a line that says the text was not checked; the neutral info icon (LANG-3).
      expect(empty).not.toContain(TICK);
      expect(empty).toContain('class="icon icon-info"');
    }
  });

  it("the Risk aggregator row shows the server's summary in every other case", () => {
    const cases: [string, "most" | "part" | null][] = [
      [A4_TEXT, "part"],
      [SCAM_OFFER, "part"],
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

  // Batch B Stage 1, decision 4: tier 1 with a finding lists the matches but shows no number.
  it("tier 1 with a finding: the row says not checked, then what matched, with no number", () => {
    for (const text of [A4_TEXT, SCAM_OFFER]) {
      const { result, html, side, chip } = render(text, "most");
      expect(result.findings.length).toBeGreaterThan(0);
      expect(aggregatorRow(html)).toBe(`${NEUTRAL}. Rules matched in its English words: ${chip}.`);
      expect(side).not.toMatch(/<span class="score-value">\d/);
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

  it("tier 2 with a finding keeps the finding chip", () => {
    expect(render(A4_TEXT, "part").chip).toBe(REVIEW);
  });

  it("no notice keeps the current chip and empty line", () => {
    const { side, html, chip } = render(LEGIT_OFFER, null);
    expect(chip).toBe("No risk indicators found");
    expect(side).not.toContain("score-neutral");
    expect(emptyCard(html)).toContain("None of the 5 rules matched.");
    expect(emptyCard(html)).toContain(TICK);
  });

  it("announces the qualified wording to screen readers with a notice", () => {
    const result = runManager(ARABIC_FEE);
    expect(resultAnnouncement(result, "most")).toBe(`Results ready. ${NEUTRAL}.`);
    expect(resultAnnouncement(result, "part")).toBe(
      "Results ready. Score 0 of 100 on the English part. Part of the text was not checked.",
    );
    expect(resultAnnouncement(result)).toBe("Results ready. Score 0 of 100: No risk indicators found.");
    expect(resultAnnouncement(runManager(A4_TEXT), "most")).toBe(
      `Results ready. ${NEUTRAL}. Rules matched in its English words: ${REVIEW}.`,
    );
  });

  it("styles the neutral chip with ink on fill, no green", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.score-neutral \.score-label \{\s*background: var\(--fill\);\s*color: var\(--ink\);/);
  });
});

// LANG-3 (live retest): with the tier 2 notice and nothing matched, the page still said "No risk
// indicators found" in the chip, the Findings card, the Risk aggregator row and the announcement.
// Display only: the score, band, findings and server trace are unchanged.
describe("tier 2 with no finding is qualified, not all clear (LANG-3)", () => {
  const ARABIC_FEE = "يرجى دفع 750 درهم لتأكيد الوظيفة";
  const A4_TEXT = "Reply within 2 hours or this offer is cancelled. Only 3 slots left.";
  const TIER_2 = `${LEGIT_OFFER}\n${ARABIC_FEE}`;
  const TIER_2_FINDING = `${A4_TEXT}\n${ARABIC_FEE}`;
  const ALL_CLEAR = "No risk indicators found";
  const PART_CHIP = "Score 0 on the English part. Part of the text was not checked.";
  const PART_EMPTY =
    "None of the 5 rules matched in the English part. Part of the text was not checked, and this does not confirm that the offer is genuine.";
  const PART_SUMMARY = "Score 0 of 100 on the English part. Part of the text was not checked.";
  const TICK = 'd="M6.5 10.5l2.5 2.5 4.5-5"';
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf("results-main"));
  const emptyCard = (html: string) => html.match(/class="[^"]*empty-state[^"]*">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
  const render = (text: string) => {
    const result = runManager(text);
    const tier = languageNotice(text);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice: tier }));
    const side = scoreSide(html);
    return { result, tier, html, side, chip: side.match(/<p class="chip score-label">([^<]*)<\/p>/)?.[1] };
  };

  it("the test texts are tier 2, one with no finding and one with a finding", () => {
    expect([languageNotice(TIER_2), languageNotice(TIER_2_FINDING)]).toEqual(["part", "part"]);
    expect(runManager(TIER_2).findings).toEqual([]);
    expect(runManager(TIER_2_FINDING).risk.score).toBe(20);
  });

  it("tier 2, no finding: neutral chip with the qualified wording", () => {
    const { side, chip } = render(TIER_2);
    expect(chip).toBe(PART_CHIP);
    expect(side).toContain("score-neutral");
    expect(side).toContain("Part of this text is not in English.");
  });

  it("tier 2, no finding: the Findings card has the info icon, no tick, and the qualified line", () => {
    const empty = emptyCard(render(TIER_2).html);
    expect(empty).toContain(PART_EMPTY);
    expect(empty).toContain('class="icon icon-info"');
    expect(empty).not.toContain(TICK);
    expect(empty).not.toContain("None of the 5 rules matched.");
  });

  it("tier 2, no finding: the Risk aggregator row and the announcement say the same", () => {
    const { result, html } = render(TIER_2);
    expect(aggregatorRow(html)).toBe(PART_SUMMARY);
    expect(resultAnnouncement(result, "part")).toBe(`Results ready. ${PART_SUMMARY}`);
    // The server's trace is unchanged.
    expect(result.trace.find((step) => step.agent === "risk_aggregator")?.summary).toBe(`Score 0 of 100: ${ALL_CLEAR}`);
  });

  it("with any notice and no finding, the all-clear wording appears nowhere", () => {
    for (const [text, tier] of [[TIER_2, "part"], [ARABIC_FEE, "most"]] as const) {
      const result = runManager(text);
      const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice: tier }));
      expect(html).not.toContain(ALL_CLEAR);
      expect(resultAnnouncement(result, tier)).not.toContain(ALL_CLEAR);
    }
  });

  it("tier 2 with a finding: the finding chip and the finding, no all-clear wording", () => {
    const { side, html, chip, result } = render(TIER_2_FINDING);
    expect(chip).toBe("Low, review the findings below");
    expect(side).toContain("score-caution");
    expect(html).toContain('class="findings"');
    expect(html).not.toContain("empty-state");
    expect(html).not.toContain(ALL_CLEAR);
    expect(html).not.toContain(PART_CHIP);
    expect(resultAnnouncement(result, "part")).toBe("Results ready. Score 20 of 100: Low, review the findings below.");
  });

  it("Clean offer, fully checked: the green signals are unchanged", () => {
    const { side, html, chip, result, tier } = render(LEGIT_OFFER);
    expect(tier).toBeNull();
    expect(chip).toBe(ALL_CLEAR);
    expect(side).not.toContain("score-neutral");
    expect(emptyCard(html)).toContain("None of the 5 rules matched.");
    expect(emptyCard(html)).toContain(TICK);
    expect(aggregatorRow(html)).toBe(`Score 0 of 100: ${ALL_CLEAR}`);
    expect(resultAnnouncement(result, null)).toBe(`Results ready. Score 0 of 100: ${ALL_CLEAR}.`);
  });

  it("leaves the score, band and findings unchanged", () => {
    const plain = runManager(TIER_2);
    expect(render(TIER_2).result).toMatchObject({ risk: plain.risk, findings: plain.findings });
  });

  it("styles the info icon in the muted colour, not green", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.empty-state \.icon-info \{\s*color: var\(--muted\);/);
  });
});

// OFFER-1 (live site): "Hi, how are you? Call me back." showed the offer-likeness notice next to
// the green "No risk indicators found" chip, the green tick and the all-clear announcement.
// Display only: the score, band, findings and server trace are unchanged.
describe("the offer-likeness notice is qualified, not all clear (OFFER-1)", () => {
  const NOT_AN_OFFER = "Hi, how are you? Call me back.";
  const WARNING_ONLY = "Hi, how are you? Never pay a fee to anyone.";
  const ARABIC_FEE = "يرجى دفع 750 درهم لتأكيد الوظيفة";
  const TIER_2 = `${LEGIT_OFFER}\n${ARABIC_FEE}`;
  const ALL_CLEAR = "No risk indicators found";
  const OFFER_CHIP = "Score 0. This text does not look like a job offer.";
  const OFFER_EMPTY =
    "None of the 5 rules matched. This text has no clear signs of a job offer, and this does not confirm that the offer is genuine.";
  const OFFER_SUMMARY = "Score 0 of 100. This text does not look like a job offer.";
  const TICK = 'd="M6.5 10.5l2.5 2.5 4.5-5"';
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf("results-main"));
  const emptyCard = (html: string) => html.match(/class="[^"]*empty-state[^"]*">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
  // Everything recorded at check time, as OfferChecker records it.
  const render = (text: string) => {
    const result = runManager(text);
    const language = languageNotice(text);
    const signals = offerSignals(text);
    const html = renderToStaticMarkup(
      createElement(ResultsPanel, { result, ruleCount: 5, languageNotice: language, offerSignals: signals }),
    );
    const side = scoreSide(html);
    const notice = activeNotice(language, signals, result.risk.band);
    return {
      result,
      html,
      side,
      notice,
      chip: side.match(/<p class="chip score-label">([^<]*)<\/p>/)?.[1],
      announcement: resultAnnouncement(result, notice),
    };
  };

  it("the test texts are in the states they name", () => {
    expect([languageNotice(NOT_AN_OFFER), offerSignals(NOT_AN_OFFER), runManager(NOT_AN_OFFER).findings]).toEqual([null, [], []]);
    expect(runManager(WARNING_ONLY).findings.map((f) => f.severity)).toEqual(["info"]);
    expect(render(NOT_AN_OFFER).notice).toBe("offer");
    expect(render(WARNING_ONLY).notice).toBe("offer");
    expect(render(ARABIC_FEE).notice).toBe("most");
    expect(render(TIER_2).notice).toBe("part");
    expect(render(LEGIT_OFFER).notice).toBeNull();
  });

  it("offer notice, no finding: grey neutral chip with the qualified wording", () => {
    const { side, chip } = render(NOT_AN_OFFER);
    expect(chip).toBe(OFFER_CHIP);
    expect(side).toContain("score-neutral");
    expect(side).toContain("This text has no clear signs of a job offer");
  });

  it("offer notice, no finding: info icon, no tick, the qualified line", () => {
    const empty = emptyCard(render(NOT_AN_OFFER).html);
    expect(empty).toBe(`${empty.slice(0, empty.indexOf("<p"))}<p class="no-match">${OFFER_EMPTY}</p>`);
    expect(empty).toContain('class="icon icon-info"');
    expect(empty).not.toContain(TICK);
  });

  it("offer notice, no finding: the Risk aggregator row and the announcement say the same", () => {
    const { result, html, announcement } = render(NOT_AN_OFFER);
    expect(aggregatorRow(html)).toBe(OFFER_SUMMARY);
    expect(announcement).toBe(`Results ready. ${OFFER_SUMMARY}`);
    // The server's trace is unchanged.
    expect(result.trace.find((step) => step.agent === "risk_aggregator")?.summary).toBe(`Score 0 of 100: ${ALL_CLEAR}`);
  });

  it("offer notice with a warning only: amber chip and warning line kept, info icon instead of the tick", () => {
    const { side, html, chip } = render(WARNING_ONLY);
    expect(chip).toBe("Low, review the findings below");
    expect(side).toContain("score-caution");
    expect(emptyCard(html)).toContain("None of the 5 rules counted toward the score.");
    expect(aggregatorRow(html)).toBe("Score 0 of 100: Low, review the findings below");
    expect(emptyCard(html)).toContain('class="icon icon-info"');
    expect(emptyCard(html)).not.toContain(TICK);
  });

  // The one invariant over every notice: with any notice active, no all-clear wording is rendered
  // or announced and there is no green tick. With no notice, the Clean offer keeps both.
  it("with any notice active, no all-clear wording and no tick; the Clean offer keeps its green signals", () => {
    for (const text of [ARABIC_FEE, TIER_2, NOT_AN_OFFER, WARNING_ONLY]) {
      const { html, announcement, notice } = render(text);
      expect(notice).not.toBeNull();
      expect(html).not.toContain(ALL_CLEAR);
      expect(announcement).not.toContain(ALL_CLEAR);
      expect(html).not.toContain(TICK);
    }
    const clean = render(LEGIT_OFFER);
    expect(clean.chip).toBe(ALL_CLEAR);
    expect(clean.side).not.toContain("score-neutral");
    expect(emptyCard(clean.html)).toContain(TICK);
    expect(emptyCard(clean.html)).toContain("None of the 5 rules matched. This does not confirm that the offer is genuine.");
    expect(aggregatorRow(clean.html)).toBe(`Score 0 of 100: ${ALL_CLEAR}`);
    expect(clean.announcement).toBe(`Results ready. Score 0 of 100: ${ALL_CLEAR}.`);
  });

  it("tier 2 with no offer signal keeps the tier 2 wording", () => {
    const text = `Thank you for applying. We will be in touch.\n${ARABIC_FEE}`;
    expect(offerSignals(text)).toEqual([]);
    const { chip, notice, announcement } = render(text);
    expect(notice).toBe("part");
    expect(chip).toBe("Score 0 on the English part. Part of the text was not checked.");
    expect(announcement).toBe("Results ready. Score 0 of 100 on the English part. Part of the text was not checked.");
  });

  it("leaves the score, band and findings unchanged", () => {
    const plain = runManager(NOT_AN_OFFER);
    expect(render(NOT_AN_OFFER).result).toMatchObject({ risk: plain.risk, findings: plain.findings });
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

  // 5b: the intro pair stays visible; the 8 items sit in a native details element, closed on load.
  it("keeps the intro visible and puts the 8 items in a closed details element with a visible summary", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const panel = html.slice(html.indexOf('aria-labelledby="limits-heading"'));
    const details = panel.match(/<details[^>]*>(.*?)<\/details>/)?.[0] ?? "";
    const opening = details.match(/<details[^>]*>/)?.[0] ?? "";
    // UX-3: the id is the footer link's target (#limits); the element is still closed on load.
    expect(opening).toBe('<details id="limits" class="card disclosure limits-details">');
    expect(opening).not.toContain("open");
    // The summary is a native, keyboard-focusable control with the visible text.
    expect(details).toMatch(/^<details[^>]*><summary><span id="limits-heading" class="limits-summary">What this check cannot do<\/span><\/summary>/);
    expect(details).not.toMatch(/<summary[^>]*(hidden|tabindex="-1"|visually-hidden)/);
    expect(details.match(/<li>/g)).toHaveLength(8);
    for (const item of PUBLIC_LIMITS) expect(details).toContain(escapeHtml(item.title));
    // The intro pair is outside the details element, so it is never hidden.
    const intro = panel.indexOf(`<p>${escapeHtml(PUBLIC_LIMITS_INTRO)}</p>`);
    expect(intro).toBeGreaterThan(-1);
    expect(intro).toBeLessThan(panel.indexOf("<details"));
    expect(details).not.toContain(escapeHtml(PUBLIC_LIMITS_INTRO));
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).not.toMatch(/\.limits[^{]*summary[^{]*\{[^}]*display:\s*none/);
  });

  it("shows the intro on the empty state and after the results, below the checker", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const form = html.indexOf('class="card input-card"');
    const limits = html.indexOf('aria-labelledby="limits-heading"');
    expect(form).toBeGreaterThan(-1);
    expect(limits).toBeGreaterThan(form);
    expect(html.slice(limits)).toContain(escapeHtml(PUBLIC_LIMITS_INTRO));
    // The panel is a sibling of the checker on the page, so it stays under every result.
    const page = readFileSync(join(process.cwd(), "src/app/check/page.tsx"), "utf8");
    expect(page).toMatch(/<OfferChecker [^>]*\/>\s*<LimitationsPanel \/>/);
  });
});

function escapeHtml(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("'", "&#x27;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

// UX-2: the header and the top navigation, checked on the stylesheet (no layout engine here).
describe("header and nav (UX-2)", () => {
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").replace(/\r\n/g, "\n");
  // Every innermost rule as { selector, body, at }, comments removed from the selector.
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({
    selector: m[1].replace(/\/\*[\s\S]*?\*\//g, "").trim(),
    body: m[2],
    at: m.index ?? 0,
  }));
  const rule = (selector: string) => {
    const found = rules.find((r) => r.selector === selector);
    expect(found, selector).toBeDefined();
    return found?.body ?? "";
  };
  // The block of an at-rule, by brace matching.
  const block = (head: string) => {
    const start = css.indexOf(`${head} {`);
    expect(start, head).toBeGreaterThan(-1);
    let depth = 0;
    for (let i = css.indexOf("{", start); i < css.length; i += 1) {
      if (css[i] === "{") depth += 1;
      if (css[i] === "}" && --depth === 0) return { start, end: i, text: css.slice(start, i + 1) };
    }
    throw new Error(head);
  };
  const motion = block("@media (prefers-reduced-motion: no-preference)");
  const inMotion = (at: number) => at > motion.start && at < motion.end;
  const HOVER = '.site-nav a:not([aria-current="page"]):hover,\n.site-nav a:not([aria-current="page"]):focus-visible';
  // 9a: Soon items are plain text (span[data-soon]) and share the tab's base look.
  const BASE = ".site-nav a,\n.site-nav [data-soon]";
  const SIZE = ["font-weight", "width", "height", "padding", "border", "font-size", "margin", "letter-spacing"];

  it("tab text is weight 700 in the base rule and no other tab rule changes the weight", () => {
    expect(rule(BASE)).toMatch(/font-weight: 700;/);
    for (const r of rules.filter((r) => r.selector.includes(".site-nav a") && r.selector !== BASE)) {
      expect(r.body, r.selector).not.toContain("font-weight");
    }
  });

  it("hover and focus-visible: tint, 1px lift and the underline, with no size change", () => {
    const hover = rule(HOVER);
    expect(hover).toMatch(/background: var\(--primary-tint\);/);
    expect(hover).toMatch(/transform: translateY\(-1px\);/);
    for (const prop of SIZE) expect(hover).not.toContain(prop);
    expect(rule(".site-nav a::after")).toMatch(/transform: scaleX\(0\);/);
    expect(rule(".site-nav a::after")).toMatch(/transform-origin: left;/);
    expect(rule(".site-nav a::after")).toMatch(/background: var\(--primary\);/);
    expect(rule(HOVER.replace(":hover,", ":hover::after,") + "::after")).toMatch(/transform: scaleX\(1\);/);
  });

  it("Soon items get neither the tint nor the underline, no lift and a default cursor", () => {
    // Hover, focus and the underline only ever select anchors; a Soon item is a span.
    for (const r of rules.filter((r) => /:hover|:focus-visible|::after/.test(r.selector) && r.selector.includes(".site-nav"))) {
      for (const part of r.selector.split(",").map((x) => x.trim()).filter((x) => /^\.site-nav/.test(x) && /:hover|:focus-visible|::after/.test(x))) {
        expect(part, r.selector).toMatch(/^\.site-nav a[:\[]/);
      }
    }
    const soonRules = rules.filter((r) => /\[data-soon\]/.test(r.selector));
    expect(soonRules.length).toBeGreaterThan(0);
    for (const r of soonRules) {
      expect(r.body, r.selector).not.toContain("primary-tint");
      expect(r.body, r.selector).not.toContain("scaleX(1)");
      expect(r.body, r.selector).not.toContain("translateY");
    }
    expect(rule(".site-nav [data-soon]")).toMatch(/cursor: default;/);
  });

  it("keeps the keyboard focus ring: no tab or brand rule removes the outline", () => {
    expect(rule(":focus-visible")).toMatch(/outline: 3px solid var\(--primary\);/);
    for (const r of rules.filter((r) => /\.site-nav|\.wordmark|\.brand/.test(r.selector))) {
      expect(r.body, r.selector).not.toMatch(/outline:\s*(none|0)/);
    }
  });

  it("the tabs sit in a rounded capsule with a border token and a translucent background", () => {
    const capsule = rule(".site-nav ul");
    expect(capsule).toMatch(/border: 1px solid var\(--border\);/);
    expect(capsule).toMatch(/background: var\(--card-bg\);/);
    expect(capsule).toMatch(/border-radius: var\(--radius-pill\);/);
  });

  it("the brand block: a 40px badge with a border and inner glow; hover and focus give the tabs' tint and lift", () => {
    const badge = rule(".brand-badge");
    expect(badge).toMatch(/width: 40px;/);
    expect(badge).toMatch(/height: 40px;/);
    expect(badge).toMatch(/border: 1px solid var\(--border\);/);
    expect(badge).toMatch(/box-shadow: inset /);
    const hover = rule(".wordmark:hover,\n.wordmark:focus-visible");
    expect(hover).toMatch(/background: var\(--primary-tint\);/);
    expect(hover).toMatch(/transform: translateY\(-1px\);/);
    for (const prop of SIZE) expect(hover).not.toContain(prop);
    const glow = rule(".wordmark:hover .brand-badge,\n.wordmark:focus-visible .brand-badge");
    expect(glow).toMatch(/box-shadow: /);
    for (const prop of SIZE) expect(glow).not.toContain(prop);
  });

  it("the aurora sits only behind the header and the title area, and is contained in them", () => {
    const ALLOWED = [".site-header::before", ".hero-copy::before", ".placeholder::before"];
    const auroraRules = rules.filter((r) => r.selector !== ":root" && /aurora/.test(r.body));
    expect(auroraRules.length).toBeGreaterThan(0);
    for (const r of auroraRules) expect(ALLOWED, r.selector).toContain(r.selector);
    // The header and title glows fill their own box, with no blur that could spread onto the form.
    for (const selector of [".site-header::before", ".hero-copy::before"]) {
      const body = rule(selector);
      expect(body, selector).toMatch(/inset: 0;/);
      expect(body, selector).toMatch(/background: var\(--aurora\);/);
      expect(body, selector).not.toContain("blur");
    }
    // Nothing on the form, the score, the findings or the draft reply uses it.
    for (const r of rules.filter((r) => /input-card|\.results|\.score|\.finding|\.draft|\.approval/.test(r.selector))) {
      expect(r.body, r.selector).not.toMatch(/aurora/);
    }
  });

  it("all motion is inside the no-preference block: tab transitions and the aurora drift", () => {
    const drift = rules.filter((r) => /aurora-drift/.test(r.body));
    expect(drift.map((r) => r.selector).sort()).toEqual([".hero-copy::before", ".site-header::before"]);
    for (const r of drift) expect(inMotion(r.at), r.selector).toBe(true);
    expect(inMotion(css.indexOf("@keyframes aurora-drift"))).toBe(true);
    const moving = rules.filter((r) => /\.site-nav|\.wordmark|\.brand|\.site-header/.test(r.selector) && /transition|animation/.test(r.body));
    expect(moving.length).toBeGreaterThan(0);
    for (const r of moving) expect(inMotion(r.at), r.selector).toBe(true);
    expect(motion.text).toMatch(/\.site-nav a,\s*\.site-nav a::after,\s*\.wordmark,\s*\.brand-badge \{\s*transition: transform 200ms ease-out, background-color 200ms ease-out, color 200ms ease-out, box-shadow 200ms ease-out;/);
  });

  // No layout engine here, so the 375px check is on the rules: no fixed width in the header that a
  // 375px screen (327px inside the 24px gutters) cannot hold, a shrinkable first column, wrapping tabs.
  it("has no horizontal overflow at 375px: shrinkable columns, wrapping capsule, no wide fixed widths", () => {
    const narrow = block("@media (max-width: 767px)").text;
    expect(narrow).toMatch(/\.site-header-inner \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/);
    expect(rule(".site-nav ul")).toMatch(/flex-wrap: wrap;/);
    expect(rule(".brand-text")).toMatch(/min-width: 0;/);
    expect(rule(".brand-caption")).toMatch(/overflow-wrap: anywhere;/);
    for (const r of rules.filter((r) => /\.site-header|\.site-nav|\.wordmark|\.brand|\.nav-/.test(r.selector))) {
      for (const m of r.body.matchAll(/(?:^|[\s;])(?:min-)?width:\s*(\d+)px/g)) {
        expect(Number(m[1]), `${r.selector} width`).toBeLessThanOrEqual(327);
      }
      expect(r.body, r.selector).not.toMatch(/white-space: nowrap/);
    }
    expect(rule(".wordmark")).toMatch(/min-width: 0;/);
  });

  // UX-3: the footer, in the same visual language. Checked on the stylesheet like the header.
  describe("footer (UX-3)", () => {
    const footerRules = () => rules.filter((r) => /footer/.test(r.selector));

    it("a thin top border from the border token, a dark palette background, and no aurora", () => {
      const footer = rule(".site-footer");
      expect(footer).toMatch(/border-top: 1px solid var\(--border\);/);
      expect(footer).toMatch(/background: var\(--surface\);/);
      expect(footerRules().length).toBeGreaterThan(5);
      for (const r of footerRules()) {
        expect(r.body, r.selector).not.toMatch(/aurora|gradient/);
        expect(r.selector).not.toContain("::before");
      }
    });

    it("four columns on desktop that stack on narrow screens, with no overflow at 375px", () => {
      expect(rule(".footer-cols")).toMatch(/grid-template-columns: repeat\(4, minmax\(0, 1fr\)\);/);
      expect(css).toMatch(/@media \(max-width: 1023px\) \{\s*\.footer-cols \{\s*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);/);
      expect(css).toMatch(/@media \(max-width: 599px\) \{\s*\.footer-cols \{\s*grid-template-columns: minmax\(0, 1fr\);/);
      expect(rule(".footer-col")).toMatch(/min-width: 0;/);
      expect(rule(".footer-col")).toMatch(/overflow-wrap: anywhere;/);
      expect(rule(".footer-chips ul")).toMatch(/flex-wrap: wrap;/);
      for (const r of footerRules()) {
        for (const m of r.body.matchAll(/(?:^|[\s;])(?:min-)?width:\s*(\d+)px/g)) {
          expect(Number(m[1]), `${r.selector} width`).toBeLessThanOrEqual(327);
        }
        expect(r.body, r.selector).not.toMatch(/white-space: nowrap/);
      }
    });

    it("motion: only the link underline slides, and only inside the no-preference block", () => {
      expect(rule(".footer-link::after")).toMatch(/transform: scaleX\(0\);/);
      expect(rule(".footer-link::after")).toMatch(/transform-origin: left;/);
      expect(rule(".footer-link:hover::after,\n.footer-link:focus-visible::after")).toMatch(/transform: scaleX\(1\);/);
      const moving = footerRules().filter((r) => /transition|animation/.test(r.body));
      expect(moving.map((r) => r.selector)).toEqual([".footer-link::after"]);
      for (const r of moving) {
        expect(inMotion(r.at), r.selector).toBe(true);
        expect(r.body.trim()).toBe("transition: transform 200ms ease-out;");
      }
      // Hover changes nothing but the underline: no tint, lift or colour change on the link itself.
      for (const r of footerRules().filter((r) => /:hover|:focus-visible/.test(r.selector))) {
        expect(r.selector).toMatch(/::after/);
      }
    });

    it("keeps the focus ring, and Soon items look like text, not links", () => {
      for (const r of footerRules()) expect(r.body, r.selector).not.toMatch(/outline:\s*(none|0)/);
      expect(rule(".footer-soon")).toMatch(/cursor: default;/);
      expect(rule(".footer-soon")).toMatch(/color: var\(--muted\);/);
      expect(rule(".footer-chip")).toMatch(/border: 1px solid var\(--border\);/);
      expect(rule(".footer-chip")).toMatch(/border-radius: var\(--radius-pill\);/);
    });
  });
});

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
