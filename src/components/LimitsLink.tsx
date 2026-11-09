"use client";

import Link from "next/link";
import { useEffect, type ReactNode } from "react";
import { LIMITS_ID, openLimits, syncLimitsToHash } from "@/components/limitsAnchor";

// UX-3: a link to the limitations on the check page that also opens them. A same-page jump fires
// no hashchange, so the click opens the details element before the jump. Without the script, the
// link still jumps to the section and its summary.
export function LimitsLink({ children }: { children: ReactNode }) {
  return (
    <Link href={`/check#${LIMITS_ID}`} onClick={() => openLimits(document)}>
      {children}
    </Link>
  );
}

// Mounted in the limitations panel: opens it when the page is reached with #limits, from another
// page, a reload, or back and forward.
export function LimitsOpener() {
  useEffect(() => {
    const sync = () => syncLimitsToHash(document, window.location.hash);
    sync();
    window.addEventListener("hashchange", sync);
    return () => window.removeEventListener("hashchange", sync);
  }, []);
  return null;
}
