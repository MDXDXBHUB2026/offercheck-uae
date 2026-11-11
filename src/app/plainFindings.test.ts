import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Plain-language findings (owner brief, 2026-11-11): the main views name each finding in plain words
// (the existing titles and the four tile names) and keep the points; the rule IDs (RF-001 to RF-005)
// stay in the code and data, and are shown only in "How this was checked" and the audit trail, as a
// small reference next to the plain name. The hero card shows values read from the synthetic "Visa
// fee before joining" sample. Rules, scoring and the APIs are unchanged.

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

import CheckPage from "./check/page";
import PortalsPage from "./portals/page";
import RadarPage from "./radar/page";
import VaultPage from "./vault/page";
import { AuditTrail } from "@/components/AuditTrail";
import { HeroStage } from "@/components/HeroStage";
import { ResultCard, spokenSummary } from "@/components/ResultCard";
import { scoreArithmetic } from "@/components/scoreArithmetic";
import { feeAmount, HERO_SAMPLE_NAME, heroExamples, heroSampleText, senderDomain } from "@/data/heroExamples";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { runWithAudit } from "@/lib/auditRun";
import { CHECK_LABELS } from "@/lib/checkLabels";
import { tr } from "@/lib/i18n";
import { AR } from "@/lib/i18nAr";
import { toResultView } from "@/lib/resultView";
import { RULE_CHECKS, ruleName } from "@/lib/ruleNames";
import { SEVERITY_WEIGHTS } from "@/lib/scoring";

const RULE_ID = /RF-\d{3}/;
const LANGS = ["en", "ar"] as const;
const html = (element: ReactElement) => renderToStaticMarkup(element);
const sample = () => runManager(heroSampleText());
const REFS = 'class="stack-sm rule-refs"';

describe("rule IDs are gone from the main views", () => {
  it.each(LANGS)("the Offer Analyzer, Radar, Portals and Vault pages (%s) show no rule ID", (lang) => {
    nav.lang = lang;
    for (const page of [CheckPage, RadarPage, PortalsPage, VaultPage]) {
      expect(html(createElement(page)), page.name).not.toMatch(RULE_ID);
    }
  });

  it.each(LANGS)("the result card (%s) shows rule IDs only in How this was checked", (lang) => {
    nav.lang = lang;
    const markup = html(createElement(ResultCard, { result: sample(), ruleCount: RULES.length }));
    const refs = markup.indexOf(REFS);
    expect(refs).toBeGreaterThan(-1);
    expect(markup.slice(0, refs)).not.toMatch(RULE_ID);
    expect(markup).not.toMatch(/Rule RF-|القاعدة RF-/);
    // The plain names and the points are still on the card.
    for (const title of ["Money asked for", "Codes, cards or documents", "Pressure to act fast", "Sender's email address"]) {
      expect(markup).toContain(tr(lang, title).replace(/'/g, "&#x27;"));
    }
    for (const check of ["fee_requested", "identity_documents_requested", "urgency_pressure", "free_email_contact"]) {
      expect(markup.slice(0, refs)).toContain(tr(lang, CHECK_LABELS[check]));
    }
    expect(markup).toContain(tr(lang, "+{0} points", 40));
  });

  it.each(LANGS)("How this was checked (%s) lists each matched rule: plain name, points, then the ID", (lang) => {
    nav.lang = lang;
    const markup = html(createElement(ResultCard, { result: sample(), ruleCount: RULES.length }));
    const section = markup.slice(markup.indexOf(REFS));
    expect(section).toContain(tr(lang, "Rules that matched"));
    for (const [id, check, points] of [
      ["RF-001", "fee_requested", 40],
      ["RF-003", "identity_documents_requested", 20],
      ["RF-004", "urgency_pressure", 20],
      ["RF-005", "free_email_contact", 20],
    ] as const) {
      const at = section.indexOf(`>${id}</bdi>`);
      expect(at, id).toBeGreaterThan(-1);
      const line = section.slice(section.lastIndexOf("<li>", at), at);
      expect(line, id).toContain(tr(lang, CHECK_LABELS[check]));
      expect(line, id).toContain(tr(lang, "+{0} points", points));
    }
  });

  it.each(LANGS)("the Listen text (%s) has no rule ID", (lang) => {
    const t = (en: string, ...args: (string | number)[]) => tr(lang, en, ...args);
    const spoken = spokenSummary(toResultView(sample()), t("High risk"), null, t);
    expect(spoken).not.toMatch(RULE_ID);
    expect(spoken).toContain(t(CHECK_LABELS.fee_requested));
  });

  it("the saved result (vault detail, PDF) carries no rule ID", () => {
    expect(JSON.stringify(toResultView(sample()))).not.toMatch(RULE_ID);
  });

  it("no dictionary entry, English or Arabic, holds a rule ID", () => {
    for (const [en, ar] of Object.entries(AR)) {
      expect(en).not.toMatch(RULE_ID);
      expect(ar, en).not.toMatch(RULE_ID);
    }
  });

  it("no interface source writes a rule ID as text (the tiles keep them for matching only)", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx$/.test(name) ? [path] : [];
      });
    for (const file of [...files("src/components"), ...files("src/app")]) {
      const text = readFileSync(file, "utf8").replace(/^\s*\/\/.*$/gm, "");
      for (const line of text.split("\n").filter((l) => RULE_ID.test(l))) {
        expect(`${file}: ${line.trim()}`).toMatch(/rules: \["RF-\d{3}"(?:, "RF-\d{3}")*\] \}/);
      }
    }
  });
});

describe("the audit trail keeps the IDs as a reference next to the plain name", () => {
  it("shows each rule as its plain name with the ID in brackets; the entry keeps the bare IDs", async () => {
    nav.lang = "en";
    const { audit } = await runWithAudit(heroSampleText());
    const markup = html(createElement(AuditTrail, { entries: audit }));
    for (const id of ["RF-001", "RF-003", "RF-004", "RF-005"]) {
      expect(markup).toContain(`${ruleName(id)} (${id})`);
    }
    expect(JSON.stringify(audit)).toContain('"RF-001"');
    expect(JSON.stringify(audit)).not.toContain(ruleName("RF-001"));
  });

  it("names every rule and warning ID the red-flag worker can produce", () => {
    const expected: Record<string, string> = {};
    for (const rule of RULES) {
      expected[rule.id] = rule.check;
      if (rule.warningCheck) expected[`${rule.id}-W`] = rule.warningCheck;
    }
    expect(RULE_CHECKS).toEqual(expected);
    for (const id of Object.keys(RULE_CHECKS)) expect(ruleName(id), id).not.toBe(id);
    expect(ruleName("RF-999")).toBe("RF-999");
  });
});

describe("the hero Example findings card", () => {
  const text = heroSampleText();

  it("reads its values from the synthetic Visa fee sample, not from typed text", () => {
    expect(SAMPLE_OFFERS.some((offer) => offer.name === HERO_SAMPLE_NAME)).toBe(true);
    expect(feeAmount(text)).toBe("AED 1,950");
    expect(senderDomain(text)).toBe("gmail.com");
    expect(text).toContain(feeAmount(text));
    expect(text).toContain(`@${senderDomain(text)}>`);
    expect(heroExamples().map((row) => row.arg)).toEqual([feeAmount(text), senderDomain(text), undefined]);
    // The salary on the same sample is not taken for the fee.
    expect(text).toMatch(/AED 18,000/);
    // The source holds no amount or domain of its own.
    const code = (path: string) => readFileSync(path, "utf8").replace(/^\s*\/\/.*$/gm, "");
    expect(code("src/data/heroExamples.ts")).not.toMatch(/1,950|gmail/);
    expect(code("src/components/HeroStage.tsx")).not.toMatch(/1,950|gmail/);
  });

  it("the values are what the rules find in that sample", () => {
    const findings = sample().findings;
    const fee = findings.find((f) => f.source === "RF-001");
    const sender = findings.find((f) => f.source === "RF-005");
    expect(fee?.evidence.join(" ")).toContain(feeAmount(text));
    expect(sender?.evidence.join(" ")).toContain(senderDomain(text));
  });

  it.each(LANGS)("renders (%s) as a marked example with the values isolated left to right", (lang) => {
    nav.lang = lang;
    const markup = html(createElement(HeroStage, null));
    expect(markup).toContain(tr(lang, "Example findings"));
    expect(markup.match(new RegExp(tr(lang, "Demo data, not your text"), "g"))).toHaveLength(1);
    expect(markup).toContain('<bdi dir="ltr" lang="en">AED 1,950</bdi>');
    expect(markup).toContain('<bdi dir="ltr" lang="en">gmail.com</bdi>');
    for (const row of heroExamples()) expect(markup).toContain(tr(lang, row.label));
    expect(markup).toContain(tr(lang, "check on the MoHRE site"));
    expect(markup).not.toMatch(RULE_ID);
  });

  it("has no coordinates, law articles, percentages, live or detected wording, or company names", () => {
    nav.lang = "en";
    const card = html(createElement(HeroStage, null));
    const hud = card.slice(card.indexOf('class="hud hero-glass"'), card.indexOf('class="hero-controls"'));
    expect(hud).not.toMatch(/°|25\.20|55\.27|Dubai/);
    expect(hud).not.toMatch(/\bArticle\b|\bArt\.|\bLaw No/i);
    expect(hud).not.toMatch(/\d\s*%/);
    expect(hud).not.toMatch(/\blive\b|detected/i);
    expect(hud).not.toMatch(/Falcon Crest/);
    nav.lang = "ar";
    const ar = html(createElement(HeroStage, null));
    expect(ar).not.toMatch(/°|دبي|مادة|٪|%/);
  });
});

describe("the Visa fee sample still scores the same", () => {
  it("scores 100 as 40 + 20 + 20 + 20 with four findings", () => {
    const result = sample();
    const counted = result.findings.filter((f) => f.severity !== "info");
    expect(result.risk.score).toBe(100);
    expect(counted.map((f) => f.source).sort()).toEqual(["RF-001", "RF-003", "RF-004", "RF-005"]);
    expect(counted.map((f) => SEVERITY_WEIGHTS[f.severity])).toEqual([40, 20, 20, 20]);
    expect(scoreArithmetic(result.findings, result.risk)).toBe("40 + 20 + 20 + 20 = 100");
  });
});
