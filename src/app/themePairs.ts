import { themeTokens, type ThemeName } from "./themeCss";

// Phase 4b: every colour pair whose contrast is checked, per theme. WCAG 2.x relative luminance.
// Text pairs need 4.5:1 (AA, body text and risk-band text); graphics (borders of inputs, focus rings,
// icons, the scrollbar thumb) need 3:1. The same list runs on the dark and the light tokens.

export type Pair = { kind: "text" | "graphic"; fg: string; bg: string; use: string };

const SURFACES = ["bg", "surface", "surface-sunken", "surface-raised"];
const pair = (kind: Pair["kind"], fg: string, bg: string, use: string): Pair => ({ kind, fg, bg, use });

export const PAIRS: Pair[] = [
  ...["heading", "ink", "ink-soft", "muted"].flatMap((fg) => SURFACES.map((bg) => pair("text", fg, bg, "body text"))),
  ...["green", "red", "amber", "sky"].flatMap((fg) => ["bg", "surface", "surface-sunken"].map((bg) => pair("text", fg, bg, "coloured text, links"))),
  pair("text", "green-soft", "green-bg", "Low band chip and callout"),
  pair("text", "red-soft", "red-bg", "High band chip and callout"),
  pair("text", "amber-soft", "amber-bg", "Medium and caution chip and callout"),
  pair("text", "green", "green-bg", "Low band text"),
  pair("text", "red", "red-bg", "High band text"),
  pair("text", "amber", "amber-bg", "Medium band text"),
  pair("text", "on-action", "action", "primary button"),
  pair("text", "on-action", "action-hover", "primary button, hover"),
  pair("text", "on-action", "action-end", "primary button gradient end"),
  pair("text", "on-action", "action-end-hover", "primary button gradient end, hover"),
  pair("text", "on-action", "red-action", "danger button"),
  pair("text", "on-action", "red-action-hover", "danger button, hover"),
  pair("text", "heading", "green-line", "selected text"),
  pair("text", "print-ink", "print-paper", "printed report"),
  pair("graphic", "control-border", "surface", "input and control borders"),
  pair("graphic", "control-border", "surface-sunken", "input and control borders"),
  pair("graphic", "control-border", "bg", "input and control borders"),
  ...SURFACES.map((bg) => pair("graphic", "focus", bg, "focus ring")),
  ...["muted", "green", "red", "amber", "sky"].map((fg) => pair("graphic", fg, "surface", "icons")),
  pair("graphic", "scroll-thumb", "scroll-track", "scrollbar thumb"),
];

// Hero text sits on glass over a video of unknown brightness. The worst pixel under the glass is
// white for the dark theme (dark glass) and black for the light theme (white glass).
export const HERO_TEXT = ["heading", "ink", "ink-soft", "muted", "green"];

function parse(value: string): [number, number, number, number] {
  const hex = value.match(/^#([0-9a-f]{6})$/i);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16)).concat(1) as [number, number, number, number];
  const rgba = value.match(/^rgba?\(\s*(\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\s*\)$/);
  if (!rgba) throw new Error(`not a colour: ${value}`);
  return [Number(rgba[1]), Number(rgba[2]), Number(rgba[3]), rgba[4] === undefined ? 1 : Number(rgba[4])];
}

const luminance = ([r, g, b]: number[]) => {
  const [x, y, z] = [r, g, b].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * x + 0.7152 * y + 0.0722 * z;
};

export function contrast(a: number[], b: number[]): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (hi + 0.05) / (lo + 0.05);
}

export function ratioOf(theme: ThemeName, fg: string, bg: string): number {
  const tokens = themeTokens(theme);
  const get = (name: string) => {
    const value = tokens[`--${name}`];
    if (!value) throw new Error(`--${name} missing in ${theme}`);
    return parse(value);
  };
  return contrast(get(fg), get(bg));
}

// Text over the glass over the worst video pixel (alpha blending in sRGB values, as browsers do).
export function heroRatio(theme: ThemeName, fg: string): number {
  const tokens = themeTokens(theme);
  const [r, g, b, a] = parse(tokens["--hero-glass"]);
  const worst = theme === "dark" ? 255 : 0;
  const under = [r, g, b].map((v) => Math.round(a * v + (1 - a) * worst));
  return contrast(parse(tokens[`--${fg}`]), under);
}
