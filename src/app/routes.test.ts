import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement, type ReactElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { networkFailure, responseFailure } from "@/components/checkRequest";
import { HeroPreview } from "@/components/HeroPreview";
import { CHECK_LABELS } from "@/components/ResultsPanel";
import { runManager } from "@/lib/agents/manager";
import { SCAM_OFFER } from "@/lib/agents/fixtures";
import { isCurrent, SiteHeader } from "@/components/shell/SiteHeader";
import { NAV_ITEMS, SiteFooter } from "@/components/shell/site";
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
    nav.pathname = "/lab";
    nav.scripted = false;
    const html = renderToStaticMarkup(createElement(SiteHeader));
    expect(html).toContain('<nav id="site-nav" aria-label="Main" class="site-nav">');
    for (const item of NAV_ITEMS) expect(html).toContain(`>${item.label}</a>`);
    expect(html.match(/aria-current="page"/g)).toHaveLength(1);
    expect(html).toMatch(/<a aria-current="page" href="\/lab">Test Lab<\/a>/);
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

describe("footer", () => {
  it("says risk indicators, not a verdict, and that it was tested on synthetic offers only", () => {
    const html = renderToStaticMarkup(createElement(SiteFooter));
    expect(html).toContain("Risk indicators, not a verdict.");
    expect(html).toContain("tested on synthetic offers only, not validated on real scam data");
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
