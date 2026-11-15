import type { NextConfig } from "next";

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

// The redesign moved the Warning signs page into Legal Guidelines and the About page into its
// #about section. Old links and bookmarks keep working.
export const REDIRECTS = [
  { source: "/guide", destination: "/legal", permanent: false },
  { source: "/about", destination: "/legal#about", permanent: false },
];

const nextConfig: NextConfig = {
  async redirects() {
    return REDIRECTS;
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
