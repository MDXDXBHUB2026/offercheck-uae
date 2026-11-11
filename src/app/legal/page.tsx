import type { Metadata } from "next";
import { BookOpen, Info } from "lucide-react";
import { PrintButton } from "@/components/PrintButton";
import { SignAccordion } from "@/components/SignAccordion";
import { FOOTER_DISCLAIMER, SYNTHETIC_STATEMENT } from "@/components/shell/site";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Card } from "@/components/ui";
import { REPORT_FRAUD_ID } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import { T } from "@/components/shell/T";

export const metadata: Metadata = {
  title: "Legal Guidelines",
  description:
    "Eight warning signs of a fake or risky job offer in the UAE, what to do about each one, and what Offer Check is.",
};

// Static: fixed text only, no request data. The offline library: the eight warning signs from one
// official page (src/lib/warningSigns.ts) and the plain-language About text (owner decision,
// 2026-11-09). The reference app's law articles and penalties are not copied: they had no source.
// /guide and /about redirect here (next.config.ts).
export const dynamic = "force-static";

const ABOUT: { id: string; title: string; body: React.ReactNode }[] = [
  {
    id: "problem-heading",
    title: "The problem",
    body: (
      <p>
        <T>
          Some job offers sent in the UAE by WhatsApp, email or LinkedIn are fake or risky. They may ask you to pay a fee, share a code or send your identity documents before you have a real job.
        </T>
      </p>
    ),
  },
  {
    id: "does-heading",
    title: "What it does",
    body: (
      <p>
        <T>
          It reads the offer text you paste and points out warning signs in plain words, with the words that matched. It shows how worrying the signs are as low, medium or high. These are warning signs, not a verdict on any company.
        </T>
      </p>
    ),
  },
  {
    id: "not-heading",
    title: "What it does not do",
    body: (
      <>
        <ul className="bullets">
          <li>
            <T>It does not check whether a company, a sender or an offer is real.</T>
          </li>
          <li>
            <T>It does not contact anyone or send any message for you.</T>
          </li>
          <li>
            <T>Its server does not store your text.</T>
          </li>
          <li>
            <T>It does not use an AI model to score your text.</T>
          </li>
          <li>
            <T>It reads English only. Words in other languages are not checked unless you choose machine translation first.</T>
          </li>
          <li>
            <T>It does not give legal advice.</T>
          </li>
        </ul>
      </>
    ),
  },
  {
    id: "for-heading",
    title: "Who it is for",
    body: (
      <p>
        <T>
          People in the UAE who receive a job offer by WhatsApp, email or LinkedIn and want to check it for warning signs, such as a request for a fee, a code or identity documents.
        </T>
      </p>
    ),
  },
  {
    id: "privacy-heading",
    title: "Your privacy",
    body: (
      <p>
        <T args={[TRANSLATE_BUTTON]}>
          {
            "Offer Check's server does not store the text you paste. Your text is sent to Google, for machine translation, only if you press “{0}”. Save to Encrypted Vault keeps an encrypted copy in this browser only, locked with a passphrase that is not stored."
          }
        </T>
      </p>
    ),
  },
  {
    id: "data-heading",
    title: "Example offers and legal advice",
    body: (
      <p>
        <T>{SYNTHETIC_STATEMENT}</T> <T>{FOOTER_DISCLAIMER}</T>
      </p>
    ),
  },
];

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

      <section id="about" className="stack-sm" aria-labelledby="about-heading">
        <h2 id="about-heading" className="h2 row">
          <Info className="icon text-green" aria-hidden="true" />
          <span>
            <T>About Offer Check UAE</T>
          </span>
        </h2>
        <p className="lead">
          <T>Offer Check UAE is a free tool that looks for common warning signs in a job offer before you pay or share anything.</T>
        </p>
        <div className="grid grid-2">
          {ABOUT.map((section) => (
            <Card as="section" key={section.id} className="stack-sm" aria-labelledby={section.id}>
              <h3 id={section.id} className="h3">
                <T>{section.title}</T>
              </h3>
              {section.body}
            </Card>
          ))}
        </div>
        <p>
          <a href={`/portals#${REPORT_FRAUD_ID}`}>
            <T>Where to report a job scam</T>
          </a>
        </p>
      </section>
    </div>
  );
}
