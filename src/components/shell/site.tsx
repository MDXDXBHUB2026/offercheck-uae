import Link from "next/link";
import { InfoIcon } from "@/components/icons";
import { LimitsLink } from "@/components/LimitsLink";
import { LIMITS_SECTION } from "@/components/publicLimitations";

// Site-wide text and navigation. Server-safe: no hooks here.

// True only while no server code logs or stores the request body. A test checks that.
// BATCHB-2: translation sends the text to Google Cloud Translation, only when the user presses "Send to Google and translate".
export const PROTOTYPE_NOTICE =
  "Prototype. Use synthetic or redacted offers only. The app does not store offer text. If you choose translation, Google Cloud Translation receives it.";

// soon: the page is still a placeholder (docs/product-roadmap-v2.md, Phase 6 for the Guide), so the
// header and footer show it as plain text with a "Soon" badge, not a link (9a). Delete the flag
// when the page ships; a test fails if they disagree. Phases 2 and 3 shipped How it works, Test Lab
// and About and limits.
export type NavItem = { href: string; label: string; soon?: true };

export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/check", label: "Check" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/lab", label: "Test Lab" },
  { href: "/guide", label: "Guide", soon: true },
  { href: "/about", label: "About and limits" },
];

// The footer's closing lines, also shown on /about so the wording stays one copy.
export const FOOTER_DISCLAIMER =
  "A low score does not confirm an offer is genuine. Offer Check does not give legal advice. A translation can lose or change meaning.";
export const SYNTHETIC_STATEMENT =
  "Risk indicators, not a verdict. It has been tested on synthetic offers only, not validated on real scam data.";

// UX-2: the logo, an original mark from basic shapes. A shield (currentColor, set to --primary in
// CSS) with a check and a small magnifier cut out in the badge colour (--fill). Inline and
// decorative: the link text "Offer Check UAE" stays the accessible name.
export function Mark() {
  return (
    <svg className="mark logo" width="24" height="24" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <path d="M14 2.5l9.5 3.5v7c0 6-4 10.5-9.5 12.5C8.5 23.5 4.5 19 4.5 13V6z" fill="currentColor" />
      <path className="logo-cut" d="M9.5 13.5l3 3 5.5-6" fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      <circle className="logo-cut-fill" cx="20.5" cy="20.5" r="5.5" />
      <circle cx="20.5" cy="20.5" r="3" fill="none" stroke="currentColor" strokeWidth="1.8" />
      <path d="M22.7 22.7l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// 9a: a page not built yet, in the header and the footer. Plain text, not a link: the label, a
// visually hidden " (coming soon)" for screen readers, and the visible Soon badge (hidden from
// them, so it is not read twice). No aria-disabled: there is no control to disable.
export function SoonItem({ label, className }: { label: string; className: string }) {
  return (
    <span className={className} data-soon="true">
      {label}
      <span className="visually-hidden">{" (coming soon)"}</span>
      <span className="nav-soon" aria-hidden="true">
        Soon
      </span>
    </span>
  );
}

// The logo badge, shared by the header and the footer so the SVG exists once.
export function BrandBadge() {
  return (
    <span className="brand-badge">
      <Mark />
    </span>
  );
}

// UX-3: the footer chips. Each is true in the code today; the comment on its line names the file
// that proves it, and a routes test checks the claim. If one stops being true, remove the chip.
export const FOOTER_CHIPS = [
  "English rules, translation first", // src/lib/coverage.ts: non-English text is detected; src/components/translateFlow.ts: it can be translated to English, after consent, before the rules read it
  "No sign-in", // package.json: no auth library; src/app/api/analyze/route.ts: no cookie or token read
  "Not stored by Offer Check", // src/lib/auditRun.ts: the run and its audit trail go back in the response; src/lib/translateServer.ts: the translation is returned, not kept; src/app/page.test.ts: no logging or storage
  "Human approval", // src/lib/approvalGate.ts: only the user's approve action approves a draft, which is then only copied
] as const;

export function NoticeStrip() {
  return (
    <div className="notice-strip">
      <p className="shell notice" role="note">
        <InfoIcon size={20} />
        <span>{PROTOTYPE_NOTICE}</span>
      </p>
    </div>
  );
}

// UX-3: four columns (brand, Product, Trust and limits, chips), then the disclaimer. Pages not built
// yet are plain text, not links. Every line is true in the code today (routes test).
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <div className="footer-cols">
          <div className="footer-col footer-brand">
            <h2 className="footer-heading footer-brand-name">
              <BrandBadge />
              <span>Offer Check UAE</span>
            </h2>
            <p>A free, rule-based check for warning signs in UAE job offers.</p>
          </div>
          <div className="footer-col">
            <h2 className="footer-heading">Product</h2>
            <ul>
              <li>
                <Link href="/check" className="footer-link">
                  Check an offer
                </Link>
              </li>
              {NAV_ITEMS.filter((item) => item.href !== "/check").map((item) => (
                <li key={item.href}>
                  {item.soon ? (
                    <SoonItem label={item.label} className="footer-soon" />
                  ) : (
                    <Link href={item.href} className="footer-link">
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>
          <div className="footer-col">
            <h2 className="footer-heading">Trust and limits</h2>
            <ul>
              <li>Rule-based score: the same English text gives the same score</li>
              <li>A person approves any reply draft</li>
              <li>
                <LimitsLink>{LIMITS_SECTION}</LimitsLink>
              </li>
            </ul>
          </div>
          <div className="footer-col footer-chips">
            <h2 className="footer-heading">At a glance</h2>
            <ul>
              {FOOTER_CHIPS.map((chip) => (
                <li key={chip} className="footer-chip">
                  {chip}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p className="footer-disclaimer">{FOOTER_DISCLAIMER}</p>
          <p>{SYNTHETIC_STATEMENT}</p>
          <p>{PROTOTYPE_NOTICE}</p>
        </div>
      </div>
    </footer>
  );
}
