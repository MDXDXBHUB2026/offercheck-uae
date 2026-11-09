// BATCHB-2, server only: the call to Google Cloud Translation (Basic, v2 REST) and the guards around
// /api/translate. Imported only by that route, which alone reads the key and passes it in.
// Nothing here logs, stores or caches the text or the translation. The only state is the throttle's
// request times per client address, in this module's memory: never written anywhere, lost on restart.
import { sourceLanguage, type TranslateErrorCode } from "./translation";
import { MAX_OFFER_CHARS } from "./types";

export const GOOGLE_TRANSLATE_URL = "https://translation.googleapis.com/language/translate/v2";
export const PROVIDER_TIMEOUT_MS = 8_000;

export type ProviderResult =
  | { ok: true; translatedText: string; detectedSourceLanguage: string }
  | { ok: false; code: TranslateErrorCode };

function providerFailure(status: number): TranslateErrorCode {
  if (status === 401 || status === 403) return "provider_denied";
  if (status === 429) return "provider_busy";
  return "provider_error";
}

// Only the one translation, with a language code from the fixed list. Anything else is an error.
function readReply(data: unknown): { translatedText: string; detectedSourceLanguage: string } | null {
  if (typeof data !== "object" || data === null) return null;
  const translations = (data as { data?: { translations?: unknown } }).data?.translations;
  if (!Array.isArray(translations) || translations.length !== 1) return null;
  const first: unknown = translations[0];
  if (typeof first !== "object" || first === null) return null;
  const { translatedText, detectedSourceLanguage } = first as { translatedText?: unknown; detectedSourceLanguage?: unknown };
  if (typeof translatedText !== "string" || translatedText.trim().length === 0) return null;
  // The translation is checked next, so it must fit the check's own limit.
  if (translatedText.length > MAX_OFFER_CHARS) return null;
  return { translatedText, detectedSourceLanguage: sourceLanguage(detectedSourceLanguage) };
}

// The text goes as data in a JSON body. The key goes in the x-goog-api-key header, never the URL.
// format "text" keeps the reply plain (no HTML escaping); no source language, so Google detects it.
export async function translateWithGoogle(
  text: string,
  apiKey: string,
  { fetchImpl = globalThis.fetch, timeoutMs = PROVIDER_TIMEOUT_MS }: { fetchImpl?: typeof fetch; timeoutMs?: number } = {},
): Promise<ProviderResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    let response: Response;
    try {
      response = await fetchImpl(GOOGLE_TRANSLATE_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json; charset=utf-8", "x-goog-api-key": apiKey },
        body: JSON.stringify({ q: text, target: "en", format: "text" }),
        signal: controller.signal,
        cache: "no-store",
        redirect: "error",
      });
    } catch {
      return { ok: false, code: controller.signal.aborted ? "provider_timeout" : "provider_error" };
    }
    if (!response.ok) {
      // The provider's error body is never read or forwarded.
      await response.body?.cancel().catch(() => {});
      return { ok: false, code: providerFailure(response.status) };
    }
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { ok: false, code: controller.signal.aborted ? "provider_timeout" : "provider_error" };
    }
    const reply = readReply(data);
    return reply ? { ok: true, ...reply } : { ok: false, code: "provider_error" };
  } finally {
    clearTimeout(timer);
  }
}

// Cross-site calls are refused: the browser must say same-origin or same-site, or, when it sends no
// Sec-Fetch-Site, an Origin header must name this host. Any other Sec-Fetch-Site value is refused.
export function isSameSiteRequest(request: Request): boolean {
  const site = request.headers.get("sec-fetch-site");
  if (site === "same-origin" || site === "same-site") return true;
  if (site) return false;
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const host = request.headers.get("host") ?? new URL(request.url).host;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Best effort: 10 requests a minute per client address, in this instance's memory only. On
// serverless hosting each instance has its own table and a cold start empties it, so this is not a
// spend limit. The real spend limit is the quota set on the Google Cloud project.
export const THROTTLE_LIMIT = 10;
export const THROTTLE_WINDOW_MS = 60_000;
const THROTTLE_MAX_CLIENTS = 5_000;

export function createThrottle(limit = THROTTLE_LIMIT, windowMs = THROTTLE_WINDOW_MS, maxClients = THROTTLE_MAX_CLIENTS) {
  const hits = new Map<string, number[]>();
  return {
    allow(client: string, now = Date.now()): boolean {
      const recent = (hits.get(client) ?? []).filter((time) => now - time < windowMs);
      if (recent.length >= limit) {
        hits.set(client, recent);
        return false;
      }
      if (!hits.has(client) && hits.size >= maxClients) {
        for (const [key, times] of hits) if (times.every((time) => now - time >= windowMs)) hits.delete(key);
        if (hits.size >= maxClients) hits.clear();
      }
      recent.push(now);
      hits.set(client, recent);
      return true;
    },
    clients: () => hits.size,
  };
}

export const translateThrottle = createThrottle();

// The first address in X-Forwarded-For (set by the host), else X-Real-IP. Used only as a throttle key.
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || headers.get("x-real-ip")?.trim() || "unknown").slice(0, 64);
}
