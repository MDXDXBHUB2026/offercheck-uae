import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

// Phase 4b (light theme), step 1: the dark theme must not move. `darkTokens.snapshot.json` is the
// token block of src/app/globals.css as it was on main at 65c9e73, before the light theme. Every one of those
// tokens must still have exactly that value in the dark block (the first :root rule, the default
// when no data-theme is set). A token may be ADDED to the dark block only if it is listed in
// ADDED_DARK_TOKENS with the value that reproduces what the stylesheet used before, so that no dark
// pixel changes.

const css = readFileSync("src/app/globals.css", "utf8").replaceAll("\r\n", "\n");
const snapshot = JSON.parse(readFileSync("src/app/darkTokens.snapshot.json", "utf8")) as {
  colorScheme: string;
  tokens: Record<string, string>;
};

// New dark tokens (step 1 of Phase 4b): name -> value. Each replaces a value the rules used before
// as a literal or through another token, with the same dark result.
export const ADDED_DARK_TOKENS: Record<string, string> = {};

function blockAt(start: number): string {
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

describe("dark theme tokens (Phase 4b)", () => {
  const dark = blockAt(css.indexOf(":root {"));
  const tokens = tokensOf(dark);

  it("every token of the snapshot has its old value", () => {
    for (const [name, value] of Object.entries(snapshot.tokens)) expect(tokens[name], name).toBe(value);
  });

  it("only the listed tokens were added to the dark block", () => {
    const added = Object.keys(tokens).filter((name) => !(name in snapshot.tokens));
    expect(added.sort()).toEqual(Object.keys(ADDED_DARK_TOKENS).sort());
    for (const [name, value] of Object.entries(ADDED_DARK_TOKENS)) expect(tokens[name], name).toBe(value);
  });

  it("the dark block is dark: color-scheme dark", () => {
    expect(dark).toMatch(/color-scheme:\s*dark;/);
    expect(snapshot.colorScheme).toBe("dark");
  });
});

describe("no colour is written outside the token blocks", () => {
  // Strip the :root blocks (dark default, light, system), comments and the print block's token use.
  const stripped = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/:root[^{}]*\{[^{}]*\}/g, "")
    .replace(/@media \(prefers-color-scheme: light\) \{\s*:root[^{}]*\{[^{}]*\}\s*\}/g, "");

  it("has no hex, rgb(a), hsl(a) or named colour in any rule", () => {
    expect(stripped.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    expect(stripped.match(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/g) ?? []).toEqual([]);
    expect(stripped.match(/:\s*(?:white|black|red|green|blue|gray|grey|yellow|orange|navy)\b/gi) ?? []).toEqual([]);
  });
});
