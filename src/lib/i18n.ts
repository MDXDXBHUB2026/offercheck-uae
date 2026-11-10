import { AR } from "@/lib/i18nAr";

// Interface translation (English / Arabic). Interface text only: the rules, scoring, coverage
// detection and the APIs are not involved, and offer text (pasted text, quoted evidence, the
// translation shown) is never passed through here, so it stays exactly as typed.
//
// The dictionary is keyed by the English text itself, so English output is unchanged and a missing
// Arabic entry falls back to English. Keys may hold numbered slots ({0}, {1}) for numbers and names.
// A full English string built elsewhere (for example "Score 12 of 100: Low risk indicators") is
// matched against the slotted keys; each captured part is translated in turn when it is itself a
// dictionary entry (a band label, a channel name), and kept as it is otherwise (a number).

export type UiLang = "en" | "ar";
export type Arg = string | number;

function fill(template: string, args: readonly Arg[]): string {
  return template.replace(/\{(\d+)\}/g, (_, index: string) => String(args[Number(index)] ?? ""));
}

const escape = (text: string) => text.replace(/[.*+?^$()|[\]\\]/g, "\\$&");

type Pattern = { re: RegExp; ar: string; slots: number[] };

// Slotted keys, compiled once. Longer keys first, so the most specific template wins.
const PATTERNS: Pattern[] = Object.keys(AR)
  .filter((key) => /\{\d+\}/.test(key))
  .sort((a, b) => b.length - a.length)
  .map((key) => {
    const slots: number[] = [];
    const source = key
      .split(/(\{\d+\})/)
      .map((part) => {
        const slot = /^\{(\d+)\}$/.exec(part);
        if (!slot) return escape(part);
        slots.push(Number(slot[1]));
        return "(.+?)";
      })
      .join("");
    return { re: new RegExp(`^${source}$`, "s"), ar: AR[key], slots };
  });

function translateArg(arg: Arg): Arg {
  return typeof arg === "string" ? tr("ar", arg) : arg;
}

// The text for the given interface language. English: the key with its slots filled.
export function tr(lang: UiLang, en: string, ...args: Arg[]): string {
  if (lang !== "ar") return args.length > 0 ? fill(en, args) : en;
  if (args.length > 0) return fill(AR[en] ?? en, args.map(translateArg));
  const exact = AR[en];
  if (exact !== undefined) return exact;
  for (const pattern of PATTERNS) {
    const match = pattern.re.exec(en);
    if (!match) continue;
    const values: Arg[] = [];
    pattern.slots.forEach((slot, i) => {
      values[slot] = translateArg(match[i + 1]);
    });
    return fill(pattern.ar, values);
  }
  return en;
}

// True when the text has an Arabic entry (exact or by template). Used by tests.
export function hasArabic(en: string): boolean {
  return tr("ar", en) !== en;
}
