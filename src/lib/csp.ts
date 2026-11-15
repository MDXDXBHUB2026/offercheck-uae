// The Content-Security-Policy for every page. src/proxy.ts calls buildCsp() once per request with
// a fresh nonce; Next.js reads the nonce back from the request header and puts it on its own
// <script> tags (the RSC payload, React's streaming bootstrap and the chunk loaders). Pages are
// rendered per request for this reason (src/app/layout.tsx awaits connection()).
//
// Why each directive is what it is (the 2026-11-15 report in docs/known-limitations.md):
// - default-src 'self': the browser loads nothing from another origin. The app has no external
//   scripts, styles, fonts, images, media or API calls; the hero video and poster, the CSS and the
//   JS chunks are same-origin, and /api/analyze and /api/translate are called on the same origin
//   (Google Translate is called by the server, never by the browser). Links to the UAE government
//   sites are plain navigations, which CSP fetch directives do not govern.
// - script-src: only scripts carrying this request's nonce, plus scripts they load
//   ('strict-dynamic'). 'self' is a fallback for browsers without 'strict-dynamic' and is ignored
//   by those that support it. No 'unsafe-inline'; 'unsafe-eval' only under `next dev` (React's
//   dev build uses eval to rebuild server stacks; production does not).
// - style-src: the app's stylesheet is same-origin and it emits no <style> tags. Style values set
//   from script (the checklist meter, the hero animation) go through the CSSOM, which CSP allows.
//   `next dev` injects styles without a nonce, so dev alone adds 'unsafe-inline' for styles.
// - object-src 'none', base-uri 'self', form-action 'self', frame-ancestors 'none'.
// Not set: upgrade-insecure-requests (every URL is relative and Vercel already sends HSTS, so it
// adds nothing, and it would break plain-http `next start` on localhost).

export type CspOptions = { dev?: boolean };

export function buildCsp(nonce: string, { dev = false }: CspOptions = {}): string {
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(nonce)) throw new Error("CSP nonce must be base64");
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    ["script-src", ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'", ...(dev ? ["'unsafe-eval'"] : [])]],
    ["style-src", ["'self'", ...(dev ? ["'unsafe-inline'"] : [`'nonce-${nonce}'`])]],
    ["img-src", ["'self'"]],
    ["font-src", ["'self'"]],
    ["connect-src", ["'self'"]],
    ["media-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", ["'self'"]],
    ["frame-ancestors", ["'none'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

// 128 random bits, base64. A new one for every page request.
export function newNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}
