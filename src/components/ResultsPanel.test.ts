import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { runManager } from "@/lib/agents/manager";
import { RULES } from "@/lib/agents/redFlag";
import { AgentRun } from "./AgentRun";
import { ResultsPanel } from "./ResultsPanel";

function render(offerText: string, ruleCount = RULES.length): string {
  const result = runManager(offerText);
  return renderToStaticMarkup(createElement(ResultsPanel, { result, ruleCount }));
}

describe("ResultsPanel", () => {
  // Defect 7: the score-0 screen said no rules matched while showing a warning mention.
  it("does not say no rules matched when it shows a warning mention", () => {
    const text = "Beware of agents who charge a fee";
    const result = runManager(text);
    expect(result.risk.score).toBe(0);
    expect(result.findings.some((finding) => finding.severity === "info")).toBe(true);

    const html = render(text);
    const note = html.match(/<p class="no-match">(.*?)<\/p>/)?.[1] ?? "";
    expect(note).not.toContain("rules matched");
    expect(note).toContain("counted toward the score");
    expect(html).toContain("only in a warning");
    expect(html).toContain("Mentioned in a warning, not counted in the score");
    expect(html).toContain("This does not confirm that the offer is genuine.");
  });

  it("says no rules matched when nothing matched at all", () => {
    const html = render("Interview is on Monday at our Sharjah office.");
    expect(html).toContain(`None of the ${RULES.length} rules matched.`);
    expect(html).not.toContain("warning-mentions");
  });

  it("shows no score-0 note when a rule counted", () => {
    expect(render("Pay the visa fee of AED 500")).not.toContain("None of the");
  });

  // Defect 9: a medium chip under a low band read as a contradiction.
  it("shows each chip as rule points, with the band thresholds beside the score", () => {
    const text = "Send your passport copy";
    const result = runManager(text);
    expect(result.risk.band).toBe("low");
    expect(result.findings.map((finding) => finding.severity)).toEqual(["medium"]);

    const html = render(text);
    expect(html).toContain("medium rule, +20 points");
    expect(html).toContain("Bands: high 60 or more, medium 30 to 59, low below 30.");
  });

  // Defect 12: the rule count was a literal 5.
  it("takes the rule count from its prop", () => {
    expect(render("Hello", 7)).toContain("None of the 7 rules matched.");
  });
});

describe("AgentRun", () => {
  // Defect 8: the label implied that Intake extracts claims.
  it("labels Intake as text cleaning only", () => {
    const html = renderToStaticMarkup(createElement(AgentRun, { trace: runManager("Hello").trace }));
    expect(html).toContain("Intake (text cleaning only)");
  });

  it("labels each stub agent as not implemented yet, never as completed", () => {
    const html = renderToStaticMarkup(createElement(AgentRun, { trace: runManager("Hello").trace }));
    const rows = html.match(/<li[^>]*>.*?<\/li>/g) ?? [];
    const row = (label: string) => rows.find((li) => li.includes(`class="trace-agent">${label}<`)) ?? "";
    for (const label of ["Verification", "Official channel"]) {
      expect(row(label)).toContain('aria-label="Not implemented yet"');
      expect(row(label)).toContain("Not run");
      expect(row(label)).not.toMatch(/Completed|done/i);
    }
    for (const label of ["Intake (text cleaning only)", "Red-flag", "Risk aggregator"]) {
      expect(row(label)).toContain('aria-label="Completed"');
    }
  });
});

describe("UI text", () => {
  // Defect 12: no UI file may hard-code the number of rules.
  it.each([
    "src/app/page.tsx",
    "src/app/check/page.tsx",
    "src/components/OfferChecker.tsx",
    "src/components/ResultsPanel.tsx",
    "src/app/about/page.tsx",
    "src/app/guide/page.tsx",
  ])(
    "%s has no literal rule count",
    (file) => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toMatch(/\b\d+\s+(fixed\s+)?rules\b/);
    },
  );

  it.each(["src/app/page.tsx", "src/app/check/page.tsx", "src/app/about/page.tsx", "src/app/guide/page.tsx"])(
    "%s stays a server component, so the rules stay out of the client bundle",
    (file) => {
      const source = readFileSync(join(process.cwd(), file), "utf8");
      expect(source).not.toContain('"use client"');
    },
  );

  // The check that no rule pattern reaches a client file (kept when the Test Lab and its source scan
  // were removed, 2026-11-09): from every "use client" module, follow its value imports through the
  // source tree; none may reach the rules module. Type-only imports are erased and are skipped.
  it("no client module imports the rules, directly or through other modules", () => {
    const RULES_FILE = "src/lib/agents/redFlag.ts";
    const walk = (dir: string): string[] =>
      readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
        entry.isDirectory() ? walk(`${dir}/${entry.name}`) : /\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [`${dir}/${entry.name}`] : [],
      );
    const files = walk("src");
    const source = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
    const resolve = (from: string, spec: string): string | null => {
      const base = spec.startsWith("@/") ? `src/${spec.slice(2)}` : spec.startsWith(".") ? join(from, "..", spec).replaceAll("\\", "/") : null;
      if (!base) return null;
      return [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`].find((path) => files.includes(path)) ?? null;
    };
    const imports = (file: string) =>
      [...source(file).matchAll(/^\s*(?:import|export)\s+(?!type\b)(?:[^;]*?\sfrom\s+)?["']([^"']+)["']/gm)]
        .map((m) => resolve(file, m[1]))
        .filter((path): path is string => path !== null);
    const clients = files.filter((file) => /^\s*["']use client["']/m.test(source(file)));
    expect(clients).toContain("src/components/OfferChecker.tsx");
    for (const client of clients) {
      const seen = new Set<string>([client]);
      const queue = [client];
      while (queue.length > 0) {
        for (const next of imports(queue.shift() as string)) {
          if (!seen.has(next)) {
            seen.add(next);
            queue.push(next);
          }
        }
      }
      expect(seen.has(RULES_FILE), `${client} reaches ${RULES_FILE}`).toBe(false);
    }
  });
});
