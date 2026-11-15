import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AUTHORITIES, mainChannels, REPORT_FRAUD_ID, REPORT_FRAUD_NOTE } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import { REDIRECTS } from "../../next.config";
import * as about from "./about/page";
import * as legal from "./legal/page";
import * as portals from "./portals/page";
import * as privacy from "./privacy/page";
import * as terms from "./terms/page";
import * as radar from "./radar/page";
import * as vault from "./vault/page";

// The public doc pages after the redesign: Legal Guidelines (/legal) holds the Warning signs (was
// /guide); the Gov Portals Hub (/portals) holds the report-fraud box. Plain language, static, fixed
// text only. About, Privacy and Terms (production hardening Phase 3) are checked in
// src/app/policyPages.test.ts.
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
const LEGAL = render(legal.default);
const PORTALS = render(portals.default);
const GUIDE = LEGAL;

describe("/guide keeps working; /about is its own page again", () => {
  // Production hardening Phase 3 (owner decision, 2026-11-15): /about no longer redirects to
  // /legal#about; the About text moved out of Legal Guidelines into src/app/about/page.tsx.
  it("only /guide redirects, to Legal Guidelines", () => {
    expect(REDIRECTS).toEqual([{ source: "/guide", destination: "/legal", permanent: false }]);
    expect(existsSync(join(process.cwd(), "src/app/about/page.tsx"))).toBe(true);
    expect(existsSync(join(process.cwd(), "src/app/guide/page.tsx"))).toBe(false);
    expect(read("next.config.ts")).toContain("return REDIRECTS;");
  });

  it("/legal no longer holds the About section, and links to no contact address", () => {
    expect(LEGAL).not.toContain('id="about"');
    expect(LEGAL).not.toContain("About Offer Check UAE");
    expect(LEGAL).not.toMatch(/mailto:|tel:/);
    expect(String(legal.metadata.description)).not.toMatch(/what Offer Check is/i);
  });
});

describe("/portals#report-fraud (was /about#report-fraud)", () => {
  it("keeps the anchor, as a box with the four main channels as links and no dates", () => {
    const start = PORTALS.indexOf(`id="${REPORT_FRAUD_ID}"`);
    expect(start).toBeGreaterThan(-1);
    const box = PORTALS.slice(start, PORTALS.indexOf("</section>", start));
    expect(box).toContain(">If you think it is a scam</h2>");
    expect(decode(box)).toContain(REPORT_FRAUD_NOTE);
    const links = [...box.matchAll(/<a href="([^"]+)" class="btn btn-secondary btn-block"[^>]*>([^<]+)</g)].map((m) => [m[2], m[1]]);
    expect(links).toEqual(mainChannels().map((channel) => [channel.name, channel.url]));
    expect(links.map(([name]) => name)).toEqual([
      "UAE Government: where to report cybercrime (lists the MoI eCrimes platform)",
      "Dubai Police eCrime website",
      "UAE Government: where to report cybercrime (lists Aman, Abu Dhabi Police)",
      "Ministry of Human Resources and Emiratisation (MOHRE)",
    ]);
    expect(box).toContain('href="https://www.mohre.gov.ae"');
    expect(box).not.toMatch(/Last verified|approved|Source:|\d{4}-\d{2}-\d{2}/);
    for (const entry of AUTHORITIES) expect(box).not.toContain(entry.sourceName);
  });
});

describe("/legal Warning signs (was /guide)", () => {
  const IDS = ["offer-letter", "reference-number", "entry-permit-check", "tourist-visa", "recruitment-fees", "company-lookup", "permit-source", "residency-abroad"];

  it("has the eight entries, in order, each a list item with its fixed id", () => {
    expect(WARNING_SIGNS.map((entry) => entry.id)).toEqual(IDS);
    const items = [...GUIDE.matchAll(/<li class="card stack-sm card-fill" id="([^"]+)"/g)].map((m) => m[1]);
    expect(items).toEqual(IDS);
  });

  it("each entry has a short heading, why it matters and one 'what to do' line", () => {
    for (const entry of WARNING_SIGNS) {
      const start = GUIDE.indexOf(`id="${entry.id}"`);
      const item = GUIDE.slice(start, GUIDE.indexOf("</li>", start));
      expect(item).toContain(`<h3 id="${entry.id}-title" class="h3">${entry.sign.replaceAll("'", "&#x27;")}</h3>`);
      expect(decode(item)).toContain(entry.why);
      expect(decode(item)).toContain(`What to do: ${entry.whatToDo}`);
      expect(item.match(/What to do:/g)).toHaveLength(1);
      expect(entry.sign.split(" ").length).toBeLessThanOrEqual(10);
      expect(entry.why.split(/(?<=\.)\s/).length).toBeLessThanOrEqual(2);
      expect(entry.whatToDo.split(/(?<=\.)\s/)).toHaveLength(1);
    }
  });

  it("shows one source line under the list, with the single source link", () => {
    expect([...GUIDE.matchAll(/href="([^"]+)"/g)].map((m) => m[1])).toEqual([WARNING_SIGNS_SOURCE.url]);
    expect(GUIDE.lastIndexOf("</ol>")).toBeLessThan(GUIDE.indexOf("Source:"));
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

  // The reference app's law articles, fines and "golden rules" had no source, so none is shown.
  it("shows no law article, fine or penalty from the reference app", () => {
    expect(decode(LEGAL)).not.toMatch(/Article \d|Federal (?:Decree-)?Law|AED \d|fine of|imprisonment/i);
  });

  it("is no longer a placeholder", () => {
    expect(LEGAL).not.toContain("Not built yet");
    expect(existsSync(join(process.cwd(), "src/components/shell/Placeholder.tsx"))).toBe(false);
  });
});

describe("static pages: one h1, no landmark of their own, fixed text", () => {
  it.each([
    ["src/app/legal/page.tsx", LEGAL],
    ["src/app/portals/page.tsx", PORTALS],
    ["src/app/radar/page.tsx", render(radar.default)],
    ["src/app/vault/page.tsx", render(vault.default)],
    ["src/app/about/page.tsx", render(about.default)],
    ["src/app/privacy/page.tsx", render(privacy.default)],
    ["src/app/terms/page.tsx", render(terms.default)],
  ])("%s", (file, html) => {
    const source = read(file);
    // Not force-static: a prerendered page has no CSP nonce, and the policy would block its inline
    // scripts (src/proxy.ts). The page still reads no request data.
    expect(source).not.toMatch(/export const dynamic/);
    expect(source).not.toMatch(/next\/headers|cookies\(|headers\(|searchParams|"use client"|dangerouslySetInnerHTML/);
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    // AI Studio port, Phase 3: the banner may carry a tint (red on Threat Radar, green elsewhere).
    expect(html).toMatch(/^<div class="stack"><section class="card hero" aria-labelledby="page-title"(?: data-tint="(?:red|green)")?>/);
    expect(html).toContain('<h1 id="page-title" class="h1">');
    expect(html).not.toMatch(/<(?:main|header|footer|nav|aside)[\s>]|role="region"/);
  });

  it("the page title uses the one type scale: 24px, 30px from 640px", () => {
    const css = read("src/app/globals.css");
    const at = css.indexOf(".h1 {");
    expect(at).toBeGreaterThan(-1);
    expect(css.slice(at, css.indexOf("}", at))).toContain("font-size: var(--fs-2xl);");
    const wide = css.indexOf("@media (min-width: 640px)", at);
    const later = css.indexOf(".h1 {", wide);
    expect(css.slice(later, css.indexOf("}", later))).toContain("font-size: var(--fs-3xl);");
    expect(css).toMatch(/--fs-2xl: 24px;[\s\S]*--fs-3xl: 30px;/);
    // 44px targets for every link that looks like a button.
    expect(css).toMatch(/\.btn \{[^}]*min-height: var\(--target\);/);
  });
});
