import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Cleanup 1 (2026-11-23): the header's tabs are separate pill buttons. These checks pin the rules
// that make them so; the numbers in a real browser are in docs/header-measurements.json
// (headerMeasurements.test.ts) and the contrast of their colours in docs/theme-contrast.md.
const css = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8").replaceAll("\r\n", "\n");
const navbar = readFileSync(join(process.cwd(), "src/components/shell/Navbar.tsx"), "utf8");

function rule(selector: string): string {
  const at = css.indexOf(`
${selector} {`);
  expect(at, selector).toBeGreaterThan(-1);
  return css.slice(at, css.indexOf("}", at));
}

describe("header tabs as pill buttons", () => {
  it("each header tab has its own border, a full radius and its own background", () => {
    const pill = rule(".site-header .tab");
    expect(pill).toMatch(/border-color: var\(--control-border\);/);
    expect(pill).toMatch(/border-radius: var\(--r-full\);/);
    expect(pill).toMatch(/background: var\(--surface\);/);
  });

  it("has a hover state, and keeps the global focus ring", () => {
    expect(rule(".site-header .tab:hover")).toMatch(/border-color: var\(--green\);[\s\S]*background: var\(--surface-raised\);/);
    expect(css).toMatch(/:focus-visible \{\s*outline: 3px solid var\(--focus\);/);
  });

  it("marks the current page by more than colour: bolder, a bar along the bottom, and aria-current", () => {
    const current = rule('.site-header .tab[aria-current="page"]');
    expect(current).toMatch(/font-weight: 700;/);
    expect(current).toMatch(/box-shadow: inset 0 -3px 0 var\(--green\)/);
    expect(navbar.match(/aria-current=\{isCurrent\(pathname, item\.href\) \? "page" : undefined\}/g)).toHaveLength(2);
  });

  it("leaves a gap between pills on both bars, and a divider between the two groups", () => {
    expect(css).toMatch(/\.nav-group \{[^}]*gap: var\(--sp-1\);/);
    expect(rule(".nav-mobile")).toMatch(/gap: var\(--sp-2\);[\s\S]*padding-block: var\(--sp-2\);/);
    expect(rule(".nav-mobile")).toMatch(/linear-gradient\(var\(--border-strong\), var\(--border-strong\)\) center/);
    expect(rule(".tab")).toMatch(/min-height: var\(--target\);/);
    expect(css).toContain("--target: 44px;");
  });

  it("the header keeps its icon animations on the icon only, never on the pill", () => {
    expect(rule(".site-header .tab")).not.toMatch(/animation|transition/);
    expect(rule('.site-header .tab[aria-current="page"]')).not.toMatch(/animation/);
  });

  it("on phones of 400px or less the brand name gets room beside the three buttons", () => {
    const at = css.indexOf("@media (max-width: 400px)");
    expect(at).toBeGreaterThan(-1);
    const block = css.slice(at, css.indexOf("/* Dropdown (hotlines) */", at));
    expect(block).toMatch(/\.brand-name \{\s*font-size: var\(--fs-sm\);/);
    expect(block).toMatch(/\.header-actions \.btn \{\s*padding-inline: var\(--sp-2\);/);
  });
});
