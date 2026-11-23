import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ContactEmail, SiteOperator } from "@/components/shell/SiteOperator";
import { MissedScamLink } from "@/components/MissedScamLink";
import { T } from "@/components/shell/T";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Card } from "@/components/ui";
import { POLICY_LAST_UPDATED, SITE_MISSED_SCAM_FORM_URL } from "@/lib/siteConfig";

export const metadata: Metadata = {
  title: "Privacy",
  description: "What Offer Check UAE sends, keeps and does not keep when you check a job offer.",
};

// Production hardening Phase 3 (2026-11-15). Drafted, pending legal review (docs/privacy-terms.md).
// Every statement here must stay true in the code; docs/privacy-terms.md names the file for each,
// and src/app/policyPages.test.ts checks the ones that can be checked mechanically. No law, no
// compliance claim. Fixed text only; rendered per request only for the CSP nonce (src/proxy.ts).

type Section = { id: string; title: string; lines: readonly string[] };

const SECTIONS: readonly Section[] = [
  {
    id: "check-heading",
    title: "When you check an offer",
    lines: [
      "Your browser sends Offer Check's server the text in the box and, if you translated it first, whether the translation worked and which language was detected. Like any web request, it also carries your network (IP) address.",
      "The server runs the check and sends the result back. It does not store the text or the result, and Offer Check's code does not write them to any log.",
    ],
  },
  {
    id: "hidden-heading",
    title: "Numbers hidden in your browser",
    lines: [
      "Before any text leaves your browser, Emirates ID numbers, UAE IBANs and passport numbers written as one letter and 7 or 8 digits are replaced with a mask.",
      "Not caught: IBANs from other countries, other passport formats, an Emirates ID written with dots, and numbers in Arabic-Indic digits. Remove names, phone numbers and other personal details yourself.",
    ],
  },
  {
    id: "translate-heading",
    title: "Translation, only if you choose it",
    lines: [
      "Text that is not in English can be translated first. The text is sent only when you press “{0}”, each time you press it, and the page says so next to the button before you do.",
      "Offer Check's server passes the text to Google Cloud Translation, a machine translation service run by Google. Offer Check does not store it; Google's terms apply to the text it receives.",
    ],
  },
  {
    id: "where-heading",
    title: "Where it is processed",
    lines: ["Checks and translations run in Vercel functions in Mumbai, India."],
  },
  {
    id: "limits-counters-heading",
    title: "Rate-limit counters",
    lines: [
      "To limit how often one visitor can check or translate, the server keeps counters. Each counter is keyed by a salted hash of your network address and a time window, never the address itself, and holds only a number.",
      "Each counter expires on its own: after 2 minutes for a per-minute limit, after 25 hours for a daily one. They are kept in an Upstash Redis store in Mumbai.",
      "We keep daily totals of how many checks, rejected inputs, errors and limit hits happened, with no text and nothing that identifies you.",
    ],
  },
  {
    id: "browser-heading",
    title: "What stays in your browser",
    lines: [
      "The Encrypted Vault: results you choose to save, encrypted with a passphrase that is not stored, and the number of saved results. Titles and notes are saved inside it, with Emirates ID, passport and UAE IBAN numbers hidden.",
      "Your choices in Settings: language, animations and text size, and whether you dismissed the install hint.",
      "If you export the vault, the file is saved where your browser puts downloads. It is still encrypted, and Offer Check keeps no copy.",
      "To clear them: open Settings and use Clear my data on this device. It removes the vault and every choice without the passphrase. Clearing this site's data in your browser's settings does the same.",
      "If you install the app, it keeps its own storage: results saved in the installed app stay there, and results saved in the browser stay in the browser.",
    ],
  },
  {
    id: "offline-heading",
    title: "Pages kept for offline reading",
    lines: [
      "After your first visit, your browser keeps a copy of the Check page and the About, Guidelines, Portals, Privacy and Terms pages, with the files they need, so you can read them offline.",
      "The copy holds only these public pages and the app's own files. It never holds the text you paste, a result, or any reply from Offer Check's server to a check or a translation.",
      "Each new version of the site replaces the copy. Clearing this site's data in your browser's settings removes it.",
    ],
  },
  {
    id: "hosting-heading",
    title: "The hosting provider",
    lines: ["Offer Check runs on Vercel. Vercel keeps its own infrastructure logs of requests, under its own terms."],
  },
  {
    id: "tracking-heading",
    title: "No advertising or tracking",
    lines: ["Offer Check has no advertising, analytics or tracking scripts, and its code sets no cookies."],
  },
];

// Shown, after the translation section, only while the form link is on (src/lib/siteConfig.ts).
const MISSED_FORM_SECTION: Section = {
  id: "missed-form-heading",
  title: "If Offer Check missed a scam",
  lines: [
    "The link under a result, and on the About and Privacy pages, opens a Google Form in a new tab. Google receives what you type there, under Google's terms. Offer Check does not send the form any offer text, result or other data from the app, and the form is not part of this app.",
    "Please do not paste the offer into the form: say what Offer Check did and what it missed.",
  ],
};

function sectionsToShow(): readonly Section[] {
  if (!SITE_MISSED_SCAM_FORM_URL.trim()) return SECTIONS;
  const after = SECTIONS.findIndex((section) => section.id === "translate-heading") + 1;
  return [...SECTIONS.slice(0, after), MISSED_FORM_SECTION, ...SECTIONS.slice(after)];
}

// {0} is the translate button's own label, so the notice names the button exactly.
function Line({ text }: { text: string }) {
  return <T args={text.includes("{0}") ? [TRANSLATE_BUTTON] : []}>{text}</T>;
}

export default function PrivacyPage() {
  return (
    <div className="stack">
      <section className="card hero" aria-labelledby="page-title" data-tint="green">
        <div className="stack-sm">
          <p className="eyebrow-pill">
            <ShieldCheck className="icon" aria-hidden="true" />
            <span>
              <T>Privacy</T>
            </span>
          </p>
          <h1 id="page-title" className="h1">
            <T>Privacy notice</T>
          </h1>
          <p className="small muted">
            <T>Last updated:</T>{" "}
            <time dateTime={POLICY_LAST_UPDATED} lang="en" dir="ltr">
              {POLICY_LAST_UPDATED}
            </time>
          </p>
          <p className="lead">
            <T>What Offer Check sends, keeps and does not keep when you use it.</T>
          </p>
        </div>
      </section>

      {sectionsToShow().map((section) => (
        <Card as="section" key={section.id} className="stack-sm" aria-labelledby={section.id}>
          <h2 id={section.id} className="h2">
            <T>{section.title}</T>
          </h2>
          {section.lines.length === 1 ? (
            <p>
              <Line text={section.lines[0]} />
            </p>
          ) : (
            <ul className="bullets">
              {section.lines.map((line) => (
                <li key={line}>
                  <Line text={line} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      ))}

      <Card as="section" className="stack-sm" aria-labelledby="contact-heading">
        <h2 id="contact-heading" className="h2">
          <T>Contact</T>
        </h2>
        <p>
          <SiteOperator />.
        </p>
        <p>
          <T>Questions about this notice:</T> <ContactEmail />
        </p>
        <MissedScamLink />
        <p>
          <Link href="/terms">
            <T>Read the terms of use</T>
          </Link>{" "}
          <span aria-hidden="true">·</span>{" "}
          <Link href="/about">
            <T>About Offer Check UAE</T>
          </Link>
        </p>
      </Card>
    </div>
  );
}
