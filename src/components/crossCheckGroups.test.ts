import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// The two groups under the findings (2026-11-11): "Cross-checks on the offer" and "Official steps for
// these findings". Score-neutral, said once; plain names in the main view, V-ids only in "How this
// was checked"; shown in print and in saved vault records; records saved before still open.

const nav = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import { CROSS_CHECKS_TITLE, CrossChecksGroup, OFFICIAL_STEPS_TITLE, OfficialStepsGroup } from "./CrossCheckGroups";
import { ResultCard } from "./ResultCard";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import {
  CROSS_CHECK_LABELS,
  CROSS_CHECK_REASONS,
  CROSS_CHECKS_NONE,
  CROSS_CHECKS_NOTE,
  OFFICIAL_STEPS_NOTE,
} from "@/lib/crossCheckLabels";
import { tr } from "@/lib/i18n";
import { AR } from "@/lib/i18nAr";
import { MENTION_LABELS } from "@/lib/officialSteps";
import type { AnalysisResult } from "@/lib/types";

const sample = (id: string) => SAMPLE_OFFERS.find((offer) => offer.id === id)?.text ?? "";
const card = (result: AnalysisResult) => renderToStaticMarkup(createElement(ResultCard, { result, ruleCount: RULES.length }));
const NOTE = CROSS_CHECKS_NOTE;

describe("the groups on the result card", () => {
  nav.lang = "en";

  it("shows both groups under the findings for the visa-fee sample", () => {
    const result = runManager(sample("visa-fee"));
    expect(result.crossChecks?.length).toBeGreaterThan(0);
    const html = card(result);
    const findings = html.indexOf("Findings");
    expect(findings).toBeGreaterThan(-1);
    expect(html.indexOf(CROSS_CHECKS_TITLE)).toBeGreaterThan(findings);
    expect(html.indexOf(OFFICIAL_STEPS_TITLE)).toBeGreaterThan(html.indexOf(CROSS_CHECKS_TITLE));
    for (const check of result.crossChecks ?? []) expect(html).toContain(CROSS_CHECK_LABELS[check.check]);
  });

  it("says once that the cross-checks do not change the score", () => {
    for (const offer of SAMPLE_OFFERS) {
      const html = card(runManager(offer.text));
      expect(html.split(NOTE).length - 1, offer.id).toBe(1);
    }
  });

  it("names cross-checks in plain words; their ids appear only in How this was checked", () => {
    const html = card(runManager(sample("visa-fee")));
    const refs = html.indexOf("cross-check-refs");
    expect(refs).toBeGreaterThan(-1);
    expect(html.slice(0, refs)).not.toMatch(/V-0\d/);
    expect(html.slice(refs)).toMatch(/<bdi class="rule-ref muted" dir="ltr">V-0\d<\/bdi>/);
    expect(html.slice(refs)).toContain("Not counted in the score");
  });

  it("says that none matched, without clearing the offer, when no cross-check matched", () => {
    const html = card(runManager("Interview is on Monday at our Sharjah office."));
    expect(html).toContain(CROSS_CHECKS_TITLE);
    expect(html).toContain("cross-checks ran and none matched. This does not confirm that the offer is genuine.");
    expect(html).not.toContain(OFFICIAL_STEPS_TITLE);
  });

  it("shows neither group for a result saved before the steps existed", () => {
    const old: AnalysisResult = { ...runManager(sample("visa-fee")) };
    delete old.crossChecks;
    delete old.officialSteps;
    const html = card(old);
    expect(html).not.toContain(CROSS_CHECKS_TITLE);
    expect(html).not.toContain(OFFICIAL_STEPS_TITLE);
    expect(html).not.toContain("cross-check-refs");
  });

  it("names a plain authority mention under its official step, with no cross-check", () => {
    const result = runManager(sample("genuine-letter"));
    expect(result.crossChecks).toEqual([]);
    const html = card(result);
    expect(html).toContain("none matched");
    expect(html).toContain(OFFICIAL_STEPS_TITLE);
    expect(html).toContain("For: MoHRE is named in the text");
  });

  it("drops malformed saved entries instead of failing", () => {
    const bad = { crossChecks: [{ id: "V-01" }, null, { id: "V-09", check: "nope", evidence: [] }], officialSteps: [{ key: "x" }] };
    const html = renderToStaticMarkup(
      createElement("div", null, createElement(CrossChecksGroup, { result: bad as never }), createElement(OfficialStepsGroup, { result: bad as never })),
    );
    expect(html).toContain("none matched");
    expect(html).not.toContain(OFFICIAL_STEPS_TITLE);
  });

  it("each official step links to an https source and shows a date only from the data", () => {
    const result = runManager(sample("visa-fee"));
    const html = renderToStaticMarkup(createElement(OfficialStepsGroup, { result }));
    const items = html.split("<li").slice(1);
    expect(items.length).toBe(result.officialSteps?.length);
    for (const item of items) {
      expect(item).toMatch(/href="https:\/\/[^"]+" target="_blank" rel="noopener noreferrer"/);
      const date = item.match(/Last checked <bdi[^>]*>([^<]*)<\/bdi>/)?.[1];
      if (date !== undefined) expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("is part of the printed card: neither group is marked no-print", () => {
    const html = card(runManager(sample("visa-fee")));
    for (const name of ["cross-checks", "official-steps"]) {
      const tag = html.match(new RegExp(`<section[^>]*class="[^"]*\\b${name}\\b[^"]*"`))?.[0] ?? "";
      expect(tag, name).not.toBe("");
      expect(tag).not.toContain("no-print");
    }
  });
});

describe("saved vault records", () => {
  it("the vault record view shows both groups from the saved check", () => {
    const source = readFileSync("src/components/EncryptedVault.tsx", "utf8");
    expect(source).toContain("<CrossChecksGroup result={current.check.response} />");
    expect(source).toContain("<OfficialStepsGroup result={current.check.response} />");
  });
});

describe("Arabic", () => {
  const strings = [
    CROSS_CHECKS_TITLE,
    OFFICIAL_STEPS_TITLE,
    CROSS_CHECKS_NOTE,
    CROSS_CHECKS_NONE,
    OFFICIAL_STEPS_NOTE,
    "For: {0}",
    "Official source",
    "Last checked",
    "Cross-checks that matched",
    "Not counted in the score",
    "Verification (text only, no outside lookups)",
    ...Object.values(CROSS_CHECK_LABELS),
    ...Object.values(CROSS_CHECK_REASONS),
    ...Object.values(MENTION_LABELS),
  ];

  it("translates every Official channel summary, with no English left", () => {
    for (const summary of [
      "1 official step for a UAE authority named in the text",
      "2 official steps for a UAE authority named in the text",
      "1 official step for 1 finding, and 1 official step for a UAE authority named in the text",
      "3 official steps for 2 findings, and 2 official steps for a UAE authority named in the text",
    ]) {
      const ar = tr("ar", summary);
      expect(ar, summary).toMatch(/\p{Script=Arabic}/u);
      expect(ar, summary).not.toMatch(/[A-Za-z]/);
    }
  });

  it("has an Arabic entry for every new string", () => {
    for (const text of strings) expect(AR[text], text).toMatch(/\p{Script=Arabic}/u);
  });

  it("marks the new entries for review", () => {
    const source = readFileSync("src/lib/i18nAr.ts", "utf8");
    const block = source.slice(source.indexOf("[review] Verification and Official channel"));
    for (const text of strings) expect(block, text).toContain(JSON.stringify(text).slice(1, -1).slice(0, 30));
  });

  it("renders the groups in Arabic", () => {
    nav.lang = "ar";
    try {
      const result = runManager(sample("visa-fee"));
      const html = renderToStaticMarkup(
        createElement("div", null, createElement(CrossChecksGroup, { result }), createElement(OfficialStepsGroup, { result })),
      );
      expect(html).toContain(AR[CROSS_CHECKS_TITLE]);
      expect(html).toContain(AR[OFFICIAL_STEPS_TITLE]);
      expect(html).toContain(AR[CROSS_CHECKS_NOTE]);
      expect(html).not.toContain(CROSS_CHECKS_TITLE);
    } finally {
      nav.lang = "en";
    }
  });
});

describe("wording", () => {
  it("never says an offer or company is verified, safe or genuine", () => {
    const texts = [
      CROSS_CHECKS_TITLE,
      OFFICIAL_STEPS_TITLE,
      CROSS_CHECKS_NOTE,
      OFFICIAL_STEPS_NOTE,
      ...Object.values(CROSS_CHECK_LABELS),
      ...Object.values(CROSS_CHECK_REASONS),
      // The one use of "genuine" is the existing negation, which never clears an offer.
      CROSS_CHECKS_NONE.replace("This does not confirm that the offer is genuine.", ""),
    ];
    for (const text of texts) expect(text, text).not.toMatch(/\b(?:verified|safe|genuine|legit\w*|trust\w*)\b/i);
  });
});
