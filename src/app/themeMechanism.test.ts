import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type { ReactElement, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

// Phase 4b: how the theme choice reaches the page before the first paint, under the nonce CSP.

const request = vi.hoisted(() => ({ csp: "" as string | null }));
vi.mock("next/headers", () => ({ headers: async () => new Headers(request.csp ? { "content-security-policy": request.csp } : {}) }));
vi.mock("next/server", () => ({ connection: async () => {}, NextResponse: {}, NextRequest: class {} }));
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));

import RootLayout from "./layout";
import { buildCsp, newNonce } from "@/lib/csp";
import { isTheme, nonceFromCsp, THEME_INIT_SCRIPT, THEME_STORAGE_KEY } from "@/lib/themeInit";

function run(stored: string | null | "throws") {
  const attrs: Record<string, string> = {};
  const sandbox = {
    localStorage: {
      getItem: (key: string) => {
        if (stored === "throws") throw new Error("SecurityError");
        expect(key).toBe(THEME_STORAGE_KEY);
        return stored;
      },
    },
    document: { documentElement: { setAttribute: (name: string, value: string) => (attrs[name] = value) } },
  };
  runInNewContext(THEME_INIT_SCRIPT, sandbox);
  return attrs;
}

describe("the script that sets data-theme before first paint", () => {
  it.each(["light", "dark", "system"])("a saved %s is set on <html>", (theme) => {
    expect(run(theme)).toEqual({ "data-theme": theme });
  });

  it("sets nothing for an empty store, an unknown value or storage that throws: the dark default stays", () => {
    expect(run(null)).toEqual({});
    expect(run("sepia")).toEqual({});
    expect(run("")).toEqual({});
    expect(run("throws")).toEqual({});
  });

  it("is small, reads one key, and can be placed inside a script element", () => {
    expect(THEME_INIT_SCRIPT.length).toBeLessThan(300);
    expect(THEME_INIT_SCRIPT).not.toMatch(/<\/script|<!--/i);
    expect(THEME_INIT_SCRIPT.match(/localStorage\.\w+/g)).toEqual(["localStorage.getItem"]);
    expect(THEME_INIT_SCRIPT).not.toMatch(/fetch|XMLHttpRequest|sendBeacon|cookie|eval|Function\(/);
  });

  it("accepts exactly the three themes", () => {
    expect(["system", "dark", "light"].every(isTheme)).toBe(true);
    expect([null, "", "Dark", "sepia", 1].some(isTheme)).toBe(false);
  });
});

describe("the nonce", () => {
  it("is read back from the request's own CSP header, as proxy.ts set it", () => {
    const nonce = newNonce();
    expect(nonceFromCsp(buildCsp(nonce))).toBe(nonce);
    expect(nonceFromCsp(buildCsp(nonce, { dev: true }))).toBe(nonce);
    expect(nonceFromCsp(null)).toBeUndefined();
    expect(nonceFromCsp("default-src 'self'")).toBeUndefined();
  });

  function find(node: ReactNode, tag: string): ReactElement<Record<string, unknown>> | null {
    if (!node || typeof node !== "object") return null;
    if (Array.isArray(node)) return node.map((child) => find(child, tag)).find(Boolean) ?? null;
    const element = node as ReactElement<Record<string, unknown>>;
    if (element.type === tag) return element;
    return find(element.props?.children as ReactNode, tag);
  }

  it("the layout puts this request's nonce and the script in the head", async () => {
    const nonce = newNonce();
    request.csp = buildCsp(nonce);
    const tree = await RootLayout({ children: null });
    const script = find(tree, "script");
    expect(script).not.toBeNull();
    expect(script!.props.nonce).toBe(nonce);
    expect(script!.props.dangerouslySetInnerHTML).toEqual({ __html: THEME_INIT_SCRIPT });
    expect(tree.props.suppressHydrationWarning).toBe(true);
    // In the head, so it runs before the body is parsed and painted.
    expect(find(find(tree, "head"), "script")).toBe(script);
    // A different request gets a different nonce.
    const other = newNonce();
    request.csp = buildCsp(other);
    expect(find(await RootLayout({ children: null }), "script")!.props.nonce).toBe(other);
  });

  it("the policy is unchanged: no 'unsafe-inline' for scripts, the nonce and strict-dynamic stay", () => {
    const csp = buildCsp("AAAA");
    const script = csp.split("; ").find((d) => d.startsWith("script-src "))!;
    expect(script).toBe("script-src 'self' 'nonce-AAAA' 'strict-dynamic'");
    expect(csp).not.toContain("unsafe-inline");
    const source = readFileSync("src/lib/csp.ts", "utf8");
    expect(source).not.toMatch(/theme/i);
  });
});
