import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const SCRIPT = join(process.cwd(), "scripts", "check-no-bypass.mjs");
// Built from parts, so this file never holds the patterns it tests.
const p = (...parts) => parts.join("");

const dirs = [];
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

// A throwaway project with one source file and a package.json.
function project(source, scripts = { test: "vitest run" }) {
  const dir = mkdtempSync(join(tmpdir(), "no-bypass-"));
  dirs.push(dir);
  mkdirSync(join(dir, "src"));
  writeFileSync(join(dir, "src", "a.test.ts"), source);
  writeFileSync(join(dir, "package.json"), JSON.stringify({ scripts }));
  return dir;
}

function check(cwd) {
  return spawnSync(process.execPath, [SCRIPT], { cwd, encoding: "utf8" });
}

describe("check:no-bypass", () => {
  it("passes on this repo", () => {
    const result = check(process.cwd());
    expect(result.stderr).toBe("");
    expect(result.status).toBe(0);
  });

  it("passes on clean code and on @ts-expect-error with a reason", () => {
    const source = `it("works", () => {});\n// ${p("@ts-", "expect-error")} -- the type is wrong upstream\n`;
    expect(check(project(source)).status).toBe(0);
  });

  it.each([
    [".skip", p("it.", "skip(", '"x", () => {});')],
    [".only", p("describe.", "only(", '"x", () => {});')],
    ["xit", p("x", "it(", '"x", () => {});')],
    ["xdescribe", p("x", "describe(", '"x", () => {});')],
    ["eslint-disable", p("// eslint-", "disable-next-line")],
    ["@ts-ignore", p("// @ts-", "ignore")],
    ["@ts-expect-error without a comment", p("// @ts-", "expect-error")],
  ])("fails on %s", (_name, source) => {
    const result = check(project(source));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("src");
  });

  it("fails on --no-verify in a package.json script", () => {
    const result = check(project("ok();\n", { commit: p("git commit --no-", "verify") }));
    expect(result.status).toBe(1);
    expect(result.stderr).toContain(p("--no-", "verify"));
  });
});
