import { readFileSync } from "node:fs";

// Test helpers for Phase 4b: read the colour tokens of each theme out of src/app/globals.css.

export const css = readFileSync("src/app/globals.css", "utf8").replaceAll("\r\n", "\n");

// The text between the braces of the rule that starts at `start`, nested braces included.
export function blockAt(start: number): string {
  const open = css.indexOf("{", start);
  let depth = 0;
  for (let i = open; i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}") {
      depth -= 1;
      if (depth === 0) return css.slice(open + 1, i);
    }
  }
  throw new Error("unclosed block");
}

export function tokensOf(block: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of block.matchAll(/^\s*(--[a-z0-9-]+):\s*([^;]+);/gm)) out[m[1]] = m[2].replace(/\s+/g, " ").trim();
  return out;
}

export type ThemeName = "dark" | "light" | "system" | "print";

function find(selector: string, from = 0): number {
  const at = css.indexOf(selector, from);
  if (at === -1) throw new Error(`${selector} not found`);
  return at;
}

// Dark is the first :root rule (the default). Light is :root[data-theme="light"]. System is the same
// tokens inside @media (prefers-color-scheme: light). Print is the :root rule inside @media print.
export function themeTokens(theme: ThemeName): Record<string, string> {
  if (theme === "dark") return tokensOf(blockAt(find(":root {")));
  if (theme === "light") return tokensOf(blockAt(find(':root[data-theme="light"] {')));
  if (theme === "system") {
    const media = find("@media (prefers-color-scheme: light)");
    return tokensOf(blockAt(find(':root[data-theme="system"] {', media)));
  }
  const print = find("@media print");
  return tokensOf(blockAt(find(":root,\n  :root[data-theme] {", print)));
}

// A colour value (hex or rgba), as opposed to a size, a font or a shadow.
export const isColour = (value: string) => /^#[0-9a-f]{3,8}$/i.test(value) || /^rgba?\(/.test(value);
