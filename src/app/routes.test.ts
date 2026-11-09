import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { networkFailure, responseFailure } from "@/components/checkRequest";
import { HeroPreview } from "@/components/HeroPreview";
import { LimitationsPanel } from "@/components/LimitationsPanel";
import { LimitsLink } from "@/components/LimitsLink";
import { LIMITS_ID, openLimits, syncLimitsToHash } from "@/components/limitsAnchor";
import { LIMITS_SECTION, PUBLIC_LIMITS_INTRO } from "@/components/publicLimitations";
import { CHECK_LABELS } from "@/components/ResultsPanel";
import { runManager } from "@/lib/agents/manager";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { gateReducer, INITIAL_GATE_FLOW } from "@/lib/approvalGate";
import { languageNotice } from "@/lib/textScript";
import { isCurrent, SiteHeader } from "@/components/shell/SiteHeader";
import { BrandBadge, FOOTER_CHIPS, NAV_ITEMS, SiteFooter } from "@/components/shell/site";
import { Button, Callout, Chip, DataTable, Disclosure, HelperText, SectionHeader, Timeline } from "@/components/ui";
import * as about from "./about/page";
import * as check from "./check/page";
import ErrorPage from "./error";
import GlobalError from "./global-error";
import * as guide from "./guide/page";
import * as howItWorks from "./how-it-works/page";
import * as lab from "./lab/page";
import Loading from "./loading";
import NotFound, { metadata as notFoundMetadata } from "./not-found";
import * as root from "./page";

// The header reads the current path, and decides whether its script is running. Both are set here.
const nav = vi.hoisted(() => ({ pathname: "/lab", scripted: false }));
vi.mock("next/navigation", () => ({ usePathname: () => nav.pathname }));
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return { ...real, useSyncExternalStore: () => nav.scripted };
});

const CANARY = "CANARY-offer-text Desert Star hr@example.test";

const ROUTES = [
  { path: "/", module: root, title: "Check an offer" },
  { path: "/check", module: check, title: "Check an offer" },
  { path: "/how-it-works", module: howItWorks, title: "How it works" },
  { path: "/lab", module: lab, title: "Test Lab" },
  { path: "/guide", module: guide, title: "Guide" },
  { path: "/about", module: about, title: "About and limits" },
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

  it.each([howItWorks, lab, guide, about].map((module) => [module.metadata.title, module] as const))(
    "%s says plainly that it is not built yet, and shows no numbers",
    (_title, module) => {
      const html = renderToStaticMarkup(createElement(module.default));
      expect(html).toContain("Not built yet");
      expect(html).toContain("This page is not built yet.");
      expect(html.replace(/<[^>]+>/g, "")).not.toMatch(/\d/);
    },
  );

  it("every navigation item has a page", () => {
    expect(NAV_ITEMS.map((item) => item.href).sort()).toEqual(ROUTES.slice(1).map((route) => route.path).sort());
  });

  it("the layout has a skip link, the shell, one main landmark and a title template", () => {
    const source = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");
    expect(source).toContain('<a className="skip-link" href="#main">');
    expect(source).toContain('<main id="main"');
    expect(source).toMatch(/<SiteHeader \/>[\s\S]*<NoticeStrip \/>[\s\S]*<main[\s\S]*<SiteFooter \/>/);
    expect(source).toContain('template: "%s · Offer Check UAE"');
  });
});

describe("site header", () => {
  it("marks the current page and lists the five sections in a named nav", () => {
    nav.pathname = "/check";
    nav.scripted = false;
    const html = renderToStaticMarkup(createElement(SiteHeader));
    expect(html).toContain('<nav id="site-nav" aria-label="Main" class="site-nav">');
    for (const item of NAV_ITEMS) expect(html).toContain(item.soon ? `>${item.label}<span class="visually-hidden">` : `>${item.label}</a>`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a aria-current="page" [^>]*href="\/check"[^>]*>Check<\/a>/);
  });

  // 9a: a placeholder page has no link in the nav, so on its route no tab is marked current.
  it("on a placeholder route no tab is marked current", () => {
    nav.pathname = "/lab";
    nav.scripted = false;
    try {
      expect(renderToStaticMarkup(createElement(SiteHeader))).not.toContain("aria-current");
    } finally {
      nav.pathname = "/check";
    }
  });

  // Each nav item whose page is still a placeholder carries a "Soon" badge. Removing the `soon`
  // flag when its phase ships removes the badge; this test fails if the flag and the page disagree.
  // 9a: a placeholder page is plain text in the nav (header and mobile menu panel, one list): the
  // label, a visually hidden " (coming soon)" and the Soon badge. Not a link, no aria-disabled.
  it.each([false, true])("shows each placeholder page as plain text with a Soon badge and hidden ' (coming soon)' (scripted: %s)", (scripted) => {
    nav.pathname = "/check";
    nav.scripted = scripted;
    try {
      const header = renderToStaticMarkup(createElement(SiteHeader));
      const html = header.slice(header.indexOf("<nav"), header.indexOf("</nav>"));
      const soonHrefs = NAV_ITEMS.filter((item) => item.soon).map((item) => item.href);
      expect([...soonHrefs].sort()).toEqual(["/about", "/guide", "/how-it-works", "/lab"]);
      for (const item of NAV_ITEMS) {
        // The placeholder routes stay.
        const page = readFileSync(join(process.cwd(), "src/app", item.href, "page.tsx"), "utf8");
        expect(page.includes("<Placeholder")).toBe(Boolean(item.soon));
        if (item.soon) {
          expect(html).toContain(`<span class="nav-item" data-soon="true">${item.label}<span class="visually-hidden"> (coming soon)</span><span class="nav-soon" aria-hidden="true">Soon</span></span>`);
          expect(html).not.toContain(`href="${item.href}"`);
        } else {
          const link = html.match(new RegExp(`<a [^>]*href="${item.href}"[^>]*>.*?</a>`))?.[0] ?? "";
          expect(link).toContain(`>${item.label}</a>`);
          expect(link).not.toContain("aria-label");
          expect(link).not.toContain("nav-soon");
        }
      }
      expect(html).not.toContain("aria-disabled");
      expect(html).not.toContain("coming soon\"");
      expect(html.match(/<a\b/g)).toHaveLength(NAV_ITEMS.filter((item) => !item.soon).length);
    } finally {
      nav.scripted = false;
    }
  });

  it("without its script, shows every link and no menu button", () => {
    nav.scripted = false;
    const html = renderToStaticMarkup(createElement(SiteHeader));
    expect(html).not.toContain("nav-toggle");
    expect(html).not.toContain("data-collapsed");
  });

  it("with its script, folds the links behind a Menu button that names what it controls", () => {
    nav.scripted = true;
    try {
      const html = renderToStaticMarkup(createElement(SiteHeader));
      expect(html).toMatch(/<button type="button" class="secondary nav-toggle" aria-expanded="false" aria-controls="site-nav">/);
      expect(html).toContain("Menu</button>");
      expect(html).toContain('data-collapsed="true"');
    } finally {
      nav.scripted = false;
    }
  });

  it("has one action on the right, a real link to the text box, never marked as the current page", () => {
    nav.pathname = "/check";
    const html = renderToStaticMarkup(createElement(SiteHeader));
    expect(html).toContain('<a class="header-action" href="/check#offer">Check an offer</a>');
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  });

  // UX-2 (item 7): the brand block is a logo badge, the name, a "UAE" chip and a caption. The logo is
  // inline and hidden from assistive tech; the link's accessible name stays "Offer Check UAE".
  it("brand block: logo badge, name, chip and caption; name 'Offer Check UAE'; href unchanged", () => {
    nav.pathname = "/check";
    const html = renderToStaticMarkup(createElement(SiteHeader));
    const brand = html.match(/<a class="wordmark" href="\/check">(.*?)<\/a>/)?.[1] ?? "";
    expect(brand).not.toBe("");
    expect(brand).toMatch(/^<span class="brand-badge"><svg class="mark logo"[^>]*>/);
    const svg = brand.match(/<svg[^>]*>.*?<\/svg>/)?.[0] ?? "";
    expect(svg).toContain('aria-hidden="true"');
    expect(svg).toContain('focusable="false"');
    expect(svg).not.toContain("<text");
    expect(brand).toContain('<span class="brand-name">Offer Check</span>');
    expect(brand).toContain('<span class="brand-chip">UAE</span>');
    expect(brand).toContain('<span class="brand-caption" aria-hidden="true">UAE job offer scam check</span>');
    for (const banned of ["<img", "src=", "url(", "http", "href=", "<image", "<use", "24K", "luxury", "gold", "premium"]) {
      expect(brand.toLowerCase()).not.toContain(banned.toLowerCase());
    }
    // Accessible name: the text left after removing what is aria-hidden.
    const name = brand
      .replace(/<svg[^>]*aria-hidden="true"[^>]*>.*?<\/svg>/g, "")
      .replace(/<span[^>]*aria-hidden="true"[^>]*>[^<]*<\/span>/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
    expect(name).toBe("Offer Check UAE");
    expect(html).not.toMatch(/<a class="wordmark"[^>]*aria-label/);
  });

  it("Soon items carry data-soon and are not anchors; built tabs are anchors without it", () => {
    nav.pathname = "/check";
    nav.scripted = false;
    const header = renderToStaticMarkup(createElement(SiteHeader));
    for (const item of NAV_ITEMS) {
      const link = header.match(new RegExp(`<a [^>]*href="${item.href}"[^>]*>`))?.[0] ?? "";
      if (item.soon) expect(link).toBe("");
      else expect(link).not.toContain("data-soon");
    }
    expect(header.match(/<span class="nav-item" data-soon="true">/g)).toHaveLength(NAV_ITEMS.filter((item) => item.soon).length);
  });

  it("treats / as the Check page", () => {
    expect(isCurrent("/", "/check")).toBe(true);
    expect(isCurrent("/", "/lab")).toBe(false);
    expect(isCurrent("/about", "/about")).toBe(true);
  });
});

describe("hero", () => {
  it("the screen shows the real result of the synthetic fee-scam sample, and says so", () => {
    const result = runManager(SCAM_OFFER);
    const counted = result.findings.filter((finding) => finding.severity !== "info");
    const html = renderToStaticMarkup(createElement(HeroPreview, { sampleText: SCAM_OFFER }));
    expect(html).toContain(`<span class="score-value">${result.risk.score}</span>`);
    expect(html).toContain(result.risk.label);
    expect(html.match(/<li>/g)).toHaveLength(counted.length);
    for (const finding of counted) expect(html).toContain(`>${CHECK_LABELS[finding.check]}<`);
    expect(html).toContain("synthetic “Fee scam” sample");
    expect(html).toContain("not a verdict");
  });

  it("the Check page hero has its copy, a CTA to the text box, the example screen and a decorative backdrop", () => {
    const html = renderToStaticMarkup(createElement(check.default));
    const hero = html.slice(html.indexOf('<section class="hero"'), html.indexOf("</section>") + 10);
    expect(hero).toContain('<div class="hero-copy"><h1 id="page-title"');
    expect(hero).toContain('<a class="button-link button-light" href="#offer">Check an offer</a>');
    expect(hero).toContain('<figure class="hero-figure"');
    expect(html).toContain('<textarea id="offer"');
    // Only the hero has a video, and it is the silent decorative backdrop.
    expect(html.match(/<video/g)).toHaveLength(1);
    expect(hero.indexOf("hero-backdrop")).toBeGreaterThan(hero.indexOf("hero-figure"));
  });

  it("the backdrop video is hidden from assistive tech, muted, looping, never autoplays from markup, and has no audio track", () => {
    const html = renderToStaticMarkup(createElement(check.default));
    const backdrop = html.slice(html.indexOf('<div class="hero-backdrop"'), html.indexOf("</video>") + 8);
    expect(backdrop).toContain('aria-hidden="true"');
    // Decorative only: no controls of its own (the owner chose no pause button).
    expect(backdrop).not.toContain("<button");
    const video = backdrop.slice(backdrop.indexOf("<video"), backdrop.indexOf(">", backdrop.indexOf("<video")) + 1);
    for (const attr of ["muted", "loop", "playsInline", 'poster="/hero/poster.jpg"', 'tabindex="-1"']) {
      expect(video.toLowerCase()).toContain(attr.toLowerCase());
    }
    expect(video).not.toContain("autoplay");
    expect(video).not.toContain("controls");
    for (const file of ["loop.mp4", "loop.webm", "poster.jpg"]) {
      expect(backdrop + video).toContain(file === "poster.jpg" ? file : `/hero/${file}`);
      const bytes = readFileSync(join(process.cwd(), "public/hero", file));
      expect(bytes.length).toBeLessThan(1_000_000);
    }
    // An MP4 audio track would declare a "soun" handler.
    expect(readFileSync(join(process.cwd(), "public/hero/loop.mp4")).includes("soun")).toBe(false);
  });
});

// UX-3: the footer. The header's visual language; every line in it is true in the code today.
describe("footer", () => {
  const html = renderToStaticMarkup(createElement(SiteFooter));
  const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
  const text = (markup: string) => markup.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  it("says risk indicators, not a verdict, and that it was tested on synthetic offers only", () => {
    expect(html).toContain("Risk indicators, not a verdict.");
    expect(html).toContain("tested on synthetic offers only, not validated on real scam data");
  });

  it("is the one footer landmark, with four columns, each under a real heading", () => {
    expect(html).toMatch(/^<footer class="site-footer">/);
    expect(html.match(/<footer[\s>]/g)).toHaveLength(1);
    expect(html.match(/class="footer-col[ "]/g)).toHaveLength(4);
    const headings = [...html.matchAll(/<h2 class="footer-heading[^"]*">([\s\S]*?)<\/h2>/g)].map((m) => text(m[1]));
    expect(headings).toEqual(["Offer Check UAE", "Product", "Trust and limits", "At a glance"]);
  });

  it("the brand column reuses the header's logo badge (one copy of the SVG) and says what Offer Check is", () => {
    const badge = renderToStaticMarkup(createElement(BrandBadge));
    expect(badge).toMatch(/^<span class="brand-badge"><svg class="mark logo"[^>]*aria-hidden="true" focusable="false"/);
    expect(html).toContain(badge);
    expect(html).toContain("A free, rule-based check for warning signs in UAE job offers.");
    expect(read("src/components/shell/SiteHeader.tsx")).toContain("<BrandBadge />");
    expect(read("src/components/shell/SiteHeader.tsx")).not.toContain("<Mark />");
    expect(read("src/components/shell/site.tsx").match(/<svg className="mark logo"/g)).toHaveLength(1);
  });

  it("Product: Check an offer links to the check route; pages not built yet are plain text with Soon and hidden ' (coming soon)'", () => {
    expect(html).toMatch(/<a [^>]*href="\/check"[^>]*>Check an offer<\/a>/);
    const soon = NAV_ITEMS.filter((item) => item.soon);
    expect(soon.map((item) => item.label)).toEqual(["How it works", "Test Lab", "Guide", "About and limits"]);
    for (const item of soon) {
      expect(html).toContain(`<span class="footer-soon" data-soon="true">${item.label}<span class="visually-hidden"> (coming soon)</span><span class="nav-soon" aria-hidden="true">Soon</span></span>`);
      expect(html).not.toContain(`href="${item.href}"`);
    }
    expect(html).not.toContain("aria-disabled");
    // The only anchors in the footer.
    expect([...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/g)].map((m) => text(m[1]))).toEqual([
      "Check an offer",
      "What this check cannot do",
    ]);
  });

  it("Trust and limits: two lines that hold in the code, and a link to the limitations", () => {
    expect(html).toContain("Rule-based score: the same text gives the same score");
    expect(html).toContain("A person approves any reply draft");
    expect(html).toMatch(/<a [^>]*href="\/check#limits"[^>]*>What this check cannot do<\/a>/);
    expect(LIMITS_SECTION).toBe("What this check cannot do");
    // Same text, same score: fixed rules, no randomness.
    const scores = [1, 2, 3].map(() => runManager(SCAM_OFFER).risk);
    expect(scores[1]).toEqual(scores[0]);
    expect(scores[2]).toEqual(scores[0]);
    // A draft starts pending; only an approve action, from the user, approves it.
    const prepared = gateReducer(INITIAL_GATE_FLOW, { type: "prepare", at: "t0" });
    expect(prepared.gate?.status).toBe("pending");
    expect(prepared.events.map((event) => event.event)).toEqual(["gate_pending"]);
  });

  it("the limits link opens the details element, on a click, on arrival and on back or forward", () => {
    expect(LIMITS_ID).toBe("limits");
    const panel = renderToStaticMarkup(createElement(LimitationsPanel));
    expect(panel).toContain('<details id="limits" class="card disclosure limits-details">');
    expect(read("src/components/LimitationsPanel.tsx")).toContain("<LimitsOpener />");
    // openLimits sets open on the details with that id, and reports whether it found it.
    const details = { open: false };
    expect(openLimits({ getElementById: (id: string) => (id === LIMITS_ID ? details : null) })).toBe(true);
    expect(details.open).toBe(true);
    expect(openLimits({ getElementById: () => null })).toBe(false);
    // Arriving with #limits opens it; any other hash leaves it alone.
    const arrival = { open: false };
    syncLimitsToHash({ getElementById: () => arrival }, "#offer");
    expect(arrival.open).toBe(false);
    syncLimitsToHash({ getElementById: () => arrival }, "#limits");
    expect(arrival.open).toBe(true);
    // A click on the footer link opens it before the jump (a same-page jump fires no hashchange).
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

  it("chips: listed in a constant, each with a comment naming the file that proves it", () => {
    expect([...FOOTER_CHIPS]).toEqual(["English only", "No sign-in", "Offer text not stored", "Human approval"]);
    const lines = read("src/components/shell/site.tsx").split(/\r?\n/);
    for (const chip of FOOTER_CHIPS) {
      expect(html).toContain(`<li class="footer-chip">${chip}</li>`);
      const line = lines.find((l) => l.trim().startsWith(`"${chip}",`)) ?? "";
      const files = [...line.slice(line.indexOf("//")).matchAll(/\b(src\/[\w./-]+\.tsx?|package\.json)/g)].map((m) => m[1]);
      expect(line, chip).toContain("//");
      expect(files.length, chip).toBeGreaterThan(0);
      for (const file of files) expect(existsSync(join(process.cwd(), file)), `${chip}: ${file}`).toBe(true);
    }
    // 9b: the offer-text chip keeps its proof in the audit run.
    expect(lines.find((l) => l.trim().startsWith('"Offer text not stored",'))).toContain("src/lib/auditRun.ts");
  });

  it("the chips are true in the code today", () => {
    // English only: the rules read English; other scripts get a notice.
    expect(PUBLIC_LIMITS_INTRO).toContain("reads English text only");
    expect(languageNotice("\u0648\u0638\u064a\u0641\u0629 \u0628\u0631\u0627\u062a\u0628 \u0639\u0627\u0644\u064a")).toBe("most");
    // No sign-in: no auth library, no middleware or proxy, one API route that reads no cookie or token.
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["next", "react", "react-dom"]);
    for (const file of ["src/middleware.ts", "src/proxy.ts", "middleware.ts", "proxy.ts"]) expect(existsSync(join(process.cwd(), file)), file).toBe(false);
    expect(readdirSync(join(process.cwd(), "src/app/api"))).toEqual(["analyze"]);
    const route = read("src/app/api/analyze/route.ts");
    expect(route).not.toMatch(/cookies|authorization|session|token/i);
    // Offer text not stored: the run and its audit trail go back in the response; no module keeps them.
    expect(route).toContain("return NextResponse.json(await runWithAudit(text));");
    for (const file of ["src/lib/auditRun.ts", "src/lib/audit.ts", "src/app/api/analyze/route.ts"]) {
      expect(read(file), file).not.toMatch(/^(?:let|var) |new (?:Map|Set)\(|globalThis\.(?!crypto)/m);
    }
    // Human approval: the browser's only request is the analysis; a draft is only ever copied.
    const browser = ["src/components/OfferChecker.tsx", "src/components/ApprovalPanel.tsx", "src/lib/approvalGate.ts"].map(read).join("\n");
    expect(browser.match(/fetch\(/g)).toHaveLength(1);
    expect(browser).toContain('fetch("/api/analyze"');
    expect(browser).not.toMatch(/mailto:|sendMessage|navigator\.share/);
  });

  it("links stay inside the site; no address, phone, payment or warranty wording; ASCII-only copy", () => {
    const hrefs = [...html.matchAll(/href="([^"]*)"/g)].map((m) => m[1]);
    expect(hrefs).toEqual(["/check", "/check#limits"]);
    expect(html).not.toMatch(/<address|tel:|mailto:|https?:|www\./i);
    const copy = text(html);
    expect(copy).toMatch(/^[\x20-\x7e]*$/);
    expect(copy).not.toMatch(/\d{3}/);
    expect(copy).not.toMatch(/\b(?:pay|payment|price|refund|warrant|guarantee|hotline|police|report a scam|contact us|call us|email us)\w*/i);
  });

  it("shows the disclaimer under the columns", () => {
    const disclaimer = html.indexOf("A low score does not confirm an offer is genuine. Offer Check does not give legal advice.");
    expect(disclaimer).toBeGreaterThan(html.lastIndexOf('class="footer-col'));
  });
});

describe("error, not-found and loading states", () => {
  it("the error boundary never shows the error's message", () => {
    const error = Object.assign(new Error(CANARY), { digest: "digest-123" });
    const html = renderToStaticMarkup(createElement(ErrorPage, { error, retry: () => {} }));
    expect(html).toContain("Something went wrong");
    expect(html).toContain("Try again");
    expect(html).not.toContain("CANARY");
    expect(html).not.toContain("digest-123");
  });

  it("the global error page brings its own document and never shows the message", () => {
    const html = renderToStaticMarkup(createElement(GlobalError, { error: new Error(CANARY), retry: () => {} }));
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toContain("<title>Something went wrong · Offer Check UAE</title>");
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
  const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");
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

  const TEXT_PAIRS = [
    ["ink", "bg"],
    ["ink", "surface"],
    ["ink", "fill"],
    ["muted", "bg"],
    ["muted", "surface"],
    ["muted", "fill"],
    ["muted", "not-built-bg"],
    ["not-built", "surface"],
    ["primary", "bg"],
    ["primary", "surface"],
    ["primary", "fill"],
    ["primary", "primary-tint"],
    ["ink", "primary-tint"],
    ["on-primary", "action"],
    ["on-primary", "action-hover"],
    ["high", "high-bg"],
    ["high", "surface"],
    // The lightest point of a glass card: its top sheen.
    ["ink", "surface-top"],
    ["muted", "surface-top"],
    ["primary", "surface-top"],
    ["high", "surface-top"],
    ["medium", "medium-bg"],
    ["success", "success-bg"],
  ];

  it.each([...TEXT_PAIRS, ["heading", "bg"], ["heading", "surface"]])("text %s on %s is at least 4.5:1", (fg, bg) => {
    expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5);
  });

  // The hero video's brightest encoded pixel, measured by decoding it (see make-hero-loop.py).
  const VIDEO_MAX_LUMINANCE = 0.12;
  it.each(["ink", "heading"])("hero text %s keeps 4.5:1 over the brightest pixel of the background video", (fg) => {
    expect((luminance(token(fg)) + 0.05) / (VIDEO_MAX_LUMINANCE + 0.05)).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.hero \.intro \{[^}]*color: var\(--ink\);/);
    expect(css).toMatch(/\.hero-caption \{\s*color: var\(--ink\);/);
  });

  it("nav Soon badge text muted on fill is at least 4.5:1", () => {
    expect(ratio("muted", "fill")).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.nav-soon \{[^}]*background: var\(--fill\);[^}]*color: var\(--muted\);/);
  });

  // UX-1: a low score with a finding or a warning shows the caution chip in the amber pair.
  it("caution chip text medium on medium-bg is at least 4.5:1", () => {
    expect(ratio("medium", "medium-bg")).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.score-caution \.score-label \{\s*background: var\(--medium-bg\);\s*color: var\(--medium\);/);
  });

  // LANG-2: mostly non-English text with no finding shows a neutral chip, ink on fill.
  it("neutral chip text ink on fill is at least 4.5:1", () => {
    expect(ratio("ink", "fill")).toBeGreaterThanOrEqual(4.5);
    expect(css).toMatch(/\.score-neutral \.score-label \{\s*background: var\(--fill\);\s*color: var\(--ink\);/);
  });

  // LANG-3: the Findings card's info icon is muted on the card; a graphic needs at least 3:1.
  it("info icon muted on the card is at least 3:1", () => {
    expect(ratio("muted", "surface-top")).toBeGreaterThanOrEqual(3);
    expect(ratio("muted", "surface")).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.empty-state \.icon-info \{\s*color: var\(--muted\);/);
  });

  // UX-2: the header's colours. The aurora is two palette colours (--primary, --action) at a low
  // percentage over --bg; text is checked over the worst case, both glows stacked.
  it("header: tab text, tint, active pill, logo and aurora overlay all pass AA", () => {
    const pct = (name: string, colour: string) => {
      const match = root.match(new RegExp(`--${name}: color-mix\\(in srgb, var\\(--${colour}\\) (\\d+)%, transparent\\);`));
      if (!match) throw new Error(`token --${name} not found`);
      return Number(match[1]) / 100;
    };
    const mix = (under: string, over: string, alpha: number) =>
      "#" +
      [1, 3, 5]
        .map((i) => Math.round(parseInt(over.slice(i, i + 2), 16) * alpha + parseInt(under.slice(i, i + 2), 16) * (1 - alpha)))
        .map((v) => v.toString(16).padStart(2, "0"))
        .join("");
    const a = pct("aurora-a", "primary");
    const b = pct("aurora-b", "action");
    expect(a).toBeLessThanOrEqual(0.15);
    expect(b).toBeLessThanOrEqual(0.15);
    const glow = mix(mix(token("bg"), token("primary"), a), token("action"), b);
    const over = (fg: string, hex: string) => {
      const [x, y] = [luminance(token(fg)), luminance(hex)].sort((p, q) => q - p);
      return (x + 0.05) / (y + 0.05);
    };
    for (const fg of ["muted", "ink", "heading", "primary"]) expect(over(fg, glow), `${fg} over the aurora`).toBeGreaterThanOrEqual(4.5);
    // Tabs at rest: muted on the header and on the capsule (fill at most).
    expect(ratio("muted", "bg")).toBeGreaterThanOrEqual(4.5);
    expect(ratio("muted", "fill")).toBeGreaterThanOrEqual(4.5);
    // Hover and focus tint.
    expect(ratio("ink", "primary-tint")).toBeGreaterThanOrEqual(4.5);
    // The underline is a graphic: 3:1 on the tint.
    expect(ratio("primary", "primary-tint")).toBeGreaterThanOrEqual(3);
    // Active tab: a filled pill in the accent colour.
    expect(ratio("on-primary", "action")).toBeGreaterThanOrEqual(4.5);
    // The logo (primary) on the badge (fill), and the focus ring (primary) on the header.
    expect(ratio("primary", "fill")).toBeGreaterThanOrEqual(3);
    expect(ratio("primary", "bg")).toBeGreaterThanOrEqual(3);
    // The bindings these numbers are for.
    expect(css).toMatch(/\.site-nav a,\s*\.site-nav \[data-soon\] \{[^}]*color: var\(--muted\);/);
    expect(css).toMatch(/\.site-nav a\[aria-current="page"\] \{\s*background: var\(--action\);\s*color: var\(--on-primary\);/);
    expect(css).toMatch(/\.mark \{\s*color: var\(--primary\);/);
    expect(css).toMatch(/\.brand-badge \{[^}]*background: var\(--fill\);/);
  });

  // UX-3: the footer sits on --surface. Link and chip text, headings and the Soon badge pass AA.
  it("footer: text, links, headings, chips and the Soon badge pass AA", () => {
    for (const [fg, bg] of [
      ["muted", "surface"],
      ["ink", "surface"],
      ["primary", "surface"],
      ["heading", "surface"],
      ["ink", "fill"],
      ["muted", "fill"],
    ]) {
      expect(ratio(fg, bg), `${fg} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    }
    // The link underline and the focus ring are graphics: 3:1 on the footer.
    expect(ratio("primary", "surface")).toBeGreaterThanOrEqual(3);
    expect(css).toMatch(/\.site-footer \{[^}]*background: var\(--surface\);/);
    expect(css).toMatch(/\.footer-inner \{[^}]*color: var\(--muted\);/);
    expect(css).toMatch(/\.footer-heading \{[^}]*color: var\(--heading\);/);
    expect(css).toMatch(/\.footer-link \{[^}]*color: var\(--primary\);/);
    expect(css).toMatch(/\.footer-chip \{[^}]*background: var\(--fill\);[^}]*color: var\(--ink\);/);
    expect(css).toMatch(/\.footer-disclaimer \{[^}]*color: var\(--ink\);/);
  });

  it("control borders are at least 3:1 on the surface", () => {
    expect(ratio("control-border", "surface")).toBeGreaterThanOrEqual(3);
  });

  it("is one dark theme, with no light variant to fall out of date", () => {
    expect(root).toContain("color-scheme: dark;");
    expect(css).not.toContain("prefers-color-scheme");
  });

  // Hover lifts and entrances run only when no reduced-motion preference is set.
  it("keeps motion behind prefers-reduced-motion: no-preference", () => {
    const motion = css.slice(css.indexOf("@media (prefers-reduced-motion: no-preference)"));
    expect(motion).toContain("@keyframes fade-in-up");
    expect(css.indexOf("@keyframes fade-in-up")).toBe(css.indexOf("@media (prefers-reduced-motion: no-preference)") + motion.indexOf("@keyframes fade-in-up"));
    expect(css.slice(0, css.indexOf("@media (prefers-reduced-motion: no-preference)"))).not.toMatch(/scale\(1\.0[12]\)/);
  });

  it("text on the not-built background uses the muted colour", () => {
    expect(css).toMatch(/\.chip-not-built \{[^}]*color: var\(--muted\);/);
    expect(css).toMatch(/\.trace-not_implemented \.trace-summary \{[^}]*color: var\(--muted\);/);
  });
});

describe("shared UI components", () => {
  it("Button: a blocked button stays focusable, names its reason and ignores clicks", () => {
    const onClick = vi.fn();
    const element = Button({ blocked: true, reasonId: "why", onClick, children: "Go" }) as ReactElement<{
      onClick: (event: { preventDefault: () => void }) => void;
    }>;
    const html = renderToStaticMarkup(element);
    expect(html).toBe('<button type="button" class="primary" aria-disabled="true" aria-describedby="why">Go</button>');
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

  it("HelperText stays in the DOM when empty", () => {
    expect(renderToStaticMarkup(createElement(HelperText, { id: "r" }))).toBe('<p id="r" class="helper"></p>');
  });

  it("Chip and Callout carry their tone as a class and their meaning as text", () => {
    expect(renderToStaticMarkup(Chip({ tone: "high", children: "High" }))).toBe('<span class="chip chip-high">High</span>');
    const callout = renderToStaticMarkup(createElement(Callout, { tone: "high", role: "alert", title: "Stopped" }, "Why"));
    expect(callout).toContain('class="callout callout-high" role="alert"');
    expect(callout).toContain('<p class="callout-title">Stopped</p>');
  });

  it("SectionHeader renders the requested heading level", () => {
    expect(renderToStaticMarkup(createElement(SectionHeader, { id: "x", title: "T" }))).toContain('<h2 id="x" class="section-title">T</h2>');
    expect(renderToStaticMarkup(createElement(SectionHeader, { id: "x", title: "T", level: 1 }))).toContain("<h1 ");
  });

  it("DataTable has a caption and scoped column headers", () => {
    const html = renderToStaticMarkup(
      createElement(DataTable, {
        caption: "Cases",
        columns: [
          { key: "id", header: "Case" },
          { key: "score", header: "Score", numeric: true },
        ],
        rows: [{ id: "A1", score: 40 }],
        rowKey: (row: Record<string, ReactNode>) => String(row.id),
      }),
    );
    expect(html).toContain("<caption>Cases</caption>");
    expect(html).toContain('<th scope="col">Case</th><th scope="col" class="numeric">Score</th>');
    expect(html).toContain('<td class="numeric">40</td>');
  });

  it("Timeline shows a not-built step with its status in text and no check icon", () => {
    const html = renderToStaticMarkup(
      createElement(Timeline, {
        items: [
          { id: "a", title: "A", status: "completed", statusLabel: "Completed", detail: "d", meta: "1.00 ms" },
          { id: "b", title: "B", status: "not_implemented", statusLabel: "Not implemented yet", detail: "Not implemented yet", meta: "Not run" },
        ],
      }),
    );
    const stub = html.match(/<li class="trace-not_implemented">.*?<\/li>/)?.[0] ?? "";
    expect(stub).toContain('aria-label="Not implemented yet"');
    expect(stub).not.toContain("<svg");
  });

  it("Disclosure is a native details element", () => {
    const html = renderToStaticMarkup(Disclosure({ summary: "More", children: "Body" }));
    expect(html).toBe('<details class="card disclosure"><summary>More</summary><div class="disclosure-body">Body</div></details>');
  });
});
