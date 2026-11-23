// Production hardening, Phase 2: shared rate limits for /api/analyze and /api/translate, and a daily
// cap on the characters sent to Google. Server only; imported by the two API routes.
//
// What is stored: counters only, each with an expiry. A key is a fixed prefix, a time window and,
// for a per-visitor counter, the first 32 hex characters of HMAC-SHA-256(OFFERCHECK_RATE_SALT, client
// address). Never the address itself, a user agent, offer text or anything from the request body.
// Nothing here logs. The store's URL and token go only into the store request.
//
// Where the counters live:
// - "store": the Upstash Redis REST API (KV_REST_API_URL, KV_REST_API_TOKEN; no other store
//   variable is read), called with fetch, one pipeline per counter group, with a short timeout.
// - "memory": this instance's memory, for local development and tests (no store configured, not on
//   Vercel), with a fixed, public test salt. A cold start empties it.
// - "unavailable": on Vercel with no store or no salt configured. Treated like an unreachable store.
// If the store cannot be used: translation is refused (it costs money); analysis is still limited,
// per instance, in memory.
//
// Windows are fixed: the current UTC minute, or the current UTC day. The window is part of the key,
// so a new minute or day starts a new counter; the expiry only clears old keys away.
import { MAX_OFFER_CHARS } from "./types";

export const ANALYZE_PER_MINUTE = 30;
export const TRANSLATE_PER_MINUTE = 10;
export const TRANSLATE_PER_DAY = 20;
// Google Cloud Translation Basic includes 500,000 characters a month, about 16,000 a day.
export const DEFAULT_DAILY_CHAR_CAP = 15_000;
export const STORE_TIMEOUT_MS = 800;
// Public on purpose: used only with no store, where nothing leaves the instance.
export const LOCAL_TEST_SALT = "offercheck-local-test-salt-not-secret";

const MINUTE_TTL_S = 120;
const DAY_TTL_S = 90_000; // 25 hours: the whole UTC day, plus margin.
const PREFIX = "oc:v1";
const MEMORY_MAX_KEYS = 10_000;

export type Counter = { key: string; by: number; ttlSeconds: number };
// Adds `by` to each counter, sets its expiry if it has none, and returns the new values in order.
// Throws if the store cannot answer.
export type CounterStore = { add(counters: Counter[]): Promise<number[]> };

export type Env = Record<string, string | undefined>;
export type LimitOptions = { env?: Env; fetchImpl?: typeof fetch; now?: number; memory?: CounterStore; timeoutMs?: number };

export type TranslateVerdict = "ok" | "rate_limited" | "daily_limit" | "translation_unavailable";

// --- Client address -------------------------------------------------------------------------

// The first address in X-Forwarded-For (on Vercel, set by Vercel and not forwarded from the client),
// else X-Real-IP. Used only as input to the keyed hash below; never stored or returned.
export function clientAddress(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || headers.get("x-real-ip")?.trim() || "unknown").slice(0, 64);
}

export async function visitorKey(address: string, salt: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(salt), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const mac = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(address)));
  return [...mac.slice(0, 16)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// --- Configuration --------------------------------------------------------------------------

export type Mode =
  | { kind: "store"; url: string; token: string; salt: string; cap: number }
  | { kind: "memory"; salt: string; cap: number }
  | { kind: "unavailable"; cap: number; salt?: string };

export function dailyCharCap(value: string | undefined): number {
  const cap = Number(value?.trim());
  return value?.trim() && Number.isSafeInteger(cap) && cap > 0 ? cap : DEFAULT_DAILY_CHAR_CAP;
}

export function limitMode(env: Env = process.env): Mode {
  const url = env.KV_REST_API_URL?.trim();
  const auth = env.KV_REST_API_TOKEN?.trim();
  const salt = env.OFFERCHECK_RATE_SALT?.trim();
  const cap = dailyCharCap(env.OFFERCHECK_DAILY_CHAR_CAP);
  if (url && auth) return salt ? { kind: "store", url: url.replace(/\/+$/, ""), token: auth, salt, cap } : { kind: "unavailable", cap };
  // Deployed without a store: refuse what costs money rather than fall back to per-instance counters.
  if (env.VERCEL) return { kind: "unavailable", cap, ...(salt ? { salt } : {}) };
  return { kind: "memory", salt: salt || LOCAL_TEST_SALT, cap };
}

// --- Stores ---------------------------------------------------------------------------------

export function upstashStore(url: string, auth: string, fetchImpl: typeof fetch = globalThis.fetch, timeoutMs = STORE_TIMEOUT_MS): CounterStore {
  return {
    async add(counters) {
      const commands = counters.flatMap(({ key, by, ttlSeconds }) => [
        by === 1 ? ["INCR", key] : ["INCRBY", key, String(by)],
        ["EXPIRE", key, String(ttlSeconds), "NX"],
      ]);
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(`${url}/pipeline`, {
          method: "POST",
          headers: { Authorization: `Bearer ${auth}`, "Content-Type": "application/json" },
          body: JSON.stringify(commands),
          signal: controller.signal,
          cache: "no-store",
          redirect: "error",
        });
        if (!response.ok) {
          await response.body?.cancel().catch(() => {});
          throw new Error("store refused");
        }
        const replies: unknown = await response.json();
        if (!Array.isArray(replies) || replies.length !== commands.length) throw new Error("store reply");
        return counters.map((_, index) => {
          const value = (replies[index * 2] as { result?: unknown } | null)?.result;
          if (typeof value !== "number" || !Number.isFinite(value)) throw new Error("store reply");
          return value;
        });
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

export function memoryStore(maxKeys = MEMORY_MAX_KEYS, clock: () => number = Date.now): CounterStore & { size(): number } {
  const counts = new Map<string, { value: number; expires: number }>();
  return {
    async add(counters) {
      const now = clock();
      return counters.map(({ key, by, ttlSeconds }) => {
        let entry = counts.get(key);
        if (entry && entry.expires <= now) entry = undefined;
        if (!entry) {
          if (counts.size >= maxKeys) {
            for (const [k, e] of counts) if (e.expires <= now) counts.delete(k);
            if (counts.size >= maxKeys) counts.clear();
          }
          entry = { value: 0, expires: now + ttlSeconds * 1000 };
          counts.set(key, entry);
        }
        entry.value += by;
        return entry.value;
      });
    },
    size: () => counts.size,
  };
}

// This instance's counters: the local store, and the analysis fallback when the shared store fails.
const instanceMemory = memoryStore();

// --- Windows and keys -----------------------------------------------------------------------

export function minuteWindow(now: number): string {
  return String(Math.floor(now / 60_000));
}

export function dayWindow(now: number): string {
  return new Date(now).toISOString().slice(0, 10).replaceAll("-", "");
}

export const keys = {
  analyzeMinute: (visitor: string, now: number) => `${PREFIX}:am:${minuteWindow(now)}:${visitor}`,
  translateMinute: (visitor: string, now: number) => `${PREFIX}:tm:${minuteWindow(now)}:${visitor}`,
  translateDay: (visitor: string, now: number) => `${PREFIX}:td:${dayWindow(now)}:${visitor}`,
  charsDay: (now: number) => `${PREFIX}:tc:${dayWindow(now)}`,
};

// --- The two checks -------------------------------------------------------------------------

// /api/analyze: at most ANALYZE_PER_MINUTE a minute per visitor. Never refused because the store is
// down: the count then falls back to this instance's memory.
export async function allowAnalyze(headers: Headers, options: LimitOptions = {}): Promise<boolean> {
  const now = options.now ?? Date.now();
  const memory = options.memory ?? instanceMemory;
  const mode = limitMode(options.env);
  const salt = mode.salt ?? LOCAL_TEST_SALT;
  const counter: Counter = { key: keys.analyzeMinute(await visitorKey(clientAddress(headers), salt), now), by: 1, ttlSeconds: MINUTE_TTL_S };
  let count: number;
  if (mode.kind === "store") {
    try {
      [count] = await upstashStore(mode.url, mode.token, options.fetchImpl, options.timeoutMs).add([counter]);
    } catch {
      [count] = await memory.add([counter]);
    }
  } else {
    [count] = await memory.add([counter]);
  }
  return count <= ANALYZE_PER_MINUTE;
}

// /api/translate, called after the request is validated and consented, with the length of the text
// that would be sent. Per visitor: TRANSLATE_PER_MINUTE a minute and TRANSLATE_PER_DAY a UTC day
// (every attempt counts). Then the whole app: the characters sent to Google in this UTC day stay
// within the cap; a text that would pass it is refused and its characters are given back.
// Any store failure refuses the translation.
export async function allowTranslate(headers: Headers, chars: number, options: LimitOptions = {}): Promise<TranslateVerdict> {
  const now = options.now ?? Date.now();
  const mode = limitMode(options.env);
  if (mode.kind === "unavailable") return "translation_unavailable";
  const store = mode.kind === "store" ? upstashStore(mode.url, mode.token, options.fetchImpl, options.timeoutMs) : (options.memory ?? instanceMemory);
  const size = Math.max(1, Math.min(Math.trunc(chars), MAX_OFFER_CHARS));
  try {
    const visitor = await visitorKey(clientAddress(headers), mode.salt);
    const [minute, day] = await store.add([
      { key: keys.translateMinute(visitor, now), by: 1, ttlSeconds: MINUTE_TTL_S },
      { key: keys.translateDay(visitor, now), by: 1, ttlSeconds: DAY_TTL_S },
    ]);
    if (minute > TRANSLATE_PER_MINUTE) return "rate_limited";
    if (day > TRANSLATE_PER_DAY) return "daily_limit";
    const charsKey = keys.charsDay(now);
    const [total] = await store.add([{ key: charsKey, by: size, ttlSeconds: DAY_TTL_S }]);
    if (total > mode.cap) {
      await store.add([{ key: charsKey, by: -size, ttlSeconds: DAY_TTL_S }]).catch(() => {});
      return "translation_unavailable";
    }
    return "ok";
  } catch {
    return "translation_unavailable";
  }
}

// --- Daily totals (Production Phase 5, counts only) ---------------------------------------------

// How many checks, errors and limit hits happened in a UTC day: five counters, each a number. A key
// is oc:v1:m:<UTC day>:<name> and nothing else: no visitor key, no address, no user agent, no offer
// text, no cookie, no request body. They expire after 40 days. Nothing reads them over the web;
// scripts/read-counts.mjs, run by the owner, prints the last 14 days.
//   checks              /api/analyze returned a result
//   analyze_errors      /api/analyze answered with an error other than 429 (bad request, too long)
//   analyze_rate_limits /api/analyze answered 429
//   translate_requests  every POST to /api/translate
//   translate_refusals  /api/translate answered with an error (cross-site, no consent, limit, ...)
export const COUNT_NAMES = ["checks", "analyze_errors", "analyze_rate_limits", "translate_requests", "translate_refusals"] as const;
export type CountName = (typeof COUNT_NAMES)[number];
export const COUNT_TTL_S = 40 * 86_400;

export function countKey(name: CountName, now: number): string {
  return `${PREFIX}:m:${dayWindow(now)}:${name}`;
}

// Adds one to a daily total. Never throws and never reports: if the store cannot be used or does not
// answer within the same short timeout as the limits, the count is skipped. On Vercel with no store
// nothing is counted (a per-instance count would be wrong). Locally, the counts go to memory.
export async function recordCount(name: CountName, options: LimitOptions = {}): Promise<void> {
  try {
    const mode = limitMode(options.env);
    if (mode.kind === "unavailable") return;
    const store = mode.kind === "store" ? upstashStore(mode.url, mode.token, options.fetchImpl, options.timeoutMs) : (options.memory ?? instanceMemory);
    await store.add([{ key: countKey(name, options.now ?? Date.now()), by: 1, ttlSeconds: COUNT_TTL_S }]);
  } catch {
    // Skipped on purpose: monitoring never changes a response.
  }
}
