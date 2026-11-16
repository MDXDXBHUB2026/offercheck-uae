"use client";

import { useSyncExternalStore } from "react";

// Production hardening Phase 4a (2026-11-16): the installable web app's service worker and the
// browser's online / offline state.

export const SERVICE_WORKER_URL = "/sw.js";

// Registers /sw.js (src/app/sw.js/route.ts, logic in src/lib/serviceWorker.ts). Under `next dev` that
// route serves a worker that keeps nothing and removes itself, so a cached page never hides a code
// change. updateViaCache "none": the browser always asks the server for /sw.js, so a new deploy's
// worker (and its new cache) is found at once.
export function registerServiceWorker() {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  navigator.serviceWorker.register(SERVICE_WORKER_URL, { scope: "/", updateViaCache: "none" }).catch(() => {
    // Not allowed (a private window, or blocked by the browser): the site works the same online.
  });
}

function subscribe(listener: () => void) {
  window.addEventListener("online", listener);
  window.addEventListener("offline", listener);
  return () => {
    window.removeEventListener("online", listener);
    window.removeEventListener("offline", listener);
  };
}

// True while the browser says it has no connection. Online on the server and before hydration.
export function useOffline(): boolean {
  return useSyncExternalStore(subscribe, () => navigator.onLine === false, () => false);
}
