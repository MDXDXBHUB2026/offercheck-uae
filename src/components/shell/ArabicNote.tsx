"use client";

import { useLang } from "@/components/shell/lang";
import { tr } from "@/lib/i18n";

export const ARABIC_NOTE =
  "The Arabic text has not been reviewed by a native speaker. Offer text, quoted words and official names are shown as written.";

// Shown in the footer only while Arabic is on, in Arabic.
export function ArabicNote() {
  const lang = useLang();
  return lang === "ar" ? <p>{tr(lang, ARABIC_NOTE)}</p> : null;
}
