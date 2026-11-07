import { runManager } from "./agents/manager";
import { appendEntries, runRecords, type AuditEntry } from "./audit";
import type { AnalysisResult } from "./types";

export type AuditedAnalysis = AnalysisResult & { runId: string; audit: AuditEntry[] };

// Server only: it imports the rules, so the browser must not import it. Each run gets a random id
// and a fresh audit chain. Only the offer's length is logged, never the text or a hash of it.
export async function runWithAudit(offerText: string): Promise<AuditedAnalysis> {
  const runId = globalThis.crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const result = runManager(offerText);
  const finishedAt = new Date().toISOString();
  const audit = await appendEntries([], runRecords(runId, offerText.length, result, startedAt, finishedAt));
  return { ...result, runId, audit };
}
