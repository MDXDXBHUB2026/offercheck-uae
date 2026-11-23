import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV_GROUPS, NAV_ITEMS } from "@/components/shell/site";

// Production hardening Phase 3 (2026-11-15): the grouped desktop header, measured in a real Chrome
// by scripts/measure-header.mjs at 1280, 1440, 1568 and 1920 px, in English and Arabic, against a
// production build. This test reads the recorded numbers. Re-run the script after any change to the
// header, its labels or its CSS: the label check below fails when the recording is out of date.

type Rect = { left: number; right: number; width: number };
type Measurement = {
  lang: string;
  dir: string;
  viewport: number;
  row: Rect;
  brand: Rect;
  brandText: { cls: string; scroll: number; client: number }[];
  nav: Rect & { scrollWidth: number; clientWidth: number };
  actions: Rect;
  tabs: (Rect & { label: string })[];
  groups: Rect[];
  divider: Rect | null;
};

const file = JSON.parse(readFileSync(join(process.cwd(), "docs/header-measurements.json"), "utf8")) as {
  measuredAt: string;
  results: Measurement[];
};
const EPS = 0.5;
const WIDTHS = [1280, 1440, 1568, 1920];

describe("header measurements (docs/header-measurements.json)", () => {
  it("covers the four widths in both languages", () => {
    expect(file.results.map((m) => `${m.lang} ${m.viewport}`)).toEqual([
      ...WIDTHS.map((w) => `en ${w}`),
      ...WIDTHS.map((w) => `ar ${w}`),
    ]);
    for (const m of file.results) expect(m.dir).toBe(m.lang === "ar" ? "rtl" : "ltr");
    expect(file.measuredAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("was recorded with today's labels: five tabs, in order, the short English names or the Arabic ones", () => {
    for (const m of file.results) {
      expect(m.tabs.map((t) => t.label), `${m.lang} ${m.viewport}`).toEqual(NAV_ITEMS.map((item) => (m.lang === "ar" ? item.labelAr : item.short)));
    }
  });

  it.each(file.results.map((m) => [`${m.lang} ${m.viewport}px`, m] as const))("%s: no tab scrolled, clipped or overlapped; the brand fully visible", (_name, m) => {
    // Nothing to scroll: the tab row fits in the space it has.
    expect(m.nav.scrollWidth).toBe(m.nav.clientWidth);
    // Every tab inside the row, none over the next one.
    const tabs = [...m.tabs].sort((a, b) => a.left - b.left);
    for (const tab of tabs) {
      expect(tab.left, tab.label).toBeGreaterThanOrEqual(m.nav.left - EPS);
      expect(tab.right, tab.label).toBeLessThanOrEqual(m.nav.right + EPS);
      expect(tab.width, tab.label).toBeGreaterThan(30);
    }
    for (let i = 1; i < tabs.length; i += 1) expect(tabs[i].left, tabs[i].label).toBeGreaterThanOrEqual(tabs[i - 1].right - EPS);
    // The brand, the tabs and the actions side by side, in reading order.
    const [first, last] = m.lang === "ar" ? [m.actions, m.brand] : [m.brand, m.actions];
    expect(first.right).toBeLessThanOrEqual(m.nav.left + EPS);
    expect(m.nav.right).toBeLessThanOrEqual(last.left + EPS);
    expect(m.brand.left).toBeGreaterThanOrEqual(m.row.left - EPS);
    expect(m.actions.left).toBeGreaterThanOrEqual(m.row.left - EPS);
    expect(Math.max(m.brand.right, m.actions.right)).toBeLessThanOrEqual(m.row.right + EPS);
    // The brand's name and caption are not cut short.
    expect(m.brandText).toHaveLength(2);
    for (const line of m.brandText) expect(line.scroll, line.cls).toBeLessThanOrEqual(line.client);
  });

  it.each(file.results.map((m) => [`${m.lang} ${m.viewport}px`, m] as const))("%s: two groups, with the divider and a gap between them", (_name, m) => {
    expect(m.groups).toHaveLength(NAV_GROUPS.length);
    expect(m.divider).not.toBeNull();
    const divider = m.divider as Rect;
    const [before, after] = [...m.groups].sort((a, b) => a.left - b.left);
    // A gap on each side of the divider (its margin), and the divider itself visible.
    expect(divider.width).toBeGreaterThanOrEqual(1);
    expect(divider.left - before.right).toBeGreaterThanOrEqual(4);
    expect(after.left - divider.right).toBeGreaterThanOrEqual(4);
    // Tools first in reading order: on the left in English, on the right in Arabic.
    const tools = NAV_ITEMS.filter((item) => item.group === "tools").map((item) => (m.lang === "ar" ? item.labelAr : item.short));
    const toolTabs = m.tabs.filter((t) => tools.includes(t.label));
    const group = m.lang === "ar" ? after : before;
    for (const tab of toolTabs) {
      expect(tab.left, tab.label).toBeGreaterThanOrEqual(group.left - EPS);
      expect(tab.right, tab.label).toBeLessThanOrEqual(group.right + EPS);
    }
  });
});
