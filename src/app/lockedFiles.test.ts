import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The locked files (docs/locked-files.md). Each listed file must hash to its recorded value: sha256 of
// the UTF-8 text with CRLF turned into LF. An owner-approved change updates the row in the same commit.

const doc = readFileSync(join(process.cwd(), "docs/locked-files.md"), "utf8");
const rows = [...doc.matchAll(/^\| `([^`]+)` \| `([0-9a-f]{64})` \|/gm)].map((m) => [m[1], m[2]] as const);

describe("locked files", () => {
  it("lists the six locked files", () => {
    expect(rows.map(([file]) => file)).toEqual([
      "src/lib/agents/redFlag.ts",
      "src/lib/scoring.ts",
      "src/lib/vaultCrypto.ts",
      "src/lib/approvalGate.ts",
      "src/lib/audit.ts",
      "src/lib/translateServer.ts",
    ]);
  });

  it.each(rows)("%s is unchanged", (file, hash) => {
    const text = readFileSync(join(process.cwd(), file), "utf8").replaceAll("\r\n", "\n");
    expect(createHash("sha256").update(text).digest("hex")).toBe(hash);
  });

  it("agrees with the redFlag.ts prefix recorded for holdout 2", () => {
    const holdout = readFileSync(join(process.cwd(), "src/lib/agents/eval/holdout2.test.ts"), "utf8");
    const prefix = holdout.match(/redFlagSha256Prefix: "([0-9a-f]{16})"/)?.[1];
    expect(rows[0][1].startsWith(prefix ?? "missing")).toBe(true);
  });
});
