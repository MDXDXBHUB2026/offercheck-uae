import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// LIMITS-2 (owner decision, 2026-11-11): the "What this check cannot do" section, its footer link,
// its #limits anchor and its Arabic strings are gone. Kept: the one-line notice under the analyzer,
// the footer disclaimer lines, the result card's "not a verdict" line and the coverage notices.
// docs/known-limitations.md stays as internal documentation.

const env = vi.hoisted(() => ({ lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? env.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import CheckPage from "@/app/check/page";
import LegalPage from "@/app/legal/page";
import { PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { FOOTER_DISCLAIMER, SiteFooter, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { AR } from "@/lib/i18nAr";
import { LANGUAGE_NOTICES } from "@/lib/textScript";

const PHRASE = "What this check cannot do";
const PHRASE_AR = "ما لا يستطيع هذا الفحص فعله";
// The nine item titles the section listed, so none of them comes back into the copy by accident.
const OLD_TITLES = [
  "Some honest offers can score high.",
  "A request for a code can be missed.",
  "Look-alike letters can hide words.",
  "A request for a photo of a card can be missed.",
  "The check is built for job offers.",
  "Other languages typed in English letters are only partly detected.",
  "The language check uses simple cut-offs.",
  "Look-alike letters can also keep the language notice away.",
  "A translation can change the meaning.",
];

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
const decode = (html: string) =>
  html.replaceAll("&quot;", '"').replaceAll("&#x27;", "'").replaceAll("&amp;", "&").replaceAll("&lt;", "<").replaceAll("&gt;", ">");

// Interface source: every .ts and .tsx under src that is not a test.
function sources(dir: string): string[] {
  return readdirSync(join(process.cwd(), dir)).flatMap((name) => {
    const path = `${dir}/${name}`;
    if (statSync(join(process.cwd(), path)).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function renderAll(lang: "en" | "ar") {
  env.lang = lang;
  return {
    check: decode(renderToStaticMarkup(createElement(CheckPage))),
    legal: decode(renderToStaticMarkup(createElement(LegalPage))),
    footer: decode(renderToStaticMarkup(createElement(SiteFooter))),
  };
}

describe("LIMITS-2: the section is gone from user-facing copy", () => {
  it("no interface source names the section or its anchor (code comments that record the removal aside)", () => {
    const offending = sources("src").filter((path) => {
      // Comments may record the removal; only code and copy count.
      const code = read(path).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");
      return code.includes(PHRASE) || code.includes(PHRASE_AR) || /#limits\b|LIMITS_ID|LimitsLink|LimitationsPanel/.test(code);
    });
    expect(offending).toEqual([]);
  });

  it("the Arabic dictionary has neither the heading nor any of the nine items", () => {
    for (const [english, arabic] of Object.entries(AR)) {
      expect(english).not.toContain(PHRASE);
      expect(arabic).not.toContain(PHRASE_AR);
    }
    for (const title of OLD_TITLES) expect(Object.keys(AR)).not.toContain(title);
  });

  it("the panel, the link and the anchor code are deleted; the internal doc stays", () => {
    for (const file of ["LimitationsPanel.tsx", "LimitsLink.tsx", "limitsAnchor.ts", "limitations.ts"]) {
      expect(existsSync(join(process.cwd(), "src/components", file)), file).toBe(false);
    }
    expect(existsSync(join(process.cwd(), "docs/known-limitations.md"))).toBe(true);
  });

  it.each(["en", "ar"] as const)("%s: the check page, /legal and the footer show no section, link, anchor or item", (lang) => {
    for (const [page, html] of Object.entries(renderAll(lang))) {
      for (const text of [PHRASE, PHRASE_AR, ...OLD_TITLES]) expect(html, `${page}: ${text}`).not.toContain(text);
      expect(html, page).not.toContain("#limits");
      expect(html, page).not.toContain('id="limits"');
      expect(html, page).not.toContain("limits-heading");
    }
  });

  it.each(["en", "ar"] as const)("%s: no empty container is left: the footer link list holds only links, /legal's list is not followed by an empty paragraph", (lang) => {
    const { footer, legal } = renderAll(lang);
    const list = footer.match(/<ul class="footer-links"[^>]*>([\s\S]*?)<\/ul>/)?.[1] ?? "";
    const items = list.match(/<li>[\s\S]*?<\/li>/g) ?? [];
    expect(items.length).toBe(4);
    for (const item of items) expect(item).toMatch(/<a href="https:\/\//);
    expect(legal).not.toMatch(/<p>\s*<\/p>/);
  });
});

describe("LIMITS-2: what stays", () => {
  it.each(["en", "ar"] as const)("%s: the one-line notice still renders under the analyzer", (lang) => {
    const { check } = renderAll(lang);
    const notice = lang === "en" ? PUBLIC_LIMITS_INTRO : AR[PUBLIC_LIMITS_INTRO];
    expect(notice).toBeTruthy();
    expect(check).toContain(`<p class="small">${notice}</p>`);
    expect(check.indexOf(notice)).toBeGreaterThan(check.indexOf('class="card stack input-card"'));
    expect(PUBLIC_LIMITS_INTRO).toContain('A low score, or "No risk indicators found", does not mean an offer is genuine.');
  });

  it.each(["en", "ar"] as const)("%s: the footer disclaimer lines still render", (lang) => {
    const { footer } = renderAll(lang);
    for (const line of [FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT]) expect(footer).toContain(lang === "en" ? line : AR[line]);
  });

  it("the result card's not-a-verdict line and the coverage notices are unchanged", () => {
    expect(read("src/lib/resultView.ts")).toContain('const NOT_A_VERDICT = "These are risk indicators, not a verdict on any company.";');
    expect(AR["These are risk indicators, not a verdict on any company."]).toBeTruthy();
    expect(Object.keys(LANGUAGE_NOTICES).sort()).toEqual(["most", "part"]);
    for (const notice of Object.values(LANGUAGE_NOTICES)) expect(AR[notice], notice).toBeTruthy();
  });
});
