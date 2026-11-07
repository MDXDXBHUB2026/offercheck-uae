import { describe, expect, it } from "vitest";
import nextConfig from "../../next.config";

describe("response headers", () => {
  it("sends the three basic headers on every route, and no CSP", async () => {
    const rules = (await nextConfig.headers?.()) ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0].source).toBe("/:path*");
    expect(Object.fromEntries(rules[0].headers.map((h) => [h.key, h.value]))).toEqual({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "X-Frame-Options": "DENY",
    });
    expect(JSON.stringify(rules)).not.toMatch(/content-security-policy/i);
  });
});
