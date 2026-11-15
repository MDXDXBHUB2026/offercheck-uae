import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { ContactEmail, SiteOperator } from "@/components/shell/SiteOperator";
import { T } from "@/components/shell/T";
import { TRANSLATE_BUTTON } from "@/components/translateFlow";
import { Card } from "@/components/ui";
import { POLICY_LAST_UPDATED } from "@/lib/siteConfig";

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
    ],
  },
  {
    id: "browser-heading",
    title: "What stays in your browser",
    lines: [
      "The Encrypted Vault: results you choose to save, encrypted with a passphrase that is not stored, and the number of saved results.",
      "Your language choice and your animation choice.",
      "Reports you write on the Threat Radar stay in the open tab's memory only, are not sent anywhere, and are gone after a reload.",
      "To clear them: in the Encrypted Vault, unlock it and use Delete all. Or clear this site's data in your browser's settings, which removes the vault and both choices.",
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

      {SECTIONS.map((section) => (
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
