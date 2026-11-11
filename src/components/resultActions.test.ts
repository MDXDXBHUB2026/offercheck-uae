import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Result card action bar (2026-11-11): Listen, Export PDF, Save to Encrypted Vault and New Audit sit in
// the result card's header, on the score's row; the button is renamed everywhere it is named; a
// completed check brings the header into view and focuses its heading. Chrome checks at 1280 and
// 390 px in English and Arabic are in docs/test-report.md.

const env = vi.hoisted(() => ({ lang: "en" as "en" | "ar", speech: true }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  // Server snapshots, except the language (scripted) and Web Speech (on, so Listen renders).
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    if (value === "en" || value === "ar") return env.lang;
    if (value === false) return env.speech;
    return value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import { ResultCard } from "@/components/ResultCard";
import { RESULT_HEADING_ID, revealResult, scrollBehaviorFor } from "@/components/revealResult";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { AR } from "@/lib/i18nAr";

const NEW_NAME = "Save to Encrypted Vault";
const AR_NEW_NAME = "حفظ في الخزنة المشفّرة";
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8").replaceAll("\r\n", "\n");

function render(lang: "en" | "ar") {
  env.lang = lang;
  const result = runManager(SCAM_OFFER);
  return renderToStaticMarkup(
    createElement(ResultCard, { result, ruleCount: RULES.length, onSave: () => {}, onNewAudit: () => {} }),
  );
}

// The score row: from the row's opening tag up to the summary paragraph that follows it.
function headerRow(html: string): string {
  const start = html.indexOf('class="row-between result-head-row"');
  const end = html.indexOf('<p class="lead">', start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return html.slice(start, end);
}

const LABELS = {
  en: ["Listen", "Export PDF", NEW_NAME, "New Audit"],
  ar: [AR["Listen"], AR["Export PDF"], AR_NEW_NAME, AR["New Audit"]],
};

describe("the four actions are in the result card header", () => {
  it.each(["en", "ar"] as const)("%s: Listen, Export PDF, Save to Encrypted Vault, New Audit, in that order, on the score's row", (lang) => {
    const html = render(lang);
    const row = headerRow(html);
    const toolbar = row.slice(row.indexOf('class="result-toolbar no-print"'));
    expect(row).toContain('class="result-head-end"');
    expect(toolbar.length).toBeLessThan(row.length);
    const at = LABELS[lang].map((label) => toolbar.indexOf(`${label}</button>`));
    expect(at.every((index) => index > -1)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    // Moved, not copied: each label once in the whole card, and before the summary and the rule tiles.
    for (const label of LABELS[lang]) expect(html.split(`${label}</button>`).length - 1).toBe(1);
    expect(html.indexOf('class="result-toolbar')).toBeLessThan(html.indexOf('class="dimensions"'));
  });

  it("the actions are a labelled group, not printed, and the heading can take focus", () => {
    const html = render("en");
    expect(html).toContain('class="result-toolbar no-print" role="group" aria-label="Result actions"');
    expect(html).toContain(`<h2 id="${RESULT_HEADING_ID}" class="label-caps" tabindex="-1">`);
    expect(render("ar")).toContain(`aria-label="${AR["Result actions"]}"`);
  });

  it("CSS: end of the row on wide screens, under the score on narrow ones; 44px targets, 3px focus ring, hidden in print", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\.result-head-row \{\n {2}align-items: flex-start;/);
    expect(css).toMatch(/\.result-head-end \{\n {2}display: flex;\n {2}flex-direction: column;\n {2}align-items: flex-end;/);
    expect(css).toMatch(/@media \(max-width: 639px\) \{\n {2}\.result-head-end \{\n {4}align-items: flex-start;/);
    expect(css).toContain("--target: 44px;");
    expect(css).toMatch(/\.btn \{[^}]*min-height: var\(--target\);/);
    expect(css).toMatch(/:focus-visible \{\n {2}outline: 3px solid var\(--focus\);/);
    expect(css).toMatch(/@media print \{[\s\S]*?\.no-print,[\s\S]*?display: none !important;/);
    // Clears the sticky site header: 130 px high below 1200 px, 69 px from 1200 px.
    expect(css).toMatch(/\.result-head \{[^}]*scroll-margin-top: 150px;/);
    expect(css).toMatch(/@media \(min-width: 1200px\) \{\n {2}\.result-head \{\n {4}scroll-margin-top: 96px;/);
  });
});

describe("the button is called Save to Encrypted Vault everywhere", () => {
  function sources(dir: string): string[] {
    return readdirSync(join(process.cwd(), dir)).flatMap((name) => {
      const path = `${dir}/${name}`;
      return statSync(join(process.cwd(), path)).isDirectory() ? sources(path) : /\.(tsx?|css)$/.test(name) ? [path] : [];
    });
  }

  it("no source file still uses the old button name", () => {
    const old = ["Save", "Encrypted"].join(" ");
    expect(sources("src").filter((path) => read(path).includes(old))).toEqual([]);
  });

  it("the strings that name it use the new name: button, vault empty state, vault intro, footer, privacy line", () => {
    expect(read("src/components/ResultCard.tsx")).toContain(`t("${NEW_NAME}")`);
    const vault = read("src/components/EncryptedVault.tsx");
    expect(vault).toContain(`choose ${NEW_NAME} on the result`);
    expect(vault).toContain(`Results you save with ${NEW_NAME} stay in this browser`);
    expect(read("src/components/shell/site.tsx")).toContain(`${NEW_NAME} keeps an encrypted copy`);
    expect(read("src/app/legal/page.tsx")).toContain(`${NEW_NAME} keeps an encrypted copy`);
  });

  it("Arabic: every entry that names it uses the vault's Arabic name, marked for review", () => {
    const named = Object.entries(AR).filter(([english]) => english.includes(NEW_NAME));
    expect(named.length).toBeGreaterThanOrEqual(6);
    for (const [, arabic] of named) expect(arabic).toContain(AR_NEW_NAME);
    expect(Object.values(AR).some((arabic) => arabic.includes("حفظ مشفّر"))).toBe(false);
    const dict = read("src/lib/i18nAr.ts").split("\n");
    for (const [english] of named) {
      const line = dict.findIndex((text) => text.startsWith(`  ${JSON.stringify(english)}`));
      expect(line, english).toBeGreaterThan(0);
      expect(dict[line - 1], english).toMatch(/\/\/ \[review\] button renamed/);
    }
    expect(dict[dict.findIndex((text) => text.startsWith('  "Result actions"')) - 1]).toMatch(/\/\/ \[review\]/);
  });
});

describe("after a check completes, the result header comes into view and its heading takes focus", () => {
  function fakeDoc(withHeader = true) {
    const calls: string[] = [];
    const header = { scrollIntoView: (options?: ScrollIntoViewOptions) => calls.push(`header.scroll ${JSON.stringify(options)}`) };
    const heading = {
      focus: (options?: FocusOptions) => calls.push(`heading.focus ${JSON.stringify(options)}`),
      closest: (selector: string) => (withHeader && selector === ".result-head" ? header : null),
      scrollIntoView: (options?: ScrollIntoViewOptions) => calls.push(`heading.scroll ${JSON.stringify(options)}`),
    };
    return { calls, doc: { getElementById: (id: string) => (id === RESULT_HEADING_ID ? heading : null) } };
  }

  it("scrolls the header to the top, then focuses the heading without a second scroll", () => {
    const { calls, doc } = fakeDoc();
    expect(revealResult(doc, "smooth")).toBe(true);
    expect(calls).toEqual(['header.scroll {"behavior":"smooth","block":"start"}', 'heading.focus {"preventScroll":true}']);
  });

  it("falls back to the heading itself, and does nothing without a result", () => {
    const { calls, doc } = fakeDoc(false);
    revealResult(doc, "auto");
    expect(calls[0]).toBe('heading.scroll {"behavior":"auto","block":"start"}');
    expect(revealResult({ getElementById: () => null }, "auto")).toBe(false);
  });

  it("smooth only under prefers-reduced-motion: no-preference, and not while Pause animations is on", () => {
    const media = (matches: boolean) => ({ matchMedia: (query: string) => ({ matches: query === "(prefers-reduced-motion: no-preference)" && matches }) });
    expect(scrollBehaviorFor(media(true), { dataset: {} })).toBe("smooth");
    expect(scrollBehaviorFor(media(false), { dataset: {} })).toBe("auto");
    expect(scrollBehaviorFor(media(true), { dataset: { motion: "paused" } })).toBe("auto");
    expect(scrollBehaviorFor({}, null)).toBe("auto");
    expect(scrollBehaviorFor(undefined, undefined)).toBe("auto");
  });

  it("OfferChecker reveals after a successful check only, once the card has rendered", () => {
    const source = read("src/components/OfferChecker.tsx");
    const success = source.indexOf("setChecked(recordCheck(data, submitted, shown, { channel, ...meta }));");
    const reveal = source.indexOf("setRevealCount((count) => count + 1);");
    const failure = source.indexOf("setFailure(responseFailure(");
    expect(success).toBeGreaterThan(-1);
    expect(reveal).toBeGreaterThan(success);
    expect(reveal).toBeLessThan(failure);
    expect(source.split("setRevealCount(").length - 1).toBe(1);
    expect(source).toMatch(/useEffect\(\(\) => \{\n {4}if \(revealCount === 0\) return;\n {4}revealResult\(document, scrollBehaviorFor\(window, document\.documentElement\)\);\n {2}\}, \[revealCount\]\);/);
    // The live message is unchanged.
    expect(source).toContain("return `Results ready. Score ${result.risk.score} of 100:");
  });
});
