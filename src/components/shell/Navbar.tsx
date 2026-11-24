"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment, useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, ChevronDown, FileCheck2, Info, Languages, Lock, PhoneCall, ShieldCheck } from "lucide-react";
import { BrandBadge, NAV_GROUPS, NAV_ITEMS, type NavItem } from "@/components/shell/site";
import { restoreLang, setLang, useLang, useT } from "@/components/shell/lang";
import { restoreMotion } from "@/components/shell/motion";
import { registerServiceWorker } from "@/components/shell/offline";
import { startInstallWatch } from "@/components/shell/install";
import { SettingsButton } from "@/components/shell/SettingsPanel";
import { restoreTextSize } from "@/components/shell/textSize";
import { restoreTheme } from "@/components/shell/theme";
import { Button } from "@/components/ui";
import { useVaultState } from "@/components/vaultStore";
import { HEADER_HOTLINE_IDS, contact } from "@/data/uaeContacts";
import { REPORT_FRAUD_NOTE } from "@/lib/authorities";

const ICONS: Record<NavItem["id"], typeof ShieldCheck> = {
  analyzer: ShieldCheck,
  portals: FileCheck2,
  legal: BookOpen,
  vault: Lock,
  about: Info,
};

// The page the link points at is the current one. "/" shows the Offer Analyzer; /guide redirects
// to Legal Guidelines.
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href === "/check" && pathname === "/");
}

// The reference app's header: UAE flag ribbon (its colours drift slowly when motion is allowed), logo and title, five tabs in two groups, Tools and
// Information, with a divider between them (a three-by-two bar under the header below 1200px), the hotlines dropdown and the English / Arabic switch. Tabs are real links, so
// navigation works without JavaScript.
export function Navbar() {
  const pathname = usePathname() ?? "/";
  const lang = useLang();
  const [hotlinesOpen, setHotlinesOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restoreLang();
    restoreMotion();
    restoreTextSize();
    restoreTheme();
    startInstallWatch();
    registerServiceWorker();
  }, []);

  // The tab title follows the interface language on the five main pages. Next sets the page's own
  // (English) title after a navigation, so while Arabic is on the title is set again when it changes.
  useEffect(() => {
    const item = NAV_ITEMS.find((entry) => isCurrent(pathname, entry.href));
    if (!item) return;
    const wanted = `${lang === "ar" ? item.labelAr : item.label} · Offer Check UAE`;
    const apply = () => {
      if (document.title !== wanted) document.title = wanted;
    };
    apply();
    if (lang !== "ar" || typeof MutationObserver === "undefined") return;
    const observer = new MutationObserver(apply);
    observer.observe(document.head, { subtree: true, childList: true, characterData: true });
    return () => observer.disconnect();
  }, [lang, pathname]);

  useEffect(() => {
    if (!hotlinesOpen) return;
    const close = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!panelRef.current?.contains(target) && !toggleRef.current?.contains(target)) setHotlinesOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [hotlinesOpen]);

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && hotlinesOpen) {
      setHotlinesOpen(false);
      toggleRef.current?.focus();
    }
  }

  const t = useT();
  const label = (item: NavItem) => (lang === "ar" ? item.labelAr : item.short);
  // The number of saved results on the Vault tab, from the plain count kept beside the encrypted
  // vault: no passphrase needed, and no title or text is read.
  const vault = useVaultState();
  const savedCount = /^\d+$/.test(vault) && Number(vault) > 0 ? Number(vault) : null;
  const countBadge = (item: NavItem) =>
    item.id === "vault" && savedCount !== null ? (
      <>
        <span className="nav-count" aria-hidden="true">
          {savedCount}
        </span>
        <span className="visually-hidden">{t("Saved results: {0}", savedCount)}</span>
      </>
    ) : null;

  return (
    <header className="site-header" onKeyDown={closeOnEscape}>
      <div className="flag-ribbon" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="shell">
        <div className="header-row">
          <Link href="/check" className="brand">
            <BrandBadge />
            <span className="brand-text">
              <span className="brand-name">Offer Check UAE</span>
              <span className="brand-caption" aria-hidden="true">
                {t("UAE job offer scam check")}
              </span>
            </span>
          </Link>

          <nav aria-label={t("Main")} className="nav-desktop">
            {NAV_GROUPS.map((group, index) => (
              <Fragment key={group.id}>
                {index > 0 && <span className="nav-divider" aria-hidden="true" />}
                <div role="group" aria-label={t(group.label)} className="nav-group" data-group={group.id}>
                  {NAV_ITEMS.filter((item) => item.group === group.id).map((item) => {
                    const Icon = ICONS[item.id];
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className="tab"
                        aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                      >
                        {isCurrent(pathname, item.href) && <span className="tab-dot" aria-hidden="true" />}
                        {/* Phase 3b: only this icon wrapper animates (CSS, no-preference only); the label never does. */}
                        <span className="nav-icon" data-icon={item.id} aria-hidden="true">
                          <Icon className="icon" aria-hidden="true" />
                        </span>
                        <span>{label(item)}</span>
                        {countBadge(item)}
                      </Link>
                    );
                  })}
                </div>
              </Fragment>
            ))}
          </nav>

          <div className="header-actions">
            {/* Phase 3 option A: no "Fixed rules" pill here. The hero's "Fixed rules, no AI scoring"
                is the one place that says it. */}
            <div className="dropdown">
              <Button
                ref={toggleRef}
                variant="secondary"
                className="hotline-btn"
                aria-expanded={hotlinesOpen}
                aria-controls="hotlines-panel"
                onClick={() => setHotlinesOpen((open) => !open)}
              >
                <span className="hotline-icon" aria-hidden="true">
                  <PhoneCall className="icon text-red" aria-hidden="true" />
                </span>
                <span className="btn-label-wide">{t("UAE Hotlines")}</span>
                <span className="visually-hidden">{t("UAE hotlines")}</span>
                <ChevronDown className="icon text-red hotline-chevron" aria-hidden="true" />
              </Button>
              {hotlinesOpen && (
                <div id="hotlines-panel" ref={panelRef} className="dropdown-panel">
                  <p className="label-caps">{t("Official UAE hotlines")}</p>
                  <div className="stack-sm">
                    {HEADER_HOTLINE_IDS.map((id) => {
                      const entry = contact(id);
                      return (
                        <a key={id} href={`tel:${entry.hotline}`} className="contact-row">
                          <span>
                            <span className="contact-name">{lang === "ar" ? entry.arabicName : entry.name}</span>
                            <br />
                            <span className="small muted">{t(entry.purpose)}</span>
                          </span>
                          <span className="contact-number" dir="ltr">{entry.hotlineLabel}</span>
                        </a>
                      );
                    })}
                  </div>
                  {/* The dropdown lists a reporting hotline (eCrime), so it carries the same note as
                      every other place that lists reporting channels. */}
                  <p className="small muted">{t(REPORT_FRAUD_NOTE)}</p>
                </div>
              )}
            </div>
            <Button variant="secondary" lang={lang === "en" ? "ar" : "en"} onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Languages className="icon text-green lang-icon" aria-hidden="true" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </Button>
            {/* Phase 4a: Settings, beside the language button, on every width. */}
            <SettingsButton />
          </div>
        </div>

        {/* Below 1200px: the same five links, one row per group (Tools, then Information). */}
        <nav aria-label={t("Main (compact)")} className="nav-mobile">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tab"
              data-group={item.group}
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              {t(item.short)}
              {countBadge(item)}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
