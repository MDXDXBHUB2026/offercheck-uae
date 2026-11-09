import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  HOLDOUT_1_RESULT,
  HOLDOUT_2_BAR_COUNTED,
  HOLDOUT_2_BAR_ITEMS,
  HOLDOUT_2_PASS_BAR,
  HOLDOUT_2_RUN,
} from "./records";

// The holdout records must say what the docs say, word for word. They are records of a run that may
// never be repeated, so this test compares text; it never runs the rules on a holdout case.
const read = (file: string) => readFileSync(join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n");
const REPORT = read("docs/test-report.md");
const BAR = read("docs/holdout2-pass-bar.md");

describe("holdout records", () => {
  it("holdout 1: every string is in the test report's holdout 1 section", () => {
    const section = REPORT.slice(REPORT.indexOf("## Holdout 1 (consumed)"), REPORT.indexOf("## Holdout 2 (consumed)"));
    expect(section.length).toBeGreaterThan(0);
    expect(section).toContain(
      `once, on ${HOLDOUT_1_RESULT.runDate}, against \`redFlag.ts\` sha256 \`${HOLDOUT_1_RESULT.ranOnRedFlagPrefix}…\`, ${HOLDOUT_1_RESULT.ranOnNote}.`,
    );
    expect(section).toContain(`**Strict:** ${HOLDOUT_1_RESULT.strict}.`);
    expect(section).toContain(`**Right rule counted as a pass:** ${HOLDOUT_1_RESULT.rightRuleCountedAsPass}.`);
    expect(section).toContain(`**${HOLDOUT_1_RESULT.realMiss}** ${HOLDOUT_1_RESULT.realMissNote}`);
    expect(section).toContain(`H01, H09, H14 and H17. ${HOLDOUT_1_RESULT.strictFailuresNote}`);
    expect(HOLDOUT_1_RESULT.strictFailures).toEqual(["H01", "H09", "H14", "H17"]);
    expect(section).toContain(HOLDOUT_1_RESULT.passBarNote);
  });

  it("holdout 2: every string is in the test report's holdout 2 section", () => {
    const section = REPORT.slice(REPORT.indexOf("## Holdout 2 (consumed)"), REPORT.indexOf("## What none of the numbers above show"));
    expect(section.length).toBeGreaterThan(0);
    expect(section).toContain(
      `once, on ${HOLDOUT_2_RUN.runDate}, after the rules were frozen at \`redFlag.ts\` sha256 \`${HOLDOUT_2_RUN.ranOnRedFlagPrefix}…\`.`,
    );
    expect(section).toContain(`**Result:** ${HOLDOUT_2_RUN.strict} passed. ${HOLDOUT_2_RUN.failureNote}`);
    expect(section).toContain(`${HOLDOUT_2_RUN.tunedNote} (60, High, RF-002). ${HOLDOUT_2_RUN.tunedDetail}`);
    expect(section).toContain(HOLDOUT_2_RUN.passBarLocked);
    expect(section).toContain(HOLDOUT_2_RUN.noRerun);
  });

  it("holdout 2 bar counts: each row is the test report's table row, Derived labels included", () => {
    for (const row of HOLDOUT_2_PASS_BAR) {
      expect(REPORT).toContain(`| ${row.item} | ${row.required} | ${row.count} | ${row.source} |`);
    }
    expect(HOLDOUT_2_PASS_BAR.filter((row) => row.source.startsWith("Derived"))).toHaveLength(3);
  });

  it("holdout 2 bar: the cases counted and the three items are as locked in docs/holdout2-pass-bar.md", () => {
    expect(BAR).toContain("locked 2026-11-06, before the run");
    for (const line of HOLDOUT_2_BAR_COUNTED) expect(BAR).toContain(`- ${line}`);
    for (const line of HOLDOUT_2_BAR_ITEMS) expect(BAR).toContain(line);
  });

  it("holds hash prefixes only, never a full 64-character hash", () => {
    const source = read("src/lib/agents/eval/records.ts");
    expect(source).not.toMatch(/[0-9a-f]{64}/);
    expect(HOLDOUT_1_RESULT.ranOnRedFlagPrefix).toMatch(/^[0-9a-f]{8}$/);
    expect(HOLDOUT_2_RUN.ranOnRedFlagPrefix).toMatch(/^[0-9a-f]{8}$/);
  });
});
