import { ExternalLink, Lock, ShieldAlert, ShieldCheck } from "lucide-react";
import { LimitsLink } from "@/components/LimitsLink";
import { LIMITS_SECTION } from "@/components/publicLimitations";
import { ArabicNote } from "@/components/shell/ArabicNote";
import { contact } from "@/data/uaeContacts";

// Site-wide text and navigation. Server-safe: no hooks here.

// True only while no server code logs or stores the request body (page.test.ts checks that), and
// the Encrypted Vault keeps its copy in this browser only (src/lib/vault.ts).
export const PROTOTYPE_NOTICE =
  "Prototype. Use synthetic or redacted offers only. Offer Check's server does not store offer text. If you choose translation, Google Cloud Translation receives it. Save Encrypted keeps an encrypted copy in this browser only.";

// The five tabs of the reference app. The Arabic labels are the reference app's own, not reviewed by
// a native speaker. short: the compact bar under the header below 1200px.
export type NavItem = {
  id: "analyzer" | "radar" | "portals" | "legal" | "vault";
  href: string;
  label: string;
  labelAr: string;
  short: string;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { id: "analyzer", href: "/check", label: "Offer Analyzer", labelAr: "فاحص العروض", short: "Analyzer" },
  { id: "radar", href: "/radar", label: "Threat Radar", labelAr: "رادار التهديدات", short: "Radar" },
  { id: "portals", href: "/portals", label: "Gov Portals Hub", labelAr: "بوابات التحقق", short: "Portals" },
  { id: "legal", href: "/legal", label: "Legal Guidelines", labelAr: "الدليل القانوني", short: "Legal" },
  { id: "vault", href: "/vault", label: "Encrypted Vault", labelAr: "الخزنة المشفرة", short: "Vault" },
];

export const FOOTER_DISCLAIMER =
  "A low score does not confirm an offer is genuine. Offer Check does not report anything for you and does not give legal advice. A translation can lose or change meaning.";
export const SYNTHETIC_STATEMENT =
  "Risk indicators, not a verdict. It has been tested on synthetic offers only, not validated on real scam data.";

// The reference app's logo: a shield in a tinted badge, with a small red attention mark at its top
// corner (a ping ring spreads from it when motion is allowed). Decorative: the link text names the
// site, and the mark claims no live or online state.
export function BrandBadge() {
  return (
    <span className="brand-badge">
      <ShieldAlert className="icon icon-lg" aria-hidden="true" />
      <span className="brand-ping" aria-hidden="true" />
    </span>
  );
}

const FOOTER_LINKS = [
  { id: "mohre", label: "MoHRE Portal" },
  { id: "icp", label: "ICP Smart Services" },
  // GDRFA Dubai is in src/data/uaeContacts.ts (Amer), so the footer links it too.
  { id: "amer", label: "GDRFA Dubai (Amer)" },
  { id: "ecrime", label: `Dubai Police eCrime (${contact("ecrime").hotlineLabel})` },
] as const;

// The reference app's footer: brand line and portal links, then the disclaimer row.
export function SiteFooter() {
  return (
    <footer className="site-footer no-print">
      <div className="shell">
        <div className="footer-top">
          <div className="stack-sm">
            <h2 className="footer-brand h3">
              <ShieldCheck className="icon text-green" aria-hidden="true" />
              <span>Offer Check UAE</span>
            </h2>
            <p>A free, rule-based check for warning signs in UAE job offers.</p>
            <p className="small muted">Rule-based score: the same English text gives the same score.</p>
          </div>
          <ul className="footer-links" aria-label="Official portals">
            {FOOTER_LINKS.map((link) => (
              <li key={link.id}>
                <a href={contact(link.id).url} target="_blank" rel="noopener noreferrer">
                  <span>{link.label}</span>
                  <ExternalLink className="icon" aria-hidden="true" />
                </a>
              </li>
            ))}
            <li>
              <LimitsLink>{LIMITS_SECTION}</LimitsLink>
            </li>
          </ul>
        </div>
        <div className="footer-bottom">
          <p className="footer-disclaimer">{FOOTER_DISCLAIMER}</p>
          <p>{SYNTHETIC_STATEMENT}</p>
          <p className="notice">{PROTOTYPE_NOTICE}</p>
          <p className="row text-green mono">
            <Lock className="icon" aria-hidden="true" />
            <span>Encrypted Vault data stays in this browser</span>
          </p>
          <ArabicNote />
        </div>
      </div>
    </footer>
  );
}
