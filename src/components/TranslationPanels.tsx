import { Button, Callout } from "@/components/ui";
import {
  TRANSLATE_CONFIRM,
  TRANSLATE_CONSENT_TEXT,
  TRANSLATE_CONSENT_TITLE,
  TRANSLATE_FAILED_TITLE,
  TRANSLATE_UNAVAILABLE_TITLE,
  translateFailureMessage,
  TRANSLATION_NOTE,
  type ShownTranslation,
} from "@/components/translateFlow";
import { languageName, UNKNOWN_LANGUAGE, type TranslateFailure } from "@/lib/translation";

// BATCHB-2: the consent box. Shown before every send; only its confirm button sends the text.
export function TranslateConsent({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="callout callout-neutral translate-consent" role="group" aria-labelledby="translate-consent-title">
      <div className="callout-body">
        <p id="translate-consent-title" className="callout-title">
          {TRANSLATE_CONSENT_TITLE}
        </p>
        <p>{TRANSLATE_CONSENT_TEXT}</p>
        <div className="translate-actions">
          <Button onClick={onConfirm}>{TRANSLATE_CONFIRM}</Button>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}

// A failed translation: fixed wording only, never the text or the provider's reply.
export function TranslateFailureAlert({ code }: { code: TranslateFailure }) {
  return (
    <Callout
      tone="high"
      role="alert"
      title={code === "translation_unavailable" ? TRANSLATE_UNAVAILABLE_TITLE : TRANSLATE_FAILED_TITLE}
      className="translate-failure"
    >
      <p>{translateFailureMessage(code)}</p>
    </Callout>
  );
}

// After a translation: the original under a label, and the English that was checked, read-only.
// Both are rendered as text, never as HTML.
export function TranslationShown({ translation }: { translation: ShownTranslation }) {
  const name = translation.sourceLang === UNKNOWN_LANGUAGE ? null : languageName(translation.sourceLang);
  return (
    <section className="card translation-card" aria-labelledby="translation-heading">
      <h2 id="translation-heading" className="eyebrow">
        Machine translation
      </h2>
      <Callout tone="neutral" role="note" className="translation-note">
        <p>{TRANSLATION_NOTE}</p>
      </Callout>
      <h3 className="translation-label">{name ? `Original text (${name})` : "Original text"}</h3>
      <div className="translation-text" lang={name ? translation.sourceLang : undefined} dir="auto">
        {translation.original}
      </div>
      <h3 className="translation-label">English translation that was checked</h3>
      <div className="translation-text" lang="en" dir="auto">
        {translation.english}
      </div>
    </section>
  );
}
