import { readFileSync } from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyzePOST } from "@/app/api/analyze/route";
import { POST as translatePOST } from "@/app/api/translate/route";
import { runWithAudit } from "@/lib/auditRun";
import { responseFailure } from "@/components/checkRequest";
import { translateFailureMessage } from "@/components/translateFlow";
import { tr } from "@/lib/i18n";
import {
  allowAnalyze,
  allowTranslate,
  ANALYZE_PER_MINUTE,
  DEFAULT_DAILY_CHAR_CAP,
  dailyCharCap,
  limitMode,
  LOCAL_TEST_SALT,
  memoryStore,
  STORE_TIMEOUT_MS,
  TRANSLATE_PER_DAY,
  TRANSLATE_PER_MINUTE,
  visitorKey,
} from "./rateLimit";

// Phase 2. Every store call goes to a fake fetch: no real network call. FAKE_URL and FAKE_AUTH are
// placeholders, and ADDRESS is a documentation address that must never appear in a stored key.
const FAKE_URL = "https://fake-store.invalid";
const FAKE_AUTH = "fake-store-credential-canary";
const SALT = "test-salt-for-rate-limits";
const ADDRESS = "203.0.113.77";
const STORE_ENV = { KV_REST_API_URL: FAKE_URL, KV_REST_API_TOKEN: FAKE_AUTH, OFFERCHECK_RATE_SALT: SALT, OFFERCHECK_DAILY_CHAR_CAP: "1000" };
const T0 = Date.parse("2026-11-15T10:00:05Z");

const headersFor = (address = ADDRESS) => new Headers({ "x-forwarded-for": `${address}, 10.0.0.1`, "user-agent": "UA-canary/1.0" });

// A stand-in for the Upstash REST pipeline endpoint: INCR, INCRBY and EXPIRE over a Map, with the
// same request and reply shapes. Records every request.
function fakeUpstash() {
  const data = new Map<string, number>();
  const ttl = new Map<string, number>();
  const requests: { url: string; init: RequestInit; commands: string[][] }[] = [];
  const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
    const commands = JSON.parse(String(init.body)) as string[][];
    requests.push({ url, init, commands });
    const replies = commands.map(([name, key, arg, option]) => {
      if (name === "INCR" || name === "INCRBY") {
        const value = (data.get(key) ?? 0) + (name === "INCR" ? 1 : Number(arg));
        data.set(key, value);
        return { result: value };
      }
      if (name === "EXPIRE" && option === "NX") {
        if (ttl.has(key)) return { result: 0 };
        ttl.set(key, Number(arg));
        return { result: 1 };
      }
      return { error: "ERR unknown command" };
    });
    return new Response(JSON.stringify(replies), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  return { data, ttl, requests, fetchImpl: fetchImpl as unknown as typeof fetch, calls: fetchImpl };
}

const down = (reason: "throw" | "401" | "garbage" | "hang") =>
  vi.fn(async (_url: string, init: RequestInit) => {
    if (reason === "throw") throw new TypeError("fetch failed");
    if (reason === "401") return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    if (reason === "garbage") return new Response("<html>gateway</html>", { status: 200 });
    return new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError"))));
  }) as unknown as typeof fetch;

beforeEach(() => {
  // Any fetch not passed in explicitly would be a real network call: fail loudly.
  vi.stubGlobal("fetch", vi.fn(async () => {
    throw new Error("unexpected network call");
  }));
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("configuration", () => {
  it("uses the store only with both store variables and the salt", () => {
    expect(limitMode(STORE_ENV)).toEqual({ kind: "store", url: FAKE_URL, token: FAKE_AUTH, salt: SALT, cap: 1000 });
    expect(limitMode({ ...STORE_ENV, OFFERCHECK_RATE_SALT: "" }).kind).toBe("unavailable");
    expect(limitMode({ ...STORE_ENV, KV_REST_API_TOKEN: undefined, VERCEL: "1" }).kind).toBe("unavailable");
  });

  it("runs in memory with the fixed test salt locally, and is unavailable on Vercel without a store", () => {
    expect(limitMode({})).toEqual({ kind: "memory", salt: LOCAL_TEST_SALT, cap: DEFAULT_DAILY_CHAR_CAP });
    expect(limitMode({ VERCEL: "1" }).kind).toBe("unavailable");
  });

  it("reads the cap from OFFERCHECK_DAILY_CHAR_CAP, with 15,000 when unset or not a positive integer", () => {
    expect(DEFAULT_DAILY_CHAR_CAP).toBe(15_000);
    expect(dailyCharCap("250000")).toBe(250_000);
    for (const bad of [undefined, "", " ", "0", "-5", "1.5", "abc", "1e400"]) expect(dailyCharCap(bad), String(bad)).toBe(15_000);
  });

  it("reads only the two allowed store variables, and logs nothing", () => {
    const source = readFileSync("src/lib/rateLimit.ts", "utf8");
    expect(source).toContain("env.KV_REST_API_URL");
    expect(source).toContain("env.KV_REST_API_TOKEN");
    expect(source).not.toMatch(/KV_REST_API_READ_ONLY_TOKEN|KV_URL|REDIS_URL|console\.|user-agent/i);
  });
});

describe("the visitor key", () => {
  it("is a keyed hash of the address: 32 hex characters, stable, and different for another salt", async () => {
    const key = await visitorKey(ADDRESS, SALT);
    expect(key).toMatch(/^[0-9a-f]{32}$/);
    expect(await visitorKey(ADDRESS, SALT)).toBe(key);
    expect(await visitorKey(ADDRESS, "another-salt")).not.toBe(key);
    expect(await visitorKey("203.0.113.78", SALT)).not.toBe(key);
  });

  it("no stored key holds the raw address, the user agent or the text; only counters with an expiry", async () => {
    const store = fakeUpstash();
    const options = { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 };
    await allowAnalyze(headersFor(), options);
    await allowTranslate(headersFor(), 42, options);
    const visitor = await visitorKey(ADDRESS, SALT);
    const keys = [...store.data.keys()];
    expect(keys.sort()).toEqual(
      [`oc:v1:am:29912280:${visitor}`, `oc:v1:tm:29912280:${visitor}`, `oc:v1:td:20261115:${visitor}`, "oc:v1:tc:20261115"].sort(),
    );
    const sent = JSON.stringify(store.requests.map((r) => r.commands));
    for (const secret of [ADDRESS, "203.0.113", "UA-canary", SALT]) expect(sent).not.toContain(secret);
    for (const request of store.requests) {
      for (const [name] of request.commands) expect(["INCR", "INCRBY", "EXPIRE"]).toContain(name);
    }
    // Every counter gets an expiry.
    expect([...store.ttl.keys()].sort()).toEqual(keys.sort());
  });
});

describe("the store request", () => {
  it("one pipeline per counter group: POST {url}/pipeline, bearer credential, INCR then EXPIRE NX", async () => {
    const store = fakeUpstash();
    await allowAnalyze(headersFor(), { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 });
    expect(store.requests).toHaveLength(1);
    const [{ url, init, commands }] = store.requests;
    expect(url).toBe(`${FAKE_URL}/pipeline`);
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>).Authorization).toBe(`Bearer ${FAKE_AUTH}`);
    expect(commands).toEqual([
      ["INCR", expect.stringMatching(/^oc:v1:am:/)],
      ["EXPIRE", expect.stringMatching(/^oc:v1:am:/), "120", "NX"],
    ]);
  });

  it("a translation that is allowed takes two pipelines: per visitor (4 commands), then the cap (2)", async () => {
    const store = fakeUpstash();
    expect(await allowTranslate(headersFor(), 300, { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 })).toBe("ok");
    expect(store.requests.map((r) => r.commands.map(([name]) => name))).toEqual([
      ["INCR", "EXPIRE", "INCR", "EXPIRE"],
      ["INCRBY", "EXPIRE"],
    ]);
    expect(store.requests[1].commands[0][2]).toBe("300");
  });
});

describe("/api/analyze limit", () => {
  it(`allows ${ANALYZE_PER_MINUTE} checks a minute per visitor, then refuses; another visitor is not affected`, async () => {
    expect(ANALYZE_PER_MINUTE).toBe(30);
    const store = fakeUpstash();
    const options = { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 };
    for (let i = 0; i < 30; i++) expect(await allowAnalyze(headersFor(), options)).toBe(true);
    expect(await allowAnalyze(headersFor(), options)).toBe(false);
    expect(await allowAnalyze(headersFor("198.51.100.1"), options)).toBe(true);
  });

  it("starts again in the next minute", async () => {
    const store = fakeUpstash();
    for (let i = 0; i < 31; i++) await allowAnalyze(headersFor(), { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 });
    expect(await allowAnalyze(headersFor(), { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 + 60_000 })).toBe(true);
  });

  it.each(["throw", "401", "garbage", "hang"] as const)("store down (%s): checks still run, limited per instance in memory", async (reason) => {
    const memory = memoryStore();
    const options = { env: STORE_ENV, fetchImpl: down(reason), now: T0, memory, timeoutMs: 20 };
    for (let i = 0; i < 30; i++) expect(await allowAnalyze(headersFor(), options)).toBe(true);
    expect(await allowAnalyze(headersFor(), options)).toBe(false);
  });

  it(`a slow store is abandoned after ${STORE_TIMEOUT_MS} ms by default`, async () => {
    expect(STORE_TIMEOUT_MS).toBe(800);
    const started = Date.now();
    expect(await allowAnalyze(headersFor(), { env: STORE_ENV, fetchImpl: down("hang"), now: T0, memory: memoryStore() })).toBe(true);
    expect(Date.now() - started).toBeLessThan(3_000);
  });

  it("works with no store at all, in memory, and never calls fetch", async () => {
    const memory = memoryStore();
    for (let i = 0; i < 30; i++) expect(await allowAnalyze(headersFor(), { env: {}, now: T0, memory })).toBe(true);
    expect(await allowAnalyze(headersFor(), { env: {}, now: T0, memory })).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});

describe("/api/translate limits", () => {
  it(`allows ${TRANSLATE_PER_MINUTE} a minute per visitor, then rate_limited`, async () => {
    expect(TRANSLATE_PER_MINUTE).toBe(10);
    const store = fakeUpstash();
    const options = { env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 };
    for (let i = 0; i < 10; i++) expect(await allowTranslate(headersFor(), 10, options)).toBe("ok");
    expect(await allowTranslate(headersFor(), 10, options)).toBe("rate_limited");
    expect(await allowTranslate(headersFor("198.51.100.1"), 10, options)).toBe("ok");
  });

  it(`allows ${TRANSLATE_PER_DAY} a UTC day per visitor, then daily_limit, and starts again the next UTC day`, async () => {
    expect(TRANSLATE_PER_DAY).toBe(20);
    const store = fakeUpstash();
    const at = (minute: number) => ({ env: STORE_ENV, fetchImpl: store.fetchImpl, now: T0 + minute * 60_000 });
    for (let i = 0; i < 20; i++) expect(await allowTranslate(headersFor(), 10, at(i * 2))).toBe("ok");
    expect(await allowTranslate(headersFor(), 10, at(60))).toBe("daily_limit");
    const nextDay = Date.parse("2026-11-16T00:00:01Z");
    expect(await allowTranslate(headersFor(), 10, { env: STORE_ENV, fetchImpl: store.fetchImpl, now: nextDay })).toBe("ok");
  });

  it("caps the characters sent to Google in a UTC day for the whole app, gives back a refused text's share, and resets", async () => {
    const store = fakeUpstash();
    const options = (now = T0) => ({ env: STORE_ENV, fetchImpl: store.fetchImpl, now });
    expect(await allowTranslate(headersFor("198.51.100.1"), 600, options())).toBe("ok");
    // 600 + 500 > 1,000: refused, and the 500 are given back.
    expect(await allowTranslate(headersFor("198.51.100.2"), 500, options())).toBe("translation_unavailable");
    expect(store.data.get("oc:v1:tc:20261115")).toBe(600);
    // A shorter text still fits: 600 + 400 = 1,000.
    expect(await allowTranslate(headersFor("198.51.100.3"), 400, options())).toBe("ok");
    expect(await allowTranslate(headersFor("198.51.100.4"), 1, options())).toBe("translation_unavailable");
    expect(await allowTranslate(headersFor("198.51.100.4"), 1, options(Date.parse("2026-11-16T00:00:00Z")))).toBe("ok");
  });

  it("uses 15,000 characters a day when OFFERCHECK_DAILY_CHAR_CAP is unset", async () => {
    const store = fakeUpstash();
    const env = { ...STORE_ENV, OFFERCHECK_DAILY_CHAR_CAP: undefined };
    for (let i = 0; i < 3; i++) expect(await allowTranslate(headersFor(`198.51.100.${i}`), 5_000, { env, fetchImpl: store.fetchImpl, now: T0 })).toBe("ok");
    expect(await allowTranslate(headersFor("198.51.100.9"), 1, { env, fetchImpl: store.fetchImpl, now: T0 })).toBe("translation_unavailable");
  });

  it.each(["throw", "401", "garbage", "hang"] as const)("store down (%s): the translation is refused", async (reason) => {
    expect(await allowTranslate(headersFor(), 10, { env: STORE_ENV, fetchImpl: down(reason), now: T0, timeoutMs: 20 })).toBe("translation_unavailable");
  });

  it("store fails between the two pipelines: refused", async () => {
    const store = fakeUpstash();
    const flaky = vi.fn(async (url: string, init: RequestInit) => {
      if (store.requests.length >= 1) throw new TypeError("fetch failed");
      return store.fetchImpl(url, init);
    }) as unknown as typeof fetch;
    expect(await allowTranslate(headersFor(), 10, { env: STORE_ENV, fetchImpl: flaky, now: T0 })).toBe("translation_unavailable");
  });

  it("refused on Vercel without a store, or with a store but no salt; never calls fetch", async () => {
    expect(await allowTranslate(headersFor(), 10, { env: { VERCEL: "1" }, now: T0 })).toBe("translation_unavailable");
    expect(await allowTranslate(headersFor(), 10, { env: { ...STORE_ENV, OFFERCHECK_RATE_SALT: undefined }, now: T0 })).toBe("translation_unavailable");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("with no store and not on Vercel, the same limits run in memory", async () => {
    const memory = memoryStore();
    const env = { OFFERCHECK_DAILY_CHAR_CAP: "100" };
    expect(await allowTranslate(headersFor(), 60, { env, now: T0, memory })).toBe("ok");
    expect(await allowTranslate(headersFor("198.51.100.1"), 60, { env, now: T0, memory })).toBe("translation_unavailable");
    for (let i = 0; i < 9; i++) await allowTranslate(headersFor(), 1, { env, now: T0, memory });
    expect(await allowTranslate(headersFor(), 1, { env, now: T0, memory })).toBe("rate_limited");
  });
});

describe("in-memory store", () => {
  it("forgets a counter after its expiry and never grows past its size", async () => {
    let now = 0;
    const memory = memoryStore(3, () => now);
    expect(await memory.add([{ key: "a", by: 1, ttlSeconds: 60 }])).toEqual([1]);
    expect(await memory.add([{ key: "a", by: 1, ttlSeconds: 60 }])).toEqual([2]);
    now = 60_000;
    expect(await memory.add([{ key: "a", by: 1, ttlSeconds: 60 }])).toEqual([1]);
    for (const key of ["b", "c", "d", "e"]) await memory.add([{ key, by: 1, ttlSeconds: 60 }]);
    expect(memory.size()).toBeLessThanOrEqual(3);
  });
});

describe("the routes", () => {
  const analyze = (address: string) =>
    analyzePOST(new Request("http://localhost/api/analyze", { method: "POST", body: JSON.stringify({ text: "Pay the visa fee of AED 500 today." }), headers: { "x-forwarded-for": address } }));

  beforeEach(() => {
    vi.stubEnv("KV_REST_API_URL", "");
    vi.stubEnv("KV_REST_API_TOKEN", "");
    vi.stubEnv("VERCEL", "");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(T0);
  });

  it("/api/analyze: allowed checks are unchanged (200, same body, no new header); the 31st gets 429 with fixed text", async () => {
    const first = await analyze("192.0.2.10");
    expect(first.status).toBe(200);
    expect([...first.headers.keys()].sort()).toEqual(["content-type"]);
    // The same fields, in the same order, as the analysis itself returns: the limit adds nothing.
    expect(Object.keys((await first.json()) as object)).toEqual(Object.keys(await runWithAudit("Pay the visa fee of AED 500 today.", null)));
    for (let i = 0; i < 29; i++) expect((await analyze("192.0.2.10")).status).toBe(200);
    const limited = await analyze("192.0.2.10");
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({ error: "Too many checks in a short time." });
    expect((await analyze("192.0.2.11")).status).toBe(200);
  });

  it("/api/analyze: still answers 200 when the store is configured but down", async () => {
    vi.stubEnv("KV_REST_API_URL", FAKE_URL);
    vi.stubEnv("KV_REST_API_TOKEN", FAKE_AUTH);
    vi.stubEnv("OFFERCHECK_RATE_SALT", SALT);
    vi.stubGlobal("fetch", down("throw"));
    expect((await analyze("192.0.2.20")).status).toBe(200);
  });

  it("/api/translate: store down means 503 translation_unavailable, and Google is never called", async () => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "fake-key-canary-0000");
    vi.stubEnv("KV_REST_API_URL", FAKE_URL);
    vi.stubEnv("KV_REST_API_TOKEN", FAKE_AUTH);
    vi.stubEnv("OFFERCHECK_RATE_SALT", SALT);
    const fetchMock = down("throw");
    vi.stubGlobal("fetch", fetchMock);
    const response = await translatePOST(
      new Request("http://localhost:3000/api/translate", {
        method: "POST",
        body: JSON.stringify({ text: "رسوم التأشيرة", consent: true }),
        headers: { host: "localhost:3000", "sec-fetch-site": "same-origin", "x-forwarded-for": "192.0.2.30" },
      }),
    );
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "translation_unavailable" });
    const urls = (fetchMock as unknown as ReturnType<typeof vi.fn>).mock.calls.map(([url]) => String(url));
    expect(urls.every((url) => url.startsWith(FAKE_URL))).toBe(true);
  });
});

describe("what the page shows", () => {
  it("a 429 from /api/analyze is its own fixed message, with retry, in English and Arabic", () => {
    const failure = responseFailure(429, { error: "anything the server said" });
    expect(failure).toEqual({
      kind: "rate_limited",
      title: "Too many checks",
      message: "Too many checks in a short time. Your text is still in the box. Wait a minute, then try again.",
      retry: true,
    });
    expect(tr("ar", failure.title)).not.toBe(failure.title);
    expect(tr("ar", failure.message)).not.toBe(failure.message);
  });

  it("daily_limit has its own message; the cap uses the existing translation_unavailable message", () => {
    expect(translateFailureMessage("daily_limit")).toContain("today's limit for translations");
    expect(tr("ar", translateFailureMessage("daily_limit"))).not.toBe(translateFailureMessage("daily_limit"));
    expect(translateFailureMessage("translation_unavailable")).toBe(
      "Nothing was sent for translation. You can check the original text; the parts not in English will not be checked.",
    );
  });

  it("the new Arabic entries are marked for review", () => {
    const ar = readFileSync("src/lib/i18nAr.ts", "utf8");
    expect(ar).toMatch(/\[review\] Phase 2 daily translation limit/);
    expect(ar).toMatch(/\[review\] Phase 2 per-visitor limit on checks/);
  });
});
