import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// Phase 3 checks for the AI Studio UI/UX port (docs/reference/aistudio-ui-inventory.md): the port is
// visual only, adds no dependency, loads nothing from outside, moves only when motion is allowed,
// mirrors in Arabic and never states a verdict.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8");
const css = read("src/app/globals.css");

const walk = (dir: string): string[] =>
  readdirSync(join(process.cwd(), dir), { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(`${dir}/${entry.name}`) : [`${dir}/${entry.name}`],
  );
const UI_SOURCES = [...walk("src/app"), ...walk("src/components"), ...walk("src/data")].filter(
  (file) => /\.tsx?$/.test(file) && !/\.test\.tsx?$/.test(file) && !file.startsWith("src/app/api/"),
);

// The block of an at-rule, by brace matching.
const block = (head: string) => {
  const start = css.indexOf(`${head} {`);
  expect(start, head).toBeGreaterThan(-1);
  let depth = 0;
  for (let i = css.indexOf("{", start); i < css.length; i += 1) {
    if (css[i] === "{") depth += 1;
    if (css[i] === "}" && --depth === 0) return { start, end: i, text: css.slice(start, i + 1) };
  }
  throw new Error(head);
};

describe("AI Studio port: no new dependency", () => {
  it("package.json lists exactly the dependencies it had before the port", () => {
    const pkg = JSON.parse(read("package.json")) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["lucide-react", "next", "react", "react-dom"]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual([
      "@types/node",
      "@types/react",
      "@types/react-dom",
      "eslint",
      "eslint-config-next",
      "typescript",
      "vitest",
    ]);
  });

  it("no source imports a library the export used", () => {
    for (const file of UI_SOURCES) {
      expect(read(file), file).not.toMatch(/from ["'](?:motion|framer-motion|canvas-confetti|@google\/genai|express|dotenv|vite|tailwindcss)[/"']/);
    }
  });
});

describe("AI Studio port: nothing loaded from outside", () => {
  it("the stylesheet has no external URL, @import or font file", () => {
    expect(css).not.toMatch(/https?:\/\//);
    expect(css).not.toMatch(/@import|@font-face|url\(/);
  });

  it("the new hero component and the check page load only local files", () => {
    for (const file of ["src/components/HeroBackdrop.tsx", "src/app/check/page.tsx"]) {
      expect(read(file), file).not.toMatch(/https?:\/\//);
    }
    expect(read("src/components/HeroBackdrop.tsx")).toMatch(/src="\/hero\/loop\.webm"[\s\S]*src="\/hero\/loop\.mp4"/);
  });

  it("no page or component injects HTML", () => {
    for (const file of UI_SOURCES) expect(read(file), file).not.toContain("dangerouslySetInnerHTML");
  });
});

describe("AI Studio port: motion only when allowed", () => {
  const motion = block("@media (prefers-reduced-motion: no-preference)");

  it("every transition and animation declaration is inside the one no-preference block", () => {
    const reduce = block("@media (prefers-reduced-motion: reduce)");
    for (const m of css.matchAll(/\b(?:transition|animation)(?:-[a-z]+)?\s*:/g)) {
      const at = m.index!;
      const inMotion = at > motion.start && at < motion.end;
      const inReduce = at > reduce.start && at < reduce.end;
      expect(inMotion || inReduce, `${m[0]} at ${at}`).toBe(true);
    }
  });

  it("a reduce block sets every duration to 0s", () => {
    const reduce = block("@media (prefers-reduced-motion: reduce)").text;
    expect(reduce).toMatch(/animation-duration: 0s !important;/);
    expect(reduce).toMatch(/transition-duration: 0s !important;/);
    expect(reduce).toMatch(/animation-iteration-count: 1 !important;/);
  });

  it("every keyframe is used, and only inside the no-preference block", () => {
    const names = [...css.matchAll(/@keyframes ([\w-]+)/g)].map((m) => m[1]);
    expect(names).toEqual(expect.arrayContaining(["aurora-flow", "drop-in", "rise-in", "pop-in", "orb-drift", "progress-sweep", "gauge-fill"]));
    for (const name of names) {
      const uses = [...css.matchAll(new RegExp(`animation: ${name}\\b`, "g"))];
      expect(uses.length, name).toBeGreaterThan(0);
      for (const use of uses) expect(use.index! > motion.start && use.index! < motion.end, name).toBe(true);
    }
  });

  it("each ported effect has its rule in the block", () => {
    for (const selector of [
      ".site-header",
      ".brand:hover .brand-badge",
      ".dropdown-panel",
      ".page > .stack > *",
      ".hero-orb",
      ".sample-card:hover",
      ".progress::after",
      ".gauge-value",
      ".modal",
      ".success-tick",
      "details[open] > :not(summary)",
    ]) {
      expect(motion.text, selector).toContain(`${selector} {`);
    }
    // Blocked buttons do not move: hover and press scale apply only to buttons that work.
    expect(motion.text).toMatch(/\.btn:not\(\[aria-disabled="true"\]\):not\(:disabled\):hover \{\s*scale: 1\.02;/);
    expect(motion.text).toMatch(/\.btn:not\(\[aria-disabled="true"\]\):not\(:disabled\):active \{\s*scale: 0\.98;/);
    // No scroll-driven reveal: it leaves findings at opacity 0 outside the viewport, so print,
    // Export PDF and full-page captures came out blank. Content is never hidden by motion.
    expect(css).not.toMatch(/animation-timeline|\.reveal\b/);
    for (const file of UI_SOURCES) expect(read(file), file).not.toMatch(/\breveal\b/);
  });

  it("the hero video starts only from script and only when motion is allowed", () => {
    const source = read("src/components/HeroBackdrop.tsx");
    expect(source).not.toMatch(/autoPlay/);
    expect(source.indexOf("prefers-reduced-motion: reduce")).toBeLessThan(source.indexOf(".play()"));
  });
});

describe("AI Studio port: right-to-left", () => {
  it("the new direction-dependent pieces mirror under dir=rtl", () => {
    expect(css).toMatch(/\[dir="rtl"\] \.hero-backdrop::before \{\s*background:\s*linear-gradient\(270deg/);
    expect(css).toMatch(/\[dir="rtl"\] \.gauge \{\s*scale: 1 -1;/);
    expect(css).toMatch(/\[dir="rtl"\] \.sample-arrow \{\s*scale: -1 1;/);
    expect(css).toMatch(/\[dir="rtl"\] \.sample-card:hover \.sample-arrow \{\s*translate: -3px 0;/);
  });

  it("new layout rules use logical properties, not left and right", () => {
    for (const selector of [".hero-orb", ".hero-orb + .hero-orb", ".hero-backdrop", ".gauge-wrap", ".gauge", ".progress::after"]) {
      const at = css.indexOf(`${selector} {`);
      expect(at, selector).toBeGreaterThan(-1);
      const body = css.slice(at, css.indexOf("}", at));
      expect(body, selector).not.toMatch(/(?:^|\s)(?:left|right|margin-left|margin-right|padding-left|padding-right):/m);
    }
  });
});

describe("AI Studio port: risk, not verdict", () => {
  it("no page or component states a verdict, celebrates, or shows a model or trust score", () => {
    for (const file of UI_SOURCES) {
      expect(read(file), file).not.toMatch(
        /offer is safe|safe (?:job )?offer|verified (?:offer|job)|offer (?:is )?verified|\blegit\b|scam confirmed|probable recruitment scam|confetti|celebrat|trust score|scam probability|gemini/i,
      );
    }
  });

  it("the score ring shows the engine's score only, and nothing when the text was not checked", () => {
    const source = read("src/components/ResultCard.tsx");
    expect(source).toContain('{notice !== "most" && (');
    expect(source).toContain("strokeDashoffset={100 - Math.min(100, Math.max(0, risk.score))}");
  });
});
