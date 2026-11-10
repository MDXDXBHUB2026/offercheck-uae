"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { BookOpen, ChevronDown, FileCheck2, Languages, Lock, PhoneCall, Radio, ShieldCheck } from "lucide-react";
import { BrandBadge, NAV_ITEMS, type NavItem } from "@/components/shell/site";
import { restoreLang, setLang, useLang } from "@/components/shell/lang";
import { Button } from "@/components/ui";
import { HEADER_HOTLINE_IDS, contact } from "@/data/uaeContacts";

const ICONS: Record<NavItem["id"], typeof ShieldCheck> = {
  analyzer: ShieldCheck,
  radar: Radio,
  portals: FileCheck2,
  legal: BookOpen,
  vault: Lock,
};

// The page the link points at is the current one. "/" shows the Offer Analyzer; /guide and /about
// redirect to the tabs that now hold their content.
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href === "/check" && pathname === "/");
}

// The reference app's header: UAE flag ribbon (its colours drift slowly when motion is allowed), logo and title, five tabs (a bar under the header
// below 1200px), the hotlines dropdown and the English / Arabic switch. Tabs are real links, so
// navigation works without JavaScript.
export function Navbar() {
  const pathname = usePathname() ?? "/";
  const lang = useLang();
  const [hotlinesOpen, setHotlinesOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restoreLang();
  }, []);

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

  const label = (item: NavItem) => (lang === "ar" ? item.labelAr : item.label);

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
                UAE job offer scam check
              </span>
            </span>
          </Link>

          <nav aria-label="Main" className="nav-desktop">
            {NAV_ITEMS.map((item) => {
              const Icon = ICONS[item.id];
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className="tab"
                  aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                >
                  {isCurrent(pathname, item.href) && <span className="tab-dot" aria-hidden="true" />}
                  <Icon className="icon" aria-hidden="true" />
                  <span>{label(item)}</span>
                </Link>
              );
            })}
          </nav>

          <div className="header-actions">
            {/* True of the engine: the score comes from fixed rules (scoring.ts), with no AI model. */}
            <span className="status-pill">
              <span className="status-dot" aria-hidden="true" />
              <span>Fixed rules</span>
            </span>
            <div className="dropdown">
              <Button
                ref={toggleRef}
                variant="secondary"
                aria-expanded={hotlinesOpen}
                aria-controls="hotlines-panel"
                onClick={() => setHotlinesOpen((open) => !open)}
              >
                <PhoneCall className="icon text-red" aria-hidden="true" />
                <span className="btn-label-wide">UAE Hotlines</span>
                <span className="visually-hidden">UAE hotlines</span>
                <ChevronDown className="icon text-red" aria-hidden="true" />
              </Button>
              {hotlinesOpen && (
                <div id="hotlines-panel" ref={panelRef} className="dropdown-panel">
                  <p className="label-caps">Official UAE hotlines</p>
                  <div className="stack-sm">
                    {HEADER_HOTLINE_IDS.map((id) => {
                      const entry = contact(id);
                      return (
                        <a key={id} href={`tel:${entry.hotline}`} className="contact-row">
                          <span>
                            <span className="contact-name">{entry.name}</span>
                            <br />
                            <span className="small muted">{entry.purpose}</span>
                          </span>
                          <span className="contact-number" dir="ltr">{entry.hotlineLabel}</span>
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
            <Button variant="secondary" lang={lang === "en" ? "ar" : "en"} onClick={() => setLang(lang === "en" ? "ar" : "en")}>
              <Languages className="icon text-green" aria-hidden="true" />
              <span>{lang === "en" ? "العربية" : "English"}</span>
            </Button>
          </div>
        </div>

        <nav aria-label="Main (compact)" className="nav-mobile">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="tab"
              aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
            >
              {item.short}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
