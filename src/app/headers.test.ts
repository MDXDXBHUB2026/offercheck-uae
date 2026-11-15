import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import nextConfig from "../../next.config";
import { buildCsp, newNonce } from "@/lib/csp";
import { config as proxyConfig, proxy } from "@/proxy";

const NONCE = "AAECAwQFBgcICQoLDA0ODw==";

function directives(policy: string): Map<string, string[]> {
  return new Map(
    policy.split(";").map((part) => {
      const [name, ...values] = part.trim().split(/\s+/);
      return [name, values] as [string, string[]];
    }),
  );
}

describe("response headers", () => {
  it("sends the three basic headers and a Permissions-Policy on every route, and no static CSP", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    expect(Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]))).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
      "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    });
    // The CSP carries a per-request nonce, so it comes from src/proxy.ts, not from next.config.ts.
    // HSTS comes from Vercel (see the comment in next.config.ts).
    expect(JSON.stringify(rules)).not.toMatch(/content-security-policy|strict-transport-security/i);
  });
});

describe("Content-Security-Policy (production)", () => {
  const policy = buildCsp(NONCE);
  const d = directives(policy);

  it("has exactly the expected directives", () => {
    expect(policy).toBe(
      [
        "default-src 'self'",
        `script-src 'self' 'nonce-${NONCE}' 'strict-dynamic'`,
        `style-src 'self' 'nonce-${NONCE}'`,
        "img-src 'self'",
        "font-src 'self'",
        "connect-src 'self'",
        "media-src 'self'",
        "object-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
        "frame-ancestors 'none'",
      ].join("; "),
    );
  });

  it("allows scripts only by nonce: no 'unsafe-inline', no 'unsafe-eval', no 'unsafe-hashes'", () => {
    const scripts = [...(d.get("script-src") ?? []), ...(d.get("script-src-elem") ?? []), ...(d.get("script-src-attr") ?? [])];
    expect(scripts).toContain(`'nonce-${NONCE}'`);
    expect(scripts).toContain("'strict-dynamic'");
    expect(scripts.join(" ")).not.toMatch(/unsafe-inline|unsafe-eval|unsafe-hashes|wasm-unsafe-eval|\*/);
    expect(policy).not.toMatch(/'unsafe-/);
  });

  it("names no external origin, scheme source or wildcard anywhere", () => {
    for (const [name, values] of d) {
      for (const value of values) {
        expect(value, `${name} ${value}`).toMatch(/^'(?:self|none|strict-dynamic|nonce-[A-Za-z0-9+/=]+)'$/);
      }
    }
    expect(policy).not.toMatch(/https?:|wss?:|data:|blob:|\*/);
  });

  it("locks down framing, base, forms and plugins", () => {
    expect(d.get("default-src")).toEqual(["'self'"]);
    expect(d.get("frame-ancestors")).toEqual(["'none'"]);
    expect(d.get("base-uri")).toEqual(["'self'"]);
    expect(d.get("form-action")).toEqual(["'self'"]);
    expect(d.get("object-src")).toEqual(["'none'"]);
  });

  it("relaxes only under next dev, and only for eval and dev-injected styles", () => {
    const dev = directives(buildCsp(NONCE, { dev: true }));
    expect(dev.get("script-src")).toEqual(["'self'", `'nonce-${NONCE}'`, "'strict-dynamic'", "'unsafe-eval'"]);
    expect(dev.get("style-src")).toEqual(["'self'", "'unsafe-inline'"]);
    expect(dev.get("frame-ancestors")).toEqual(["'none'"]);
  });

  it("rejects a nonce that could break out of the header", () => {
    expect(() => buildCsp("abc'; script-src *")).toThrow();
    expect(() => buildCsp("")).toThrow();
  });
});

describe("nonce", () => {
  it("is 128 random bits, base64, and new every time", () => {
    const seen = new Set(Array.from({ length: 200 }, () => newNonce()));
    expect(seen.size).toBe(200);
    for (const n of seen) expect(atob(n)).toHaveLength(16);
  });
});

describe("src/proxy.ts", () => {
  it("puts the same fresh nonce policy on the request (for Next.js) and the response", () => {
    const a = proxy(new NextRequest("https://example.test/check"));
    const b = proxy(new NextRequest("https://example.test/check"));
    const csp = a.headers.get("content-security-policy") ?? "";
    expect(csp).toMatch(/^default-src 'self'; script-src 'self' 'nonce-[A-Za-z0-9+/]{22}==' 'strict-dynamic';/);
    expect(csp).not.toMatch(/unsafe/);
    expect(a.headers.get("x-middleware-request-content-security-policy")).toBe(csp);
    expect(b.headers.get("content-security-policy")).not.toBe(csp);
    expect(a.headers.get("location")).toBeNull();
    expect(a.headers.get("x-middleware-rewrite")).toBeNull();
  });

  it("runs on pages, not on the API, static files, public files or prefetches", () => {
    const [rule] = proxyConfig.matcher;
    const pattern = new RegExp(`^${rule.source.replace("/(", "/(?:")}$`);
    for (const page of ["/", "/check", "/legal", "/portals", "/radar", "/vault", "/no-such-page"]) expect(pattern.test(page), page).toBe(true);
    for (const skip of ["/api/analyze", "/api/translate", "/_next/static/chunks/a.js", "/hero/loop.mp4", "/hero/poster.jpg", "/favicon.ico"]) {
      expect(pattern.test(skip), skip).toBe(false);
    }
    expect(rule.missing.map((m) => m.key)).toEqual(["next-router-prefetch", "purpose"]);
  });

  it("is the only place the policy is built, and the layout renders per request", () => {
    expect(readFileSync("src/proxy.ts", "utf8")).toContain("buildCsp(newNonce()");
    expect(readFileSync("src/app/layout.tsx", "utf8")).toContain("await connection();");
  });
});
