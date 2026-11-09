import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runManager } from "@/lib/agents/manager";
import { TRANSLATE_FAILURES, type TranslateFailure } from "@/lib/translation";
import { resultAnnouncement } from "./OfferChecker";
import { ResultsPanel } from "./ResultsPanel";
import { scoreChip, TRANSLATED_NONE_LABEL } from "./scoreChip";
import {
  failureForCheck,
  idleFlow,
  TRANSLATE_CONSENT_TEXT,
  TRANSLATE_FAILED_TITLE,
  translateFailureMessage,
  translateFlowReducer,
  TRANSLATION_NOTE,
  type TranslateFlow,
} from "./translateFlow";
import { requestTranslation } from "./translateRequest";
import { TranslateConsent, TranslateFailureAlert, TranslationShown } from "./TranslationPanels";

// BATCHB-2: the page side of the translation. fetch is always mocked.
const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";

function reply(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

afterEach(() => vi.unstubAllGlobals());

describe("requestTranslation (the page's only translation request)", () => {
  it("sends the text and the consent flag, and nothing else, to its own route", async () => {
    const fetchMock = vi.fn(async () => reply({ translatedText: "Visa fee", detectedSourceLanguage: "ar" }));
    await expect(requestTranslation(ARABIC, fetchMock as unknown as typeof fetch)).resolves.toEqual({ ok: true, translatedText: "Visa fee", sourceLang: "ar" });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("/api/translate");
    expect(init.method).toBe("POST");
    expect(JSON.parse(String(init.body))).toEqual({ text: ARABIC, consent: true });
  });

  it("refuses text over 5,000 characters without sending it", async () => {
    const fetchMock = vi.fn();
    await expect(requestTranslation("a".repeat(5_001), fetchMock as unknown as typeof fetch)).resolves.toEqual({ ok: false, code: "text_too_long" });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps a language code only from the fixed list", async () => {
    const fetchMock = vi.fn(async () => reply({ translatedText: "Hi", detectedSourceLanguage: "<img>" }));
    await expect(requestTranslation("x", fetchMock as unknown as typeof fetch)).resolves.toMatchObject({ sourceLang: "und" });
  });

  it.each([
    [503, { error: "translation_unavailable" }, "translation_unavailable"],
    [429, { error: "rate_limited" }, "rate_limited"],
    [502, { error: "provider_error" }, "provider_error"],
    [503, { error: "provider_timeout" }, "provider_timeout"],
    [500, { error: "some text from a proxy" }, "unreadable"],
    [502, "<html>Bad gateway</html>", "unreadable"],
    [200, { translatedText: "" }, "unreadable"],
    [200, { translatedText: 5 }, "unreadable"],
    [200, { error: "provider_error" }, "unreadable"],
  ])("maps HTTP %i with %j to the fixed failure %s", async (status, body, code) => {
    const fetchMock = vi.fn(async () => reply(body, status));
    await expect(requestTranslation(ARABIC, fetchMock as unknown as typeof fetch)).resolves.toEqual({ ok: false, code });
  });

  it("maps a failed request to network, or offline when the browser says so", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    }) as unknown as typeof fetch;
    await expect(requestTranslation(ARABIC, failing)).resolves.toEqual({ ok: false, code: "network" });
    vi.stubGlobal("navigator", { onLine: false });
    await expect(requestTranslation(ARABIC, failing)).resolves.toEqual({ ok: false, code: "offline" });
  });
});

describe("consent gate: one explicit confirm per send, no auto-send", () => {
  const step = (flow: TranslateFlow, ...actions: Parameters<typeof translateFlowReducer>[1][]) =>
    actions.reduce(translateFlowReducer, flow);

  it("Translate opens the consent box; only Confirm from the consent box starts a send", () => {
    expect(idleFlow()).toEqual({ step: "idle" });
    expect(step(idleFlow(), { type: "ask" })).toEqual({ step: "consent" });
    expect(step(idleFlow(), { type: "ask" }, { type: "confirm" })).toEqual({ step: "sending" });
    // Confirm without the consent box open does nothing.
    for (const flow of [idleFlow(), { step: "failed", code: "provider_error" } as const, { step: "unavailable", alert: true } as const]) {
      expect(step(flow, { type: "confirm" })).toEqual(flow);
    }
  });

  it("a second Confirm while sending does not start another send", () => {
    const sending = step(idleFlow(), { type: "ask" }, { type: "confirm" });
    expect(step(sending, { type: "confirm" })).toBe(sending);
    expect(step(sending, { type: "ask" })).toBe(sending);
  });

  it("consent is not remembered: after a success or a failure, the next send needs a new confirm", () => {
    const done = step(idleFlow(), { type: "ask" }, { type: "confirm" }, { type: "done" });
    expect(done).toEqual({ step: "idle" });
    expect(step(done, { type: "confirm" })).toEqual({ step: "idle" });
    const failed = step(idleFlow(), { type: "ask" }, { type: "confirm" }, { type: "failed", code: "provider_busy" });
    expect(failed).toEqual({ step: "failed", code: "provider_busy" });
    expect(step(failed, { type: "confirm" })).toEqual(failed);
    expect(step(failed, { type: "ask" })).toEqual({ step: "consent" });
  });

  it("Cancel closes the consent box without sending", () => {
    expect(step(idleFlow(), { type: "ask" }, { type: "cancel" })).toEqual({ step: "idle" });
  });

  it("translation_unavailable turns translation off for the visit; an edit or a check keeps it off", () => {
    const off = step(idleFlow(), { type: "ask" }, { type: "confirm" }, { type: "failed", code: "translation_unavailable" });
    expect(off).toEqual({ step: "unavailable", alert: true });
    expect(step(off, { type: "reset" })).toEqual({ step: "unavailable", alert: false });
    expect(step(off, { type: "checked" })).toEqual({ step: "unavailable", alert: false });
    expect(step(off, { type: "ask" })).toBe(off);
  });

  it("a check of the original carries the failure code, for the audit trail only", () => {
    expect(failureForCheck({ step: "failed", code: "provider_timeout" })).toEqual({ result: "provider_timeout" });
    expect(failureForCheck({ step: "unavailable", alert: false })).toEqual({ result: "translation_unavailable" });
    expect(failureForCheck(idleFlow())).toBeNull();
    expect(failureForCheck({ step: "consent" })).toBeNull();
  });

  it("the consent box names Google Cloud Translation, says the app does not store the text, and has confirm and cancel", () => {
    const html = renderToStaticMarkup(createElement(TranslateConsent, { onConfirm: () => {}, onCancel: () => {} }));
    expect(TRANSLATE_CONSENT_TEXT).toContain("Google Cloud Translation");
    expect(TRANSLATE_CONSENT_TEXT).toContain("Offer Check does not store it");
    expect(html).toContain('role="group"');
    expect(html).toContain(">Send to Google and translate<");
    expect(html).toContain(">Cancel<");
    expect(TRANSLATE_CONSENT_TEXT).toMatch(/^[\x20-\x7e]+$/);
  });
});

describe("translation failure: an alert, never a silent check of the original", () => {
  it.each(TRANSLATE_FAILURES)("%s has a fixed ASCII message", (code) => {
    const message = translateFailureMessage(code as TranslateFailure);
    expect(message.length).toBeGreaterThan(10);
    expect(message).toMatch(/^[\x20-\x7e]+$/);
  });

  it("the alert says nothing was checked, as role=alert, with no offer text", () => {
    const html = renderToStaticMarkup(createElement(TranslateFailureAlert, { code: "provider_timeout" }));
    expect(TRANSLATE_FAILED_TITLE).toBe("Translation did not work, so nothing was checked.");
    expect(html).toContain('role="alert"');
    expect(html).toContain(TRANSLATE_FAILED_TITLE);
    expect(html).toContain(translateFailureMessage("provider_timeout"));
  });
});

describe("translated result", () => {
  const shown = { original: `${ARABIC} <b>bold</b>`, english: "Please reply soon. <i>x</i>", sourceLang: "ar" };

  it("shows the original under a label with its language, and the English read-only, as escaped text", () => {
    const html = renderToStaticMarkup(createElement(TranslationShown, { translation: shown }));
    expect(html).toContain("Original text (Arabic)");
    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="auto"');
    expect(html).toContain("&lt;b&gt;bold&lt;/b&gt;");
    expect(html).not.toContain("<b>bold</b>");
    expect(html).toContain("English translation that was checked");
    expect(html).toContain("Please reply soon. &lt;i&gt;x&lt;/i&gt;");
    expect(html).not.toMatch(/<textarea|<input|contenteditable/);
    expect(html).toContain(TRANSLATION_NOTE);
    expect(TRANSLATION_NOTE).toContain("machine translation by Google Cloud Translation");
    expect(TRANSLATION_NOTE).toContain("may be inexact");
  });

  it("an unknown language gets a plain label and no lang attribute", () => {
    const html = renderToStaticMarkup(createElement(TranslationShown, { translation: { ...shown, sourceLang: "und" } }));
    expect(html).toContain(">Original text<");
    expect(html).not.toContain('lang="und"');
  });

  it("no red-flag match on the translation: a grey neutral chip, never green, in every place", () => {
    const result = runManager("Please reply to confirm your interview time.");
    expect(result.findings).toHaveLength(0);
    expect(scoreChip(result.risk, result.findings, "translated")).toEqual({ label: TRANSLATED_NONE_LABEL, tone: "neutral" });
    const html = renderToStaticMarkup(
      createElement(ResultsPanel, { result, ruleCount: 5, coverage: "translated", sourceLang: "ar" }),
    );
    expect(html).toContain("score-neutral");
    expect(html).toContain(TRANSLATED_NONE_LABEL);
    expect(html).not.toContain("No risk indicators found");
    expect(html).not.toContain("score-success");
    expect(html).toContain("None of the 5 rules matched in the English translation.");
    expect(html).toContain("Checked a machine translation into English from Arabic, made by Google Cloud Translation.");
    const announcement = resultAnnouncement(result, "translated");
    expect(announcement).not.toContain("No risk indicators found");
    expect(announcement).toContain("English translation");
  });

  it("a translated text with a finding keeps the rules' own score and band", () => {
    const english = "Pay the visa fee of AED 500 today.";
    const result = runManager(english);
    const html = renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount: 5, coverage: "translated", sourceLang: "ar" }));
    expect(result.findings.length).toBeGreaterThan(0);
    expect(html).toContain(`<span class="score-value">${result.risk.score}</span>`);
  });
});
