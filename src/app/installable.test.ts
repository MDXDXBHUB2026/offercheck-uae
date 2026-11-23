import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Production hardening Phase 4a (2026-11-16): the installable web app. The manifest and its icons,
// the CSP additions, the routes the CSP proxy skips, the offline message on the Check page, and no
// new runtime dependency.

vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return { ...real, useSyncExternalStore: (_s: unknown, get: () => unknown) => get() };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/check", useRouter: () => ({ push: () => {} }) }));

import manifest from "./manifest";
import { metadata, viewport } from "./layout";
import { OFFLINE_NOTICE, OfferChecker } from "@/components/OfferChecker";
import { APP_BACKGROUND, APP_BACKGROUND_LIGHT } from "@/lib/appColors";
import { themeTokens } from "./themeCss";
import { buildCsp } from "@/lib/csp";
import { AR } from "@/lib/i18nAr";
import { OFFLINE_ASSETS } from "@/lib/serviceWorker";
import { config as proxyConfig } from "@/proxy";

afterEach(() => {
  vi.unstubAllGlobals();
});

function pngSize(path: string): { width: number; height: number; rgba: boolean } {
  const bytes = readFileSync(path);
  expect(bytes.subarray(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  expect(bytes.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), rgba: bytes[25] === 6 };
}

describe("web app manifest", () => {
  const m = manifest();

  it("names the app, starts at /check, opens standalone, in the design's colours", () => {
    expect(m.name).toBe("Offer Check UAE");
    expect(m.short_name).toBe("Offer Check");
    expect(m.start_url).toBe("/check");
    expect(m.scope).toBe("/");
    expect(m.display).toBe("standalone");
    expect(m.background_color).toBe(APP_BACKGROUND);
    expect(m.theme_color).toBe(APP_BACKGROUND);
    // The colour is the page background token, --bg.
    expect(readFileSync("src/app/globals.css", "utf8")).toContain(`--bg: ${APP_BACKGROUND};`);
    // Phase 4b: changed on purpose. The browser's theme colour used to be the one dark colour; it is
    // now the media-query form, so it follows the device: dark is still APP_BACKGROUND, light is the
    // light theme's --bg. The manifest above stays dark.
    expect(viewport.themeColor).toEqual([
      { media: "(prefers-color-scheme: light)", color: APP_BACKGROUND_LIGHT },
      { media: "(prefers-color-scheme: dark)", color: APP_BACKGROUND },
    ]);
    expect(themeTokens("light")["--bg"]).toBe(APP_BACKGROUND_LIGHT);
  });

  it("has 192 and 512 icons and a maskable 512, each a real PNG of that size in public/icons", () => {
    expect(m.icons?.map((icon) => [icon.src, icon.sizes, icon.purpose])).toEqual([
      ["/icons/icon-192.png", "192x192", "any"],
      ["/icons/icon-512.png", "512x512", "any"],
      ["/icons/icon-maskable-512.png", "512x512", "maskable"],
    ]);
    for (const icon of m.icons ?? []) {
      const [w, h] = (icon.sizes as string).split("x").map(Number);
      const size = pngSize(`public${icon.src}`);
      expect(size, icon.src).toEqual({ width: w, height: h, rgba: true });
    }
    expect(pngSize("public/icons/apple-touch-icon.png")).toEqual({ width: 180, height: 180, rgba: true });
  });

  it("the layout links the iPhone home screen icon and title; every icon is kept for offline use", () => {
    expect(JSON.stringify(metadata.icons)).toContain("/icons/apple-touch-icon.png");
    expect(metadata.appleWebApp).toMatchObject({ capable: true, title: "Offer Check" });
    for (const icon of manifest().icons ?? []) expect(OFFLINE_ASSETS).toContain(icon.src);
    expect(OFFLINE_ASSETS).toContain("/manifest.webmanifest");
  });

  it("the icons come from a dev-only script that uses Node's own modules only", () => {
    const script = readFileSync("scripts/make-icons.mjs", "utf8");
    expect([...script.matchAll(/^import .* from "([^"]+)";$/gm)].map((m) => m[1])).toEqual(["node:fs", "node:zlib"]);
    expect(script).toContain("shield-alert");
  });
});

describe("CSP: only what the installable app needs", () => {
  it("adds exactly worker-src 'self' and manifest-src 'self', in production and under next dev", () => {
    const before = [
      "default-src 'self'",
      "script-src 'self' 'nonce-AAAA' 'strict-dynamic'",
      "style-src 'self' 'nonce-AAAA'",
      "img-src 'self'",
      "font-src 'self'",
      "connect-src 'self'",
      "media-src 'self'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
    ];
    const after = buildCsp("AAAA").split("; ");
    expect(after.filter((d) => !before.includes(d))).toEqual(["worker-src 'self'", "manifest-src 'self'"]);
    expect(before.filter((d) => !after.includes(d))).toEqual([]);
    expect(buildCsp("AAAA", { dev: true })).toContain("worker-src 'self'; manifest-src 'self'");
  });

  it("the page proxy skips /sw.js and /manifest.webmanifest (no nonce needed), and still covers pages", () => {
    const source = proxyConfig.matcher[0].source;
    const matcher = new RegExp(`^${source}$`);
    expect(matcher.test("/sw.js")).toBe(false);
    expect(matcher.test("/manifest.webmanifest")).toBe(false);
    expect(matcher.test("/icons/icon-192.png")).toBe(false);
    expect(matcher.test("/check")).toBe(true);
    expect(matcher.test("/about")).toBe(true);
  });
});

describe("offline on the Check page", () => {
  function render(onLine: boolean) {
    vi.stubGlobal("navigator", { onLine, userAgent: "test" });
    return renderToStaticMarkup(createElement(OfferChecker));
  }

  it("says so clearly while offline, above the box, and keeps the box", () => {
    expect(OFFLINE_NOTICE).toMatch(/^You are offline\. Checking an offer needs a connection\./);
    const offline = render(false);
    expect(offline).toContain(OFFLINE_NOTICE);
    expect(offline.indexOf(OFFLINE_NOTICE)).toBeLessThan(offline.indexOf('<textarea id="offer"'));
    expect(offline).toContain('<textarea id="offer"');
    expect(render(true)).not.toContain(OFFLINE_NOTICE);
    expect(AR[OFFLINE_NOTICE]).toBeTruthy();
  });

  it("going offline never clears the text: the offline state only shows the notice", () => {
    const source = readFileSync("src/components/OfferChecker.tsx", "utf8")
      .replace(/\{?\/\*[\s\S]*?\*\/\}?/g, "")
      .replace(/^\s*\/\/.*$/gm, "");
    // The variable is read in one place only: the notice. No effect, handler or setText reacts to it.
    expect(source.match(/const offline = useOffline\(\);/g)).toHaveLength(1);
    expect(source.match(/\{offline &&/g)).toHaveLength(1);
    expect(source).not.toMatch(/if \(!?offline\b|\boffline \?|\[offline\]|, offline\b|\(offline\)/);
  });
});

describe("no new runtime dependency", () => {
  it("package.json lists the same four runtime dependencies", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8"));
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["lucide-react", "next", "react", "react-dom"]);
  });
});
