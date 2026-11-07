import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/analyze/route";
import { draftReply, planBlocks } from "./agents/drafter";
import { HOLDOUT_OFFERS } from "./agents/eval/holdout";
import { EVAL_OFFERS } from "./agents/eval/offers";
import { LEGIT_OFFER, SCAM_OFFER } from "./agents/fixtures";
import { cleanOfferText } from "./agents/intake";
import { gateReducer, INITIAL_GATE_FLOW, type GateAction, type GateFlow } from "./approvalGate";
import {
  appendEntries,
  gateRecords,
  GENESIS_HASH,
  verifyAuditLog,
  type AuditEntry,
  type AuditRecord,
} from "./audit";
import { runWithAudit } from "./auditRun";

const AT = "2026-11-07T10:00:00.000Z";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const OFFERS = [SCAM_OFFER, LEGIT_OFFER, ...[...EVAL_OFFERS, ...HOLDOUT_OFFERS].map((offer) => offer.text)];
const ALLOWED_KEYS = new Set([
  "offerLength",
  "status",
  "durationMs",
  "agent",
  "ruleIds",
  "warningIds",
  "score",
  "band",
  "decision",
  "edited",
  "blocks",
]);
// Every string value in the log comes from a fixed vocabulary: kinds, agents, statuses, rule ids,
// bands, decisions and block ids.
const SAFE_STRING = /^(?:[a-z]+(?:[_-][a-z]+)*|RF-\d{3}(?:-W)?)$/;

function digests(text: string): string[] {
  return ["sha256", "sha1", "md5", "sha512"].map((algorithm) =>
    createHash(algorithm).update(text, "utf8").digest("hex"),
  );
}

// The offer in every form a fingerprint could be taken from.
function offerForms(text: string): string[] {
  const cleaned = cleanOfferText(text).text;
  return [text, cleaned, text.trim(), cleaned.toLowerCase(), cleaned.replace(/\s+/g, " ")];
}

function run(flow: GateFlow, ...actions: GateAction[]): GateFlow {
  return actions.reduce(gateReducer, flow);
}

// Long hex strings in the log may only be the entry hashes themselves.
function foreignHex(log: AuditEntry[]): string[] {
  const own = new Set([GENESIS_HASH, ...log.map((entry) => entry.hash)]);
  return (JSON.stringify(log).match(/[0-9a-f]{32,}/gi) ?? []).filter((hex) => !own.has(hex));
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("run records", () => {
  it("logs the run in order: started, intake, one entry per agent step, finished", async () => {
    const { audit } = await runWithAudit(SCAM_OFFER);
    expect(audit.map((entry) => [entry.kind, entry.data.agent ?? null])).toEqual([
      ["run_started", null],
      ["intake_done", null],
      ["agent_step", "red_flag"],
      ["agent_step", "verification"],
      ["agent_step", "official_channel"],
      ["agent_step", "risk_aggregator"],
      ["run_finished", null],
    ]);
  });

  it("records the offer length, the rule ids and the score, and nothing from the text", async () => {
    const { audit, risk, findings } = await runWithAudit(SCAM_OFFER);
    expect(audit[0].data).toEqual({ offerLength: SCAM_OFFER.length });
    expect(audit[2].data.ruleIds).toEqual(findings.filter((f) => f.severity !== "info").map((f) => f.source));
    expect(audit[5].data).toMatchObject({ score: risk.score, band: risk.band });
    expect(audit[3].data).toEqual({ agent: "verification", status: "not_implemented", durationMs: null });
  });

  it("gives every run a random id and timestamps, shared by all its entries", async () => {
    const first = await runWithAudit(SCAM_OFFER);
    const second = await runWithAudit(SCAM_OFFER);
    expect(first.runId).toMatch(UUID);
    expect(second.runId).not.toBe(first.runId);
    for (const entry of first.audit) {
      expect(entry.runId).toBe(first.runId);
      expect(new Date(entry.at).toISOString()).toBe(entry.at);
    }
  });

  it("is returned by the API with a chain that verifies", async () => {
    const response = await POST(
      new Request("http://localhost/api/analyze", {
        method: "POST",
        body: JSON.stringify({ text: SCAM_OFFER }),
      }),
    );
    const body = await response.json();
    expect(body.runId).toMatch(UUID);
    expect(body.audit).toHaveLength(7);
    await expect(verifyAuditLog(body.audit)).resolves.toEqual({ ok: true });
  });
});

describe("hash chain", () => {
  async function chain(): Promise<AuditEntry[]> {
    return (await runWithAudit(SCAM_OFFER)).audit;
  }

  it("links each entry to the one before it", async () => {
    const log = await chain();
    expect(log[0].prevHash).toBe(GENESIS_HASH);
    log.slice(1).forEach((entry, index) => expect(entry.prevHash).toBe(log[index].hash));
    expect(log.map((entry) => entry.seq)).toEqual([0, 1, 2, 3, 4, 5, 6]);
  });

  it("verifies an untouched log, including an empty one", async () => {
    await expect(verifyAuditLog(await chain())).resolves.toEqual({ ok: true });
    await expect(verifyAuditLog([])).resolves.toEqual({ ok: true });
  });

  it("detects a changed value", async () => {
    const log = await chain();
    log[5] = { ...log[5], data: { ...log[5].data, score: 0 } };
    await expect(verifyAuditLog(log)).resolves.toEqual({ ok: false, brokenAt: 5 });
  });

  it("detects a removed entry", async () => {
    const log = await chain();
    log.splice(2, 1);
    await expect(verifyAuditLog(log)).resolves.toEqual({ ok: false, brokenAt: 2 });
  });

  it("detects swapped entries", async () => {
    const log = await chain();
    [log[3], log[4]] = [log[4], log[3]];
    await expect(verifyAuditLog(log)).resolves.toEqual({ ok: false, brokenAt: 3 });
  });

  it("detects an added field and a rewritten hash", async () => {
    const log = await chain();
    await expect(
      verifyAuditLog([log[0], { ...log[1], extra: "x" } as AuditEntry, ...log.slice(2)]),
    ).resolves.toEqual({ ok: false, brokenAt: 1 });
    await expect(
      verifyAuditLog([...log.slice(0, 6), { ...log[6], hash: GENESIS_HASH }]),
    ).resolves.toEqual({ ok: false, brokenAt: 6 });
  });

  it("continues the chain with gate entries", async () => {
    const log = await chain();
    const record: AuditRecord = {
      runId: log[0].runId,
      at: AT,
      kind: "gate_decision",
      data: { decision: "pending", edited: false, blocks: [] },
    };
    const longer = await appendEntries(log, [record]);
    expect(longer[7].prevHash).toBe(log[6].hash);
    await expect(verifyAuditLog(longer)).resolves.toEqual({ ok: true });
  });
});

describe("gate records", () => {
  const findings = [{ source: "RF-001" }, { source: "RF-005" }];
  const blocks = planBlocks(findings);
  const prepare: GateAction = { type: "prepare", at: AT, findings };
  const filled = draftReply(findings).replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");

  function step(flow: GateFlow, action: GateAction) {
    const next = gateReducer(flow, action);
    return { next, records: gateRecords("run-1", flow, next, blocks) };
  }

  it("records a prepared draft as pending and not edited", () => {
    expect(step(INITIAL_GATE_FLOW, prepare).records).toEqual([
      { runId: "run-1", at: AT, kind: "gate_decision", data: { decision: "pending", edited: false, blocks } },
    ]);
  });

  it("records an approval of an edited draft as approved and edited", () => {
    const editing = run(INITIAL_GATE_FLOW, prepare, { type: "startEdit", at: AT }, { type: "changeDraft", draft: filled });
    expect(step(editing, { type: "approve", copied: true, at: AT }).records[0].data).toEqual({
      decision: "approved",
      edited: true,
      blocks,
    });
  });

  it("records a discard, and whether the discarded draft was edited", () => {
    const pending = run(INITIAL_GATE_FLOW, prepare);
    expect(step(pending, { type: "discard", at: AT }).records[0].data).toEqual({
      decision: "discarded",
      edited: false,
      blocks,
    });
    const edited = run(pending, { type: "startEdit", at: AT }, { type: "changeDraft", draft: "My words" });
    expect(step(edited, { type: "discard", at: AT }).records[0].data.edited).toBe(true);
  });

  it("records nothing for opening the editor, typing, a refused approval or a reset", () => {
    const pending = run(INITIAL_GATE_FLOW, prepare);
    expect(step(pending, { type: "startEdit", at: AT }).records).toEqual([]);
    expect(step(pending, { type: "approve", copied: true, at: AT }).records).toEqual([]);
    const editing = run(pending, { type: "startEdit", at: AT });
    expect(step(editing, { type: "changeDraft", draft: "x" }).records).toEqual([]);
    expect(step(editing, { type: "reset" }).records).toEqual([]);
  });
});

describe("privacy", () => {
  it.each(OFFERS.map((text, index) => [index, text] as const))(
    "offer %i: the log holds no offer text, evidence or hash of the offer",
    async (_index, text) => {
      const { audit, findings } = await runWithAudit(text);
      const json = JSON.stringify(audit);
      for (const form of offerForms(text)) {
        for (const digest of digests(form)) expect(json).not.toContain(digest);
      }
      for (const quote of findings.flatMap((finding) => finding.evidence)) {
        expect(json).not.toContain(quote);
      }
      expect(json).not.toMatch(/@|https?:|www\./i);
      expect(foreignHex(audit)).toEqual([]);
    },
  );

  it("the gate entries hold no draft text and no hash of it", async () => {
    const { audit, findings, runId } = await runWithAudit(SCAM_OFFER);
    const blocks = planBlocks(findings);
    const prepare: GateAction = { type: "prepare", at: AT, findings };
    const draft = draftReply(findings);
    const filled = draft.replace("[Recipient name]", "Ms Example").replace("[Your name]", "Sam");
    const actions: GateAction[] = [
      prepare,
      { type: "startEdit", at: AT },
      { type: "changeDraft", draft: filled },
      { type: "approve", copied: true, at: AT },
      { type: "discard", at: AT },
    ];
    let flow = INITIAL_GATE_FLOW;
    let log = audit;
    for (const action of actions) {
      const next = gateReducer(flow, action);
      log = await appendEntries(log, gateRecords(runId, flow, next, blocks));
      flow = next;
    }
    const json = JSON.stringify(log);
    expect(log.filter((entry) => entry.kind === "gate_decision").map((e) => e.data.decision)).toEqual([
      "pending",
      "approved",
      "discarded",
    ]);
    for (const text of [draft, filled]) {
      expect(json).not.toContain(text.slice(0, 40));
      for (const digest of digests(text)) expect(json).not.toContain(digest);
    }
    expect(json).not.toMatch(/Ms Example|Sam|Dear|Recipient name/);
    expect(foreignHex(log)).toEqual([]);
    await expect(verifyAuditLog(log)).resolves.toEqual({ ok: true });
  });

  it("uses only fixed keys and fixed-vocabulary strings", async () => {
    for (const text of OFFERS) {
      for (const entry of (await runWithAudit(text)).audit) {
        for (const [key, value] of Object.entries(entry.data)) {
          expect(ALLOWED_KEYS.has(key)).toBe(true);
          for (const item of Array.isArray(value) ? value : [value]) {
            if (typeof item === "string") expect(item).toMatch(SAFE_STRING);
          }
        }
      }
    }
  });
});

describe("no secrets or environment", () => {
  it.each([
    "src/lib/audit.ts",
    "src/lib/auditRun.ts",
    "src/app/api/analyze/route.ts",
    "src/components/AuditTrail.tsx",
    "src/components/OfferChecker.tsx",
  ])("%s reads no environment variable and no secret", (file) => {
    const source = readFileSync(join(process.cwd(), file), "utf8");
    expect(source).not.toMatch(/process\.env|import\.meta\.env|AUDIT_SALT|createHmac|\bHMAC\b|importKey/);
  });

  it("gives the same kind of log whatever the environment holds", async () => {
    const shape = (log: AuditEntry[]) => log.map((entry) => [entry.kind, Object.keys(entry.data)]);
    const plain = await runWithAudit(SCAM_OFFER);
    vi.stubEnv("AUDIT_SALT", "salt-canary-value");
    vi.stubEnv("NODE_ENV", "production");
    const stubbed = await runWithAudit(SCAM_OFFER);
    expect(shape(stubbed.audit)).toEqual(shape(plain.audit));
    expect(JSON.stringify(stubbed)).not.toContain("salt-canary-value");
  });
});
