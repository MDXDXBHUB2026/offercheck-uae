import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Production Phase 5b (owner decision, 2026-11-23): a five-pattern guide on /about, with the
// missed-scam form link and the official reporting links under it. English and Arabic.

const env = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/about" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? env.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import AboutPage from "@/app/about/page";
import { SITE_MISSED_SCAM_FORM_URL } from "@/lib/siteConfig";
import { mainChannels, REPORT_FRAUD_ID } from "@/lib/authorities";
import { AR } from "@/lib/i18nAr";

const TITLES = [
  "A fee before you join",
  "A request for card or login details",
  "Identity documents sent early",
  "Pressure to act today",
  "A free email sender",
];
const BANNED = /probability|reliability|trust score|\bsafe\b|\bsafely\b|verified|legit|genuine baseline|live threat|zero-knowledge|military-grade/i;

const decode = (html: string) => html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&");
function about(lang: "en" | "ar"): string {
  env.lang = lang;
  try {
    return decode(renderToStaticMarkup(createElement(AboutPage)));
  } finally {
    env.lang = "en";
  }
}
function guide(html: string): string {
  const start = html.indexOf('id="patterns-heading"');
  return html.slice(start, html.indexOf('aria-labelledby="cannot-heading"'));
}

describe("/about: five common job-scam patterns", () => {
  it("lists exactly the five patterns, in order, each with what it looks like and what to do", () => {
    const html = guide(about("en"));
    expect(html).toContain("Five common job-scam patterns");
    const at = TITLES.map((title) => html.indexOf(`<strong>${title}</strong>`));
    for (const position of at) expect(position).toBeGreaterThan(-1);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(html.match(/<li class="stack-sm pattern-item">/g)).toHaveLength(5);
    expect(html.match(/What it looks like:/g)).toHaveLength(5);
    expect(html.match(/What to do:/g)).toHaveLength(5);
  });

  it("matches the five rules: a fee, card or login details, identity documents, pressure, a free email", () => {
    const text = guide(about("en"));
    for (const word of [/visa, training/, /one-time code, a password, a card number/, /passport, an Emirates ID or a bank statement/, /ends tonight/, /Gmail or Yahoo/]) {
      expect(text).toMatch(word);
    }
  });

  it("uses none of the banned wording, and claims neither proof nor safety", () => {
    for (const lang of ["en", "ar"] as const) expect(guide(about(lang))).not.toMatch(BANNED);
    expect(guide(about("en"))).toContain("One sign does not prove a scam, and finding none does not mean an offer is real.");
  });

  it("has the missed-scam form link under it, and the official reporting links", () => {
    const html = guide(about("en"));
    expect(html).toContain(`<a href="${SITE_MISSED_SCAM_FORM_URL}" target="_blank" rel="noopener noreferrer">`);
    expect(html.indexOf("Report a scam")).toBeLessThan(html.indexOf(SITE_MISSED_SCAM_FORM_URL));
    for (const channel of mainChannels()) expect(html).toContain(`<a href="${channel.url}" target="_blank" rel="noopener noreferrer">`);
    expect(html).toContain(`href="/portals#${REPORT_FRAUD_ID}"`);
    expect(html).toContain('href="/check"');
  });

  it("is in Arabic when Arabic is chosen: every new string has a translation, marked [review] in the source", () => {
    const html = guide(about("ar"));
    for (const key of [
      "Five common job-scam patterns",
      ...TITLES,
      "What it looks like:",
      "What to do:",
      "Check an offer in the Offer Analyzer",
      "Report a scam",
      "Official UAE places to report a suspected job scam:",
    ]) {
      expect(AR[key], key).toBeTruthy();
      expect(html, key).toContain(AR[key]);
    }
  });
});
