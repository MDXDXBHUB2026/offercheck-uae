import { isTranslateFailure, sourceLanguage, TRANSLATE_MAX_CHARS, type TranslateFailure } from "@/lib/translation";
import { MAX_OFFER_CHARS } from "@/lib/types";

// BATCHB-2: the page's only translation request, to this app's own /api/translate route (which calls
// Google Cloud Translation). OfferChecker calls it only from the consent box's confirm button, once
// per click. It sends the text and the consent flag, nothing else, and keeps neither.
export type TranslateOutcome =
  | { ok: true; translatedText: string; sourceLang: string }
  | { ok: false; code: TranslateFailure };

export async function requestTranslation(text: string, fetchImpl: typeof fetch = globalThis.fetch): Promise<TranslateOutcome> {
  if (text.length > TRANSLATE_MAX_CHARS) return { ok: false, code: "text_too_long" };
  let response: Response;
  try {
    response = await fetchImpl("/api/translate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, consent: true }),
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
