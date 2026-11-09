"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";
import { BrandBadge, NAV_ITEMS, SoonItem } from "@/components/shell/site";

const noSubscribe = () => () => {};

// The page the link points at is the current one. "/" shows the Check workspace.
export function isCurrent(pathname: string, href: string): boolean {
  return pathname === href || (href === "/check" && pathname === "/");
}

// Below 768px the links fold behind a Menu button. Before the script runs (or without it) the
// links stay visible, so navigation never depends on JavaScript.
export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const scripted = useSyncExternalStore(noSubscribe, () => true, () => false);

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key === "Escape" && open) {
      setOpen(false);
      toggleRef.current?.focus();
    }
  }

  return (
    <header className="site-header" onKeyDown={closeOnEscape}>
      <div className="shell site-header-inner">
        {/* UX-2: a logo badge, the name with a "UAE" chip, and a caption. The caption is hidden from
            assistive tech so the link's accessible name stays "Offer Check UAE". */}
        <Link href="/check" className="wordmark">
          <BrandBadge />
          <span className="brand-text">
            <span className="brand-line">
              <span className="brand-name">Offer Check</span> <span className="brand-chip">UAE</span>
            </span>
            <span className="brand-caption" aria-hidden="true">
              UAE job offer scam check
            </span>
          </span>
        </Link>
        {scripted && (
          <button
            ref={toggleRef}
            type="button"
            className="secondary nav-toggle"
            aria-expanded={open}
            aria-controls="site-nav"
            onClick={() => setOpen((value) => !value)}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
              {open ? (
                <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
            Menu
          </button>
        )}
        <nav id="site-nav" aria-label="Main" className="site-nav" data-collapsed={scripted && !open ? "true" : undefined}>
          <ul>
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                {/* 9a: a page not built yet is plain text with a Soon badge, not a link. */}
                {item.soon ? (
                  <SoonItem label={item.label} className="nav-item" />
                ) : (
                  <Link
                    href={item.href}
                    aria-current={isCurrent(pathname, item.href) ? "page" : undefined}
                    onClick={() => setOpen(false)}
                  >
                    {item.label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <Link href="/check#offer" className="header-action">
          Check an offer
        </Link>
      </div>
    </header>
  );
}
