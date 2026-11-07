import { readFileSync } from "node:fs";
import { join } from "node:path";

// Server only: read by the page at build time, so the panel always says what
// docs/known-limitations.md says and the browser never fetches the file.
export type InlinePart = { kind: "text" | "strong" | "code"; text: string };

export const LIMITS_FILE = join("docs", "known-limitations.md");
export const LIMITS_SECTION = "What this check cannot do";

// Splits **bold** and `code` out of one line of Markdown. Nothing else is interpreted.
export function inlineParts(line: string): InlinePart[] {
  return line
    .split(/(\*\*[^*]+\*\*|`[^`]+`)/)
    .filter((part) => part.length > 0)
    .map((part) =>
      part.startsWith("**")
        ? { kind: "strong", text: part.slice(2, -2) }
        : part.startsWith("`")
          ? { kind: "code", text: part.slice(1, -1) }
          : { kind: "text", text: part },
    );
}

// The bullets under "## What this check cannot do", and the document's opening sentence.
export function readLimitations(markdown?: string): { intro: string; items: InlinePart[][] } {
  const source = markdown ?? readFileSync(join(process.cwd(), LIMITS_FILE), "utf8");
  const lines = source.replaceAll("\r\n", "\n").split("\n");
  const intro = lines.find((line) => line.trim() && !line.startsWith("#")) ?? "";
  const start = lines.findIndex((line) => line.trim() === `## ${LIMITS_SECTION}`);
  if (start === -1) return { intro, items: [] };
  const items: InlinePart[][] = [];
  for (const line of lines.slice(start + 1)) {
    if (line.startsWith("## ")) break;
    if (line.startsWith("- ")) items.push(inlineParts(line.slice(2)));
  }
  return { intro, items };
}
