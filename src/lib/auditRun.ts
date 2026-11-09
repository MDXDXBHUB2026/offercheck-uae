import { runManager } from "./agents/manager";
import { appendEntries, runRecords, type AuditEntry } from "./audit";
import { coverageOf, detectLanguage } from "./coverage";
import type { AnalysisResult } from "./types";

export type AuditedAnalysis = AnalysisResult & { runId: string; audit: AuditEntry[] };

// Server only: it imports the rules, so the browser must not import it. Each run gets a random id
// and a fresh audit chain. Only the offer's length is logged, never the text or a hash of it.
export async function runWithAudit(offerText: string): Promise<AuditedAnalysis> {
  const runId = globalThis.crypto.randomUUID();
  const startedAt = new Date().toISOString();
  const result = runManager(offerText);
  const finishedAt = new Date().toISOString();
  // Batch B Stage 1: the coverage state, from the same offline detector as the page. Fixed values.
  const detected = detectLanguage(offerText);
  const language = { coverage: coverageOf(detected), detected };
  const audit = await appendEntries([], runRecords(runId, offerText.length, result, startedAt, finishedAt, language));
  return { ...result, runId, audit };
}
