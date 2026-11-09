import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PipelineDiagram } from "@/components/PipelineDiagram";
import { PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { CHECK_LABELS } from "@/components/ResultsPanel";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { runManager } from "@/lib/agents/manager";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { RULES } from "@/lib/agents/redFlag";
import { COVERAGES } from "@/lib/coverage";
import { PIPELINE, PIPELINE_STATUS_TEXT } from "@/lib/pipeline";
import { HIGH_BAND_MIN, MEDIUM_BAND_MIN, SEVERITY_WEIGHTS } from "@/lib/scoring";
import * as about from "./about/page";
import * as howItWorks from "./how-it-works/page";

// Roadmap Phase 2: How it works and About and limits. Every figure is read from the code.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const render = (page: () => React.ReactNode) => renderToStaticMarkup(createElement(page));
const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, "")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
const HOW = render(howItWorks.default);
const ABOUT = render(about.default);

describe("pipeline registry", () => {
  it("has the ten steps in order with the statuses of the app today", () => {
    expect(PIPELINE.map((node) => [node.id, node.label, node.status])).toEqual([
      ["manager", "Manager", "built"],
      ["intake", "Intake", "partial"],
      ["red_flag", "Red-flag", "built"],
      ["verification", "Verification", "not built"],
      ["official_channel", "Official channel", "not built"],
      ["risk_aggregator", "Risk aggregator", "built"],
      ["explainer", "Explainer", "not built"],
      ["drafter", "Drafter", "built"],
      ["approval_gate", "Approval gate", "built"],
      ["audit_trail", "Audit trail", "built"],
    ]);
    expect(PIPELINE_STATUS_TEXT["not built"]).toBe("Not implemented yet");
    for (const node of PIPELINE) expect(node.description.length).toBeGreaterThan(0);
  });

  it("agrees with the steps runManager reports: not implemented in the trace if and only if not built here", () => {
    const trace = runManager(SCAM_OFFER).trace;
    expect(trace.map((step) => step.agent)).toEqual([
      "manager",
      "intake",
      "red_flag",
      "verification",
      "official_channel",
      "risk_aggregator",
    ]);
    for (const step of trace) {
      const node = PIPELINE.find((entry) => entry.id === step.agent);
      expect(node, step.agent).toBeDefined();
      expect(step.status === "not_implemented", step.agent).toBe(node?.status === "not built");
    }
  });
});

describe("pipeline diagram", () => {
  const svg = renderToStaticMarkup(createElement(PipelineDiagram));

  it("is one image with a title and a description", () => {
    expect(svg).toMatch(/^<svg class="pipeline-diagram" role="img" aria-labelledby="pipeline-title pipeline-desc"/);
    expect(svg).toContain('<title id="pipeline-title">');
    expect(svg).toContain('<desc id="pipeline-desc">');
  });

  it("shows every registry label and status, in order, and no other text", () => {
    const texts = [...svg.matchAll(/<text[^>]*>(.*?)<\/text>/g)].map((m) => m[1]);
    expect(texts).toEqual(PIPELINE.flatMap((node) => [node.label, PIPELINE_STATUS_TEXT[node.status]]));
  });

  it("marks a step that is not built with a dashed edge as well as its text", () => {
    expect(svg.match(/class="pipeline-node pipeline-not-built"/g)).toHaveLength(
      PIPELINE.filter((node) => node.status === "not built").length,
    );
    expect(read("src/app/globals.css")).toMatch(/\.pipeline-not-built rect \{[^}]*stroke-dasharray/);
  });
});

describe("/how-it-works", () => {
  it("has the diagram and a text list of the same steps with a status word", () => {
    expect(HOW).toContain('<svg class="pipeline-diagram"');
    const list = HOW.slice(HOW.indexOf('<ol class="pipeline-list">'), HOW.indexOf("</ol>", HOW.indexOf("pipeline-list")));
    for (const node of PIPELINE) {
      expect(list).toContain(`<span class="pipeline-item-label">${node.label}</span>`);
      expect(decode(list)).toContain(node.description);
    }
    expect(list.match(/<li class="pipeline-item">/g)).toHaveLength(PIPELINE.length);
    expect(list.match(/>Not implemented yet</g)).toHaveLength(PIPELINE.filter((node) => node.status === "not built").length);
  });

  it("lists every rule by id and plain name with its points, and never a pattern", () => {
    for (const rule of RULES) {
      expect(HOW).toContain(`<td>${rule.id}</td><td>${CHECK_LABELS[rule.check]}</td>`);
    }
    expect(decode(HOW)).toContain(`${RULES.length} fixed rules read English text.`);
    expect(HOW).not.toMatch(/\\b|\(\?:|\(\?<|\\s/);
  });

  it("reads the weights, the floor and the band edges from the scoring constants", () => {
    const text = decode(HOW);
    for (const points of Object.values(SEVERITY_WEIGHTS)) expect(HOW).toContain(`<td class="numeric">${points}</td>`);
    expect(text).toContain(`Any high finding puts the score at ${HIGH_BAND_MIN} or more on its own.`);
    expect(text).toContain(`High: a score of ${HIGH_BAND_MIN} or more.`);
    expect(text).toContain(`Medium: ${MEDIUM_BAND_MIN} or more, below ${HIGH_BAND_MIN}.`);
    expect(text).toContain(`Low: below ${MEDIUM_BAND_MIN}.`);
    expect(read("src/app/how-it-works/page.tsx")).not.toMatch(/\b(?:40|20|10|60|30)\b/);
  });

  it("names the four coverage states from the coverage code", () => {
    expect(COVERAGES).toHaveLength(4);
    for (const coverage of COVERAGES) expect(HOW).toContain(`<code>${coverage}</code>`);
  });

  it("states the trust boundaries: fixed rules, no AI scoring, Google only on the button press, no storage, audit, approval", () => {
    const text = decode(HOW);
    expect(text).toContain(`The score is set only by the ${RULES.length} fixed rules`);
    expect(text).toContain("No AI model scores your text, and Offer Check runs no AI model of its own.");
    expect(text).toContain(
      `The only third party that can receive your text is Google Cloud Translation, and only when you press “${TRANSLATE_BUTTON}”, every time, after the notice next to the button.`,
    );
    expect(text).toContain("Offer Check does not store your text.");
    expect(text).toContain("tamper-evident, not tamper-proof");
    expect(text).toContain("page memory only");
    expect(text).toContain("A person approves any reply draft before it can be copied.");
  });
});

describe("/about", () => {
  const bullets = read("docs/known-limitations.md")
    .replaceAll("\r\n", "\n")
    .split("\n")
    .filter((line) => line.startsWith("- "));

  it("says what Offer Check is for, who it is for and what it does not do", () => {
    const text = decode(ABOUT);
    expect(text).toContain("People in the UAE who receive a job offer by WhatsApp, email or LinkedIn");
    expect(text).toContain("It does not check whether a company, a sender or an offer is real.");
    expect(text).toContain("It does not give legal advice.");
  });

  it("reuses the footer's synthetic-data and legal-advice wording", () => {
    expect(decode(ABOUT)).toContain(SYNTHETIC_STATEMENT);
    expect(decode(ABOUT)).toContain(FOOTER_DISCLAIMER);
  });

  it("has no contact for reporting problems with Offer Check (owner decision): no section, no address, no phone", () => {
    expect(existsSync(join(process.cwd(), "src/lib/siteConfig.ts"))).toBe(false);
    expect(ABOUT).not.toContain('id="report-heading"');
    expect(decode(ABOUT)).not.toMatch(/report a problem/i);
    expect(ABOUT).not.toMatch(/mailto:|tel:/);
  });

  it("shows the public limits from publicLimitations.ts, unchanged", () => {
    const text = decode(ABOUT);
    expect(text).toContain(PUBLIC_LIMITS_INTRO);
    for (const limit of PUBLIC_LIMITS) expect(text).toContain(`${limit.title} ${limit.text}`);
  });

  it("shows every bullet of docs/known-limitations.md as technical detail, in every section", () => {
    const technical = ABOUT.slice(ABOUT.indexOf('id="technical-heading"'));
    const items = technical.match(/<li>/g) ?? [];
    expect(items).toHaveLength(bullets.length);
    expect(technical).toContain(`Show all ${bullets.length} technical items`);
    const text = decode(technical);
    for (const bullet of bullets) {
      const lead = bullet.match(/^- \*\*([^*]+)\*\*/)?.[1];
      expect(lead, bullet.slice(0, 60)).toBeDefined();
      expect(text).toContain(lead);
    }
    for (const section of ["General", "What this check cannot do", "Known misses in the eval set"]) {
      expect(technical).toContain(`<h3 class="technical-title"><span>${section}</span></h3>`);
    }
  });
});

describe("Phase 2 pages: static, one h1, no landmark of their own", () => {
  it.each([
    ["src/app/how-it-works/page.tsx", HOW],
    ["src/app/about/page.tsx", ABOUT],
  ])("%s", (file, html) => {
    const source = read(file);
    expect(source).toContain('export const dynamic = "force-static";');
    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|searchParams|"use client"/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).not.toMatch(/<(?:main|header|footer|nav|aside|form)[\s>]|role="region"|<section[^>]*aria-label/);
    expect(html).not.toMatch(/<textarea|<input/);
  });
});
