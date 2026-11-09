import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createThrottle, GOOGLE_TRANSLATE_URL, translateWithGoogle } from "@/lib/translateServer";
import { TRANSLATE_ERRORS, TRANSLATE_MAX_CHARS } from "@/lib/translation";
import * as route from "./route";

// BATCHB-2. The provider is always mocked: no real network call and no real key. FAKE_KEY is a
// placeholder canary that must never come back in a response.
const FAKE_KEY = "fake-key-canary-0000";
const CANARY_TEXT = "canary offer text 7f3a";
const ARABIC = "رسوم التأشيرة 750 درهم يجب دفعها اليوم";

let ip = 0;
// Each request gets its own client address, so the throttle never couples two tests.
function post(body: unknown, headers: Record<string, string> = {}): Promise<Response> {
  ip++;
  return route.POST(
    new Request("http://localhost:3000/api/translate", {
      method: "POST",
      body: typeof body === "string" ? body : JSON.stringify(body),
      headers: { host: "localhost:3000", "sec-fetch-site": "same-origin", "x-forwarded-for": `10.0.${Math.floor(ip / 250)}.${ip % 250}`, ...headers },
    }),
  );
}

function googleReply(translatedText: string, detectedSourceLanguage: string): Response {
  return new Response(JSON.stringify({ data: { translations: [{ translatedText, detectedSourceLanguage }] } }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

async function everything(response: Response): Promise<string> {
  return `${response.status} ${JSON.stringify([...response.headers.entries()])} ${await response.text()}`;
}

let provider: ReturnType<typeof vi.fn>;

beforeEach(() => {
  vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", FAKE_KEY);
  provider = vi.fn(async () => googleReply("Visa fees of 750 dirhams must be paid today", "ar"));
  vi.stubGlobal("fetch", provider);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("POST /api/translate: the route", () => {
  it("exports POST only, so any other method gets 405 from Next", () => {
    expect(Object.keys(route).filter((name) => /^[A-Z]+$/.test(name))).toEqual(["POST"]);
  });

  it("returns only translatedText and detectedSourceLanguage on success, uncached", async () => {
    const response = await post({ text: ARABIC, consent: true });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      translatedText: "Visa fees of 750 dirhams must be paid today",
      detectedSourceLanguage: "ar",
    });
  });

  it("calls Google Cloud Translation v2 once: key in the x-goog-api-key header, never the URL; q, target en, format text", async () => {
    await post({ text: ARABIC, consent: true });
    expect(provider).toHaveBeenCalledTimes(1);
    const [url, init] = provider.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://translation.googleapis.com/language/translate/v2");
    expect(url).toBe(GOOGLE_TRANSLATE_URL);
    expect(url).not.toContain(FAKE_KEY);
    expect(url).not.toContain("?");
    expect(init.method).toBe("POST");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe(FAKE_KEY);
    // Auto-detect: no source language is sent. format "text", so the reply is not HTML-escaped.
    expect(JSON.parse(String(init.body))).toEqual({ q: ARABIC, target: "en", format: "text" });
    expect(init.signal).toBeInstanceOf(AbortSignal);
    expect(init.cache).toBe("no-store");
  });

  it("maps the detected language to a fixed list: anything else is und", async () => {
    provider.mockImplementation(async () => googleReply("Hello", "xx-<script>"));
    await expect((await post({ text: "bonjour", consent: true })).json()).resolves.toEqual({ translatedText: "Hello", detectedSourceLanguage: "und" });
    provider.mockImplementation(async () => googleReply("Hello", "zh-CN"));
    await expect((await post({ text: "ni hao", consent: true })).json()).resolves.toMatchObject({ detectedSourceLanguage: "zh-cn" });
  });
});

describe("POST /api/translate: input validation", () => {
  it.each([
    ["a number", { text: 5, consent: true }],
    ["null text", { text: null, consent: true }],
    ["no text", { consent: true }],
    ["empty text", { text: "", consent: true }],
    ["blank text", { text: "   \n ", consent: true }],
    ["an array body", [ARABIC]],
    ["a null body", null],
  ])("rejects %s with 400 invalid_request and calls no provider", async (_name, body) => {
    const response = await post(body);
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
    expect(provider).not.toHaveBeenCalled();
  });

  it("rejects a body that is not JSON with 400 invalid_request", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "invalid_request" });
  });

  it("accepts exactly 5,000 characters and rejects 5,001 with 400 text_too_long", async () => {
    expect(TRANSLATE_MAX_CHARS).toBe(5_000);
    expect((await post({ text: "a".repeat(5_000), consent: true })).status).toBe(200);
    const response = await post({ text: "a".repeat(5_001), consent: true });
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "text_too_long" });
    expect(provider).toHaveBeenCalledTimes(1);
  });

  it("rejects an oversized body before reading it, and a declared size over the cap", async () => {
    const big = await post({ text: "a".repeat(40_000), consent: true });
    expect(big.status).toBe(400);
    await expect(big.json()).resolves.toEqual({ error: "text_too_long" });
    const declared = await post({ text: "short", consent: true }, { "content-length": "999999" });
    expect(declared.status).toBe(400);
    await expect(declared.json()).resolves.toEqual({ error: "text_too_long" });
    expect(provider).not.toHaveBeenCalled();
  });

  it("refuses a request without the consent flag set to true", async () => {
    for (const body of [{ text: ARABIC }, { text: ARABIC, consent: "true" }, { text: ARABIC, consent: false }]) {
      const response = await post(body);
      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({ error: "consent_required" });
    }
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("POST /api/translate: cross-site calls", () => {
  it.each([
    ["Sec-Fetch-Site same-origin", { "sec-fetch-site": "same-origin" }],
    ["Sec-Fetch-Site same-site", { "sec-fetch-site": "same-site" }],
    ["no Sec-Fetch-Site, Origin matching the host", { "sec-fetch-site": "", origin: "http://localhost:3000" }],
  ])("allows %s", async (_name, headers) => {
    expect((await post({ text: ARABIC, consent: true }, headers)).status).toBe(200);
  });

  it.each([
    ["Sec-Fetch-Site cross-site", { "sec-fetch-site": "cross-site", origin: "https://evil.example" }],
    ["Sec-Fetch-Site cross-site, even with a matching Origin", { "sec-fetch-site": "cross-site", origin: "http://localhost:3000" }],
    ["Sec-Fetch-Site none", { "sec-fetch-site": "none" }],
    ["no Sec-Fetch-Site and no Origin", { "sec-fetch-site": "" }],
    ["an Origin for another host", { "sec-fetch-site": "", origin: "https://evil.example" }],
    ["an Origin on another port", { "sec-fetch-site": "", origin: "http://localhost:4000" }],
    ["an Origin that is not a URL", { "sec-fetch-site": "", origin: "null" }],
  ])("rejects %s with 403 cross_site and calls no provider", async (_name, headers) => {
    const response = await post({ text: ARABIC, consent: true }, headers);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "cross_site" });
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("POST /api/translate: missing key", () => {
  it.each([["unset", undefined], ["empty", ""]])("returns 503 translation_unavailable when the key is %s, and sends nothing", async (_name, value) => {
    vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", value as string);
    const response = await post({ text: ARABIC, consent: true });
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "translation_unavailable" });
    expect(provider).not.toHaveBeenCalled();
  });
});

describe("POST /api/translate: provider errors and timeouts", () => {
  it.each([
    [401, 502, "provider_denied"],
    [403, 502, "provider_denied"],
    [429, 503, "provider_busy"],
    [400, 502, "provider_error"],
    [500, 502, "provider_error"],
    [503, 502, "provider_error"],
  ])("maps provider %i to %i %s, never forwarding the provider's body", async (status, expected, code) => {
    provider.mockImplementation(async () => new Response(JSON.stringify({ error: { message: `${CANARY_TEXT} ${FAKE_KEY} quota` } }), { status }));
    const response = await post({ text: CANARY_TEXT, consent: true });
    expect(response.status).toBe(expected);
    expect(TRANSLATE_ERRORS[code as keyof typeof TRANSLATE_ERRORS]).toBe(expected);
    const all = await everything(response);
    expect(all).toContain(`{"error":"${code}"}`);
    expect(all).not.toContain(CANARY_TEXT);
    expect(all).not.toContain(FAKE_KEY);
    expect(all).not.toContain("quota");
  });

  it.each([
    ["no translations", { data: { translations: [] } }],
    ["two translations", { data: { translations: [{ translatedText: "a" }, { translatedText: "b" }] } }],
    ["no translatedText", { data: { translations: [{ detectedSourceLanguage: "ar" }] } }],
    ["a blank translation", { data: { translations: [{ translatedText: "  " }] } }],
    ["a translation over 20,000 characters", { data: { translations: [{ translatedText: "a".repeat(20_001) }] } }],
    ["not JSON", "<html>oops</html>"],
  ])("maps a reply with %s to 502 provider_error", async (_name, reply) => {
    provider.mockImplementation(async () => new Response(typeof reply === "string" ? reply : JSON.stringify(reply), { status: 200 }));
    const response = await post({ text: ARABIC, consent: true });
    expect(response.status).toBe(502);
    await expect(response.json()).resolves.toEqual({ error: "provider_error" });
  });

  it("maps a network failure to 502 provider_error", async () => {
    provider.mockImplementation(async () => {
      throw new TypeError(`fetch failed ${FAKE_KEY}`);
    });
    const response = await post({ text: ARABIC, consent: true });
    expect(response.status).toBe(502);
    expect(await everything(response)).not.toContain(FAKE_KEY);
  });

  it("aborts after 8 seconds and maps the timeout to 503 provider_timeout", async () => {
    vi.useFakeTimers();
    provider.mockImplementation(
      (_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")));
        }),
    );
    const pending = post({ text: ARABIC, consent: true });
    await vi.advanceTimersByTimeAsync(7_999);
    expect((provider.mock.calls[0][1] as RequestInit).signal?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    const response = await pending;
    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toEqual({ error: "provider_timeout" });
  });

  it("translateWithGoogle takes a shorter timeout and its own fetch, for the same mapping", async () => {
    const hang = vi.fn(
      (_url: string, init: RequestInit) =>
        new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    await expect(translateWithGoogle("x", "k", { fetchImpl: hang as unknown as typeof fetch, timeoutMs: 5 })).resolves.toEqual({ ok: false, code: "provider_timeout" });
  });
});

describe("POST /api/translate: no key in any response", () => {
  it("success, validation, cross-site, throttle and provider errors never contain the key", async () => {
    const responses = [
      await post({ text: ARABIC, consent: true }),
      await post({ text: "" }),
      await post({ text: ARABIC, consent: true }, { "sec-fetch-site": "cross-site" }),
    ];
    provider.mockImplementation(async () => new Response(FAKE_KEY, { status: 500 }));
    responses.push(await post({ text: ARABIC, consent: true }));
    for (const response of responses) expect(await everything(response)).not.toContain(FAKE_KEY);
  });
});

describe("POST /api/translate: best-effort throttle", () => {
  it("allows 10 requests a minute per client address, then 429 rate_limited, without calling the provider", async () => {
    const headers = { "x-forwarded-for": "203.0.113.7, 10.0.0.1" };
    for (let i = 0; i < 10; i++) expect((await post({ text: ARABIC, consent: true }, headers)).status).toBe(200);
    const limited = await post({ text: ARABIC, consent: true }, headers);
    expect(limited.status).toBe(429);
    await expect(limited.json()).resolves.toEqual({ error: "rate_limited" });
    expect(provider).toHaveBeenCalledTimes(10);
    // Another address is not limited.
    expect((await post({ text: ARABIC, consent: true }, { "x-forwarded-for": "203.0.113.8" })).status).toBe(200);
  });

  it("forgets requests older than the window, and keeps only times per address in memory", () => {
    const throttle = createThrottle(2, 60_000, 3);
    expect(throttle.allow("a", 0)).toBe(true);
    expect(throttle.allow("a", 1)).toBe(true);
    expect(throttle.allow("a", 2)).toBe(false);
    expect(throttle.allow("a", 60_001)).toBe(true);
    // A full table drops old entries, so it never grows past its cap.
    for (const client of ["b", "c", "d", "e"]) throttle.allow(client, 60_002);
    expect(throttle.clients()).toBeLessThanOrEqual(3);
  });
});

describe("privacy and isolation of the translation route", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("the route and its server module log, store and cache nothing", () => {
    for (const file of ["src/app/api/translate/route.ts", "src/lib/translateServer.ts"]) {
      const source = read(file);
      expect(source, file).not.toMatch(/\bconsole\.\w+|localStorage|sessionStorage|indexedDB|writeFile|appendFile|createWriteStream|caches\.|unstable_cache|revalidate/);
      // No module-level variable can keep a text: the only state is the throttle's request times.
      expect(source, file).not.toMatch(/^(?:let|var) /m);
    }
    expect(read("src/lib/translateServer.ts").match(/new Map</g)).toHaveLength(1);
    expect(read("src/lib/translateServer.ts")).toContain("new Map<string, number[]>()");
  });

  it("only the route reads the key, from process.env on the server, never a NEXT_PUBLIC variable", () => {
    expect(read("src/app/api/translate/route.ts")).toContain("process.env.GOOGLE_TRANSLATE_API_KEY");
    expect(read("src/lib/translateServer.ts")).not.toMatch(/process\.env/);
  });
});
