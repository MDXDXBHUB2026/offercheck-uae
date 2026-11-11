import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

// Arabic interface (owner request, 2026-11-10): with Arabic chosen, every page and every message of
// the existing flow is in Arabic. Offer text (pasted text, quoted evidence, the translation shown)
// stays exactly as typed. The rules, scoring, coverage detection and the APIs are not changed, and
// nothing is sent to Google here: none of these renders makes a request.

const nav = vi.hoisted(() => ({ pathname: "/check", lang: "ar" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  // Only the language store is scripted; other stores keep their server snapshot.
  const scripted = (subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

import { ApprovalPanel } from "@/components/ApprovalPanel";
import { AuditTrail } from "@/components/AuditTrail";
import { networkFailure, responseFailure } from "@/components/checkRequest";
import {
  checkBlockedReason,
  checkingSteps,
  LANGUAGE_GATE_BUTTON,
  LANGUAGE_GATE_NOTE,
  OfferChecker,
  RESULT_CLEARED,
  resultAnnouncement,
} from "@/components/OfferChecker";
import { PUBLIC_LIMITS, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { ReportModal } from "@/components/radar/ReportModal";
import { intakeNote, ResultCard } from "@/components/ResultCard";
import { EmptyVault, VAULT_EMPTY, VAULT_LOCAL_NOTE } from "@/components/EncryptedVault";
import { PASSPHRASE_NOTE, SAVED_NOTICE, SaveVaultModal } from "@/components/SaveVaultModal";
import { qualifiedSummary, scoreChip } from "@/components/scoreChip";
import { Navbar } from "@/components/shell/Navbar";
import { SiteFooter } from "@/components/shell/site";
import { getLang } from "@/components/shell/lang";
import { AR } from "@/lib/i18nAr";
import {
  LANGUAGE_GATE_TRANSLATE_NOTE,
  LANGUAGE_GATE_UNCERTAIN_NOTE,
  TRANSLATE_BUTTON,
  TRANSLATE_CONSENT_TEXT,
  TRANSLATE_FAILED_TITLE,
  TRANSLATE_UNAVAILABLE_TITLE,
  translateFailureMessage,
  TRANSLATION_NOTE,
} from "@/components/translateFlow";
import { TranslateFailureAlert, TranslationShown } from "@/components/TranslationPanels";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { THREAT_SAMPLES } from "@/data/threatSamples";
import { LEGIT_OFFER, SCAM_OFFER } from "@/lib/agents/fixtures";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { gateReducer, INITIAL_GATE_FLOW } from "@/lib/approvalGate";
import { CHECK_LABELS, CHECK_NOTES } from "@/lib/checkLabels";
import { hasArabic } from "@/lib/i18n";
import { OFFER_NOTICE } from "@/lib/offerLikeness";
import { toResultView } from "@/lib/resultView";
import { LANGUAGE_NOTICES } from "@/lib/textScript";
import { TRANSLATE_ERRORS, type TranslateFailure } from "@/lib/translation";
import { WARNING_SIGNS } from "@/lib/warningSigns";
import CheckPage from "./check/page";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import LegalPage from "./legal/page";
import Loading from "./loading";
import NotFound from "./not-found";
import PortalsPage from "./portals/page";
import RadarPage from "./radar/page";
import VaultPage from "./vault/page";

const html = (element: ReactElement) => renderToStaticMarkup(element);

// Words that stay as they are in Arabic: names of products, services and standards, and codes.
// Everything else in Latin letters is English that was not translated.
const KEEP = new Set(
  [
    "Offer", "Check", "UAE", "MoHRE", "MOHRE", "ICP", "GDRFA", "Amer", "MoI", "Google", "Cloud", "Translation",
    "WhatsApp", "LinkedIn", "PDF", "AES", "GCM", "UTC", "IBAN", "OTP", "CVV", "eCrime", "Aman", "SHA",
    // Phase 4d: ICP's platform keeps its own Latin name on the official Arabic page.
    "eChannels",
  ].map((word) => word.toLowerCase()),
);

// Offer text that is shown as typed: the fixtures, the samples and the demo quotes.
const OFFER_TEXTS = [
  SCAM_OFFER,
  LEGIT_OFFER,
  ...SAMPLE_OFFERS.map((sample) => sample.text),
  ...THREAT_SAMPLES.map((sample) => sample.warningQuote),
];

const decode = (text: string) =>
  text
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");

// Visible text and the text-bearing attributes. Elements marked lang="en" hold English on purpose
// (the reply draft, the audit records) and are left out.
function visibleText(markup: string): string[] {
  const kept = markup
    .replace(/<(script|style)[\s\S]*?<\/\1>/g, " ")
    .replace(/<([a-z0-9]+)[^>]*\slang="en"[^>]*>[\s\S]*?<\/\1>/g, " ");
  const attributes = [...kept.matchAll(/\s(?:aria-label|placeholder|title|alt)="([^"]*)"/g)].map((m) => m[1]);
  return [...kept.split(/<[^>]+>/), ...attributes].map((text) => decode(text).trim()).filter(Boolean);
}

// The pieces of visible text that still have English words in them.
function english(markup: string, offerText: readonly string[] = []): string[] {
  const shown = [...OFFER_TEXTS, ...offerText];
  return [
    ...new Set(
      visibleText(markup)
        .filter((text) => !shown.some((offer) => offer.includes(text)))
        .filter((text) => {
          const words = text.replace(/https?:\/\/\S+|[\w.+-]+@[\w.-]+|\bRF-\d{3}\b/g, " ").match(/[A-Za-z][A-Za-z'’]{2,}/g);
          return (words ?? []).some((word) => !KEEP.has(word.toLowerCase()));
        }),
    ),
  ];
}

const evidence = (result: ReturnType<typeof runManager>) => result.findings.flatMap((finding) => finding.evidence);

describe("Arabic interface: every page is in Arabic", () => {
  it.each([
    ["/check", () => html(createElement(CheckPage))],
    ["/radar", () => html(createElement(RadarPage))],
    ["/portals", () => html(createElement(PortalsPage))],
    ["/legal", () => html(createElement(LegalPage))],
    ["/vault", () => html(createElement(VaultPage))],
    ["not found", () => html(createElement(NotFound))],
    ["loading", () => html(createElement(Loading))],
    ["error", () => html(createElement(ErrorPage, { error: new Error("x"), retry: () => {} }))],
    ["global error", () => html(createElement(GlobalError, { error: new Error("x"), retry: () => {} }))],
    ["header", () => html(createElement(Navbar))],
    ["footer", () => html(createElement(SiteFooter))],
  ])("%s", (_name, render) => {
    expect(english(render())).toEqual([]);
  });
});

describe("Arabic interface: every state of a result is in Arabic", () => {
  const scam = runManager(SCAM_OFFER);
  const legit = runManager(LEGIT_OFFER);
  const card = (result: ReturnType<typeof runManager>, props: Record<string, unknown> = {}) =>
    html(
      createElement(ResultCard, {
        result,
        ruleCount: RULES.length,
        sourceText: SCAM_OFFER,
        channel: "WhatsApp",
        redacted: 2,
        onNewAudit: () => {},
        onSave: () => {},
        onReport: () => {},
        ...props,
      }),
    );

  it.each([
    ["matched, full coverage", () => card(scam)],
    ["nothing matched", () => card(legit)],
    ["translated, matched", () => card(scam, { coverage: "translated", sourceLang: "hi" })],
    ["translated, nothing matched", () => card(legit, { coverage: "translated", sourceLang: "ur" })],
    ["partial, matched", () => card(scam, { coverage: "partial" })],
    ["partial, nothing matched", () => card(legit, { coverage: "partial" })],
    ["unchecked", () => card(legit, { coverage: "unchecked" })],
    ["not a job offer", () => card(runManager("Hi, how are you? Call me back when you can."), { offerSignals: [] })],
  ])("%s", (_name, render) => {
    expect(english(render(), [...evidence(scam), ...evidence(legit)])).toEqual([]);
  });

  it("unchecked and partial text still show no number and no Low, in Arabic too", () => {
    for (const coverage of ["unchecked", "partial"] as const) {
      const markup = card(legit, { coverage });
      // The verdict area: title, chip, meta line, summary and rule groups. The band key below it is a
      // fixed legend shown in every state, so it is left out.
      const head = markup.slice(markup.indexOf("score-card"), markup.indexOf("result-toolbar"));
      expect(head, coverage).not.toMatch(/\bLow\b|منخفض/);
      if (coverage === "unchecked") expect(head).not.toMatch(/score-value">\d/);
    }
  });

  it("the quoted evidence stays exactly as typed", () => {
    const markup = decode(card(scam));
    for (const quote of evidence(scam)) expect(markup).toContain(quote);
  });

  it("the translation panels and every translation failure", () => {
    const shown = { original: "نص العرض", english: "The offer text", sourceLang: "ar" };
    expect(english(html(createElement(TranslationShown, { translation: shown })), [shown.english])).toEqual([]);
    for (const code of Object.keys(TRANSLATE_ERRORS) as TranslateFailure[]) {
      expect(english(html(createElement(TranslateFailureAlert, { code }))), code).toEqual([]);
    }
  });

  it("the draft reply panel, the audit trail and the modals", () => {
    const pending = gateReducer(INITIAL_GATE_FLOW, { type: "prepare", at: "2026-11-10T00:00:00Z", findings: scam.findings });
    const panels = [
      html(createElement(ApprovalPanel, { gate: null, dispatch: () => {} })),
      html(createElement(ApprovalPanel, { gate: pending.gate, dispatch: () => {} })),
      html(createElement(AuditTrail, { entries: [] })),
      html(createElement(ReportModal, { initial: {}, onClose: () => {} })),
      html(createElement(SaveVaultModal, { view: toResultView(scam), channel: "Email", checkedText: SCAM_OFFER, bandLabel: "High risk indicators", onClose: () => {}, onSaved: () => {} })),
      html(createElement(EmptyVault)),
    ];
    for (const markup of panels) expect(english(markup)).toEqual([]);
  });

  it("the analyzer before a check", () => {
    expect(english(html(createElement(OfferChecker, { ruleCount: RULES.length, samples: SAMPLE_OFFERS })))).toEqual([]);
  });
});

describe("Arabic interface: every message of the existing flow has Arabic", () => {
  const scam = runManager(SCAM_OFFER);
  const legit = runManager(LEGIT_OFFER);
  const messages: string[] = [
    LANGUAGE_GATE_NOTE,
    LANGUAGE_GATE_BUTTON,
    LANGUAGE_GATE_TRANSLATE_NOTE,
    LANGUAGE_GATE_UNCERTAIN_NOTE,
    TRANSLATE_BUTTON,
    TRANSLATE_CONSENT_TEXT,
    TRANSLATION_NOTE,
    TRANSLATE_FAILED_TITLE,
    TRANSLATE_UNAVAILABLE_TITLE,
    RESULT_CLEARED,
    OFFER_NOTICE,
    PUBLIC_LIMITS_INTRO,
    ...PUBLIC_LIMITS.flatMap((item) => [item.title, item.text]),
    ...Object.values(LANGUAGE_NOTICES),
    ...(Object.keys(TRANSLATE_ERRORS) as TranslateFailure[]).map((code) => translateFailureMessage(code)),
    ...[networkFailure(true), networkFailure(false), ...[413, 400, 500, 200].map((status) => responseFailure(status, null))].flatMap(
      (failure) => [failure.title, failure.message],
    ),
    responseFailure(400, { error: "Paste an offer to check." }).message,
    checkBlockedReason("", true),
    checkBlockedReason("", false),
    ...checkingSteps(RULES.length),
    ...Object.values(CHECK_LABELS),
    ...Object.values(CHECK_NOTES).filter((note): note is string => Boolean(note)),
    ...WARNING_SIGNS.flatMap((sign) => [sign.sign, sign.whatToDo, sign.why]),
    ...(["unchecked", "partial", "translated"] as const).map((state) => intakeNote(state, "hi") ?? ""),
    VAULT_EMPTY,
    VAULT_LOCAL_NOTE,
    PASSPHRASE_NOTE,
    SAVED_NOTICE,
  ];
  for (const notice of [null, "most", "part", "offer", "translated"] as const) {
    for (const result of [scam, legit]) {
      messages.push(resultAnnouncement(result, notice), scoreChip(result.risk, result.findings, notice).label);
      const summary = qualifiedSummary(result.risk, result.findings, notice);
      if (summary) messages.push(summary);
    }
  }
  for (const state of ["full", "partial", "translated", "unchecked"] as const) {
    for (const result of [scam, legit]) messages.push(toResultView(result, state).summary);
  }
  for (const step of [...scam.trace, ...legit.trace]) messages.push(step.summary);

  it.each([...new Set(messages.filter((text) => text.length > 0))].map((text) => [text]))("%s", (text) => {
    expect(hasArabic(text)).toBe(true);
  });
});

describe("Arabic typography (letters join, so nothing may space or restyle them)", () => {
  const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start, selector).toBeGreaterThan(-1);
    return css.slice(start, css.indexOf("}", start));
  };

  it("the Arabic root sets letter-spacing: normal and no upper case on every text element", () => {
    const text = block(':root[lang="ar"] body *:not([lang="en"], [lang="en"] *)');
    expect(text).toContain("letter-spacing: normal;");
    expect(text).toContain("text-transform: none;");
  });

  it("every letter-spacing or upper-case rule is a plain selector the Arabic rule outranks", () => {
    // The Arabic rule's specificity is (0,2,1); a rule that spaces letters must stay below it.
    const rules = css.replace(/\/\*[\s\S]*?\*\//g, "");
    for (const match of rules.matchAll(/([^{}]+)\{[^{}]*(?:letter-spacing:\s*(?!normal)[^;]+|text-transform:\s*uppercase)[^{}]*\}/g)) {
      for (const selector of match[1].split(",").map((part) => part.trim())) {
        if (selector.startsWith(":root[lang=") || selector.startsWith('[lang="en"]')) continue;
        expect(selector, selector).toMatch(/^(?:[a-z0-9]+|\.[a-z0-9-]+)$/);
      }
    }
    expect(css).not.toMatch(/letter-spacing:[^;]*!important/);
  });

  it("uses system Arabic fonts only, no monospace on Arabic text, and taller lines", () => {
    const stack = /--font-arabic:\s*([^;]+);/.exec(css)?.[1] ?? "";
    expect(stack).toBe('"Segoe UI", Tahoma, "Geeza Pro", "Noto Naskh Arabic", "Noto Sans Arabic", Arial, sans-serif');
    expect(css).not.toMatch(/@font-face|@import|url\(\s*["']?https?:/);
    // Every element, so a class that sets a monospace font itself (such as .brand-caption) is covered.
    expect(block(':root[lang="ar"] body *:not([lang="en"], [lang="en"] *)')).toContain("font-family: var(--font-arabic);");
    expect(Number(/line-height:\s*([\d.]+)/.exec(block(':root[lang="ar"] body'))?.[1])).toBeGreaterThanOrEqual(1.7);
  });
});

describe("language choice and what was not ported", () => {
  const store = readFileSync("src/components/shell/lang.ts", "utf8");

  it("defaults to English, never reads the browser's language, and wraps storage in try/catch", () => {
    expect(getLang()).toBe("en");
    expect(store).not.toMatch(/navigator|languages?\b\s*\[|Accept-Language/i);
    const lines = store.split(/\r?\n/);
    lines.forEach((line, index) => {
      if (line.includes("localStorage") && !line.trim().startsWith("//")) expect(lines[index - 1].trim(), line).toBe("try {");
    });
  });

  it("no Arabic text claims more than the English: no AI chip, percentages, 360 radar or law articles", () => {
    for (const [en, ar] of Object.entries(AR)) {
      expect(ar, en).not.toMatch(/Gemini|%|٪|360|مادة|آمن|موثوق|موثّق|مضمون|احتمال|متصل بالذكاء/);
    }
  });
});
