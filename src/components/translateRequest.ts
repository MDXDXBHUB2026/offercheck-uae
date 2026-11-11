import { isTranslateFailure, sourceLanguage, TRANSLATE_MAX_CHARS, type TranslateFailure } from "@/lib/translation";
import { redactSensitive } from "@/lib/redact";
import { MAX_OFFER_CHARS } from "@/lib/types";

// BATCHB-2: the page's only translation request, to this app's own /api/translate route (which calls
// Google Cloud Translation). OfferChecker calls it only from the "Send to Google and translate"
// button, once per press. It sends the text and the consent flag (the user pressed that labelled
// button), nothing else, and keeps neither. STALE-1: signal lets the page abort it when the text changes.
// Auto-Redact (always on, 2026-11-11): the text is masked here, at the request itself, so Google never
// receives an Emirates ID, passport or UAE IBAN number in the formats src/lib/redact.ts knows.
export type TranslateOutcome =
  | { ok: true; translatedText: string; sourceLang: string }
  | { ok: false; code: TranslateFailure };

export async function requestTranslation(
  unmasked: string,
  fetchImpl: typeof fetch = globalThis.fetch,
  signal?: AbortSignal,
): Promise<TranslateOutcome> {
  const masked = redactSensitive(unmasked).text;
  if (masked.length > TRANSLATE_MAX_CHARS) return { ok: false, code: "text_too_long" };
  let response: Response;
  try {
    response = await fetchImpl("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: masked, consent: true }),
      signal,
    });
  } catch {
    return { ok: false, code: typeof navigator !== "undefined" && navigator.onLine === false ? "offline" : "network" };
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    data = null;
  }
  const reply = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  if (response.ok) {
    const { translatedText } = reply;
    if (typeof translatedText === "string" && translatedText.trim().length > 0 && translatedText.length <= MAX_OFFER_CHARS) {
      return { ok: true, translatedText, sourceLang: sourceLanguage(reply.detectedSourceLanguage) };
    }
    return { ok: false, code: "unreadable" };
  }
  // Only a code from the fixed list is believed; anything else, such as a proxy's page, is unreadable.
  return { ok: false, code: isTranslateFailure(reply.error) ? reply.error : "unreadable" };
}
