import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { UAE_CONTACTS } from "@/data/uaeContacts";
import { AUTHORITIES } from "@/lib/authorities";
import { WARNING_SIGNS, WARNING_SIGNS_SOURCE } from "@/lib/warningSigns";
import { RULES } from "./agents/redFlag";
import { CROSS_CHECKS } from "./crossCheckIds";
import { runManager } from "./agents/manager";
import { loadStep, MENTION_LABELS, resolveSteps, selectOfficialSteps, STEP_MAP } from "./officialSteps";

// Official-channel v1 (2026-11-11): a typed mapping to existing entries only, each shown with an
// official source URL; "last checked" only where the data holds a date; nothing for an unmapped id.

const KEYS = [...new Set(Object.values(STEP_MAP).flat())];

describe("the mapping", () => {
  it("maps only known finding, cross-check and authority-mention ids", () => {
    const known = new Set([...RULES.map((rule) => rule.id), ...CROSS_CHECKS.map((check) => check.id), ...Object.keys(MENTION_LABELS)]);
    for (const id of Object.keys(STEP_MAP)) expect(known.has(id), id).toBe(true);
    for (const id of Object.keys(MENTION_LABELS)) expect(STEP_MAP[id], id).toBeDefined();
  });

  it("maps a plain mention of an authority to that authority's own existing entry", () => {
    expect(STEP_MAP["mention:mohre"]).toEqual(["authority:mohre_verify"]);
    expect(STEP_MAP["mention:icp"]).toEqual(["contact:icp"]);
    expect(STEP_MAP["mention:gdrfa"]).toEqual(["contact:amer"]);
    expect(STEP_MAP["mention:dubai_police"]).toBeUndefined();
  });

  it("points only at existing entries, and every one loads with an https source", () => {
    for (const key of KEYS) {
      const step = loadStep(key);
      expect(step, key).not.toBeNull();
      expect(step?.sourceUrl).toMatch(/^https:\/\/\S+$/);
    }
  });

  it("writes no guidance of its own: each title and text is the entry's own words", () => {
    const words = new Set([
      ...WARNING_SIGNS.flatMap((sign) => [sign.sign, sign.whatToDo]),
      ...AUTHORITIES.flatMap((entry) => [entry.name, entry.purpose]),
      ...UAE_CONTACTS.flatMap((entry) => [entry.name, entry.purpose]),
    ]);
    for (const key of KEYS) {
      const step = loadStep(key);
      expect(words.has(step?.title ?? ""), key).toBe(true);
      expect(words.has(step?.text ?? ""), key).toBe(true);
    }
    const source = readFileSync("src/lib/officialSteps.ts", "utf8").replace(/^\s*\/\/.*$/gm, "");
    expect(source).not.toMatch(/https?:\/\//);
  });

  it("shows last checked only where the data holds a date", () => {
    expect(loadStep("sign:recruitment-fees")?.lastChecked).toBe(WARNING_SIGNS_SOURCE.verified);
    expect(loadStep("authority:mohre_verify")?.lastChecked).toBe(AUTHORITIES.find((a) => a.id === "mohre_verify")?.lastVerified);
    // The contacts file has no per-entry date.
    expect(loadStep("contact:mohre")).not.toHaveProperty("lastChecked");
  });
});

describe("the loader refuses an entry without an official source URL", () => {
  const base = { title: "T", text: "X", sourceName: "S", sourceUrl: "https://u.ae/x", lastChecked: "2026-11-09" };
  it.each([
    ["no URL", { ...base, sourceUrl: undefined }],
    ["empty URL", { ...base, sourceUrl: "" }],
    ["http, not https", { ...base, sourceUrl: "http://u.ae/x" }],
    ["not a URL", { ...base, sourceUrl: "u.ae/x" }],
    ["no title", { ...base, title: "" }],
    ["no text", { ...base, text: undefined }],
  ])("%s", (_name, entry) => {
    expect(loadStep("sign:test", () => entry)).toBeNull();
  });

  it("keeps a good entry, and drops a date that is not an ISO date", () => {
    expect(loadStep("sign:test", () => base)).toEqual({ key: "sign:test", ...base });
    expect(loadStep("sign:test", () => ({ ...base, lastChecked: "24 Sep 2026" }))).not.toHaveProperty("lastChecked");
  });

  it("refuses an unknown key", () => {
    expect(loadStep("sign:nope")).toBeNull();
    expect(loadStep("other:mohre")).toBeNull();
  });
});

describe("the step", () => {
  it("summarises steps for findings and for an authority named in the text, and audits only rule and cross-check ids", () => {
    const result = runManager("Send your passport copy. Your offer letter will be issued through MoHRE.");
    const step = result.trace.find((s) => s.agent === "official_channel");
    expect(result.officialSteps?.map((s) => s.key)).toEqual(["sign:offer-letter", "authority:mohre_verify"]);
    expect(step?.summary).toBe("1 official step for 1 finding, and 1 official step for a UAE authority named in the text");
    expect(step?.checkIds).toEqual(["RF-003"]);
    expect(step?.count).toBe(2);
  });

  it("lists each entry once, in order of first use, with the ids it is for", () => {
    expect(selectOfficialSteps(["RF-005", "V-01", "RF-001"])).toEqual([
      { key: "sign:company-lookup", forIds: ["RF-005", "V-01"] },
      { key: "sign:recruitment-fees", forIds: ["RF-001"] },
      { key: "contact:mohre", forIds: ["RF-001"] },
    ]);
  });

  it("gives nothing for ids with no entry", () => {
    expect(selectOfficialSteps([])).toEqual([]);
    expect(selectOfficialSteps(["RF-001-W", "V-99"])).toEqual([]);
  });

  it("drops malformed or unknown refs from a saved record", () => {
    expect(resolveSteps(undefined)).toEqual([]);
    expect(resolveSteps([{ key: "sign:nope", forIds: ["RF-001"] }, { key: 3 }, null, { key: "contact:mohre", forIds: [1] }])).toEqual([]);
    expect(resolveSteps([{ key: "contact:mohre", forIds: ["RF-001"] }])).toHaveLength(1);
  });
});
