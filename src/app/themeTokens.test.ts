import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { css, themeTokens } from "./themeCss";

// Phase 4b (light theme): the dark theme must not move. `darkTokens.snapshot.json` is the token block
// of src/app/globals.css as it was on main at 65c9e73, before the light theme. Every one of those
// tokens must still have exactly that value in the dark block (the first :root rule, the default
// when no data-theme is set). A token may be ADDED to the dark block only if it is listed in
// ADDED_DARK_TOKENS with the value that reproduces what the stylesheet used before, so that no dark
// pixel changes.

const snapshot = JSON.parse(readFileSync("src/app/darkTokens.snapshot.json", "utf8")) as {
  colorScheme: string;
  tokens: Record<string, string>;
};

// New dark tokens: name -> value. Each replaces a value the rules used before, with the same dark result.
const ADDED_DARK_TOKENS: Record<string, string> = {
  "--action": "#047857", // was --green-action
  "--action-hover": "#065f46", // was --green-action-hover
  "--action-end": "#0e7490", // was --cyan-action
  "--action-end-hover": "#155e75", // was --cyan-action-hover
  "--on-action": "#ffffff", // was --heading: the text on the primary and danger buttons and the skip link
};

describe("dark theme tokens (Phase 4b)", () => {
  const tokens = themeTokens("dark");

  it("every token of the snapshot has its old value", () => {
    for (const [name, value] of Object.entries(snapshot.tokens)) expect(tokens[name], name).toBe(value);
  });

  it("only the listed tokens were added to the dark block", () => {
    const added = Object.keys(tokens).filter((name) => !(name in snapshot.tokens));
    expect(added.sort()).toEqual(Object.keys(ADDED_DARK_TOKENS).sort());
    for (const [name, value] of Object.entries(ADDED_DARK_TOKENS)) expect(tokens[name], name).toBe(value);
  });

  it("the dark block is dark: color-scheme dark", () => {
    expect(css).toMatch(/:root \{\s*color-scheme: dark;/);
    expect(snapshot.colorScheme).toBe("dark");
  });
});

describe("no colour is written outside the token blocks", () => {
  // Strip comments and the token rules (dark default, light, system, print).
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/:root[^{}]*\{[^{}]*\}/g, "");

  it("has no hex, rgb(a), hsl(a) or named colour in any rule", () => {
    expect(stripped.match(/#[0-9a-fA-F]{3,8}\b/g) ?? []).toEqual([]);
    expect(stripped.match(/\b(?:rgba?|hsla?|oklch|oklab|lab|lch|color-mix)\(/g) ?? []).toEqual([]);
    expect(stripped.match(/:\s*(?:white|black|red|green|blue|gray|grey|yellow|orange|navy)\b/gi) ?? []).toEqual([]);
  });
});
