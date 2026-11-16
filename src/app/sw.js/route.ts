import { DEV_SERVICE_WORKER, serviceWorkerSource, SW_HEADERS } from "@/lib/serviceWorker";

// /sw.js, the installable web app's service worker (src/lib/serviceWorker.ts). Built once per
// deployment: the version in its cache name is the Vercel deployment id, or the build time for a
// local build, so every deploy serves a different worker and replaces the old cache. Under
// `next dev` it is a worker that keeps nothing and removes itself.
export const dynamic = "force-static";

const VERSION = (process.env.VERCEL_DEPLOYMENT_ID ?? `build-${Date.now()}`).replace(/[^A-Za-z0-9_.-]/g, "").slice(0, 80);
const DEV = process.env.NODE_ENV === "development";

export function GET() {
  return new Response(DEV ? DEV_SERVICE_WORKER : serviceWorkerSource(VERSION), { headers: SW_HEADERS });
}
