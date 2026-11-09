import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { SCAM_OFFER } from "./agents/fixtures";
import { runManager } from "./agents/manager";
import { EVAL_OFFERS } from "./agents/eval/offers";
import {
  HOLDOUT_1_RESULT,
  HOLDOUT_2_BAR_COUNTED,
  HOLDOUT_2_BAR_ITEMS,
  HOLDOUT_2_PASS_BAR,
  HOLDOUT_2_RUN,
} from "./agents/eval/records";

// docs/technical-evidence.md is not served by the app. Every figure in it must be reproducible:
// the dev-set counts are recomputed here from the case file, the holdout lines are compared with
// the records, the step statuses with the trace, and the limitations with docs/known-limitations.md.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n");
const DOC = read("docs/technical-evidence.md");

describe("docs/technical-evidence.md", () => {
  it("dev set: the fenced JSON counts equal a recompute from offers.ts", () => {
    const block = DOC.match(/## Dev set: confusion counts[\s\S]*?```json\n([\s\S]*?)\n```/)?.[1];
    expect(block).toBeDefined();
    const recorded = JSON.parse(block as string);
    const sorted = (list: readonly string[]) => [...list].sort().join();
    const runs = EVAL_OFFERS.map((offer) => {
      const result = runManager(offer.text);
      const counted = result.findings.filter((f) => f.severity !== "info").map((f) => f.source);
      const info = result.findings.filter((f) => f.severity === "info").map((f) => f.source);
      return {
        scam: offer.scamLike,
        flagged: result.risk.band === "medium" || result.risk.band === "high",
        passed:
          result.risk.band === offer.expectedBand &&
          sorted(counted) === sorted(offer.expectedRuleIds) &&
          sorted(info) === sorted(offer.expectedInfoIds ?? []),
      };
    });
    const count = (scam: boolean, flagged: boolean) => runs.filter((r) => r.scam === scam && r.flagged === flagged).length;
    expect(recorded).toEqual({
      source: "src/lib/agents/eval/offers.ts",
      flaggedBands: ["medium", "high"],
      cases: EVAL_OFFERS.length,
      passed: runs.filter((r) => r.passed).length,
      failed: runs.filter((r) => !r.passed).length,
      truePositives: count(true, true),
      falsePositives: count(false, true),
      falseNegatives: count(true, false),
      trueNegatives: count(false, false),
    });
  });

  it("names the one failing dev case, and it is the recorded known miss", () => {
    const failing = EVAL_OFFERS.filter((offer) => {
      const result = runManager(offer.text);
      return result.risk.band !== offer.expectedBand;
    }).map((offer) => offer.id);
    expect(failing).toEqual(["S12"]);
    expect(EVAL_OFFERS.find((offer) => offer.id === "S12")?.knownMiss).toBe(true);
    expect(DOC).toContain("The one failure is the known miss S12");
  });

  it("lists every step the trace reports, marked not built exactly when the trace says not implemented", () => {
    const rows = [...DOC.matchAll(/^\| `([a-z_]+)` \| [^|]+ \| ([^|]+) \|/gm)].map((m) => ({ id: m[1], status: m[2].trim() }));
    expect(rows.map((row) => row.id)).toEqual([
      "manager",
      "intake",
      "red_flag",
      "verification",
      "official_channel",
      "risk_aggregator",
      "explainer",
      "drafter",
      "approval_gate",
      "audit_trail",
    ]);
    for (const step of runManager(SCAM_OFFER).trace) {
      const row = rows.find((entry) => entry.id === step.agent);
      expect(row, step.agent).toBeDefined();
      expect(row?.status === "Not implemented yet", step.agent).toBe(step.status === "not_implemented");
    }
  });

  it("holdouts: every recorded line matches records.ts, with no pass or fail verdict on the bar", () => {
    const h1 = HOLDOUT_1_RESULT;
    expect(DOC).toContain(`Ran once, on ${h1.runDate}, against \`redFlag.ts\` sha256 \`${h1.ranOnRedFlagPrefix}…\`, ${h1.ranOnNote}.`);
    expect(DOC).toContain(`Cases: ${h1.cases}.`);
    expect(DOC).toContain(`**Strict:** ${h1.strict}.`);
    expect(DOC).toContain(`**Right rule counted as a pass:** ${h1.rightRuleCountedAsPass}.`);
    expect(DOC).toContain(`**${h1.realMiss}** ${h1.realMissNote}`);
    expect(DOC).toContain(`Strict failures: H01, H09, H14 and H17. ${h1.strictFailuresNote}`);
    expect(h1.strictFailures).toEqual(["H01", "H09", "H14", "H17"]);
    expect(DOC).toContain(h1.passBarNote);
    const h2 = HOLDOUT_2_RUN;
    expect(DOC).toContain(`Ran once, on ${h2.runDate}, after the rules were frozen at \`redFlag.ts\` sha256 \`${h2.ranOnRedFlagPrefix}…\`.`);
    expect(DOC).toContain(`Cases: ${h2.cases}.`);
    expect(DOC).toContain(`**Result:** ${h2.strict} passed. ${h2.failureNote}`);
    expect(DOC).toContain(`After tuning: ${h2.tunedNote}. ${h2.tunedDetail}`);
    expect(DOC).toContain(h2.passBarLocked);
    expect(DOC).toContain(h2.noRerun);
    for (const line of HOLDOUT_2_BAR_ITEMS) expect(DOC).toContain(`- ${line}`);
    for (const line of HOLDOUT_2_BAR_COUNTED) expect(DOC).toContain(`- ${line}`);
    for (const row of HOLDOUT_2_PASS_BAR) expect(DOC).toContain(`| ${row.item} | ${row.required} | ${row.count} | ${row.source} |`);
    const holdouts = DOC.slice(DOC.indexOf("## Holdouts"), DOC.indexOf("## Known limitations"));
    expect(holdouts).not.toMatch(/\bPASS\b|\bFAIL\b/);
    expect(holdouts).not.toMatch(/bar is met|meets the bar|fails the bar|bar passed|bar failed|bar is not met/i);
  });

  // Roadmap Phase 2 completeness, moved here when /about lost its technical list (owner decision).
  it("contains every bullet of docs/known-limitations.md, word for word", () => {
    const bullets = read("docs/known-limitations.md")
      .split("\n")
      .filter((line) => line.startsWith("- "));
    expect(bullets.length).toBeGreaterThan(0);
    for (const bullet of bullets) expect(DOC, bullet.slice(0, 60)).toContain(bullet);
  });

  it("holds hash prefixes only, never a full 64-character hash", () => {
    expect(DOC).not.toMatch(/[0-9a-f]{64}/i);
  });
});
