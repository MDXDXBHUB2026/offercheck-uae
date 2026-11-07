import { InfoIcon } from "@/components/icons";

// Site-wide text and navigation. Server-safe: no hooks here.

// True only while no server code logs or stores the request body. A test checks that.
export const PROTOTYPE_NOTICE =
  "Prototype. Use synthetic or redacted offers only. The app does not store offer text.";

export const NAV_ITEMS = [
  { href: "/check", label: "Check" },
  { href: "/how-it-works", label: "How it works" },
  { href: "/lab", label: "Test Lab" },
  { href: "/guide", label: "Guide" },
  { href: "/about", label: "About and limits" },
] as const;

// The mark: a rounded square with a check, from two basic shapes.
export function Mark() {
  return (
    <svg className="mark" width="28" height="28" viewBox="0 0 28 28" aria-hidden="true" focusable="false">
      <rect width="28" height="28" rx="8" fill="currentColor" />
      <path d="M8 14.5l4 4 8-9" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

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

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <p className="footer-lead">Risk indicators, not a verdict.</p>
        <p>
          Offer Check shows patterns that fixed rules found in the text you paste. It does not judge
          any company and it is not legal advice. It has been tested on synthetic offers only, not
          validated on real scam data.
        </p>
        <p>{PROTOTYPE_NOTICE}</p>
      </div>
    </footer>
  );
}
