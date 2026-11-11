import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Phase 4 (2026-11-11), the Arabic gap check on top of e2ff1db: dictionary parity, every interface
// literal has Arabic, no reporting or safety claim in Arabic, rule IDs isolated left-to-right, the
// review note (owner wording) on screen and in print, the warning signs marked official or for review.
// The live Chrome sweep behind these is in docs/test-report.md.

const nav = vi.hoisted(() => ({ lang: "ar" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  const scripted = (_subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import { ARABIC_NOTE, ArabicNote } from "@/components/shell/ArabicNote";
import { PAUSE_ANIMATIONS, RESUME_ANIMATIONS } from "@/components/shell/MotionToggle";
import { ResultCard } from "@/components/ResultCard";
import { TEXT_NOT_KEPT } from "@/lib/vault";
import { KEEP_TEXT_LABEL, SAVE_INTRO } from "@/components/SaveVaultModal";
import { VAULT_EMPTY } from "@/components/EncryptedVault";
import { NAV_ITEMS } from "@/components/shell/site";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { AR } from "@/lib/i18nAr";
import { hasArabic, tr } from "@/lib/i18n";
import { WARNING_SIGNS } from "@/lib/warningSigns";

const placeholders = (text: string) => [...text.matchAll(/\{\d+\}/g)].map((m) => m[0]).sort();

describe("4g: dictionary parity", () => {
  it.each(Object.entries(AR))("%s", (en, ar) => {
    expect(ar.trim(), en).not.toBe("");
    expect(ar, en).not.toBe(en);
    expect(placeholders(ar), en).toEqual(placeholders(en));
  });
});

// Every literal passed to t("...") or <T>...</T> in the interface has an Arabic entry. Template
// strings and variables are left to the flow tests in arabic.test.ts.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

describe("4b: every interface literal has Arabic", () => {
  const literals = new Map<string, string>();
  for (const file of [...sources("src/components"), ...sources("src/app")]) {
    // Comments are not interface text.
    const text = readFileSync(file, "utf8")
      .replace(/^\s*\/\/.*$/gm, "")
      .replace(/\/\*[\s\S]*?\*\//g, "");
    for (const m of text.matchAll(/\bt\(\s*"((?:[^"\\]|\\.)+)"/g)) literals.set(m[1].replace(/\\"/g, '"'), file);
    for (const m of text.matchAll(/<T>([^<{]+)<\/T>/g)) literals.set(m[1].trim(), file);
  }

  it("finds the literals", () => {
    expect(literals.size).toBeGreaterThan(150);
  });

  it.each([...literals].map(([text, file]) => [text, file]))("%s (%s)", (text) => {
    expect(hasArabic(text)).toBe(true);
  });

  it("the Phase 2 to 4 strings have Arabic: vault, pause toggle, skip link, review note", () => {
    for (const text of [
      TEXT_NOT_KEPT,
      KEEP_TEXT_LABEL,
      SAVE_INTRO,
      VAULT_EMPTY,
      PAUSE_ANIMATIONS,
      RESUME_ANIMATIONS,
      "Skip to content",
      ARABIC_NOTE,
    ]) {
      expect(hasArabic(text), text).toBe(true);
    }
  });
});

describe("4g: banned wording, in Arabic too", () => {
  it("no Arabic entry says Offer Check reports, files or sends anything for the user", () => {
    for (const [en, ar] of Object.entries(AR)) {
      expect(ar, en).not.toMatch(/سنبلّغ|سنبلغ|نبلّغ عنك|أبلغنا|تم الإبلاغ عنه|أرسلنا|أُرسل إلى (?:الشرطة|السلطات)|قدّمنا بلاغ/);
    }
  });

  it("no Arabic entry calls an offer safe, real, verified or guaranteed", () => {
    for (const [en, ar] of Object.entries(AR)) {
      expect(ar, en).not.toMatch(/آمن تمامًا|العرض آمن|عرض حقيقي مؤكد|تم التحقق من|مضمون|موثّق رسميًا/);
    }
  });

  it("AI is named only to say there is no AI scoring, or in the review note", () => {
    for (const [en, ar] of Object.entries(AR)) {
      if (/ذكاء اصطناعي|الذكاء الاصطناعي/.test(ar)) expect(en, ar).toMatch(/no AI scoring|does not use an AI model|AI tool/);
    }
  });
});

describe("4a: the review note", () => {
  it("has the owner's wording, shows only in Arabic, and has a print-only copy for paper and PDF", () => {
    expect(ARABIC_NOTE).toBe("The Arabic interface text was written with an AI tool and has not been reviewed by a native speaker.");
    nav.lang = "ar";
    expect(renderToStaticMarkup(createElement(ArabicNote, { printOnly: true }))).toBe(
      `<p class="print-only arabic-note small">${tr("ar", ARABIC_NOTE)}</p>`,
    );
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain("<ArabicNote printOnly />");
    expect(readFileSync("src/components/shell/site.tsx", "utf8")).toMatch(/<MotionToggle \/>\s*<ArabicNote \/>/);
    nav.lang = "en";
    expect(renderToStaticMarkup(createElement(ArabicNote))).toBe("");
    nav.lang = "ar";
  });
});

describe("4f: rule IDs stay left-to-right in Arabic lines", () => {
  it("every RF-nnn on the Arabic result card is inside <bdi dir=\"ltr\">", () => {
    nav.lang = "ar";
    const markup = renderToStaticMarkup(createElement(ResultCard, { result: runManager(SCAM_OFFER), ruleCount: 5 }));
    const all = markup.match(/RF-\d{3}/g) ?? [];
    const isolated = markup.match(/<bdi dir="ltr">RF-\d{3}<\/bdi>/g) ?? [];
    expect(all.length).toBeGreaterThan(0);
    expect(isolated.length).toBe(all.length);
  });

  it("the Arabic tab labels shortened in Phase 3 are the compact bar's words", () => {
    expect(NAV_ITEMS.map((item) => item.labelAr)).toEqual(["فاحص العروض", "الرادار", "بوابات التحقق", "الإرشادات", "الخزنة"]);
  });
});

describe("4d: the eight warning signs are marked official or for review", () => {
  const source = readFileSync("src/lib/i18nAr.ts", "utf8").replace(/\r\n/g, "\n");
  it("names the official Arabic page", () => {
    expect(source).toContain("https://u.ae/ar/information-and-services/visa-and-emirates-id/Visa-information/tips-to-avoid-labour-and-visa-fraud");
  });

  it.each(WARNING_SIGNS.flatMap((sign) => [sign.sign, sign.why, sign.whatToDo]).map((text) => [text]))("%s", (text) => {
    const at = source.indexOf(`  ${JSON.stringify(text)}:`);
    expect(at, text).toBeGreaterThan(-1);
    const before = source.slice(0, at).split("\n").reverse();
    // The nearest comment above the entry (skipping the comment's own wrapped lines).
    const marker = before.find((line) => /^\s*\/\/ \[/.test(line));
    expect(marker, text).toMatch(/\[(?:official|official, adapted|review)\]/);
  });
});
