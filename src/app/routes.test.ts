import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { networkFailure, responseFailure } from "@/components/checkRequest";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { LimitsLink } from "@/components/LimitsLink";
import { LIMITS_ID, openLimits, syncLimitsToHash } from "@/components/limitsAnchor";
import { LIMITS_SECTION, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { ARABIC_NOTE } from "@/components/shell/ArabicNote";
import { isCurrent, Navbar } from "@/components/shell/Navbar";
import { BrandBadge, NAV_ITEMS, PROTOTYPE_NOTICE, SiteFooter } from "@/components/shell/site";
import { Button, ButtonLink, Callout, Card, Chip, Disclosure, HelperText } from "@/components/ui";
import { SAMPLE_OFFERS } from "@/data/sampleOffers";
import { HEADER_HOTLINE_IDS, UAE_CONTACTS, contact } from "@/data/uaeContacts";
import { runManager } from "@/lib/agents/manager";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { gateReducer, INITIAL_GATE_FLOW } from "@/lib/approvalGate";
import { languageNotice } from "@/lib/textScript";
import * as check from "./check/page";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import * as legal from "./legal/page";
import Loading from "./loading";
import NotFound, { metadata as notFoundMetadata } from "./not-found";
import * as root from "./page";
import * as portals from "./portals/page";
import * as radar from "./radar/page";
import * as vault from "./vault/page";

// The header reads the current path and the language store. Both are set here.
const nav = vi.hoisted(() => ({ pathname: "/check", lang: "en" as "en" | "ar" }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  // Only the language store is scripted; other stores (Threat Radar's local reports) keep their server snapshot.
  const scripted = (subscribe: unknown, get: () => unknown, server?: () => unknown) => {
    const value = (server ?? get)();
    return value === "en" || value === "ar" ? nav.lang : value;
  };
  return { ...real, useSyncExternalStore: scripted };
});

const CANARY = "CANARY-offer-text Desert Star hr@example.test";
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");

// The redesign: the reference app's five tabs, one route each. "/" is the Offer Analyzer.
const ROUTES = [
  { path: "/", module: root, title: "Offer Analyzer" },
  { path: "/check", module: check, title: "Offer Analyzer" },
  { path: "/radar", module: radar, title: "Threat Radar" },
  { path: "/portals", module: portals, title: "Gov Portals Hub" },
  { path: "/legal", module: legal, title: "Legal Guidelines" },
  { path: "/vault", module: vault, title: "Encrypted Vault" },
];

describe("routes", () => {
  it.each(ROUTES.map((route) => [route.path, route] as const))("%s has a title, a description and one h1", (_path, route) => {
    expect(route.module.metadata.title).toBe(route.title);
    expect(String(route.module.metadata.description ?? "").length).toBeGreaterThan(0);
    const html = renderToStaticMarkup(createElement(route.module.default));
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
    // The layout supplies the one <main>, header and footer landmarks.
    expect(html).not.toMatch(/<main[\s>]|<header[\s>]|<footer[\s>]/);
  });

  it("has exactly the five tabs of the reference app, and no /how-it-works or /lab route", () => {
    expect(NAV_ITEMS.map((item) => [item.label, item.href])).toEqual([
      ["Offer Analyzer", "/check"],
      ["Threat Radar", "/radar"],
      ["Gov Portals Hub", "/portals"],
      ["Legal Guidelines", "/legal"],
      ["Encrypted Vault", "/vault"],
    ]);
    for (const dir of ["how-it-works", "lab", "about", "guide"]) expect(existsSync(join(process.cwd(), "src/app", dir)), dir).toBe(false);
  });

  it("every navigation item has a page", () => {
    expect(NAV_ITEMS.map((item) => item.href).sort()).toEqual(ROUTES.slice(1).map((route) => route.path).sort());
  });

  it("the layout has a skip link, the header, one main landmark, the footer and a title template", () => {
    const source = read("src/app/layout.tsx");
    expect(source).toContain('<a className="skip-link" href="#main">');
    expect(source).toContain('<main id="main"');
    expect(source).toMatch(/<Navbar \/>[\s\S]*<main[\s\S]*<SiteFooter \/>/);
    expect(source).toContain('template: "%s · Offer Check UAE"');
    expect(source).toContain('<html lang="en" dir="ltr">');
  });
});

describe("header", () => {
  const header = (pathname = "/check", lang: "en" | "ar" = "en") => {
    nav.pathname = pathname;
    nav.lang = lang;
    try {
      return renderToStaticMarkup(createElement(Navbar));
    } finally {
      nav.pathname = "/check";
      nav.lang = "en";
    }
  };
  const navOf = (html: string, label: string) => {
    const start = html.indexOf(`aria-label="${label}"`);
    return html.slice(start, html.indexOf("</nav>", start));
  };

  it("lists the five tabs as real links in a named nav, and marks the current page once", () => {
    const html = header();
    const main = navOf(html, "Main");
    const links = [...main.matchAll(/<a [^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/g)].map((m) => [m[2].replace(/<[^>]+>/g, ""), m[1]]);
    expect(links).toEqual(NAV_ITEMS.map((item) => [item.label, item.href]));
    expect(main.match(/aria-current="page"/g)).toHaveLength(1);
    expect(main).toMatch(/<a class="tab" aria-current="page" href="\/check">/);
    expect(html).not.toMatch(/Soon|coming soon|aria-disabled|how-it-works|"\/lab/);
  });

  it("has a compact tab bar for narrow screens with the same links", () => {
    const compact = navOf(header("/legal"), "Main (compact)");
    expect([...compact.matchAll(/href="([^"]*)"/g)].map((m) => m[1])).toEqual(NAV_ITEMS.map((item) => item.href));
    expect(compact).toMatch(/<a class="tab" aria-current="page" href="\/legal">Legal<\/a>/);
  });

  it("brand: logo badge, name and caption, linking to the Offer Analyzer; the name is 'Offer Check UAE'", () => {
    const html = header();
    const brand = html.match(/<a class="brand" href="\/check">(.*?)<\/a>/)?.[1] ?? "";
    expect(brand).toContain(renderToStaticMarkup(createElement(BrandBadge)));
    expect(brand).toContain('<span class="brand-name">Offer Check UAE</span>');
    expect(brand).toContain('<span class="brand-caption" aria-hidden="true">UAE job offer scam check</span>');
    const name = brand
      .replace(/<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>/g, "")
      .replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, "")
      .replace(/<[^>]+>/g, "")
      .trim();
    expect(name).toBe("Offer Check UAE");
  });

  it("the hotlines dropdown is a button that names what it controls; closed on load", () => {
    const html = header();
    expect(html).toMatch(/<button type="button" class="btn btn-secondary" aria-expanded="false" aria-controls="hotlines-panel">/);
    expect(html).not.toContain('id="hotlines-panel"');
    expect(HEADER_HOTLINE_IDS).toEqual(["mohre", "amer", "ecrime"]);
    // The numbers it lists come from the one contacts file.
    expect(read("src/components/shell/Navbar.tsx")).toContain("contact(id)");
    expect(read("src/components/shell/Navbar.tsx")).not.toMatch(/\b(?:600\s?590000|800\s?5111|901)\b/);
  });

  it("the language switch shows the other language, and Arabic labels the tabs in Arabic", () => {
    expect(header()).toContain(">العربية</span>");
    const arabic = header("/check", "ar");
    expect(arabic).toContain(">English</span>");
    for (const item of NAV_ITEMS) expect(navOf(arabic, "Main")).toContain(`<span>${item.labelAr}</span>`);
  });

  it("the language store sets lang and dir on <html>, so the whole layout mirrors", () => {
    const store = read("src/components/shell/lang.ts");
    expect(store).toContain('document.documentElement.dir = lang === "ar" ? "rtl" : "ltr"');
    expect(store).toContain("document.documentElement.lang = lang");
    // Logical properties only: no physical left/right margins, paddings or positions in the CSS.
    const css = read("src/app/globals.css");
    // The one exception is the Arabic (RTL) bidi block: a fixed "right" alignment, only under
    // [dir="rtl"], so English text in an RTL page stays right-aligned (see the next test).
    const rtlOnly = /(?:\[dir="rtl"\][^{},]*,\s*)*\[dir="rtl"\][^{},]*\{[^}]*\}/g;
    expect(css.replace(rtlOnly, "")).not.toMatch(/(?:margin|padding|border)-(?:left|right)\s*:|(?:^|\s)(?:left|right)\s*:\s*[^;]+;|text-align:\s*(?:left|right)/m);
    expect(ARABIC_NOTE).toBe("Arabic labels have not been reviewed by a native speaker. Page content is in English.");
  });

  // RTL with English page text: sentences keep their full stop at the end and stay right-aligned,
  // and hotline numbers keep their digit order ("600 590000", not "590000 600").
  it("in Arabic, English text keeps its punctuation and the hotline numbers keep their order", () => {
    const css = read("src/app/globals.css");
    expect(css).toMatch(/\[dir="rtl"\] body,\s*\[dir="rtl"\] \.tabs-boxed \.tab,\s*\[dir="rtl"\] \.vault-item \{\s*text-align: right;\s*\}/);
    expect(css).toMatch(/\[dir="rtl"\] body \*:not\(\[dir\]\) \{\s*unicode-bidi: plaintext;\s*\}/);
    expect(css).toMatch(/\[dir="rtl"\] \.score-text \{\s*flex-direction: row-reverse;\s*justify-content: flex-end;\s*\}/);
    expect(read("src/components/shell/Navbar.tsx")).toContain('<span className="contact-number" dir="ltr">{entry.hotlineLabel}</span>');
    expect(read("src/app/portals/page.tsx")).toContain('<span className="mono" dir="ltr">{entry.hotlineLabel}</span>');
  });

  it("treats / as the Offer Analyzer", () => {
    expect(isCurrent("/", "/check")).toBe(true);
    expect(isCurrent("/", "/legal")).toBe(false);
    expect(isCurrent("/legal", "/legal")).toBe(true);
  });
});

describe("Offer Analyzer hero", () => {
  it("has its copy, the four synthetic sample cards, the box and one big audit button; no upload", () => {
    const html = renderToStaticMarkup(createElement(check.default));
    expect(html).toMatch(/^<div class="stack"><div class="stack"><section class="card hero hero-video" aria-labelledby="page-title" data-glow="max">/);
    expect(html).toContain("Check a job offer before you pay or share anything.");
    expect(html.match(/<li class="card sample-card">/g)).toHaveLength(4);
    expect(html).toContain('<textarea id="offer"');
    expect(html.match(/<button type="submit"/g)).toHaveLength(1);
    expect(html).toMatch(/<button type="submit" class="btn btn-primary btn-block btn-lg"/);
    // The reference's upload / screenshot box is not copied: no file input, no image.
    expect(html).not.toMatch(/<img|type="file"|Upload|screenshot/i);
    // The only video is the hero's decorative backdrop (owner decision 2026-11-10).
    expect(html.match(/<video/g)).toHaveLength(1);
  });

  // Owner decision 2026-11-10: a brighter loop than the old 0.12-capped one, rendered locally by
  // scripts/make-hero-loop.py (the export's video was rejected: its frames carry model names,
  // invented figures and law articles). The hero text sits on .hero-glass panels instead.
  describe("hero backdrop video", () => {
    const html = renderToStaticMarkup(createElement(check.default));
    const hero = html.slice(html.indexOf('<section class="card hero hero-video"'), html.indexOf("</section>") + 10);
    const backdrop = hero.slice(hero.indexOf('<div class="hero-backdrop"'), hero.indexOf("</video>") + 8);
    const css = read("src/app/globals.css");

    it("is decorative, silent, looping, not focusable, with a poster and no autoplay attribute", () => {
      expect(backdrop).toMatch(/^<div class="hero-backdrop" aria-hidden="true"><video /);
      for (const attr of ["muted", "loop", "playsInline", 'preload="metadata"', 'poster="/hero/poster.jpg"', 'tabindex="-1"']) {
        expect(backdrop.toLowerCase()).toContain(attr.toLowerCase());
      }
      expect(backdrop).not.toMatch(/autoplay|controls/i);
      // Started from script only when motion is allowed.
      const source = read("src/components/HeroBackdrop.tsx");
      expect(source).toContain('window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;');
    });

    // S5-1 closed (WCAG 2.2.2, Pause, Stop, Hide): the hero has a Pause radar control that stops the
    // video and holds every hero animation. It replaces the owner's earlier "no pause button".
    it("has a Pause radar control that pauses the video and every hero animation", () => {
      const buttons = [...hero.matchAll(/<button type="button" class="btn btn-secondary">([\s\S]*?)<\/button>/g)].map((m) =>
        m[1].replace(/<[^>]+>/g, ""),
      );
      expect(buttons).toEqual(["Pause radar", "Glow: Max"]);
      const stage = read("src/components/HeroStage.tsx");
      expect(stage).toContain('{paused ? "Resume radar" : "Pause radar"}');
      expect(stage).toContain("if (next) video.pause();");
      expect(stage).toContain('data-paused={paused ? "true" : undefined}');
      expect(css).toMatch(
        /\.hero-video\[data-paused="true"\],\s*\.hero-video\[data-paused="true"\] \*,\s*\.hero-video\[data-paused="true"\] \*::before,\s*\.hero-video\[data-paused="true"\] \*::after \{\s*animation-play-state: paused;/,
      );
      // Resume plays the video again only when motion is allowed.
      expect(stage.indexOf("prefers-reduced-motion: reduce")).toBeLessThan(stage.indexOf("video.play()"));
    });

    it("labels the radar card as demo data and keeps the radar decorative", () => {
      const radar = hero.slice(hero.indexOf('<div class="radar"'), hero.indexOf('<div class="hud'));
      expect(radar).toMatch(/^<div class="radar" aria-hidden="true">/);
      const hud = hero.slice(hero.indexOf('<div class="hud hero-glass">'), hero.indexOf('<div class="hero-controls">'));
      expect(hud).toContain("Example findings");
      expect(hud).toContain(`${SAMPLE_OFFERS.length} EXAMPLES`);
      expect(hud).toContain("Demo data, not your text");
      expect(hero).toContain("Demo animation");
      expect(hero).not.toMatch(/live|threat acquisition|60FPS|online/i);
      expect(css).toMatch(/\.radar \{[^}]*pointer-events: none;/);
    });

    it("ships WebM, MP4 and a poster, each under 2 MB, with no audio track", () => {
      for (const file of ["loop.webm", "loop.mp4", "poster.jpg"]) {
        if (file !== "poster.jpg") expect(backdrop).toContain(`src="/hero/${file}"`);
        const bytes = readFileSync(join(process.cwd(), "public/hero", file));
        expect(bytes.length, file).toBeGreaterThan(10_000);
        expect(bytes.length, file).toBeLessThan(2_000_000);
      }
      expect(readFileSync(join(process.cwd(), "public/hero/loop.mp4")).includes("soun")).toBe(false);
      // WebM: no Opus or Vorbis audio codec id.
      expect(readFileSync(join(process.cwd(), "public/hero/loop.webm")).includes("A_OPUS")).toBe(false);
      expect(readFileSync(join(process.cwd(), "public/hero/loop.webm")).includes("A_VORBIS")).toBe(false);
    });

    it("holds every hero text block on a glass panel, never on the video", () => {
      const glass = hero.match(/class="[^"]*hero-glass[^"]*"/g) ?? [];
      expect(glass).toHaveLength(2);
      // After the backdrop: the text panel (glass), then the radar side: the decorative radar, the
      // Example findings card (glass) and the controls (buttons and a chip on their own surfaces).
      const afterBackdrop = hero.slice(hero.indexOf("</div>", hero.indexOf("</video>")) + 6, -"</section>".length);
      expect(afterBackdrop).toMatch(
        /^<div class="stack-sm hero-glass hero-main">[\s\S]*<\/div><div class="hero-radar-col"><div class="radar" aria-hidden="true">[\s\S]*<\/svg>(?:<span class="radar-[\w -]+"><\/span>){4}<\/div><div class="hud hero-glass">[\s\S]*<\/div><div class="hero-controls">[\s\S]*<\/div><\/div>$/,
      );
    });
  });

  it("has the four channel tabs and the Auto-Redact toggle, on by default", () => {
    const html = renderToStaticMarkup(createElement(check.default));
    const tabs = [...html.matchAll(/<button type="button" class="tab" aria-pressed="(true|false)">.*?<\/svg>([^<]+)<\/button>/g)].map((m) => [m[2], m[1]]);
    expect(tabs).toEqual([
      ["Email", "true"],
      ["WhatsApp", "false"],
      ["LinkedIn", "false"],
      ["Offer Letter PDF", "false"],
    ]);
    expect(html).toMatch(/aria-describedby="mask-note" aria-pressed="true">.*Auto-Redact on<\/button>/);
  });
});

// The footer: every line in it is true in the code today.
describe("footer", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  it("says risk indicators, not a verdict, and that it was tested on synthetic offers only", () => {
    expect(html).toContain("Risk indicators, not a verdict.");
    expect(html).toContain("tested on synthetic offers only, not validated on real scam data");
  });

  it("is the one footer landmark, hidden when printing, with the brand and the prototype notice", () => {
    expect(html).toMatch(/^<footer class="site-footer no-print">/);
    expect(html.match(/<footer[\s>]/g)).toHaveLength(1);
    expect(html).toContain("A free, rule-based check for warning signs in UAE job offers.");
    expect(html).toContain(PROTOTYPE_NOTICE.replace("'", "&#x27;"));
  });

  it("links the official portals from the contacts file, in a new tab, and the limitations", () => {
    const links = [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/g)].map((m) => [text(m[2]), m[1].match(/href="([^"]*)"/)?.[1]]);
    expect(links).toEqual([
      ["MoHRE Portal", contact("mohre").url],
      ["ICP Smart Services", contact("icp").url],
      ["GDRFA Dubai (Amer)", contact("amer").url],
      [`Dubai Police eCrime (${contact("ecrime").hotlineLabel})`, contact("ecrime").url],
      [LIMITS_SECTION, "/check#limits"],
    ]);
    expect(html.match(/target="_blank" rel="noopener noreferrer"/g)).toHaveLength(4);
    expect(html).not.toMatch(/<address|mailto:/i);
  });

  it("its two claims hold in the code: same English text, same score; a person approves any reply draft", () => {
    expect(html).toContain("Rule-based score: the same English text gives the same score.");
    const scores = [1, 2, 3].map(() => runManager(SCAM_OFFER).risk);
    expect(scores[1]).toEqual(scores[0]);
    expect(scores[2]).toEqual(scores[0]);
    const prepared = gateReducer(INITIAL_GATE_FLOW, { type: "prepare", at: "t0" });
    expect(prepared.gate?.status).toBe("pending");
    expect(prepared.events.map((event) => event.event)).toEqual(["gate_pending"]);
  });

  it("the limits link opens the details element, on a click, on arrival and on back or forward", () => {
    expect(LIMITS_ID).toBe("limits");
    const panel = renderToStaticMarkup(createElement(LimitationsPanel));
    expect(panel).toContain('<details id="limits" class="card accordion limits-details">');
    expect(read("src/components/LimitationsPanel.tsx")).toContain("<LimitsOpener />");
    const details = { open: false };
    expect(openLimits({ getElementById: (id: string) => (id === LIMITS_ID ? details : null) })).toBe(true);
    expect(details.open).toBe(true);
    expect(openLimits({ getElementById: () => null })).toBe(false);
    const arrival = { open: false };
    syncLimitsToHash({ getElementById: () => arrival }, "#offer");
    expect(arrival.open).toBe(false);
    syncLimitsToHash({ getElementById: () => arrival }, "#limits");
    expect(arrival.open).toBe(true);
    const clicked = { open: false };
    vi.stubGlobal("document", { getElementById: (id: string) => (id === LIMITS_ID ? clicked : null) });
    try {
      const link = LimitsLink({ children: "x" }) as ReactElement<{ href: string; onClick: () => void }>;
      expect(link.props.href).toBe("/check#limits");
      link.props.onClick();
    } finally {
      vi.unstubAllGlobals();
    }
    expect(clicked.open).toBe(true);
  });

  it("what the site says about itself is true in the code today", () => {
    // English rules, translation first (BATCHB-2).
    expect(PUBLIC_LIMITS_INTRO).toContain("checks English text");
    expect(PUBLIC_LIMITS_INTRO).toContain("machine translated first");
    expect(read("src/components/OfferChecker.tsx")).toContain("TRANSLATE_BUTTON");
    expect(languageNotice("وظيفة براتب عالي")).toBe("most");
    // No sign-in: no auth library, no middleware or proxy, and API routes that read no cookie or token.
    // The redesign added lucide-react (icons only).
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["lucide-react", "next", "react", "react-dom"]);
    for (const file of ["src/middleware.ts", "src/proxy.ts", "middleware.ts", "proxy.ts"]) expect(existsSync(join(process.cwd(), file)), file).toBe(false);
    expect(readdirSync(join(process.cwd(), "src/app/api"))).toEqual(["analyze", "translate"]);
    const route = read("src/app/api/analyze/route.ts");
    const translate = read("src/app/api/translate/route.ts");
    for (const source of [route, translate]) expect(source).not.toMatch(/cookies|authorization|session|token/i);
    // The server does not store offer text: the run and its audit trail go back in the response.
    expect(route).toContain("return NextResponse.json(await runWithAudit(text, translation));");
    expect(translate).toContain("{ translatedText: result.translatedText, detectedSourceLanguage: result.detectedSourceLanguage }");
    for (const file of ["src/lib/auditRun.ts", "src/lib/audit.ts", "src/app/api/analyze/route.ts", "src/app/api/translate/route.ts"]) {
      expect(read(file), file).not.toMatch(/^(?:let|var) |new (?:Map|Set)\(|globalThis\.(?!crypto)/m);
    }
    // The browser's only requests are the analysis and, after consent, the translation. The new
    // Threat Radar, Report modal, Gov Portals Hub and Encrypted Vault make none; a draft is only copied.
    const browser = [
      "src/components/OfferChecker.tsx",
      "src/components/ResultCard.tsx",
      "src/components/ApprovalPanel.tsx",
      "src/lib/approvalGate.ts",
      "src/components/translateRequest.ts",
      "src/components/radar/ThreatRadar.tsx",
      "src/components/radar/ReportModal.tsx",
      "src/components/radar/localReports.ts",
      "src/components/ReferenceHelper.tsx",
      "src/components/EncryptedVault.tsx",
      "src/components/SaveVaultModal.tsx",
      "src/lib/vault.ts",
      "src/lib/vaultCrypto.ts",
      "src/components/shell/Navbar.tsx",
    ]
      .map(read)
      .join("\n");
    expect(browser.match(/fetch(?:Impl)?\(/g)).toHaveLength(2);
    expect(browser).toContain('fetch("/api/analyze"');
    expect(browser).toContain('fetchImpl("/api/translate"');
    expect(browser).not.toMatch(/mailto:|sendMessage|navigator\.share|XMLHttpRequest|sendBeacon|WebSocket/);
  });

  it("shows the Arabic note only while Arabic is on", () => {
    expect(html).not.toContain(ARABIC_NOTE);
    nav.lang = "ar";
    try {
      expect(renderToStaticMarkup(createElement(SiteFooter))).toContain(ARABIC_NOTE);
    } finally {
      nav.lang = "en";
    }
  });
});

describe("UAE contacts: one file, one value each", () => {
  it("holds the confirmed hotlines and links, with the owner's confirmation note", () => {
    const source = read("src/data/uaeContacts.ts");
    expect(source).toContain("confirmed by owner 2026-11-09");
    expect(UAE_CONTACTS.map((entry) => [entry.id, entry.hotline, entry.url])).toEqual([
      ["mohre", "600590000", "https://www.mohre.gov.ae"],
      ["icp", "600522222", "https://smartservices.icp.gov.ae"],
      ["amer", "8005111", "https://www.gdrfad.gov.ae"],
      ["ecrime", "901", "https://www.dubaipolice.gov.ae/app/services/ecrime"],
    ]);
  });

  it("no other source file writes a hotline number or one of these links", () => {
    const walk = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
      );
    for (const file of walk("src").filter((f) => f !== "src/data/uaeContacts.ts")) {
      const source = read(file);
      for (const entry of UAE_CONTACTS) {
        expect(source, `${file}: ${entry.id} hotline`).not.toContain(entry.hotlineLabel.length > 3 ? entry.hotlineLabel : `"${entry.hotline}"`);
        expect(source, `${file}: ${entry.id} hotline`).not.toContain(entry.hotline.length > 3 ? entry.hotline : "tel:901");
        expect(source, `${file}: ${entry.id} url`).not.toContain(`"${entry.url}"`);
      }
    }
  });
});

describe("error, not-found and loading states", () => {
  it("the error boundary never shows the error's message", () => {
    const error = Object.assign(new Error(CANARY), { digest: "digest-123" });
    const html = renderToStaticMarkup(createElement(ErrorPage, { error, retry: () => {} }));
    expect(html).toContain("Something went wrong");
    expect(html).toContain("Try again");
    // BATCHB-2: a claim for Offer Check only; a translation, if chosen, went to Google.
    expect(html).toContain("Offer Check did not save your text.");
    expect(html).not.toContain("not saved anywhere");
    expect(html).not.toContain("CANARY");
    expect(html).not.toContain("digest-123");
  });

  it("the global error page brings its own document and never shows the message", () => {
    const html = renderToStaticMarkup(createElement(GlobalError, { error: new Error(CANARY), retry: () => {} }));
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toContain("<title>Something went wrong · Offer Check UAE</title>");
    expect(html).toContain("Offer Check did not save your text.");
    expect(html).not.toContain("not saved anywhere");
    expect(html).not.toContain("CANARY");
  });

  it("the not-found page has a title and a way back, and repeats nothing from the URL", () => {
    expect(notFoundMetadata.title).toBe("Page not found");
    const html = renderToStaticMarkup(createElement(NotFound));
    expect(html).toContain('href="/check"');
    expect(html.match(/<h1[\s>]/g)).toHaveLength(1);
  });

  it("loading is a status line with no invented progress", () => {
    const html = renderToStaticMarkup(createElement(Loading));
    expect(html).toContain('role="status"');
    expect(html.replace(/<[^>]+>/g, "")).not.toMatch(/\d/);
  });
});

describe("check request failures", () => {
  it("says offline when the browser is offline, and that the text is kept", () => {
    const failure = networkFailure(false);
    expect(failure.kind).toBe("offline");
    expect(failure.message).toContain("Your text is still in the box.");
    expect(failure.retry).toBe(true);
    expect(networkFailure(true).kind).toBe("network");
  });

  it("never shows a server string it did not write, so offer text cannot be echoed", () => {
    for (const status of [400, 404, 422, 429, 500, 502, 200]) {
      const failure = responseFailure(status, { error: CANARY });
      expect(`${failure.title} ${failure.message}`).not.toContain("CANARY");
    }
  });

  it("shows the server's own fixed messages, and the length limit for 413", () => {
    expect(responseFailure(400, { error: "Paste an offer to check." }).message).toBe("Paste an offer to check.");
    expect(responseFailure(413, null).message).toBe("Offer text must be 20,000 characters or fewer.");
    expect(responseFailure(413, null).retry).toBe(false);
    expect(responseFailure(503, "<html>").kind).toBe("server");
    expect(responseFailure(200, { nonsense: true }).kind).toBe("unreadable");
  });
});

describe("colour contrast (WCAG AA, from the tokens in globals.css)", () => {
  const css = read("src/app/globals.css");
  const root = css.slice(css.indexOf(":root"), css.indexOf("}", css.indexOf(":root")));
  const token = (name: string) => {
    const value = root.match(new RegExp(`--${name}:\\s*(#[0-9a-fA-F]{6})`))?.[1];
    if (!value) throw new Error(`token --${name} not found`);
    return value;
  };
  const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => {
      const v = parseInt(hex.slice(i, i + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a: string, b: string) => {
    const [x, y] = [luminance(token(a)), luminance(token(b))].sort((p, q) => q - p);
    return (x + 0.05) / (y + 0.05);
  };
  const rule = (selector: string) => {
    const at = css.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    return css.slice(at, css.indexOf("}", at));
  };

  // Every text colour on every surface it is used on.
  const TEXT_PAIRS = [
    ...["heading", "ink", "ink-soft", "muted"].flatMap((fg) => ["bg", "surface", "surface-sunken", "surface-raised"].map((bg) => [fg, bg])),
    ["green", "surface"],
    ["green", "surface-sunken"],
    ["green-soft", "green-bg"],
    ["red", "surface"],
    ["red-soft", "red-bg"],
    ["amber", "surface"],
    ["amber-soft", "amber-bg"],
    ["sky", "surface"],
    // Button text: white on the primary green and the danger red, both at rest and on hover.
    ["heading", "green-action"],
    ["heading", "green-action-hover"],
    // The primary button's gradient ends in cyan (AI Studio port).
    ["heading", "cyan-action"],
    ["heading", "cyan-action-hover"],
    ["heading", "red-action"],
    ["heading", "red-action-hover"],
    // Print.
    ["print-ink", "print-paper"],
  ];

  it.each(TEXT_PAIRS)("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  it("the chips use the pairs checked above", () => {
    expect(rule(".chip-high")).toMatch(/background: var\(--red-bg\);\s*color: var\(--red-soft\);/);
    expect(css).toMatch(/\.chip-caution \{[^}]*background: var\(--amber-bg\);\s*color: var\(--amber-soft\);/);
    expect(css).toMatch(/\.chip-green \{[^}]*background: var\(--green-bg\);\s*color: var\(--green-soft\);/);
    expect(rule(".chip-neutral")).toMatch(/background: var\(--surface-raised\);\s*color: var\(--ink\);/);
    expect(rule(".btn-primary")).toMatch(/background: var\(--green-action\);\s*color: var\(--heading\);/);
    expect(rule(".btn-danger")).toMatch(/background: var\(--red-action\);\s*color: var\(--heading\);/);
  });

  // Graphics (icons, the focus ring, control borders) need 3:1.
  it("the info icon, the focus ring and control borders are at least 3:1", () => {
    expect(ratio("muted", "surface")).toBeGreaterThanOrEqual(3);
    expect(ratio("focus", "bg")).toBeGreaterThanOrEqual(3);
    expect(ratio("focus", "surface")).toBeGreaterThanOrEqual(3);
    expect(ratio("control-border", "surface")).toBeGreaterThanOrEqual(3);
  });

  // The hero video can be bright, so the hero text sits on glass: --surface-sunken at 85%. Worst
  // case: a pure white video pixel under the glass (blur only averages it down). Alpha blending is
  // done in sRGB values, as browsers do.
  it.each(["heading", "ink", "ink-soft", "muted", "green"])("hero text %s on the glass keeps 4.5:1 over a white video pixel", (fg) => {
    const glass = root.match(/--hero-glass:\s*rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)/);
    expect(glass, "--hero-glass").not.toBeNull();
    const [r, g, b, a] = glass!.slice(1).map(Number);
    expect(`#${[r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("")}`).toBe(token("surface-sunken").toLowerCase());
    expect(a).toBeGreaterThanOrEqual(0.85);
    const over = `#${[r, g, b].map((v) => Math.round(a * v + (1 - a) * 255).toString(16).padStart(2, "0")).join("")}`;
    const [x, y] = [luminance(token(fg)), luminance(over)].sort((p, q) => q - p);
    expect((x + 0.05) / (y + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.hero-glass \{[^}]*background: var\(--hero-glass\);/);
  });

  it("is one dark theme, with no light variant to fall out of date", () => {
    expect(root).toContain("color-scheme: dark;");
    expect(css).not.toContain("prefers-color-scheme");
  });

  // Transitions and animations run only when no reduced-motion preference is set.
  it("keeps motion behind prefers-reduced-motion: no-preference", () => {
    const motion = css.indexOf("@media (prefers-reduced-motion: no-preference)");
    expect(motion).toBeGreaterThan(-1);
    const before = css.slice(0, motion);
    expect(before).not.toMatch(/\btransition:|\banimation:/);
  });

  it("text for a step that did not run uses the muted colour, never green", () => {
    const html = renderToStaticMarkup(
      Chip({ tone: "neutral", children: "Not run" }),
    );
    expect(html).toBe('<span class="chip chip-neutral">Not run</span>');
  });
});

describe("shared UI components", () => {
  it("Button: a blocked button stays focusable, names its reason and ignores clicks", () => {
    const onClick = vi.fn();
    const element = Button({ blocked: true, reasonId: "why", onClick, children: "Go" }) as ReactElement<{
      onClick: (event: { preventDefault: () => void }) => void;
    }>;
    const html = renderToStaticMarkup(element);
    expect(html).toBe('<button type="button" class="btn btn-primary" aria-disabled="true" aria-describedby="why">Go</button>');
    const preventDefault = vi.fn();
    element.props.onClick({ preventDefault });
    expect(onClick).not.toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
  });

  it("Button: an unblocked button calls its handler; a busy one shows a spinner and aria-busy", () => {
    const onClick = vi.fn();
    const element = Button({ variant: "secondary", onClick, children: "Go" }) as ReactElement<{
      onClick: (event: { preventDefault: () => void }) => void;
    }>;
    element.props.onClick({ preventDefault: () => {} });
    expect(onClick).toHaveBeenCalledTimes(1);
    const busy = renderToStaticMarkup(createElement(Button, { busy: true }, "Go"));
    expect(busy).toContain('aria-busy="true"');
    expect(busy).toContain('<span class="spinner" aria-hidden="true"></span>');
  });

  it("Button has exactly three variants, and ButtonLink uses the same classes", () => {
    for (const variant of ["primary", "secondary", "danger"] as const) {
      expect(renderToStaticMarkup(createElement(Button, { variant }, "x"))).toContain(`class="btn btn-${variant}"`);
    }
    expect(renderToStaticMarkup(createElement(ButtonLink, { href: "https://example.ae" }, "x"))).toBe(
      '<a href="https://example.ae" class="btn btn-secondary" target="_blank" rel="noopener noreferrer">x</a>',
    );
    expect(renderToStaticMarkup(createElement(ButtonLink, { href: "/legal" }, "x"))).toBe('<a href="/legal" class="btn btn-secondary">x</a>');
    const css = read("src/app/globals.css");
    expect([...css.matchAll(/^\.btn-(\w+) \{/gm)].map((m) => m[1]).sort()).toEqual(["block", "danger", "lg", "primary", "secondary"]);
  });

  it("HelperText stays in the DOM when empty", () => {
    expect(renderToStaticMarkup(createElement(HelperText, { id: "r" }))).toBe('<p id="r" class="helper"></p>');
  });

  it("Card, Chip and Callout carry their tone as a class and their meaning as text", () => {
    expect(renderToStaticMarkup(Card({ tone: "high", children: "x" }))).toBe('<div class="card tone-high">x</div>');
    expect(renderToStaticMarkup(Chip({ tone: "high", children: "High" }))).toBe('<span class="chip chip-high">High</span>');
    const callout = renderToStaticMarkup(createElement(Callout, { tone: "high", role: "alert", title: "Stopped" }, "Why"));
    expect(callout).toContain('class="callout callout-high" role="alert"');
    expect(callout).toContain('<p class="callout-title">Stopped</p>');
  });

  it("Disclosure is a native details element", () => {
    const html = renderToStaticMarkup(Disclosure({ summary: "More", children: "Body" }));
    expect(html).toBe('<details class="card accordion"><summary>More</summary><div class="disclosure-body">Body</div></details>');
  });
});
