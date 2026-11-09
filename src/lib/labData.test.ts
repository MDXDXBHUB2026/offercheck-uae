import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as labPage from "@/app/lab/page";
import * as resultsRoute from "@/app/lab/results.json/route";
import { runManager } from "./agents/manager";
import { EVAL_OFFERS, type EvalOffer } from "./agents/eval/offers";
import { RULES } from "./agents/redFlag";
import { COVERAGES, coverageOf, detectLanguage } from "./coverage";
import { buildLabData, DEV_EVAL_LABEL, DOES_NOT_PROVE, getLabData, HOLDOUT_LABEL } from "./labData";
import { ENGLISH_EDGE_CASES, LATIN_NON_ENGLISH, ROMAN_ARABIC_FEE_SCAM } from "./languageSamples";

// Roadmap Phase 3: the Test Lab. Every number on the page comes from labData, and labData is checked
// here against a recompute that calls runManager directly, without metrics.ts or labData.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replace(/\s+/g, " ");
const DATA = getLabData();
const HTML = renderToStaticMarkup(createElement(labPage.default));
const TEXT = decode(HTML);

afterEach(() => {
  vi.unstubAllGlobals();
});

// The independent recompute: runManager on every dev eval case, counted by hand.
function recompute(cases: readonly EvalOffer[]) {
  const sorted = (list: readonly string[]) => [...list].sort().join();
  return cases.map((offer) => {
    const result = runManager(offer.text);
    const counted = result.findings.filter((finding) => finding.severity !== "info").map((finding) => finding.source);
    const info = result.findings.filter((finding) => finding.severity === "info").map((finding) => finding.source);
    const passed =
      result.risk.band === offer.expectedBand &&
      sorted(counted) === sorted(offer.expectedRuleIds) &&
      sorted(info) === sorted(offer.expectedInfoIds ?? []);
    const flagged = result.risk.band === "medium" || result.risk.band === "high";
    return { offer, band: result.risk.band, score: result.risk.score, counted, passed, flagged };
  });
}

describe("lab data: the dev eval, recomputed independently", () => {
  const runs = recompute(EVAL_OFFERS);

  it("has the same totals and per-group counts", () => {
    expect(DATA.devEval.cases).toBe(EVAL_OFFERS.length);
    expect(DATA.devEval.passed).toBe(runs.filter((run) => run.passed).length);
    expect(DATA.devEval.failed).toBe(runs.filter((run) => !run.passed).length);
    expect(DATA.devEval.knownMisses).toBe(EVAL_OFFERS.filter((offer) => offer.knownMiss).length);
    for (const group of DATA.devEval.groups) {
      const inGroup = runs.filter((run) => run.offer.group === group.group);
      expect(group.cases, group.group).toBe(inGroup.length);
      expect(group.passed, group.group).toBe(inGroup.filter((run) => run.passed).length);
    }
    expect(DATA.devEval.groups.reduce((sum, group) => sum + group.cases, 0)).toBe(EVAL_OFFERS.length);
  });

  it("has the same per-case band, score, rules and outcome", () => {
    expect(DATA.devEval.rows.map((row) => row.id)).toEqual(EVAL_OFFERS.map((offer) => offer.id));
    runs.forEach((run, index) => {
      const row = DATA.devEval.rows[index];
      expect(row.actualBand, row.id).toBe(run.band);
      expect(row.score, row.id).toBe(run.score);
      expect(row.actualRuleIds, row.id).toEqual([...run.counted].sort());
      expect(row.passed, row.id).toBe(run.passed);
      expect(row.knownMissReason, row.id).toBe(run.offer.knownMissReason ?? null);
    });
  });

  it("has the same confusion table at medium or high, with precision and recall", () => {
    const count = (scam: boolean, flagged: boolean) =>
      runs.filter((run) => run.offer.scamLike === scam && run.flagged === flagged).length;
    const matrix = DATA.devEval.confusion;
    expect(matrix.flaggedBands).toEqual(["medium", "high"]);
    expect([matrix.truePositives, matrix.falsePositives, matrix.falseNegatives, matrix.trueNegatives]).toEqual([
      count(true, true),
      count(false, true),
      count(true, false),
      count(false, false),
    ]);
    expect(matrix.precision).toBeCloseTo(count(true, true) / (count(true, true) + count(false, true)), 10);
    expect(matrix.recall).toBeCloseTo(count(true, true) / (count(true, true) + count(true, false)), 10);
  });

  it("has the same per-rule hit counts, split scam-like versus other cases", () => {
    expect(DATA.devEval.ruleHits.map((hit) => hit.ruleId)).toEqual(RULES.map((rule) => rule.id));
    for (const hit of DATA.devEval.ruleHits) {
      expect(hit.scamCases, hit.ruleId).toBe(runs.filter((run) => run.offer.scamLike && run.counted.includes(hit.ruleId)).length);
      expect(hit.nonScamCases, hit.ruleId).toBe(runs.filter((run) => !run.offer.scamLike && run.counted.includes(hit.ruleId)).length);
    }
  });

  it("changes when an injected case changes", () => {
    const base = EVAL_OFFERS.find((offer) => offer.id === "S01");
    expect(base).toBeDefined();
    const offer = base as EvalOffer;
    const asExpected = buildLabData([offer]);
    expect(asExpected.devEval.cases).toBe(1);
    expect(asExpected.devEval.passed).toBe(1);
    const wrongBand = buildLabData([{ ...offer, expectedBand: "low" }]);
    expect(wrongBand.devEval.passed).toBe(0);
    expect(wrongBand.devEval.rows[0].passed).toBe(false);
    const legit = buildLabData([{ ...offer, id: "X1", scamLike: false, group: "legit" }]);
    expect(legit.devEval.confusion.falsePositives).toBe(1);
    expect(legit.devEval.ruleHits.find((hit) => hit.ruleId === "RF-001")?.nonScamCases).toBe(1);
  });
});

describe("lab data: language samples", () => {
  const samples = [ROMAN_ARABIC_FEE_SCAM, ...ENGLISH_EDGE_CASES, ...LATIN_NON_ENGLISH];

  it("gives each synthetic sample the state the Check page's coverage function gives it", () => {
    expect(DATA.language.rows.map((row) => row.id)).toEqual(samples.map((sample) => sample.id));
    samples.forEach((sample, index) => {
      const row = DATA.language.rows[index];
      expect(row.coverage, sample.id).toBe(coverageOf(detectLanguage(sample.text)));
      expect(row.label).toBe("Synthetic");
      expect(row.language).toBe(sample.language);
    });
  });

  it("counts every state from the rows, translated included (no translation runs here)", () => {
    expect(DATA.language.counts.map((entry) => entry.coverage)).toEqual([...COVERAGES]);
    for (const entry of DATA.language.counts) {
      expect(entry.count).toBe(DATA.language.rows.filter((row) => row.coverage === entry.coverage).length);
    }
    expect(DATA.language.counts.find((entry) => entry.coverage === "translated")?.count).toBe(0);
    expect(DATA.language.note).toContain("not validated by a native speaker");
  });
});

describe("/lab page", () => {
  it("shows the suite summary, labels and dev eval totals from the data", () => {
    expect(TEXT).toContain(`${DATA.devEval.passed} of ${DATA.devEval.cases} pass`);
    expect(TEXT).toContain(DEV_EVAL_LABEL);
    expect(TEXT.split(HOLDOUT_LABEL).length - 1).toBeGreaterThanOrEqual(2);
    for (const group of DATA.devEval.groups) {
      expect(HTML).toContain(
        `<td>${group.group}</td><td class="numeric">${group.cases}</td><td class="numeric">${group.passed}</td><td class="numeric">${group.failed}</td><td class="numeric">${group.knownMisses}</td>`,
      );
    }
  });

  it("shows the confusion table, precision, recall and per-rule counts from the data", () => {
    const matrix = DATA.devEval.confusion;
    expect(HTML).toContain(`<td>Scam-like</td><td class="numeric">${matrix.truePositives}</td><td class="numeric">${matrix.falseNegatives}</td>`);
    expect(HTML).toContain(`<td>Not scam-like</td><td class="numeric">${matrix.falsePositives}</td><td class="numeric">${matrix.trueNegatives}</td>`);
    expect(TEXT).toContain(`Precision: ${matrix.truePositives} of ${matrix.truePositives + matrix.falsePositives} (${matrix.precision?.toFixed(2)})`);
    expect(TEXT).toContain(`Recall: ${matrix.truePositives} of ${matrix.truePositives + matrix.falseNegatives} (${matrix.recall?.toFixed(2)})`);
    for (const hit of DATA.devEval.ruleHits) {
      expect(HTML).toMatch(new RegExp(`<td>${hit.ruleId}</td><td>[^<]+</td><td class="numeric">${hit.scamCases}</td><td class="numeric">${hit.nonScamCases}</td>`));
    }
  });

  it("has one row per dev eval case with its score and a Pass or Fail word", () => {
    for (const row of DATA.devEval.rows) {
      expect(HTML).toContain(`<td>${row.id}</td><td>${row.group}</td><td>${row.expectedBand}</td><td>${row.actualBand}</td><td class="numeric">${row.score}</td>`);
    }
    const outcomes = HTML.match(/<span class="chip chip-(?:success|high)">(?:Pass|Fail)<\/span>/g) ?? [];
    expect(outcomes).toHaveLength(DATA.devEval.cases);
  });

  it("shows the holdouts as recorded, and the bar counts with no pass or fail verdict", () => {
    const { holdout1, holdout2, holdout2Bar } = DATA.holdouts;
    for (const value of [holdout1.strict, holdout1.rightRuleCountedAsPass, holdout1.ranOnRedFlagPrefix, holdout1.runDate, holdout2.strict, holdout2.ranOnRedFlagPrefix, holdout2.failureNote]) {
      expect(TEXT).toContain(value);
    }
    for (const row of holdout2Bar.counts) {
      expect(HTML).toContain(`<td>${row.item}</td><td>${row.required}</td><td>${row.count}</td>`);
    }
    const bar = HTML.slice(HTML.indexOf("The locked pass bar."), HTML.indexOf(holdout2.noRerun));
    expect(bar.length).toBeGreaterThan(0);
    expect(bar).not.toMatch(/\bPASS\b|\bFAIL\b|chip-success|chip-high|bar is met|meets the bar|fails the bar/);
  });

  it("renders backticks in the pass-bar sources as inline code, never as literal backtick characters", () => {
    const { holdout2Bar } = DATA.holdouts;
    // The record keeps its backticks: records.test.ts checks it word for word against the docs.
    expect(holdout2Bar.counts.some((row) => row.source.includes("`"))).toBe(true);
    const start = HTML.indexOf("Holdout 2: counts against the locked bar");
    const table = HTML.slice(start, HTML.indexOf("</table>", start));
    expect(table.length).toBeGreaterThan(0);
    expect(table).not.toContain("`");
    expect(table).toContain("<code>docs/rules-backlog.md</code>");
    expect(HTML).not.toContain("`");
  });

  it("shows the language samples, each labelled Synthetic, and the counts by state", () => {
    for (const row of DATA.language.rows) {
      expect(HTML).toContain(`<td>${row.id}</td><td>${row.language}</td><td>Synthetic</td><td><code>${row.coverage}</code></td>`);
    }
    for (const entry of DATA.language.counts) {
      expect(HTML).toContain(`<td><code>${entry.coverage}</code></td><td class="numeric">${entry.count}</td>`);
    }
  });

  it("has the 'What this does not prove' panel and a JSON download link", () => {
    for (const line of DOES_NOT_PROVE) expect(TEXT).toContain(line);
    expect(HTML).toContain('<a class="button-link secondary lab-download" href="/lab/results.json" download="">');
  });

  it("shows no case text, no rule pattern and no free-text box", () => {
    for (const offer of EVAL_OFFERS.filter((entry) => entry.text.length > 30)) expect(HTML).not.toContain(offer.text.slice(0, 30));
    for (const sample of [...ENGLISH_EDGE_CASES, ...LATIN_NON_ENGLISH]) expect(HTML).not.toContain(sample.text.slice(0, 30));
    expect(HTML).not.toMatch(/\\b|\(\?:|\(\?<|<textarea|<input|<form/);
  });

  it("is static, has one h1 and adds no landmark of its own", () => {
    expect(read("src/app/lab/page.tsx")).toContain('export const dynamic = "force-static";');
    expect(HTML.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(HTML).not.toMatch(/<(?:main|header|footer|nav|aside)[\s>]|role="region"|<section[^>]*aria-label/);
  });
});

describe("/lab/results.json", () => {
  it("returns the same data object as the page, as a static download", async () => {
    expect(resultsRoute.dynamic).toBe("force-static");
    const response = resultsRoute.GET();
    expect(response.headers.get("content-type")).toBe("application/json; charset=utf-8");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(await response.json()).toEqual(JSON.parse(JSON.stringify(getLabData())));
  });
});

describe("Test Lab sources: no holdout file, no network, server only", () => {
  const files = ["src/lib/labData.ts", "src/app/lab/page.tsx", "src/app/lab/results.json/route.ts"];

  it.each(files)("%s imports no holdout case file and makes no network or translation call", (file) => {
    // Code only: the header comments name what the file must not do.
    const source = read(file).replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/from\s+["'][^"']*holdout2?["']/);
    expect(source).not.toMatch(/\bfetch\s*\(|https?:\/\/|translateServer|translateRequest|\/api\/translate|next\/headers|"use client"/);
  });

  it("no client file imports labData", () => {
    const client = ["src/components/OfferChecker.tsx", "src/components/shell/SiteHeader.tsx", "src/components/LimitsLink.tsx"];
    for (const file of client) expect(read(file)).not.toContain("labData");
  });

  it("building the data and rendering the page call no network", () => {
    const fetchSpy = vi.fn(() => {
      throw new Error("network call");
    });
    vi.stubGlobal("fetch", fetchSpy);
    buildLabData();
    renderToStaticMarkup(createElement(labPage.default));
    resultsRoute.GET();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
