import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { AUTHORITIES, mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import * as about from "./about/page";
import * as guide from "./guide/page";

// The public doc pages: About and Warning signs (/guide). Plain language, static, fixed text only.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n");
const render = (page: () => React.ReactNode) => renderToStaticMarkup(createElement(page));
const decode = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replace(/\s+/g, " ");
const ABOUT = render(about.default);
const GUIDE = render(guide.default);

describe("/about", () => {
  it("says what Offer Check UAE is, the problem, what it does, who it is for", () => {
    const text = decode(ABOUT);
    expect(text).toContain("Offer Check UAE is a free tool that looks for common warning signs in a job offer");
    expect(text).toContain("Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky.");
    expect(text).toContain("It reads the offer text you paste and points out warning signs in plain words");
    expect(text).toContain("People in the UAE who receive a job offer by WhatsApp, email or LinkedIn");
  });

  it("keeps the six 'what it does not do' bullets", () => {
    const list = ABOUT.slice(ABOUT.indexOf('id="not-heading"'), ABOUT.indexOf("</ul>", ABOUT.indexOf('id="not-heading"')));
    expect(list.match(/<li>/g)).toHaveLength(6);
    const text = decode(list);
    for (const line of [
      "It does not check whether a company, a sender or an offer is real.",
      "It does not contact anyone or send any message for you.",
      "It does not store your text.",
      "It does not use an AI model to score your text.",
      "It reads English only.",
      "It does not give legal advice.",
    ]) {
      expect(text).toContain(line);
    }
  });

  it("has one privacy paragraph that stays true: Google only when the person presses translate", () => {
    const text = decode(ABOUT);
    expect(text).toContain(`Offer Check does not store the text you paste. Your text is sent to Google, for machine translation, only if you press “${TRANSLATE_BUTTON}”.`);
  });

  it("puts the footer's synthetic-data and legal-advice wording in one paragraph", () => {
    expect(ABOUT).toContain(`<p>${SYNTHETIC_STATEMENT} ${FOOTER_DISCLAIMER}</p>`);
  });

  it("uses no technical terms", () => {
    expect(decode(ABOUT)).not.toMatch(/\b(?:pipeline|deterministic|hash|audit|agents?|tests?)\b/i);
  });

  it("no longer shows the technical limitation list (it lives in docs/technical-evidence.md)", () => {
    expect(ABOUT).not.toContain("Technical detail");
    expect(ABOUT).not.toContain("technical-title");
    const first = read("docs/known-limitations.md").match(/^- \*\*([^*]+)\*\*/m)?.[1] ?? "";
    expect(first.length).toBeGreaterThan(0);
    expect(decode(ABOUT)).not.toContain(first);
  });

  it("has no contact for reporting problems with Offer Check (owner decision): no section, no address, no phone", () => {
    expect(existsSync(join(process.cwd(), "src/lib/siteConfig.ts"))).toBe(false);
    expect(ABOUT).not.toContain('id="report-heading"');
    expect(decode(ABOUT)).not.toMatch(/report a problem/i);
    expect(ABOUT).not.toMatch(/mailto:|tel:/);
  });

  it("keeps the report-fraud anchor, as a small box with the four main channels as links and no dates", () => {
    const start = ABOUT.indexOf(`id="${REPORT_FRAUD_ID}"`);
    expect(start).toBeGreaterThan(-1);
    const box = ABOUT.slice(start, ABOUT.indexOf("</section>", start));
    expect(box).toContain(">If you think it is a scam</h2>");
    expect(decode(box)).toContain(REPORT_FRAUD_NOTE);
    const links = [...box.matchAll(/<a class="source-link" href="([^"]+)" rel="noreferrer">([^<]+)<\/a>/g)].map((m) => [m[2], m[1]]);
    expect(links).toEqual(mainChannels().map((channel) => [channel.name, channel.url]));
    expect(links.map(([name]) => name)).toEqual([
      "Ministry of Interior eCrimes platform",
      "Dubai Police eCrime website",
      "Abu Dhabi Police Aman service",
      "Ministry of Human Resources and Emiratisation (MOHRE)",
    ]);
    expect(box).toContain('href="https://www.mohre.gov.ae"');
    expect(box).not.toMatch(/Last verified|approved|Source:|\d{4}-\d{2}-\d{2}/);
    for (const entry of AUTHORITIES) expect(box).not.toContain(entry.sourceName);
  });
});

describe("/guide (Warning signs)", () => {
  const IDS = ["offer-letter", "reference-number", "entry-permit-check", "tourist-visa", "recruitment-fees", "company-lookup", "permit-source", "residency-abroad"];

  it("has the eight entries, in order, each an article with its fixed id", () => {
    expect(WARNING_SIGNS.map((entry) => entry.id)).toEqual(IDS);
    const articles = [...GUIDE.matchAll(/<article id="([^"]+)" class="card sign"/g)].map((m) => m[1]);
    expect(articles).toEqual(IDS);
  });

  it("each entry has a short heading, why it matters and one 'what to do' line", () => {
    for (const entry of WARNING_SIGNS) {
      const start = GUIDE.indexOf(`<article id="${entry.id}"`);
      const article = GUIDE.slice(start, GUIDE.indexOf("</article>", start));
      expect(article).toContain(`<h2 id="${entry.id}-title" class="sign-title">${entry.sign.replaceAll("'", "&#x27;")}</h2>`);
      expect(decode(article)).toContain(entry.why);
      expect(decode(article)).toContain(`What to do: ${entry.whatToDo}`);
      expect(article.match(/What to do:/g)).toHaveLength(1);
      expect(entry.sign.split(" ").length).toBeLessThanOrEqual(10);
      expect(entry.why.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(2);
      expect(entry.whatToDo.split(/(?<=\.)\s/)).toHaveLength(1);
    }
  });

  it("shows one source line at the bottom, with the single source link", () => {
    expect([...GUIDE.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([WARNING_SIGNS_SOURCE.url]);
    expect(GUIDE.lastIndexOf("</article>")).toBeLessThan(GUIDE.indexOf('class="doc-source"'));
    expect(decode(GUIDE)).toContain(
      `Source: UAE Government Portal, “Tips to avoid labour and visa fraud” , page last updated 24 Sep 2026.`,
    );
    expect(WARNING_SIGNS_SOURCE.url).toBe(
      "https://u.ae/en/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud",
    );
  });

  it("has no phone number, email address, tel: or mailto:, and no other URL", () => {
    expect(GUIDE).not.toMatch(/tel:|mailto:|@/);
    const text = WARNING_SIGNS.map((entry) => `${entry.sign} ${entry.why} ${entry.whatToDo}`).join(" ");
    expect(text).not.toMatch(/\d/);
    expect(text).not.toMatch(/https?:|www\./);
  });

  it("is no longer a placeholder", () => {
    expect(GUIDE).not.toContain("Not built yet");
    expect(existsSync(join(process.cwd(), "src/components/shell/Placeholder.tsx"))).toBe(false);
  });
});

describe("doc pages: static, one h1, no landmark of their own, readable type", () => {
  it.each([
    ["src/app/about/page.tsx", ABOUT],
    ["src/app/guide/page.tsx", GUIDE],
  ])("%s", (file, html) => {
    const source = read(file);
    expect(source).toContain('export const dynamic = "force-static";');
    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|searchParams|"use client"|dangerouslySetInnerHTML/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    expect(html).toMatch(/^<div class="doc-page doc-column"><div class="doc-hero"><h1 id="page-title" class="page-title">/);
    expect(html).not.toMatch(/<(?:main|header|footer|nav|aside|form)[\s>]|role="region"|<section[^>]*aria-label/);
    expect(html).not.toMatch(/<textarea|<input/);
  });

  it("the doc h1 is 32px (28px under 768px), not the 60px page title, in one centred 720px column", () => {
    const css = read("src/app/globals.css");
    const rule = (selector: string, from = 0) => {
      const at = css.indexOf(`${selector} {`, from);
      expect(at, selector).toBeGreaterThan(-1);
      return css.slice(at, css.indexOf("}", at));
    };
    expect(rule(".doc-hero .page-title")).toMatch(/font-size: 32px;\s*line-height: 38px;/);
    const small = css.indexOf("@media (max-width: 767px) {\n  .doc-hero .page-title {");
    expect(small).toBeGreaterThan(-1);
    expect(rule("  .doc-hero .page-title", small)).toMatch(/font-size: 28px;\s*line-height: 34px;/);
    for (const r of css.matchAll(/\.doc-hero \.page-title \{([^}]*)\}/g)) expect(r[1]).not.toContain("60px");
    expect(rule(".doc-column")).toMatch(/max-width: 720px;\s*margin-inline: auto;/);
    expect(rule(".doc-hero")).toMatch(/margin-bottom: 24px;/);
    expect(rule(".doc-section")).toMatch(/margin-top: 32px;/);
    expect(rule(".doc-hero .intro")).toMatch(/font-size: 17px;\s*line-height: 26px;/);
    expect(rule(".doc-page p,\n.doc-page li")).toMatch(/font-size: 16px;\s*line-height: 24px;/);
    expect(rule(".doc-page table")).toMatch(/font-size: 14px;\s*line-height: 20px;/);
    expect(rule(".doc-page .section-title,\n.doc-page .sign-title,\n.doc-page .report-box-title")).toMatch(/font-size: 20px;\s*line-height: 28px;/);
    // 44px targets for the source and channel links.
    expect(rule(".source-link")).toMatch(/min-height: 44px;/);
  });
});
