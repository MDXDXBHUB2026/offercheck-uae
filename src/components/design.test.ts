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
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { activeNotice } from "./scoreChip";
import { readLimitations } from "./limitations";
import { PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "./publicLimitations";
import { OfferChecker, resultAnnouncement } from "./OfferChecker";
import { ResultCard as ResultsPanel } from "./ResultCard";
import { scoreArithmetic } from "./scoreArithmetic";

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

// The redesign replaced the gauge with the reference risk banner: the score and band are text,
// and the colour only repeats what the words say.
describe("risk banner", () => {
  it("shows the score and the band as text, with the red-flag count", () => {
    const result = runManager(SCAM_OFFER);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5 }));
    const banner = html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
    expect(banner).toContain(`<span class="score-value">${result.risk.score}</span> <span class="score-max">/ 100</span>`);
    expect(banner).toContain(result.risk.label);
    const counted = result.findings.filter((f) => f.severity !== "info").length;
    expect(banner).toMatch(new RegExp(`${counted} red flags?`));
    // Every icon in it is decorative.
    for (const svg of banner.match(/<svg[^>]*>/g) ?? []) expect(svg).toContain('aria-hidden="true"');
  });

  it("is green only for a score of 0 with no finding and no warning", () => {
    const clean = renderToStaticMarkup(createElement(ResultsPanel, { result: runManager(LEGIT_OFFER), ruleCount: 5 }));
    expect(clean).toMatch(/<section class="card tone-green banner result-head score-card/);
    const scam = renderToStaticMarkup(createElement(ResultsPanel, { result: runManager(SCAM_OFFER), ruleCount: 5 }));
    expect(scam).toMatch(/<section class="card tone-high banner result-head score-card/);
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
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
  const chipOf = (text: string) => {
    const result = runManager(text);
    const side = scoreSide(renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5 })));
    return { result, side, chip: side.match(/<p class="chip chip-\w+ score-label">([^<]*)<\/p>/)?.[1] };
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

  it("styles the caution chip and banner with the amber tokens", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.chip-caution \{\s*border-color: var\(--amber-line\);\s*background: var\(--amber-bg\);\s*color: var\(--amber-soft\);/);
    expect(css).toMatch(/\.banner\.tone-medium \{\s*background: linear-gradient\(90deg, var\(--amber-bg\)/);
    const { side } = chipOf(A4_TEXT);
    expect(side).toContain('class="chip chip-caution score-label"');
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
  const TICK = "icon icon-xl text-green";
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
  const emptyCard = (html: string) => html.match(/<div class="empty stack-sm">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
  const render = (text: string, languageNotice: "most" | "part" | null) => {
    const result = runManager(text);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice }));
    const side = scoreSide(html);
    return { result, html, side, chip: side.match(/<p class="chip chip-\w+ score-label">([^<]*)<\/p>/)?.[1] };
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
      expect(empty).toContain("icon-info muted");
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

  it("styles the neutral chip with ink on a raised surface, no green", () => {
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).toMatch(/\.chip-neutral \{\s*border-color: var\(--border-strong\);\s*background: var\(--surface-raised\);\s*color: var\(--ink\);/);
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
  const TICK = "icon icon-xl text-green";
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
  const emptyCard = (html: string) => html.match(/<div class="empty stack-sm">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
  const render = (text: string) => {
    const result = runManager(text);
    const tier = languageNotice(text);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, languageNotice: tier }));
    const side = scoreSide(html);
    return { result, tier, html, side, chip: side.match(/<p class="chip chip-\w+ score-label">([^<]*)<\/p>/)?.[1] };
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
    expect(empty).toContain("icon-info muted");
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
    expect(html).toContain('class="stack findings"');
    expect(html).not.toContain('class="empty stack-sm"');
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
    expect(css).toMatch(/\.muted \{\s*color: var\(--muted\);/);
    expect(css).not.toMatch(/\.icon-info \{[^}]*--green/);
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
  const TICK = "icon icon-xl text-green";
  const scoreSide = (html: string) => html.slice(html.indexOf("score-card"), html.indexOf('role="tablist"'));
  const emptyCard = (html: string) => html.match(/<div class="empty stack-sm">(.*?)<\/div>/)?.[1] ?? "";
  const aggregatorRow = (html: string) =>
    html.match(/<span class="trace-agent">Risk aggregator<\/span><\/span><span class="trace-summary">([^<]*)<\/span>/)?.[1] ?? "";
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
      chip: side.match(/<p class="chip chip-\w+ score-label">([^<]*)<\/p>/)?.[1],
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
    expect(empty).toBe(`${empty.slice(0, empty.indexOf("<p "))}<p class="no-match">${OFFER_EMPTY}</p>`);
    expect(empty).toContain("icon-info muted");
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
    expect(emptyCard(html)).toContain("icon-info muted");
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
    expect(PUBLIC_LIMITS).toHaveLength(9);
    expect(readLimitations().items).toHaveLength(PUBLIC_LIMITS.length);
  });

  it("the page shows the intro and all 9 items, and none of the doc's internal text", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const panel = html.slice(html.indexOf('aria-labelledby="limits-heading"'));
    expect(panel).toContain("What this check cannot do");
    expect(panel).toContain(`<p class="small">${escapeHtml(PUBLIC_LIMITS_INTRO)}</p>`);
    for (const item of PUBLIC_LIMITS) {
      expect(panel).toContain(`<li><strong>${escapeHtml(item.title)}</strong> ${escapeHtml(item.text)}</li>`);
    }
    expect(panel.match(/<li>/g)).toHaveLength(9);
    for (const term of ["docs/", "QA defect", "Intake v2", "<code>"]) expect(panel).not.toContain(term);
  });

  // 5b: the intro pair stays visible; the items (9 since BATCHB-2) sit in a native details element, closed on load.
  it("keeps the intro visible and puts the 9 items in a closed details element with a visible summary", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const panel = html.slice(html.indexOf('aria-labelledby="limits-heading"'));
    const details = panel.match(/<details[^>]*>(.*?)<\/details>/)?.[0] ?? "";
    const opening = details.match(/<details[^>]*>/)?.[0] ?? "";
    // UX-3: the id is the footer link's target (#limits); the element is still closed on load.
    expect(opening).toBe('<details id="limits" class="card accordion limits-details">');
    expect(opening).not.toContain("open");
    // The summary is a native, keyboard-focusable control with the visible text.
    expect(details).toMatch(/^<details[^>]*><summary><span id="limits-heading" class="limits-summary">What this check cannot do<\/span><\/summary>/);
    expect(details).not.toMatch(/<summary[^>]*(hidden|tabindex="-1"|visually-hidden)/);
    expect(details.match(/<li>/g)).toHaveLength(9);
    for (const item of PUBLIC_LIMITS) expect(details).toContain(escapeHtml(item.title));
    // The intro pair is outside the details element, so it is never hidden.
    const intro = panel.indexOf(`<p class="small">${escapeHtml(PUBLIC_LIMITS_INTRO)}</p>`);
    expect(intro).toBeGreaterThan(-1);
    expect(intro).toBeLessThan(panel.indexOf("<details"));
    expect(details).not.toContain(escapeHtml(PUBLIC_LIMITS_INTRO));
    const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
    expect(css).not.toMatch(/\.limits[^{]*summary[^{]*\{[^}]*display:\s*none/);
  });

  it("shows the intro on the empty state and after the results, below the checker", () => {
    const html = renderToStaticMarkup(createElement(Home));
    const form = html.indexOf('class="card stack input-card"');
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

// UX-2 (redesign): the header and the five tabs, checked on the stylesheet (no layout engine here).
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
  const block = (head: string, from = 0) => {
    const start = css.indexOf(`${head} {`, from);
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
  const HEADER = /\.site-header|\.header-|\.brand|\.nav-|\.dropdown|\.flag-ribbon/;
  const SIZE = ["font-weight", "width", "height", "padding", "border-width", "font-size", "margin", "letter-spacing"];

  it("the tabs share the one .tab style: weight 600, a 44px target, and the current page in green", () => {
    const tab = rule(".tab");
    expect(tab).toMatch(/font-weight: 600;/);
    expect(tab).toMatch(/min-height: var\(--target\);/);
    expect(rule('.tab[aria-selected="true"],\n.tab[aria-current="page"],\n.tab[aria-pressed="true"]')).toMatch(
      /border-color: var\(--green-line\);\s*background: var\(--green-bg\);\s*color: var\(--green-soft\);/,
    );
    // No header rule restyles a tab: one tab style everywhere.
    for (const r of rules.filter((r) => /\.nav-\w+ \.tab/.test(r.selector))) {
      expect(r.body, r.selector).not.toMatch(/background|color:|border-color/);
    }
  });

  it("hover changes only the colours, with no size change", () => {
    const hover = rule(".tab:hover");
    expect(hover).toMatch(/background: var\(--surface-raised\);/);
    for (const prop of SIZE) expect(hover).not.toContain(prop);
  });

  it("keeps the keyboard focus ring: no tab, brand or header rule removes the outline", () => {
    expect(rule(":focus-visible")).toMatch(/outline: [^;]*var\(--focus\)/);
    for (const r of rules.filter((r) => HEADER.test(r.selector) || /\.tab\b/.test(r.selector))) {
      expect(r.body, r.selector).not.toMatch(/outline:\s*(none|0)/);
    }
  });

  it("the brand block: a 40px badge with a border; the caption shows from 640px", () => {
    const badge = rule(".brand-badge");
    expect(badge).toMatch(/width: 40px;/);
    expect(badge).toMatch(/height: 40px;/);
    expect(badge).toMatch(/border: 1px solid var\(--green-line\);/);
    expect(rule(".brand-caption")).toMatch(/display: none;/);
    expect(block("@media (min-width: 640px)", css.indexOf(".brand-caption {")).text).toMatch(/\.brand-caption,\s*\.btn-label-wide \{\s*display: inline;/);
  });

  it("five full tabs from 1200px; below that a compact five-column bar under the header", () => {
    expect(rule(".nav-desktop")).toMatch(/display: none;/);
    const wide = block("@media (min-width: 1200px)").text;
    expect(wide).toMatch(/\.nav-desktop \{\s*display: flex;/);
    expect(wide).toMatch(/\.nav-mobile \{\s*display: none;/);
    expect(rule(".nav-mobile")).toMatch(/grid-template-columns: repeat\(5, minmax\(0, 1fr\)\);/);
  });

  it("the hotlines panel is inside the screen on a 390px phone, and anchored with a logical property", () => {
    const panel = rule(".dropdown-panel");
    expect(panel).toMatch(/inset-inline-end: 0;/);
    expect(panel).toMatch(/width: min\(300px, calc\(100vw - 2 \* var\(--sp-4\)\)\);/);
  });

  it("all header motion is inside the no-preference block", () => {
    const moving = rules.filter((r) => (HEADER.test(r.selector) || /\.tab\b|\.btn\b/.test(r.selector)) && /transition|animation/.test(r.body));
    expect(moving.length).toBeGreaterThan(0);
    for (const r of moving) expect(inMotion(r.at), r.selector).toBe(true);
    expect(motion.text).toMatch(/\.btn,\s*\.tab \{\s*transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;/);
  });

  // No layout engine here, so the 390px check is on the rules: no fixed width in the header that a
  // 390px screen (358px inside the 16px gutters) cannot hold, and shrinkable brand text.
  it("has no horizontal overflow at 390px: shrinkable brand, no wide fixed widths", () => {
    expect(rule(".brand")).toMatch(/min-width: 0;/);
    expect(rule(".brand-text")).toMatch(/min-width: 0;/);
    for (const r of rules.filter((r) => HEADER.test(r.selector))) {
      for (const m of r.body.matchAll(/(?:^|[\s;])(?:min-)?width:\s*(\d+)px/g)) {
        expect(Number(m[1]), `${r.selector} width`).toBeLessThanOrEqual(358);
      }
    }
  });

  // UX-3: the footer, in the same visual language. Checked on the stylesheet like the header.
  describe("footer (UX-3)", () => {
    const footerRules = () => rules.filter((r) => /footer/.test(r.selector));

    it("a thin top border from the border token, the sunken surface, and no gradient", () => {
      const footer = rule(".site-footer");
      expect(footer).toMatch(/border-top: 1px solid var\(--border\);/);
      expect(footer).toMatch(/background: var\(--surface-sunken\);/);
      expect(footerRules().length).toBeGreaterThan(5);
      for (const r of footerRules()) {
        expect(r.body, r.selector).not.toMatch(/gradient/);
        expect(r.selector).not.toContain("::before");
      }
    });

    it("stacks and centres on narrow screens, one row from 768px, with wrapping links and no overflow", () => {
      expect(rule(".footer-top")).toMatch(/flex-direction: column;/);
      expect(css).toMatch(/@media \(min-width: 768px\) \{\s*\.footer-top \{\s*flex-direction: row;/);
      expect(rule(".footer-links")).toMatch(/flex-wrap: wrap;/);
      expect(rule(".footer-links a")).toMatch(/min-height: var\(--target\);/);
      for (const r of footerRules()) {
        for (const m of r.body.matchAll(/(?:^|[\s;])(?:min-)?width:\s*(\d+)px/g)) {
          expect(Number(m[1]), `${r.selector} width`).toBeLessThanOrEqual(358);
        }
        expect(r.body, r.selector).not.toMatch(/white-space: nowrap/);
      }
    });

    it("hover changes only the link colour; no footer motion; the focus ring stays", () => {
      expect(rule(".footer-links a:hover")).toMatch(/^\s*color: var\(--green\);\s*$/);
      expect(footerRules().filter((r) => /transition|animation/.test(r.body))).toEqual([]);
      for (const r of footerRules()) expect(r.body, r.selector).not.toMatch(/outline:\s*(none|0)/);
      expect(rules.filter((r) => /footer-soon|nav-soon|data-soon|aurora/.test(r.selector + r.body))).toEqual([]);
    });
  });
});

describe("sample cards", () => {
  // The redesign: four synthetic sample cards from src/data/sampleOffers.ts, each with a real
  // "Load sample" button named by the card's title.
  it("are four cards with a real button each, named by the sample", () => {
    const html = renderToStaticMarkup(createElement(Home));
    for (const sample of SAMPLE_OFFERS) {
      expect(html).toContain(`<span id="sample-${sample.id}" class="sample-name">${escapeHtml(sample.name)}</span>`);
      expect(html).toContain(`<button type="button" class="btn btn-secondary sample" aria-describedby="sample-${sample.id}">Load sample</button>`);
    }
    expect(SAMPLE_OFFERS).toHaveLength(4);
  });

  // S4-4: the samples sit in a section with an accessible name, and are labelled made up.
  it("sit in a labelled section that says they are made up", () => {
    const html = renderToStaticMarkup(createElement(Home));
    expect(html).toContain('<section class="stack-sm samples" aria-labelledby="samples-label">');
    expect(html).toMatch(/<h2 id="samples-label"[^>]*>Try a synthetic sample<\/h2>/);
    expect(html).toContain("Made-up examples written for this app. No real company or person.");
  });

  it("are not the evaluation offers: no sample text appears in the dev set", () => {
    for (const sample of SAMPLE_OFFERS) {
      for (const offer of EVAL_OFFERS) expect(offer.text).not.toBe(sample.text);
    }
  });

  it("are left out when no samples are given", () => {
    expect(renderToStaticMarkup(createElement(OfferChecker, { ruleCount: 5 }))).not.toContain("samples");
  });
});
