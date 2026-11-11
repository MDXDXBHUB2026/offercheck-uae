"use client";

import { useLang } from "@/components/shell/lang";
import { tr } from "@/lib/i18n";

// Phase 4a (owner wording, 2026-11-11).
export const ARABIC_NOTE =
  "The Arabic interface text was written with an AI tool and has not been reviewed by a native speaker.";

// Shown only while Arabic is on, in Arabic: in the footer beside "Pause animations", and (print
// only) at the end of the page, so a printed page or a saved PDF carries it too.
export function ArabicNote({ printOnly = false }: { printOnly?: boolean }) {
  const lang = useLang();
  if (lang !== "ar") return null;
  return <p className={printOnly ? "print-only arabic-note small" : "arabic-note small"}>{tr(lang, ARABIC_NOTE)}</p>;
}
