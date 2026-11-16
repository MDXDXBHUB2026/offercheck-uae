import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";
import { CACHE_PREFIX, DEV_SERVICE_WORKER, OFFLINE_ASSETS, OFFLINE_PAGES, serviceWorkerSource, SW_HEADERS } from "@/lib/serviceWorker";

// Production hardening Phase 4a (2026-11-16): the service worker's own text, run in a sandbox with
// stand-ins for the browser's caches, fetch and worker scope. Checks: what install keeps, that /api
// and anything not GET is never answered or kept, offline reading, and that a new version replaces
// the old cache.

const ORIGIN = "https://offercheck.example";

type Handler = (event: unknown) => void;

function pageHtml(path: string) {
  return `<!doctype html><html><head><link rel="stylesheet" href="/_next/static/css/app.css?dpl=dpl_1"><script src="/_next/static/chunks/main-abc.js" nonce="n"></script></head><body>${path}<script>self.__next_f.push([1,"\\"/_next/static/chunks/page-${path.slice(1)}.js\\""])</script></body></html>`;
}

function harness(version = "v1", existingCaches: string[] = []) {
  const handlers = new Map<string, Handler>();
  const stores = new Map<string, Map<string, Response>>();
  for (const name of existingCaches) stores.set(name, new Map());
  const fetched: string[] = [];
  let online = true;
  const flags = { skipped: false, claimed: false, unregistered: false };

  const keyOf = (input: string | Request) => new URL(typeof input === "string" ? input : input.url, ORIGIN).pathname;
  const caches = {
    open: async (name: string) => {
      if (!stores.has(name)) stores.set(name, new Map());
      const store = stores.get(name) as Map<string, Response>;
      return {
        put: async (key: string | Request, response: Response) => void store.set(keyOf(key), response),
        match: async (key: string | Request) => store.get(keyOf(key))?.clone(),
      };
    },
    keys: async () => [...stores.keys()],
    delete: async (name: string) => stores.delete(name),
  };

  async function fetchStub(input: string | Request) {
    const url = new URL(typeof input === "string" ? input : input.url, ORIGIN);
    fetched.push(url.pathname + url.search);
    if (!online) throw new TypeError("Failed to fetch");
    if (url.pathname.startsWith("/_next/static/") || (OFFLINE_ASSETS as readonly string[]).includes(url.pathname)) {
      return new Response(`file ${url.pathname}`, { status: 200 });
    }
    if (url.pathname.startsWith("/api/")) return new Response(JSON.stringify({ ok: true, echo: "offer text" }), { status: 200 });
    return new Response(pageHtml(url.pathname === "/" ? "/check" : url.pathname), {
      status: 200,
      headers: { "Content-Type": "text/html", "Content-Security-Policy": "script-src 'nonce-n'" },
    });
  }

  const self = {
    location: new URL(ORIGIN),
    addEventListener: (type: string, handler: Handler) => handlers.set(type, handler),
    skipWaiting: async () => void (flags.skipped = true),
    clients: { claim: async () => void (flags.claimed = true) },
    registration: { unregister: async () => void (flags.unregistered = true) },
  };
  // Responses read from a fake cache must look same-origin ("basic"), as the browser's do.
  const BasicResponse = class extends Response {
    get type() {
      return "basic" as ResponseType;
    }
  };
  const wrappedFetch = async (input: string | Request) => {
    const response = await fetchStub(input);
    return new BasicResponse(response.body, { status: response.status, headers: response.headers });
  };

  runInNewContext(version === "dev" ? DEV_SERVICE_WORKER : serviceWorkerSource(version), {
    self,
    caches,
    fetch: wrappedFetch,
    Response,
    URL,
    Set,
    Promise,
  });

  async function lifecycle(type: "install" | "activate") {
    let wait: Promise<unknown> = Promise.resolve();
    handlers.get(type)?.({ waitUntil: (p: Promise<unknown>) => (wait = p) });
    await wait;
  }

  // Returns the response the worker gave, or "network" when it did not answer (the browser goes to
  // the network itself).
  async function request(
    path: string,
    init: { method?: string; mode?: string; headers?: Record<string, string> } = {},
  ): Promise<Response | "network"> {
    const url = new URL(path, path.startsWith("http") ? undefined : ORIGIN).href;
    const req = { url, method: init.method ?? "GET", mode: init.mode ?? "cors", headers: new Headers(init.headers ?? {}) };
    const answers: Promise<Response>[] = [];
    handlers.get("fetch")?.({ request: req, respondWith: (p: Promise<Response>) => answers.push(p) });
    return answers.length === 0 ? "network" : await answers[0];
  }

  return {
    stores,
    fetched,
    flags,
    lifecycle,
    request,
    setOnline: (value: boolean) => (online = value),
    cacheName: `${CACHE_PREFIX}shell-${version}`,
  };
}

describe("install: the app shell and the five reading pages", () => {
  it("keeps the Check page, About, Guidelines, Portals, Privacy and Terms, the icons and manifest, and the built files they use", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    const kept = [...(sw.stores.get(sw.cacheName)?.keys() ?? [])];
    expect(OFFLINE_PAGES).toEqual(["/check", "/about", "/legal", "/portals", "/privacy", "/terms"]);
    for (const page of OFFLINE_PAGES) expect(kept).toContain(page);
    for (const asset of OFFLINE_ASSETS) expect(kept).toContain(asset);
    expect(kept).toEqual(expect.arrayContaining(["/_next/static/css/app.css", "/_next/static/chunks/main-abc.js", "/_next/static/chunks/page-about.js"]));
    expect(kept.some((key) => key.startsWith("/api"))).toBe(false);
    expect(sw.fetched.some((path) => path.startsWith("/api"))).toBe(false);
    expect(sw.flags.skipped).toBe(true);
  });
});

describe("never /api, never anything but GET, never another origin", () => {
  it("does not answer or keep /api/analyze or /api/translate, whatever the method", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    for (const path of ["/api/analyze", "/api/translate", "/api", "/api/analyze?x=1"]) {
      for (const method of ["POST", "GET"]) {
        expect(await sw.request(path, { method }), `${method} ${path}`).toBe("network");
      }
    }
    // Even offline, an /api request is left to fail in the page (which keeps the text in the box).
    sw.setOnline(false);
    expect(await sw.request("/api/analyze", { method: "POST" })).toBe("network");
    for (const store of sw.stores.values()) for (const key of store.keys()) expect(key).not.toMatch(/^\/api/);
  });

  it("does not answer a POST to a page, another origin, a range request or an in-app data (RSC) request", async () => {
    const sw = harness("v1");
    expect(await sw.request("/check", { method: "POST", mode: "navigate" })).toBe("network");
    expect(await sw.request("https://translation.googleapis.com/x")).toBe("network");
    expect(await sw.request("/hero/loop.mp4", { headers: { range: "bytes=0-" } })).toBe("network");
    expect(await sw.request("/about?_rsc=1")).toBe("network");
    expect(await sw.request("/about", { headers: { RSC: "1" } })).toBe("network");
  });

  it("the source names /api only to skip it, and never stores a request body", () => {
    const source = serviceWorkerSource("v1");
    expect(source).toContain('url.pathname.startsWith("/api/")');
    expect(source).toContain('request.method !== "GET"');
    expect(source).not.toMatch(/\.text\(\)[^;]*request|request\.(?:json|text|formData|arrayBuffer|body)/);
  });
});

describe("pages: network first, the kept copy when offline", () => {
  it("online, a page comes from the network and its kept copy is refreshed", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    const response = await sw.request("/about", { mode: "navigate" });
    expect(response).not.toBe("network");
    expect(sw.fetched.filter((p) => p === "/about").length).toBe(2);
  });

  it("offline, each kept page opens from the copy, with its own policy header; '/' opens the Check page", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    sw.setOnline(false);
    for (const page of OFFLINE_PAGES) {
      const response = (await sw.request(page, { mode: "navigate" })) as Response;
      expect(response.status, page).toBe(200);
      expect(await response.text()).toContain(`<body>${page}`);
      expect(response.headers.get("Content-Security-Policy")).toBe("script-src 'nonce-n'");
    }
    expect(await ((await sw.request("/", { mode: "navigate" })) as Response).text()).toContain("<body>/check");
  });

  it("offline, a page that is not kept gets a short offline page with no script", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    sw.setOnline(false);
    for (const page of ["/vault", "/radar"]) {
      const response = (await sw.request(page, { mode: "navigate" })) as Response;
      expect(response.status).toBe(503);
      expect(response.headers.get("Content-Security-Policy")).toBe("default-src 'none'");
      const html = await response.text();
      expect(html).toContain("You are offline");
      expect(html).toContain("Checking an offer needs a connection.");
      expect(html).not.toMatch(/<script|<style|https?:/);
    }
  });

  it("built files come from the copy first, and a new one is kept on its first fetch", async () => {
    const sw = harness("v1");
    await sw.lifecycle("install");
    const before = sw.fetched.length;
    await sw.request("/_next/static/chunks/main-abc.js");
    expect(sw.fetched.length).toBe(before);
    await sw.request("/_next/static/chunks/new-xyz.js?dpl=dpl_2");
    expect(sw.stores.get(sw.cacheName)?.has("/_next/static/chunks/new-xyz.js")).toBe(true);
  });
});

describe("a new deploy replaces the old cache", () => {
  it("activating version v2 deletes every older Offer Check cache and keeps anything else", async () => {
    const sw = harness("v2", [`${CACHE_PREFIX}shell-v1`, `${CACHE_PREFIX}shell-v0`, "someone-else"]);
    await sw.lifecycle("install");
    await sw.lifecycle("activate");
    expect([...sw.stores.keys()].sort()).toEqual([`${CACHE_PREFIX}shell-v2`, "someone-else"]);
    expect(sw.flags.claimed).toBe(true);
  });

  it("the version is part of the worker's text, so each deploy's /sw.js differs; a bad version is refused", () => {
    expect(serviceWorkerSource("dpl_A")).not.toBe(serviceWorkerSource("dpl_B"));
    expect(serviceWorkerSource("dpl_A")).toContain(`"${CACHE_PREFIX}shell-dpl_A"`);
    expect(() => serviceWorkerSource('x"; evil()')).toThrow();
    expect(() => serviceWorkerSource("")).toThrow();
  });

  it("the route takes the Vercel deployment id (or the build time), and /sw.js is never cached by the browser", () => {
    const route = readFileSync("src/app/sw.js/route.ts", "utf8");
    expect(route).toContain("process.env.VERCEL_DEPLOYMENT_ID ?? `build-${Date.now()}`");
    expect(route).toContain('export const dynamic = "force-static";');
    expect(SW_HEADERS["Cache-Control"]).toBe("no-cache, no-store, must-revalidate");
    expect(readFileSync("src/components/shell/offline.ts", "utf8")).toContain('updateViaCache: "none"');
  });

  it("under next dev, the worker keeps nothing, deletes Offer Check caches and unregisters", async () => {
    const sw = harness("dev", [`${CACHE_PREFIX}shell-v1`, "someone-else"]);
    await sw.lifecycle("install");
    await sw.lifecycle("activate");
    expect([...sw.stores.keys()]).toEqual(["someone-else"]);
    expect(sw.flags.unregistered).toBe(true);
    expect(await sw.request("/check", { mode: "navigate" })).toBe("network");
  });
});
