import type { NextConfig } from "next";
import { SW_HEADERS } from "./src/lib/serviceWorker";

export const SW_HEADER_LIST = Object.entries(SW_HEADERS).map(([key, value]) => ({ key, value }));

// Static security headers on every route, API included.
// - Content-Security-Policy is not here: it carries a per-request nonce, so src/proxy.ts sets it
//   on every page (policy in src/lib/csp.ts).
// - Permissions-Policy turns off camera, microphone and geolocation for the page and any frame.
//   Listen uses speech output only (speechSynthesis), which needs none of them.
// - Strict-Transport-Security is not set here: Vercel already sends
//   `max-age=63072000; includeSubDomains; preload` on the deployment (checked 2026-11-15), and
//   `next start` on plain-http localhost must not send it.
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// The redesign moved the Warning signs page into Legal Guidelines; old links keep working. /about
// was redirected to /legal#about until production hardening Phase 3 (2026-11-15), when it became
// its own page again (src/app/about/page.tsx).
export const REDIRECTS = [{ source: "/guide", destination: "/legal", permanent: false }];

const nextConfig: NextConfig = {
  async redirects() {
    return REDIRECTS;
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // Phase 4a: the service worker is never cached, so a new deploy's worker is found at once
      // (also set by its route, src/app/sw.js/route.ts; this wins over any default for static routes).
      { source: "/sw.js", headers: SW_HEADER_LIST },
    ];
  },
};

export default nextConfig;
