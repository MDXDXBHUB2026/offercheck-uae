// The installed app's colours (production hardening Phase 4a, 2026-11-16): the design's page
// background, --bg in src/app/globals.css (src/app/installable.test.ts checks they agree). Used by
// the manifest (src/app/manifest.ts), the browser's theme colour (src/app/layout.tsx) and the icons
// (scripts/make-icons.mjs, which repeats the values because it runs without the TypeScript build).
export const APP_BACKGROUND = "#090d16";
