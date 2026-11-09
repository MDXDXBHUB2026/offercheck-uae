import { Callout } from "@/components/ui";
import {
  TRANSLATE_FAILED_TITLE,
  TRANSLATE_UNAVAILABLE_TITLE,
  translateFailureMessage,
  TRANSLATION_NOTE,
  type ShownTranslation,
} from "@/components/translateFlow";
import { languageName, UNKNOWN_LANGUAGE, type TranslateFailure } from "@/lib/translation";

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
    <section className="card stack-sm translation-card" aria-labelledby="translation-heading">
      <h2 id="translation-heading" className="label-caps">
        Machine translation
      </h2>
      <Callout tone="neutral" role="note" className="translation-note">
        <p>{TRANSLATION_NOTE}</p>
      </Callout>
      <h3 className="h3 translation-label">{name ? `Original text (${name})` : "Original text"}</h3>
      <div className="card-sunken translation-text" lang={name ? translation.sourceLang : undefined} dir="auto">
        {translation.original}
      </div>
      <h3 className="h3 translation-label">English translation that was checked</h3>
      <div className="card-sunken translation-text" lang="en" dir="auto">
        {translation.english}
      </div>
    </section>
  );
}
