"use client";

import "./globals.css";

// Replaces the root layout when the layout itself fails, so it brings its own document. Like
// error.tsx, it never shows the error's message or digest.
export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en">
      <body>
        <title>Something went wrong · Offer Check UAE</title>
        <main id="main" className="shell page">
          <section className="hero" aria-labelledby="page-title">
            <h1 id="page-title" className="page-title">
              Something went wrong
            </h1>
            <p className="intro">Offer Check could not be shown. Offer Check did not save your text.</p>
            <p className="hero-actions">
              <button type="button" className="primary" onClick={() => retry()}>
                Try again
              </button>
            </p>
          </section>
        </main>
      </body>
    </html>
  );
}
