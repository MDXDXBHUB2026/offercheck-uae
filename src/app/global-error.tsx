"use client";

import "./globals.css";
import { useLang } from "@/components/shell/lang";
import { tr } from "@/lib/i18n";

// Replaces the root layout when the layout itself fails, so it brings its own document. Like
// error.tsx, it never shows the error's message or digest.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  const lang = useLang();
  const t = (en: string) => tr(lang, en);
  return (
    <html lang={lang} dir={lang === "ar" ? "rtl" : "ltr"}>
      <body>
        <title>{`${t("Something went wrong")} · Offer Check UAE`}</title>
        <main id="main" className="shell page">
          <section className="hero" aria-labelledby="page-title">
            <h1 id="page-title" className="page-title">
              {t("Something went wrong")}
            </h1>
            <p className="intro">{t("Offer Check could not be shown. Offer Check did not save your text.")}</p>
            <p className="hero-actions">
              <button type="button" className="primary" onClick={() => retry()}>
                {t("Try again")}
              </button>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
