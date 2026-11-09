import { TRANSLATE_MAX_CHARS, type TranslateFailure, type TranslationRecord } from "@/lib/translation";

// BATCHB-2: the translation steps on the page, as a pure state machine, and its fixed wording.
// Consent is asked before every send and never remembered: Confirm starts a send only from the
// consent box, and after a success or a failure the next send needs Translate and Confirm again.
// A failure never checks the original: the user chooses again.
export type TranslateFlow =
  | { step: "idle" }
  | { step: "consent" }
  | { step: "sending" }
  | { step: "failed"; code: TranslateFailure }
  // The server has no key: translation is off for this visit. alert: show the one-time notice.
  | { step: "unavailable"; alert: boolean };

export type TranslateAction =
  | { type: "ask" }
  | { type: "cancel" }
  | { type: "confirm" }
  | { type: "failed"; code: TranslateFailure }
  | { type: "done" }
  | { type: "reset" }
  | { type: "checked" };

// The initial state. Named, so a test can recognise this state.
export function idleFlow(): TranslateFlow {
  return { step: "idle" };
}

export function translateFlowReducer(flow: TranslateFlow, action: TranslateAction): TranslateFlow {
  switch (action.type) {
    case "ask":
      return flow.step === "idle" || flow.step === "failed" ? { step: "consent" } : flow;
    case "cancel":
      return flow.step === "consent" ? { step: "idle" } : flow;
    case "confirm":
      return flow.step === "consent" ? { step: "sending" } : flow;
    case "failed":
      if (flow.step !== "sending") return flow;
      return action.code === "translation_unavailable" ? { step: "unavailable", alert: true } : { step: "failed", code: action.code };
    case "done":
      return flow.step === "sending" ? { step: "idle" } : flow;
    // The text was edited, or a check started: close the consent box and clear a failure. A
    // translation off for the visit stays off.
    case "reset":
    case "checked":
      if (flow.step === "unavailable") return { step: "unavailable", alert: false };
      return flow.step === "sending" ? flow : { step: "idle" };
  }
}

// When the original is checked after a failed translation, the audit trail records the failure code.
export function failureForCheck(flow: TranslateFlow): TranslationRecord | null {
  if (flow.step === "failed") return { result: flow.code };
  if (flow.step === "unavailable") return { result: "translation_unavailable" };
  return null;
}

// What the page shows after a translation, kept in page memory with the checked result only.
export type ShownTranslation = { original: string; english: string; sourceLang: string };

export const TRANSLATE_BUTTON = "Translate to English and check";
export const TRANSLATE_CONFIRM = "Send to Google and translate";
export const TRANSLATE_CONSENT_TITLE = "Send this text to Google for translation?";
export const TRANSLATE_CONSENT_TEXT =
  "To translate, Offer Check sends the text in the box to Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives. Remove names, phone numbers and other personal details first.";
// Shown under the buttons for non-English or mixed text while translation is on.
export const LANGUAGE_GATE_TRANSLATE_NOTE =
  "This text does not look like English, or only part of it does. The rules read English only. You can have it machine translated to English first, or check the original, where the parts in other languages will not be checked.";
export const TRANSLATION_NOTE =
  "This result is based on a machine translation by Google Cloud Translation. It may be inexact: a translation can lose or change meaning, so a warning sign in the original can be missed.";
export const TRANSLATE_FAILED_TITLE = "Translation did not work, so nothing was checked.";
export const TRANSLATE_UNAVAILABLE_TITLE = "Translation is not available right now, so nothing was checked.";

const RETRY = "Try again, or check the original text; the parts not in English will not be checked.";

const FAILURE_MESSAGES: Record<TranslateFailure, string> = {
  invalid_request: `The translation request could not be read. ${RETRY}`,
  text_too_long: `Translation takes up to ${TRANSLATE_MAX_CHARS.toLocaleString("en-US")} characters. Shorten the text, or check the original text; the parts not in English will not be checked.`,
  consent_required: `The translation was not confirmed. ${RETRY}`,
  cross_site: `The translation request was refused. ${RETRY}`,
  rate_limited: "Too many translations in a short time. Wait a minute, then try again, or check the original text.",
  translation_unavailable: "Nothing was sent for translation. You can check the original text; the parts not in English will not be checked.",
  provider_denied: `The translation service refused the request. ${RETRY}`,
  provider_busy: `The translation service is busy. ${RETRY}`,
  provider_error: `The translation service did not return a translation. ${RETRY}`,
  provider_timeout: `The translation service took too long to answer. ${RETRY}`,
  network: `Could not reach the server. Your text is still in the box. ${RETRY}`,
  offline: "You appear to be offline. Your text is still in the box. Reconnect, then try again.",
  unreadable: `The server sent a reply this page cannot read. ${RETRY}`,
};

export function translateFailureMessage(code: TranslateFailure): string {
  return FAILURE_MESSAGES[code];
}
