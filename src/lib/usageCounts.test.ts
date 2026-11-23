import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as translate } from "@/app/api/translate/route";
import { COUNT_NAMES, COUNT_TTL_S, countKey, dayWindow, memoryStore, recordCount } from "@/lib/rateLimit";

// Production Phase 5, Part B: daily totals only. Five counters, keyed oc:v1:m:<UTC day>:<name>, 40-day
// expiry. No visitor key, no address, no user agent, no offer text, no cookie, no request body; a
// dead store changes nothing a visitor sees.

const NOW = Date.UTC(2026, 10, 23, 9, 30);
const STORE = { KV_REST_API_URL: "https://store.invalid", KV_REST_API_TOKEN: "test-token-not-secret", OFFERCHECK_RATE_SALT: "test-salt" };
const SECRET_TEXT = "Pay the registration fee of AED 950 to agent-7731@example.test before Friday";

beforeEach(() => {
  vi.stubEnv("KV_REST_API_URL", "");
  vi.stubEnv("KV_REST_API_TOKEN", "");
  vi.stubEnv("VERCEL", "");
  vi.stubEnv("GOOGLE_TRANSLATE_API_KEY", "");
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("daily totals: keys", () => {
  it("names the five totals and nothing else", () => {
    expect([...COUNT_NAMES]).toEqual(["checks", "analyze_errors", "analyze_rate_limits", "translate_requests", "translate_refusals"]);
    expect(COUNT_TTL_S).toBe(40 * 86_400);
  });

  it("every key is oc:v1:m:<UTC day>:<name>, with no visitor value in it", () => {
    for (const name of COUNT_NAMES) {
      const key = countKey(name, NOW);
      expect(key).toBe(`oc:v1:m:20261123:${name}`);
      expect(key).toMatch(/^oc:v1:m:\d{8}:[a-z_]+$/);
      expect(key).not.toMatch(/[0-9a-f]{32}/);
    }
    expect(dayWindow(NOW)).toBe("20261123");
    // The day is the UTC day: a minute before and after midnight UTC differ.
    expect(countKey("checks", Date.UTC(2026, 10, 23, 23, 59))).not.toBe(countKey("checks", Date.UTC(2026, 10, 24, 0, 0)));
  });
});

describe("daily totals: recordCount", () => {
  it("adds one to the day's counter, with a 40-day expiry", async () => {
    const memory = memoryStore();
    const add = vi.spyOn(memory, "add");
    await recordCount("checks", { memory, now: NOW });
    await recordCount("checks", { memory, now: NOW });
    await recordCount("translate_refusals", { memory, now: NOW });
    expect(add.mock.calls[0][0]).toEqual([{ key: "oc:v1:m:20261123:checks", by: 1, ttlSeconds: 40 * 86_400 }]);
    expect(await memory.add([{ key: "oc:v1:m:20261123:checks", by: 0, ttlSeconds: 1 }])).toEqual([2]);
    expect(await memory.add([{ key: "oc:v1:m:20261123:translate_refusals", by: 0, ttlSeconds: 1 }])).toEqual([1]);
  });

  it("sends the store one INCR and one EXPIRE for the key, with nothing else in the body", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify([{ result: 1 }, { result: 1 }]), { status: 200 }));
    await recordCount("analyze_errors", { env: STORE, fetchImpl: fetchImpl as unknown as typeof fetch, now: NOW });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://store.invalid/pipeline");
    expect(JSON.parse(init.body as string)).toEqual([
      ["INCR", "oc:v1:m:20261123:analyze_errors"],
      ["EXPIRE", "oc:v1:m:20261123:analyze_errors", String(40 * 86_400), "NX"],
    ]);
  });

  it.each([
    ["a store that refuses", () => vi.fn(async () => new Response("no", { status: 500 }))],
    ["a store that throws", () => vi.fn(async () => Promise.reject(new Error("network down")))],
    ["a store that sends nonsense", () => vi.fn(async () => new Response("{}", { status: 200 }))],
  ])("skips silently with %s", async (_name, make) => {
    await expect(recordCount("checks", { env: STORE, fetchImpl: make() as unknown as typeof fetch, now: NOW })).resolves.toBeUndefined();
  });

  it("gives up at the same short timeout as the limits when the store does not answer", async () => {
    const hang = vi.fn(
      (_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => init.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    const started = Date.now();
    await recordCount("checks", { env: STORE, fetchImpl: hang as unknown as typeof fetch, timeoutMs: 40, now: NOW });
    expect(Date.now() - started).toBeLessThan(1000);
    expect(hang).toHaveBeenCalledTimes(1);
  });

  it("counts nothing on Vercel with no store (a per-instance count would be wrong)", async () => {
    const memory = memoryStore();
    const add = vi.spyOn(memory, "add");
    await recordCount("checks", { env: { VERCEL: "1" }, memory, now: NOW });
    expect(add).not.toHaveBeenCalled();
  });
});

describe("daily totals: the routes", () => {
  function stubStoreThatFails() {
    const fetchSpy = vi.fn(async () => Promise.reject(new Error("store down")));
    vi.stubGlobal("fetch", fetchSpy);
    for (const [name, value] of Object.entries(STORE)) vi.stubEnv(name, value);
    return fetchSpy;
  }
  const request = (text: string) =>
    new Request("http://localhost/api/analyze", {
      method: "POST",
      body: JSON.stringify({ text }),
      headers: { "x-forwarded-for": "203.0.113.9", "user-agent": "TestAgent/1.0" },
    });

  it("a dead store does not change what /api/analyze answers", async () => {
    const baseline = await analyze(request(SECRET_TEXT));
    const baselineBody = await baseline.json();
    const spy = stubStoreThatFails();
    const response = await analyze(request(SECRET_TEXT));
    expect(response.status).toBe(baseline.status);
    const body = await response.json();
    expect(body.risk).toEqual(baselineBody.risk);
    expect(body.findings).toEqual(baselineBody.findings);
    expect(spy).toHaveBeenCalled();
  });

  it("a dead store does not change what /api/translate answers", async () => {
    const refused = () => translate(new Request("http://localhost/api/translate", { method: "POST", body: JSON.stringify({ text: "hello", consent: false }) }));
    const baseline = await refused();
    stubStoreThatFails();
    const response = await refused();
    expect(response.status).toBe(baseline.status);
    expect(await response.json()).toEqual(await baseline.json());
  });

  it("nothing sent to the store holds the offer text, the address, the user agent or a header", async () => {
    const spy = stubStoreThatFails();
    await analyze(request(SECRET_TEXT));
    await analyze(new Request("http://localhost/api/analyze", { method: "POST", body: "{not json", headers: { "x-forwarded-for": "203.0.113.9", cookie: "session=abc123" } }));
    await new Promise((resolve) => setTimeout(resolve, 30));
    const bodies = spy.mock.calls.map((call) => String((call as unknown as [string, RequestInit])[1].body));
    const countBodies = bodies.filter((body) => body.includes("oc:v1:m:"));
    expect(countBodies.length).toBeGreaterThan(0);
    for (const body of bodies) {
      for (const forbidden of ["agent-7731", "registration fee", "AED 950", "203.0.113.9", "TestAgent", "session=abc123", "not json"]) expect(body).not.toContain(forbidden);
    }
    for (const body of countBodies) {
      for (const [verb, key] of JSON.parse(body) as string[][]) {
        expect(["INCR", "EXPIRE"]).toContain(verb);
        expect(key).toMatch(/^oc:v1:m:\d{8}:(checks|analyze_errors|analyze_rate_limits|translate_requests|translate_refusals)$/);
      }
    }
  });
});

describe("daily totals: no code path stores text", () => {
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

  it("the routes pass only a fixed name to the counter", () => {
    for (const file of ["src/app/api/analyze/route.ts", "src/app/api/translate/route.ts"]) {
      const calls = [...read(file).matchAll(/countAfter\(([^)]*)\)/g)].map((m) => m[1]);
      expect(calls.length, file).toBeGreaterThan(0);
      for (const arg of calls) expect(arg, file).toMatch(/^("[a-z_]+"|response\.status === 200 \? "[a-z_]+" : response\.status === 429 \? "[a-z_]+" : "[a-z_]+")$/);
    }
  });

  it("the counting code takes a name and the options and reads nothing from a request", () => {
    const rate = read("src/lib/rateLimit.ts");
    const section = rate
      .slice(rate.indexOf("// --- Daily totals"))
      .split("\n")
      .filter((line) => !line.trim().startsWith("//"))
      .join("\n");
    expect(section).toContain("export async function recordCount(name: CountName, options: LimitOptions = {})");
    for (const word of ["headers", "Request", "visitorKey", "clientAddress", "user-agent", "cookie", "salt"]) expect(section, word).not.toContain(word);
    expect(read("src/lib/countAfter.ts")).not.toMatch(/Request|headers|cookie|body/);
  });

  it("the owner's script reads the counters locally and never prints the address or the token", () => {
    const script = read("scripts/read-counts.mjs");
    expect(script).toContain("oc:v1:m");
    expect(script).toContain("process.env.KV_REST_API_URL");
    expect(script).not.toMatch(/console\.(log|error)\([^;]*\b(url|token)\b/);
  });
});
