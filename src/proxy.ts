import { NextResponse, type NextRequest } from "next/server";
import { buildCsp, newNonce } from "@/lib/csp";

// Next.js 16 "proxy" convention (formerly middleware). Sets a per-request nonce-based
// Content-Security-Policy on every page response. Next.js reads the nonce from the request's
// Content-Security-Policy header while rendering and adds it to the scripts it emits.
// The other security headers stay in next.config.ts. Requests and responses are otherwise
// passed through unchanged.
export function proxy(request: NextRequest) {
  const csp = buildCsp(newNonce(), { dev: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

// Pages only. Skipped: the API routes (JSON, not documents; their behaviour is unchanged), Next's
// static files, the public/ files (any path with a file extension), and next/link prefetches,
// which are RSC payloads rather than documents.
export const config = {
  matcher: [
    {
      source: "/((?!api/|_next/static|_next/image|.*\\.[A-Za-z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
