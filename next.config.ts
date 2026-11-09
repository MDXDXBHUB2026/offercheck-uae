import type { NextConfig } from "next";

// Basic response headers on every route. No Content-Security-Policy yet.
export const SECURITY_HEADERS = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "X-Frame-Options", value: "DENY" },
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
