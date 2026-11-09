// BATCHB-2: the fixed values of the optional machine translation, shared by /api/translate, the page
// and the audit trail. Pure: no import, no network, no environment, no offer text. The translation
// itself is made by Google Cloud Translation (Basic, v2) on the server, only after the user agrees,
// every time. No model sets or changes the score: the translated English goes through the same
// Intake, Red-flag and Risk steps as English text.

// The most characters one translation may send. Longer text can still be checked as it is.
export const TRANSLATE_MAX_CHARS = 5_000;

// Fixed strings for the audit trail and the page. Never a value taken from the provider's reply.
export const TRANSLATION_PROVIDER = "google-cloud-translation";
export const TRANSLATION_PROVIDER_NAME = "Google Cloud Translation";

// Source languages the page may name, lower case. Any other code from the provider becomes "und".
const SOURCE_LANGUAGES: Readonly<Record<string, string>> = {
  ar: "Arabic",
  bn: "Bengali",
  de: "German",
  en: "English",
  es: "Spanish",
  fa: "Persian",
  fil: "Filipino",
  fr: "French",
  gu: "Gujarati",
  hi: "Hindi",
  id: "Indonesian",
  it: "Italian",
  kn: "Kannada",
  ml: "Malayalam",
  mr: "Marathi",
  ms: "Malay",
  ne: "Nepali",
  pa: "Punjabi",
  ps: "Pashto",
  pt: "Portuguese",
  ru: "Russian",
  si: "Sinhala",
  ta: "Tamil",
  te: "Telugu",
  tl: "Tagalog",
  tr: "Turkish",
  ur: "Urdu",
  zh: "Chinese",
  "zh-cn": "Chinese",
  "zh-tw": "Chinese",
};

export const UNKNOWN_LANGUAGE = "und";

export function sourceLanguage(code: unknown): string {
  if (typeof code !== "string") return UNKNOWN_LANGUAGE;
  const lower = code.toLowerCase();
  return Object.hasOwn(SOURCE_LANGUAGES, lower) ? lower : UNKNOWN_LANGUAGE;
}

export function languageName(code: string): string | null {
  return Object.hasOwn(SOURCE_LANGUAGES, code) ? SOURCE_LANGUAGES[code] : null;
}

// The error codes /api/translate returns, each with one HTTP status. Fixed values: the route never
// forwards the provider's own error text.
export const TRANSLATE_ERRORS = {
  invalid_request: 400,
  text_too_long: 400,
  consent_required: 400,
  cross_site: 403,
  rate_limited: 429,
  translation_unavailable: 503,
  provider_denied: 502,
  provider_busy: 503,
  provider_error: 502,
  provider_timeout: 503,
} as const;

export type TranslateErrorCode = keyof typeof TRANSLATE_ERRORS;

// What the page can see go wrong: a code from the route, no connection, or a reply it cannot read.
export type TranslateFailure = TranslateErrorCode | "network" | "offline" | "unreadable";

export const TRANSLATE_FAILURES: readonly TranslateFailure[] = [
  ...(Object.keys(TRANSLATE_ERRORS) as TranslateErrorCode[]),
  "network",
  "offline",
  "unreadable",
];

export function isTranslateFailure(value: unknown): value is TranslateFailure {
  return typeof value === "string" && (TRANSLATE_FAILURES as readonly string[]).includes(value);
}

// What the page sends with the check that follows a translation, for the audit trail only: the
// result and, on success, a language code from the list above. Never text.
export type TranslationRecord = { result: "ok"; sourceLang: string } | { result: TranslateFailure };

export function parseTranslationRecord(value: unknown): TranslationRecord | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const { result, sourceLang } = value as { result?: unknown; sourceLang?: unknown };
  if (result === "ok") return { result: "ok", sourceLang: sourceLanguage(sourceLang) };
  return isTranslateFailure(result) ? { result } : null;
}
