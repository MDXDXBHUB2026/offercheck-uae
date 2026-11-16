import type { MetadataRoute } from "next";
import { APP_BACKGROUND } from "@/lib/appColors";

// The web app manifest (production hardening Phase 4a, 2026-11-16), served at /manifest.webmanifest.
// Colours are the design's page background (--bg in globals.css), so the installed app's window and
// splash screen match the site. Icons: the shield mark (scripts/make-icons.mjs, files in public/icons).

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/check",
    name: "Offer Check UAE",
    short_name: "Offer Check",
    description: "Rule-based risk indicators for a pasted job offer. Checking an offer needs a connection.",
    start_url: "/check",
    scope: "/",
    display: "standalone",
    orientation: "any",
    lang: "en",
    dir: "ltr",
    background_color: APP_BACKGROUND,
    theme_color: APP_BACKGROUND,
    categories: ["utilities", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
