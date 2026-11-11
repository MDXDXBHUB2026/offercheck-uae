import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { LEGIT_OFFER, SCAM_OFFER } from "./agents/fixtures";
import { runManager } from "./agents/manager";
import { runWithAudit } from "./auditRun";
import {
  isTranslateFailure,
  languageName,
  parseTranslationRecord,
  sourceLanguage,
  TRANSLATE_ERRORS,
  TRANSLATE_FAILURES,
  TRANSLATION_PROVIDER,
  TRANSLATION_PROVIDER_NAME,
} from "./translation";

const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path.slice(process.cwd().length + 1).replaceAll("\\", "/")] : [];
  });
}

describe("translation values (BATCHB-2)", () => {
  it("names one provider, as fixed strings", () => {
    expect(TRANSLATION_PROVIDER).toBe("google-cloud-translation");
    expect(TRANSLATION_PROVIDER_NAME).toBe("Google Cloud Translation");
  });

  it("keeps a source language only from the fixed list, lower case; anything else is und", () => {
    expect(sourceLanguage("ar")).toBe("ar");
    expect(sourceLanguage("AR")).toBe("ar");
    expect(sourceLanguage("zh-TW")).toBe("zh-tw");
    for (const value of ["xx", "", "ar ", "<b>", 5, null, undefined, "__proto__", "constructor"]) {
      expect(sourceLanguage(value)).toBe("und");
    }
    expect(languageName("ar")).toBe("Arabic");
    expect(languageName("und")).toBeNull();
    expect(languageName("constructor")).toBeNull();
  });

  it("gives every route error one fixed status", () => {
    expect(TRANSLATE_ERRORS).toEqual({
      invalid_request: 400,
      text_too_long: 400,
      consent_required: 400,
      cross_site: 403,
      rate_limited: 429,
      translation_unavailable: 503,
      provider_denied: 502,
      provider_busy: 503,
      provider_error: 502,
      provider_timeout: 503,
    });
    expect(TRANSLATE_FAILURES).toEqual([...Object.keys(TRANSLATE_ERRORS), "network", "offline", "unreadable"]);
    expect(isTranslateFailure("provider_timeout")).toBe(true);
    expect(isTranslateFailure("ok")).toBe(false);
    expect(isTranslateFailure("toString")).toBe(false);
  });

  it("reads the translation record the page sends with a check, keeping fixed values only", () => {
    expect(parseTranslationRecord({ result: "ok", sourceLang: "ar" })).toEqual({ result: "ok", sourceLang: "ar" });
    expect(parseTranslationRecord({ result: "ok", sourceLang: "Arabic text here" })).toEqual({ result: "ok", sourceLang: "und" });
    expect(parseTranslationRecord({ result: "provider_timeout", sourceLang: "ar", text: "x" })).toEqual({ result: "provider_timeout" });
    for (const value of [null, undefined, "ok", 5, [], {}, { result: "bad" }, { result: "toString" }]) {
      expect(parseTranslationRecord(value)).toBeNull();
    }
  });
});

describe("audit fixed values for a translation (BATCHB-2)", () => {
  const intake = async (text: string, record: Parameters<typeof runWithAudit>[1]) =>
    (await runWithAudit(text, record)).audit.find((entry) => entry.kind === "intake_done")?.data;

  it("a translated check records coverage translated, the provider as a fixed string, ok and the language code", async () => {
    expect(await intake(LEGIT_OFFER, { result: "ok", sourceLang: "ar" })).toMatchObject({
      coverage: "translated",
      translation: "server",
      provider: "google-cloud-translation",
      translationResult: "ok",
      sourceLang: "ar",
    });
  });

  it("a check of the original after a failed translation records the failure code, and the coverage of the original", async () => {
    const data = await intake(ARABIC, { result: "provider_timeout" });
    expect(data).toMatchObject({ coverage: "unchecked", translation: "none", provider: "google-cloud-translation", translationResult: "provider_timeout" });
    expect(data).not.toHaveProperty("sourceLang");
  });

  it("a check with no translation keeps the Stage 1 fields only", async () => {
    const data = await intake(LEGIT_OFFER, null);
    expect(data).toMatchObject({ coverage: "full", translation: "none" });
    expect(data).not.toHaveProperty("provider");
    expect(data).not.toHaveProperty("translationResult");
  });

  it("holds no text, and the score is the same as the English text's own", async () => {
    const run = await runWithAudit(SCAM_OFFER, { result: "ok", sourceLang: "ar" });
    // The data fields only: hashes and run ids are random hex, which can spell "fee" by chance.
    const log = JSON.stringify(run.audit.map((entry) => entry.data));
    for (const word of ["visa", "fee", "Arabic"]) expect(log).not.toContain(word);
    expect(run.risk).toEqual(runManager(SCAM_OFFER).risk);
    expect(run.findings).toEqual(runManager(SCAM_OFFER).findings);
  });
});

describe("translation isolation and privacy (BATCHB-2)", () => {
  const files = sourceFiles(join(process.cwd(), "src"));
  const SERVER_ONLY = new Set(["src/app/api/translate/route.ts", "src/lib/translateServer.ts"]);

  it("the key name appears only in the translate route, and no NEXT_PUBLIC variable exists", () => {
    const withKey = files.filter((file) => read(file).includes("GOOGLE_TRANSLATE_API_KEY"));
    expect(withKey).toEqual(["src/app/api/translate/route.ts"]);
    for (const file of files) expect(read(file), file).not.toContain("NEXT_PUBLIC");
  });

  it("no client file or shared module reads the environment", () => {
    for (const file of files.filter((f) => f.startsWith("src/components/") || f === "src/lib/translation.ts" || f === "src/lib/audit.ts")) {
      expect(read(file), file).not.toMatch(/process\.env|import\.meta\.env/);
    }
  });

  it("the provider module is imported only by the translate route", () => {
    const importers = files.filter((file) => /from\s+["'][^"']*translateServer["']/.test(read(file)));
    expect(importers).toEqual(["src/app/api/translate/route.ts"]);
    for (const file of SERVER_ONLY) expect(read(file), file).not.toMatch(/^["']use client["']/m);
  });

  it("the rules, scoring, Intake and Manager never see translation code or the network", () => {
    for (const file of ["src/lib/agents/redFlag.ts", "src/lib/scoring.ts", "src/lib/agents/intake.ts", "src/lib/agents/manager.ts"]) {
      const source = read(file);
      expect(source, file).not.toMatch(/translat|fetch\(|googleapis/i);
    }
  });

  it("only the provider module contacts Google, and the browser only calls its own two routes", () => {
    expect(files.filter((file) => read(file).includes("googleapis.com"))).toEqual(["src/lib/translateServer.ts"]);
    const browserFetches = files
      .filter((file) => file.startsWith("src/components/"))
      .flatMap((file) => [...read(file).matchAll(/fetch(?:Impl)?\(\s*"([^"]*)"/g)].map((m) => m[1]));
    expect(browserFetches.sort()).toEqual(["/api/analyze", "/api/translate"]);
  });

  it("the shared values module is pure: no import, no network, no environment", () => {
    const source = read("src/lib/translation.ts");
    expect(source).not.toMatch(/^import\b|\bfrom\s+["']|fetch\(|process\.env/m);
  });
});

// BATCHB-2 claims: machine translation by Google Cloud Translation, lossy, sent to a third party
// only after consent; no accuracy claimed for any language.
describe("translation claims (BATCHB-2)", () => {
  it("the hero, notice, footer and README say who translates and that it needs the user's agreement", () => {
    const hero = read("src/app/check/page.tsx");
    expect(hero).toContain("Google Cloud Translation if you agree");
    expect(hero).not.toMatch(/English text only|No\s+AI is used yet/);
    const site = read("src/components/shell/site.tsx");
    expect(site).toContain("If you choose translation, Google Cloud Translation receives it.");
    expect(site).toContain("translation can lose or change meaning");
    const readme = read("README.md");
    expect(readme).toContain('Offer text is sent to Google Cloud Translation only when you press "Send to Google and translate", every time.');
    expect(readme).not.toMatch(/Translate to English and check|then confirm/);
    expect(readme).toContain("Machine translation is lossy");
    expect(readme).not.toMatch(/No model is called anywhere|never sent to a model or any third party|Offline word lists, no translation/);
  });

  it("no public or page copy claims translation accuracy, and all of it is ASCII", async () => {
    const { PUBLIC_LIMITS_INTRO } = await import("@/components/publicLimitations");
    const flow = await import("@/components/translateFlow");
    const copy = [
      PUBLIC_LIMITS_INTRO,
      flow.TRANSLATE_CONSENT_TEXT,
      flow.TRANSLATION_NOTE,
      flow.LANGUAGE_GATE_TRANSLATE_NOTE,
      flow.LANGUAGE_GATE_UNCERTAIN_NOTE,
      flow.TRANSLATE_FAILED_TITLE,
      flow.TRANSLATE_UNAVAILABLE_TITLE,
    ];
    for (const text of copy) {
      expect(text).toMatch(/^[\x20-\x7e]+$/);
      expect(text).not.toMatch(/accura|reliabl|guarantee|high.quality|precise/i);
    }
    // The public list was removed (LIMITS-2, 2026-11-11); the internal limitations doc keeps saying it.
    expect(readFileSync(join(process.cwd(), "docs/known-limitations.md"), "utf8")).toContain(
      "Translation quality has not been measured for any language, and no accuracy is claimed.",
    );
  });
});
