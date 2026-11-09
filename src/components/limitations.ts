import { readFileSync } from "node:fs";
import { join } from "node:path";

import { LIMITS_SECTION } from "@/components/publicLimitations";

// The Check page shows the plain-language copy in publicLimitations.ts (COPY-1); the parity test
// uses readLimitations to count the bullets in the internal doc, so no limitation is dropped.
// Roadmap Phase 2: /about also shows every bullet of the internal doc as "Technical detail", read at
// build time with readAllLimitations and rendered from inlineParts (bold and code only).
export type InlinePart = { kind: "text" | "strong" | "code"; text: string };

export const LIMITS_FILE = join("docs", "known-limitations.md");

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

export type LimitationSection = { title: string | null; items: InlinePart[][] };

// Every bullet in the document, grouped by its "## " section (null: the list before the first
// section). Headings and paragraphs are not bullets and are left out.
export function readAllLimitations(markdown?: string): LimitationSection[] {
  const source = markdown ?? readFileSync(join(process.cwd(), LIMITS_FILE), "utf8");
  const sections: LimitationSection[] = [{ title: null, items: [] }];
  for (const line of source.replaceAll("\r\n", "\n").split("\n")) {
    if (line.startsWith("## ")) sections.push({ title: line.slice(3).trim(), items: [] });
    else if (line.startsWith("- ")) sections[sections.length - 1].items.push(inlineParts(line.slice(2)));
  }
  return sections.filter((section) => section.items.length > 0);
}
