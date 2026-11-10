"use client";

import { useLang } from "@/components/shell/lang";
import { tr, type Arg } from "@/lib/i18n";

// Interface text for server components: <T>English text</T>, or <T args={[n]}>{"{0} rules"}</T>.
// Renders the English as it is until Arabic is chosen. Never use it for offer text.
export function T({ children, args = [] }: { children: string; args?: readonly Arg[] }) {
  const lang = useLang();
  return tr(lang, children, ...args);
}
