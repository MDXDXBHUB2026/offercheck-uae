// Theme (production hardening Phase 4b). Not a client module on purpose: src/app/layout.tsx (a server
// component) puts THEME_INIT_SCRIPT in the head, and a constant imported from a "use client" file
// would reach a server component as a reference, not as text.

export const THEME_STORAGE_KEY = "offercheck_theme_v1";
export const THEMES = ["system", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

// Runs while the browser parses the head, before the first paint, so a saved choice never flashes the
// dark page first. It only reads one localStorage key and sets data-theme on <html>; storage that is
// blocked, empty or holds anything else leaves the attribute off, which is the dark default. No
// choice is ever sent anywhere. The page carries this request's CSP nonce on it (see nonceFromCsp).
export const THEME_INIT_SCRIPT =
  `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
  `if(t==="light"||t==="dark"||t==="system")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;

// The per-request nonce src/proxy.ts put in the request's Content-Security-Policy header (the same
// header Next.js reads to put the nonce on its own scripts). Null when there is none, for example in
// a unit test or a request that bypassed the proxy; the script then has no nonce and is blocked,
// which leaves the dark default (the Settings choice still works after hydration).
export function nonceFromCsp(csp: string | null | undefined): string | undefined {
  const match = csp?.match(/'nonce-([A-Za-z0-9+/]+={0,2})'/);
  return match?.[1];
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}
