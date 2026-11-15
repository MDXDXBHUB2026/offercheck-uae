import type { Metadata } from "next";
import { BookOpen } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { SignAccordion } from "@/components/SignAccordion";
import { Card } from "@/components/ui";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Legal Guidelines",
  description:
    "Eight warning signs of a fake or risky job offer in the UAE, and what to do about each one.",
};

// Fixed text only, no request data. The offline library: the eight warning signs from one
// official page (src/lib/warningSigns.ts). The reference app's law articles and penalties are not
// copied: they had no source. /guide redirects here (next.config.ts). The About text that was here
// (#about) moved to its own page, /about, in production hardening Phase 3 (2026-11-15).
// Rendered per request only so that it gets the CSP nonce (src/proxy.ts); it reads no request data.

export default function LegalPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <BookOpen className="icon" aria-hidden="true" />
            <span>
              <T>Offline library</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>Legal Guidelines</T>
          </h1>
          <p className="lead">
            <T>Eight signs that a job offer in the UAE may be fake or risky, and what to do about each one. Not legal advice.</T>
          </p>
        </div>
        <div className="hero-side">
          <PrintButton />
        </div>
      </section>

      <section className="stack-sm" aria-labelledby="signs-heading">
        <h2 id="signs-heading" className="h2">
          <T>Warning signs</T>
        </h2>
        <ol className="grid grid-2">
          {WARNING_SIGNS.map((entry, index) => (
            <Card as="li" key={entry.id} id={entry.id} className="stack-sm card-fill" aria-labelledby={`${entry.id}-title`}>
              <div className="flag-head">
                <span className="num-tile" aria-hidden="true">
                  {index + 1}
                </span>
                <h3 id={`${entry.id}-title`} className="h3">
                  <T>{entry.sign}</T>
                </h3>
              </div>
              <SignAccordion why={entry.why} />
              <p className="small card-foot">
                <strong className="text-green">
                  <T>What to do:</T>
                </strong>{" "}
                <T>{entry.whatToDo}</T>
              </p>
            </Card>
          ))}
        </ol>
        <p className="small muted">
          <T>Source:</T>{" "}
          <a href={WARNING_SIGNS_SOURCE.url} rel="noreferrer" lang="en" dir="ltr">
            {WARNING_SIGNS_SOURCE.publisher}, “{WARNING_SIGNS_SOURCE.title}”
          </a>
          <T>, page last updated</T>{" "}
          <span lang="en" dir="ltr">
            {WARNING_SIGNS_SOURCE.updated}.
          </span>
        </p>
      </section>
    </div>
  );
}
