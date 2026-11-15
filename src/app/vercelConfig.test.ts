import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Production hardening follow-up, 2026-11-15. Pages are rendered per request (CSP nonce), so the
// function region decides most of the latency. Vercel lists no compute region in the Gulf (dxb1 is
// not one); Mumbai (bom1) is the closest to the UAE. Before this, functions ran in the default iad1
// (`x-vercel-id: bom1::iad1::…` on /api/analyze). One region only: the Hobby plan allows one.
describe("vercel.json", () => {
  it("runs the functions in bom1 and sets nothing else", () => {
    const config = JSON.parse(readFileSync("vercel.json", "utf8")) as Record<string, unknown>;
    expect(config).toEqual({ $schema: "https://openapi.vercel.sh/vercel.json", regions: ["bom1"] });
  });

  it("is the only place a region is set: no deprecated preferredRegion or runtime export", () => {
    for (const file of ["src/app/layout.tsx", "src/proxy.ts", "src/app/api/analyze/route.ts", "src/app/api/translate/route.ts"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/export const (?:preferredRegion|runtime)\b/);
    }
  });
});
