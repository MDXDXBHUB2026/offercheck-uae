import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

// Phase 3b to 3e (2026-11-11): only the icon inside each header label animates; every keyframe lives
// in the no-preference block, so nothing moves with a reduced-motion preference, in print, or while
// "Pause animations" is on (closes S5-2). Measured in headless Chrome (docs/test-report.md): the
// header still fits at 1280, 1440, 1568 and 1920 px in English and Arabic with all five icons.

// Stores read their client snapshot here, so the toggle follows the motion store.
vi.mock("react", async (importOriginal) => {
  const real = await importOriginal<typeof import("react")>();
  return { ...real, useSyncExternalStore: (_s: unknown, get: () => unknown) => get() };
});
vi.mock("next/navigation", () => ({ usePathname: () => "/check" }));

import { MOTION_STORAGE_KEY, getMotion, restoreMotion, setMotion } from "@/components/shell/motion";
import { MotionToggle, PAUSE_ANIMATIONS, RESUME_ANIMATIONS } from "@/components/shell/MotionToggle";
import { Navbar } from "@/components/shell/Navbar";
import { SiteFooter } from "@/components/shell/site";

const css = readFileSync("src/app/globals.css", "utf8").replace(/\r\n/g, "\n");

// The text of a top-level block, from its opening line to its matching brace.
function block(head: string): { start: number; end: number; text: string } {
  const start = css.indexOf(`\n${head} {`);
  expect(start, head).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i++) {
    if (css[i] === "{") depth++;
    if (css[i] === "}" && --depth === 0) return { start, end: i, text: css.slice(start, i + 1) };
  }
  throw new Error(`unclosed ${head}`);
}

function stubBrowser() {
  const store = new Map<string, string>();
  const root = { dataset: {} as Record<string, string> };
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  });
  vi.stubGlobal("document", { documentElement: root });
  return { store, root };
}

afterEach(() => {
  setMotion("running");
  vi.unstubAllGlobals();
});

describe("3e: keyframes exist only where motion is allowed", () => {
  const motion = block("@media (prefers-reduced-motion: no-preference)");

  it("every @keyframes is inside the no-preference block", () => {
    const all = [...css.matchAll(/@keyframes [\w-]+/g)];
    expect(all.length).toBeGreaterThanOrEqual(19);
    for (const m of all) expect(m.index! > motion.start && m.index! < motion.end, m[0]).toBe(true);
  });

  it("the reduce block, the print block and the paused rule start no animation", () => {
    const reduce = block("@media (prefers-reduced-motion: reduce)").text;
    expect(reduce).not.toMatch(/@keyframes|animation-name|animation:\s*[a-z-]+ /);
    expect(reduce).toMatch(/animation-duration: 0s !important;/);
    expect(block("@media print").text).toMatch(/\*,\s*\*::before,\s*\*::after \{\s*animation: none !important;/);
    expect(css).toMatch(
      /:root\[data-motion="paused"\] \*,\n:root\[data-motion="paused"\] \*::before,\n:root\[data-motion="paused"\] \*::after \{\n {2}animation: none !important;/,
    );
  });
});

describe("3b/3c: only the header icons loop, slowly, with opacity or transform", () => {
  const motion = block("@media (prefers-reduced-motion: no-preference)").text;
  const LOOPS: [string, string][] = [
    ['.nav-icon[data-icon="analyzer"]::before', "icon-glow"],
    [".signal-arc", "signal-arc"],
    ['.nav-icon[data-icon="vault"] .icon', "icon-breathe"],
    [".hotline-icon::after", "halo-ring"],
    [".hotline-btn::before", "glow-rise"],
  ];

  it.each(LOOPS)("%s runs %s, at least 2s a cycle (no flashing)", (selector, name) => {
    const at = motion.indexOf(`${selector} {`);
    expect(at, selector).toBeGreaterThan(-1);
    const rule = motion.slice(at, motion.indexOf("}", at));
    const seconds = Number(rule.match(new RegExp(`animation: ${name} ([\\d.]+)s`))?.[1]);
    expect(seconds).toBeGreaterThanOrEqual(2);
  });

  it("the three calm icons breathe out of phase; the radar's outer arc follows the inner one", () => {
    expect(motion).toMatch(/\.nav-icon\[data-icon="portals"\] \.icon,\s*\.nav-icon\[data-icon="legal"\] \.icon,\s*\.nav-icon\[data-icon="vault"\] \.icon \{\s*animation: icon-breathe 6s/);
    expect(motion).toMatch(/\.nav-icon\[data-icon="legal"\] \.icon \{\s*animation-delay: -2s;/);
    expect(motion).toMatch(/\.nav-icon\[data-icon="vault"\] \.icon \{\s*animation-delay: -4s;/);
    expect(motion).toMatch(/\.signal-arc-outer \{\s*animation-delay: 0\.5s;/);
  });

  it("the header keyframes change only opacity and scale, and never dim below 0.55", () => {
    for (const name of ["icon-glow", "signal-arc", "icon-breathe", "halo-ring", "glow-rise"]) {
      const at = motion.indexOf(`@keyframes ${name} {`);
      expect(at, name).toBeGreaterThan(-1);
      const body = motion.slice(at, motion.indexOf("\n  }\n", at));
      for (const [, prop] of body.matchAll(/^\s+([a-z-]+):/gm)) expect(["opacity", "scale"], `${name}: ${prop}`).toContain(prop);
    }
    // Icons themselves (not the glow or ring pseudo-elements, which fade to nothing by design).
    for (const name of ["signal-arc", "icon-breathe"]) {
      const at = motion.indexOf(`@keyframes ${name} {`);
      const body = motion.slice(at, motion.indexOf("\n  }\n", at));
      for (const [, value] of body.matchAll(/opacity: ([\d.]+);/g)) expect(Number(value)).toBeGreaterThanOrEqual(0.55);
    }
  });

  it("labels never animate: no rule in the motion block targets a tab label", () => {
    expect(motion).not.toMatch(/\.tab > span[^{]*\{[^}]*animation/);
    expect(motion).not.toMatch(/\.nav-desktop \.tab \{[^}]*animation/);
    expect(motion).not.toMatch(/\.btn-label-wide[^{]*\{[^}]*animation/);
  });

  it("the hotline glow is outside the button and its sheen is off, so nothing clips it", () => {
    expect(motion).toMatch(/\.btn\.hotline-btn:not\(\[aria-disabled="true"\]\):not\(:disabled\) \{\s*overflow: visible;/);
    expect(motion).toMatch(/\.btn\.hotline-btn:not\(\[aria-disabled="true"\]\):not\(:disabled\)::after \{\s*content: none;/);
    expect(motion).toMatch(/\.hotline-btn::before \{[^}]*box-shadow: 0 0 10px 1px var\(--glow-red\);/);
  });
});

describe("3b: the header icons are present and decorative", () => {
  it("renders all five tab icons in aria-hidden wrappers, and the radar's signal icon arc by arc", () => {
    const html = renderToStaticMarkup(createElement(Navbar));
    for (const id of ["analyzer", "radar", "portals", "legal", "vault"]) {
      expect(html).toContain(`<span class="nav-icon" data-icon="${id}" aria-hidden="true"><svg`);
    }
    expect(html).toMatch(/<circle class="signal-dot"[^>]*>/);
    expect(html).toContain('class="signal-arc signal-arc-inner"');
    expect(html).toContain('class="signal-arc signal-arc-outer"');
    expect(html).toContain('<span class="hotline-icon" aria-hidden="true">');
  });
});

describe("3d: Pause animations", () => {
  it("is a real button in the footer with aria-pressed, and its label says what it does", () => {
    stubBrowser();
    const off = renderToStaticMarkup(createElement(MotionToggle));
    expect(off).toMatch(/^<button type="button" class="btn btn-secondary motion-toggle" aria-pressed="false">/);
    expect(off).toContain(PAUSE_ANIMATIONS);
    setMotion("paused");
    const on = renderToStaticMarkup(createElement(MotionToggle));
    expect(on).toContain('aria-pressed="true"');
    expect(on).toContain(RESUME_ANIMATIONS);
    expect(renderToStaticMarkup(createElement(SiteFooter))).toContain("motion-toggle");
  });

  it("sets one attribute on <html> and remembers the choice in this browser", () => {
    const { store, root } = stubBrowser();
    setMotion("paused");
    expect(root.dataset.motion).toBe("paused");
    expect(store.get(MOTION_STORAGE_KEY)).toBe("paused");
    setMotion("running");
    expect(root.dataset.motion).toBeUndefined();
    store.set(MOTION_STORAGE_KEY, "paused");
    restoreMotion();
    expect(getMotion()).toBe("paused");
    expect(root.dataset.motion).toBe("paused");
  });

  it("blocked storage never breaks the switch", () => {
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    vi.stubGlobal("document", { documentElement: { dataset: {} } });
    expect(() => setMotion("paused")).not.toThrow();
    expect(() => restoreMotion()).not.toThrow();
    expect(getMotion()).toBe("paused");
  });

  it("the hero's own Pause radar still holds the hero, and the footer switch also pauses the video", () => {
    const hero = readFileSync("src/components/HeroStage.tsx", "utf8");
    expect(hero).toContain('{paused ? t("Resume radar") : t("Pause radar")}');
    expect(hero).toContain('if (motion === "paused") video.pause();');
    expect(css).toMatch(/\.hero-video\[data-paused="true"\] \*::after \{\s*animation-play-state: paused;/);
  });
});
