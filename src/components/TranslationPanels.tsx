import { Callout } from "@/components/ui";
import {
  TRANSLATE_FAILED_TITLE,
  TRANSLATE_UNAVAILABLE_TITLE,
  translateFailureMessage,
  TRANSLATION_NOTE,
  type ShownTranslation,
} from "@/components/translateFlow";
import { languageName, UNKNOWN_LANGUAGE, type TranslateFailure } from "@/lib/translation";
import { useT } from "@/components/shell/lang";

// A failed translation: fixed wording only, never the text or the provider's reply.
export function TranslateFailureAlert({ code }: { code: TranslateFailure }) {
  const t = useT();
  return (
    <Callout
      tone="high"
      role="alert"
      title={t(code === "translation_unavailable" ? TRANSLATE_UNAVAILABLE_TITLE : TRANSLATE_FAILED_TITLE)}
      className="translate-failure"
    >
      <p>{t(translateFailureMessage(code))}</p>
    </Callout>
  );
}

// After a translation: the original under a label, and the English that was checked, read-only.
// Both are rendered as text, never as HTML.
export function TranslationShown({ translation }: { translation: ShownTranslation }) {
  const name = translation.sourceLang === UNKNOWN_LANGUAGE ? null : languageName(translation.sourceLang);
  const t = useT();
  return (
    <section className="card stack-sm translation-card" aria-labelledby="translation-heading">
      <h2 id="translation-heading" className="label-caps">
        {t("Machine translation")}
      </h2>
      <Callout tone="neutral" role="note" className="translation-note">
        <p>{t(TRANSLATION_NOTE)}</p>
      </Callout>
      <h3 className="h3 translation-label">{name ? t("Original text ({0})", name) : t("Original text")}</h3>
      <div className="card-sunken translation-text" lang={name ? translation.sourceLang : undefined} dir="auto">
        {translation.original}
      </div>
      <h3 className="h3 translation-label">{t("English translation that was checked")}</h3>
      <div className="card-sunken translation-text" lang="en" dir="auto">
        {translation.english}
      </div>
    </section>
  );
}
