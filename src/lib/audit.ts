import { planBlocks, renderBlocks, type BlockId } from "./agents/drafter";
import { draftState, gateReducer, type GateAction, type GateFlow } from "./approvalGate";
import type { Finding } from "./types";
import type { AnalysisResult } from "./types";

// The audit trail records what the agents and the user did, never what anyone wrote. It holds no
// offer text, draft text, evidence, name, email or phone number, and no hash or fingerprint of any
// of them. The only hashes are of the log entries themselves, which hold none of that text.
// It uses no secret and no environment variable.

export type AuditValue = string | number | boolean | null | readonly string[];
export type AuditData = Readonly<Record<string, AuditValue>>;

export type AuditKind = "run_started" | "intake_done" | "agent_step" | "run_finished" | "gate_decision";

export type AuditRecord = {
  runId: string;
  at: string;
  kind: AuditKind;
  data: AuditData;
};

export type AuditEntry = AuditRecord & {
  seq: number;
  prevHash: string;
  hash: string;
};

export type GateDecision = "pending" | "approved" | "discarded";

// What /api/analyze returns. The browser checks the shape before using it, so a proxy error page
// or a broken reply shows an error instead of crashing the page.
export type AnalyzeResponse = AnalysisResult & { runId: string; audit: AuditEntry[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isAnalyzeResponse(value: unknown): value is AnalyzeResponse {
  if (!isRecord(value) || !isRecord(value.risk)) return false;
  return (
    typeof value.runId === "string" &&
    typeof value.risk.score === "number" &&
    typeof value.risk.band === "string" &&
    typeof value.risk.label === "string" &&
    Array.isArray(value.trace) &&
    Array.isArray(value.findings) &&
    value.findings.every(
      (f) => isRecord(f) && typeof f.source === "string" && Array.isArray(f.evidence),
    ) &&
    Array.isArray(value.audit) &&
    value.audit.every(
      (e) =>
        isRecord(e) &&
        typeof e.hash === "string" &&
        typeof e.prevHash === "string" &&
        typeof e.kind === "string" &&
        typeof e.at === "string" &&
        isRecord(e.data),
    )
  );
}

export const GENESIS_HASH = "0".repeat(64);

// Stable JSON with sorted keys, so the same entry always hashes the same way.
function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value);
}

async function sha256Hex(text: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

// Each entry carries the hash of the entry before it, so a changed, removed or reordered entry
// breaks the chain from that point on.
export async function appendEntries(
  log: readonly AuditEntry[],
  records: readonly AuditRecord[],
): Promise<AuditEntry[]> {
  const entries = [...log];
  for (const record of records) {
    const body = { ...record, seq: entries.length, prevHash: entries.at(-1)?.hash ?? GENESIS_HASH };
    entries.push({ ...body, hash: await sha256Hex(canonical(body)) });
  }
  return entries;
}

export type ChainCheck = { ok: true } | { ok: false; brokenAt: number };

export async function verifyAuditLog(log: readonly AuditEntry[]): Promise<ChainCheck> {
  let prevHash = GENESIS_HASH;
  for (const [index, entry] of log.entries()) {
    const { hash, ...body } = entry;
    if (entry.seq !== index || entry.prevHash !== prevHash || hash !== (await sha256Hex(canonical(body)))) {
      return { ok: false, brokenAt: index };
    }
    prevHash = hash;
  }
  return { ok: true };
}

function ms(durationMs: number | null): number | null {
  return durationMs === null ? null : Math.round(durationMs * 100) / 100;
}

// One run: started, intake done, one entry per agent step, finished. Only lengths, statuses,
// durations, rule ids and the score are kept, never the text or the evidence.
export function runRecords(
  runId: string,
  offerLength: number,
  result: AnalysisResult,
  startedAt: string,
  finishedAt: string,
): AuditRecord[] {
  const records: AuditRecord[] = [{ runId, at: startedAt, kind: "run_started", data: { offerLength } }];
  let total: number | null = null;
  for (const step of result.trace) {
    const timing = { status: step.status, durationMs: ms(step.durationMs) };
    if (step.agent === "manager") {
      total = timing.durationMs;
    } else if (step.agent === "intake") {
      // Intake only cleans the text so far. Claim extraction is not implemented yet.
      records.push({ runId, at: finishedAt, kind: "intake_done", data: { ...timing, scope: "text_cleaning_only" } });
    } else {
      const extra: Record<string, AuditValue> =
        step.agent === "red_flag"
          ? {
              ruleIds: result.findings.filter((f) => f.severity !== "info").map((f) => f.source),
              warningIds: result.findings.filter((f) => f.severity === "info").map((f) => f.source),
            }
          : step.agent === "risk_aggregator"
            ? { score: result.risk.score, band: result.risk.band }
            : {};
      records.push({ runId, at: finishedAt, kind: "agent_step", data: { agent: step.agent, ...timing, ...extra } });
    }
  }
  records.push({ runId, at: finishedAt, kind: "run_finished", data: { durationMs: total } });
  return records;
}

const DECISIONS: Record<string, GateDecision> = {
  gate_pending: "pending",
  gate_approved: "approved",
  gate_discarded: "discarded",
};

// One gate action, from the latest state, not the state of the last render: a double-click on
// approve then gives one "approved" entry, because the second click finds the gate already approved.
export function gateStep(
  runId: string,
  before: GateFlow,
  action: GateAction,
  findings: readonly Pick<Finding, "source">[],
): { action: GateAction; after: GateFlow; records: AuditRecord[] } {
  // The draft adapts to the findings. Only their rule ids reach the drafter.
  const full = action.type === "prepare" ? { ...action, findings } : action;
  const after = gateReducer(before, full);
  return { action: full, after, records: gateRecords(runId, before, after, planBlocks(findings)) };
}

// The gate decisions made by one action: the decision, the draft's state and its block ids. The
// draft itself is only compared against its template, never stored or hashed.
export function gateRecords(
  runId: string,
  before: GateFlow,
  after: GateFlow,
  blocks: readonly BlockId[],
): AuditRecord[] {
  // The same template the gate's approval label checks against.
  const template = after.template ?? before.template ?? renderBlocks(blocks);
  const draft = after.gate?.draft ?? before.gate?.draft ?? template;
  return after.events.slice(before.events.length).flatMap((event) => {
    const decision = DECISIONS[event.event];
    if (!decision) return [];
    return [
      {
        runId,
        at: event.timestamp,
        kind: "gate_decision" as const,
        data: { decision, ...draftState(draft, template), blocks: [...blocks] },
      },
    ];
  });
}
