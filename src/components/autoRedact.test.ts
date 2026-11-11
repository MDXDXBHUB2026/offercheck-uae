import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { analyzeRequest } from "./checkRequest";
import { REDACTION_NOTE, REDACTION_NOTE_SAVED, ResultCard } from "./ResultCard";
import { buildRecord } from "./SaveVaultModal";
import { requestTranslation } from "./translateRequest";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { EVAL_OFFERS } from "@/lib/agents/eval/offers";
import { HOLDOUT_OFFERS } from "@/lib/agents/eval/holdout";
import { HOLDOUT_2_OFFERS } from "@/lib/agents/eval/holdout2";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { runWithAudit } from "@/lib/auditRun";
import { AR } from "@/lib/i18nAr";
import { REDACTED, redactSensitive } from "@/lib/redact";
import { toResultView } from "@/lib/resultView";

// Auto-Redact always on and silent (owner decision, 2026-11-11). No toggle and no notice before a
// check; masking runs in the browser at both requests; the vault keeps only masked text; the score
// is the same with and without masking; the explanation shows only when a number was hidden.

// Synthetic values, made up for this test.
const EMIRATES_ID = "784-1990-1234567-1";
const PASSPORT = "N1234567";
const IBAN = "AE07 0331 2345 6789 0123 456";
const VALUES = [EMIRATES_ID, "784199012345671", PASSPORT, IBAN, "AE070331234567890123456", "1234567", "0331"];
const OFFER = `Dear candidate, send your passport copy (passport no. ${PASSPORT}) and Emirates ID ${EMIRATES_ID}.
Pay the visa fee of AED 500 to IBAN ${IBAN} today.`;

const holdsNone = (text: string) => VALUES.filter((value) => text.includes(value));
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

describe("masking happens before both network calls", () => {
  it("/api/analyze: the request body holds none of the ID, passport or IBAN values", () => {
    const request = analyzeRequest(OFFER);
    expect(request.count).toBe(3);
    expect(holdsNone(request.body)).toEqual([]);
    expect(JSON.parse(request.body)).toEqual({ text: request.text });
    expect(request.text).toContain(REDACTED);
  });

  it("/api/analyze after a translation: the English is masked too, and the record is passed on", () => {
    const translation = { result: "ok", sourceLang: "fr" } as const;
    const request = analyzeRequest(`Passport ${PASSPORT}`, translation);
    expect(holdsNone(request.body)).toEqual([]);
    expect(JSON.parse(request.body)).toEqual({ text: `Passport ${REDACTED}`, translation });
  });

  it("masking is idempotent: masked text comes back unchanged with a count of 0", () => {
    const once = analyzeRequest(OFFER);
    const twice = analyzeRequest(once.text);
    expect(twice.text).toBe(once.text);
    expect(twice.count).toBe(0);
  });

  it("/api/translate: the request body holds none of the values, even when the caller passes the box text", async () => {
    const bodies: string[] = [];
    const fake = (async (_url: string, init?: RequestInit) => {
      bodies.push(String(init?.body));
      return new Response(JSON.stringify({ translatedText: "ok", detectedSourceLanguage: "fr" }), { status: 200 });
    }) as typeof fetch;
    const outcome = await requestTranslation(OFFER, fake);
    expect(outcome.ok).toBe(true);
    expect(bodies).toHaveLength(1);
    expect(holdsNone(bodies[0])).toEqual([]);
    expect(JSON.parse(bodies[0])).toEqual({ text: redactSensitive(OFFER).text, consent: true });
  });

  it("the page has no other way to reach either route: one /api/analyze call with the masked body, translation only through requestTranslation", () => {
    const checker = read("src/components/OfferChecker.tsx");
    expect([...checker.matchAll(/\bfetch\(/g)]).toHaveLength(1);
    expect(checker).toMatch(/fetch\("\/api\/analyze", \{[\s\S]{0,200}?body: request\.body,/);
    expect(checker).toContain("const request = analyzeRequest(unmasked, translation);");
    expect(checker).not.toContain("/api/translate");
    expect(checker).toContain("await requestTranslation(original, undefined, signal)");
    // runCheck has no default text, so no call can send the box text unmasked.
    expect(checker).toMatch(/async function runCheck\(\s*unmasked: string,/);
    expect(checker).not.toMatch(/runCheck\(\)/);

    const callers = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return callers(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) && /fetch(?:Impl)?\(\s*["'`]\/api\//.test(read(path)) ? [path.replaceAll("\\", "/")] : [];
      });
    expect(callers("src").sort()).toEqual(["src/components/OfferChecker.tsx", "src/components/translateRequest.ts"]);
  });
});

describe("no toggle and no off state remain", () => {
  it("no source file has the toggle, its notice or an off string", () => {
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap((name) => {
        const path = join(dir, name);
        if (statSync(path).isDirectory()) return files(path);
        return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
      });
    for (const path of files("src")) {
      const source = read(path);
      expect(source, path).not.toMatch(/Auto-Redact (?:on|off|is on|is off)|autoMask|setAutoMask|mask-note/);
    }
    expect(Object.keys(AR).filter((key) => /Auto-Redact/.test(key))).toEqual([]);
  });
});

describe("the vault stores masked text only", () => {
  it("kept text and quotes come from the masked text; the record holds none of the values", async () => {
    const request = analyzeRequest(OFFER);
    const response = await runWithAudit(request.text);
    const record = buildRecord({
      title: "t",
      channel: "Email",
      checkedText: request.text,
      keepText: true,
      view: toResultView(response),
      notes: "",
      bandLabel: "High",
      points: null,
      check: { response, coverage: "full", offerSignals: [], redacted: request.count, sourceLang: null },
    });
    expect(record.text).toContain(REDACTED);
    expect(response.findings.flatMap((f) => f.evidence).join(" ")).toContain(REDACTED);
    expect(holdsNone(JSON.stringify(record))).toEqual([]);
    expect(record.check?.redacted).toBe(3);
  });

  it("a kept text is masked again when the record is built, so no caller can store an unmasked one", () => {
    const record = buildRecord({
      title: "t",
      channel: "Email",
      checkedText: OFFER,
      keepText: true,
      view: toResultView(runManager("Hello")),
      notes: "",
      bandLabel: "Low",
      points: null,
    });
    expect(holdsNone(record.text ?? "")).toEqual([]);
  });
});

describe("the score is the same with and without masking", () => {
  const texts: [string, string][] = [
    ...SAMPLE_OFFERS.map((offer): [string, string] => [`sample ${offer.id}`, offer.text]),
    ...[...EVAL_OFFERS, ...HOLDOUT_OFFERS, ...HOLDOUT_2_OFFERS].map((offer): [string, string] => [offer.id, offer.text]),
  ];
  const NUMBERS_LINE = `\nPassport ${PASSPORT}, Emirates ID ${EMIRATES_ID}, IBAN ${IBAN}.`;

  it("covers the 4 samples and all 77 eval cases", () => {
    expect(texts).toHaveLength(4 + 77);
  });

  it.each(texts)("%s: same score, band and findings, as written and with ID, passport and IBAN numbers added", (_name, text) => {
    for (const input of [text, text + NUMBERS_LINE]) {
      const plain = runManager(input);
      const masked = runManager(redactSensitive(input).text);
      expect(masked.risk).toEqual(plain.risk);
      expect(masked.findings.map((f) => [f.source, f.severity])).toEqual(plain.findings.map((f) => [f.source, f.severity]));
    }
  });
});

describe("after a check: the explanation shows only when a number was hidden", () => {
  const render = (redacted: number, reopened = false) =>
    renderToStaticMarkup(createElement(ResultCard, { result: runManager("Hello"), ruleCount: RULES.length, redacted, reopened }));

  it("nothing about redaction when nothing was hidden", () => {
    const html = render(0);
    expect(html).not.toContain(REDACTION_NOTE_SAVED);
    expect(html).not.toContain("removed before checking");
    expect(html).not.toMatch(/hidden before the text is sent/);
  });

  it("the count line and the explanation, once each, when numbers were hidden", () => {
    const html = render(2);
    expect(html).toContain("2 numbers removed before checking");
    expect(html.split(REDACTION_NOTE.replace("'", "&#x27;")).length - 1).toBe(1);
    expect(html.indexOf("Highlights in your text")).toBeLessThan(html.indexOf("redaction-note"));
  });

  it("a result re-opened from the vault does not claim the original text is in the box", () => {
    const html = render(1, true);
    expect(html).toContain("1 number removed before checking");
    expect(html).toContain(REDACTION_NOTE_SAVED);
    expect(html).not.toContain("Your original text is still in the box.");
  });

  it("the changed strings have Arabic entries marked for review", () => {
    const dict = read("src/lib/i18nAr.ts").split(/\r?\n/);
    for (const english of [REDACTION_NOTE, REDACTION_NOTE_SAVED]) {
      expect(AR[english], english).toMatch(/\p{Script=Arabic}/u);
      const line = dict.findIndex((text) => text.startsWith(`  ${JSON.stringify(english)}`));
      expect(dict.slice(Math.max(0, line - 3), line).join("\n"), english).toMatch(/\[review\] Auto-Redact always on/);
    }
    expect(AR["The text the rules read, with ID, passport and IBAN numbers removed. Each quoted warning sign is marked."]).toBeUndefined();
  });
});
