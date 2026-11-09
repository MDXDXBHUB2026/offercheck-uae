"use client";

import { useLang } from "@/components/shell/lang";

export const ARABIC_NOTE = "Arabic labels have not been reviewed by a native speaker. Page content is in English.";

// Shown in the footer only while Arabic is on.
export function ArabicNote() {
  const lang = useLang();
  return lang === "ar" ? <p lang="en">{ARABIC_NOTE}</p> : null;
}
