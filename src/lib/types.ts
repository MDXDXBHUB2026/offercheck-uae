export type Severity = "high" | "medium" | "low" | "info";

// Shared finding format from docs/offercheck-plan.md section 3.
export type Finding = {
  agent: string;
  check: string;
  severity: Severity;
  evidence: string[];
  confidence: "rule" | "model";
  source: string;
};

export type RiskBand = "low" | "medium" | "high";

export type RiskScore = {
  score: number;
  band: RiskBand;
  label: string;
};

export type TraceStatus = "completed" | "not_implemented";

// durationMs is measured, and null for a step that did not run.
// checkIds and count: only on the Verification and Official-channel steps (2026-11-11), fixed ids
// and a number, recorded in the audit trail. Never text.
export type TraceStep = {
  agent: string;
  status: TraceStatus;
  durationMs: number | null;
  summary: string;
  checkIds?: string[];
  count?: number;
};

// A Verification cross-check that matched (src/lib/agents/verification.ts). Score-neutral: it is
// never part of findings and has no weight.
export type CrossCheck = {
  agent: "verification";
  // V-01 to V-05.
  id: string;
  // The kind of match; the interface picks the plain reason by this name.
  check: string;
  // The matched words from the text, quoted.
  evidence: string[];
};

// An official step chosen by the Official-channel step (src/lib/officialSteps.ts): the key of an
// existing entry and the finding or cross-check ids it is shown for.
export type OfficialStepRef = { key: string; forIds: string[] };

// crossChecks and officialSteps are optional: results saved before 2026-11-11 do not have them.
export type AnalysisResult = {
  plan: string[];
  findings: Finding[];
  risk: RiskScore;
  trace: TraceStep[];
  crossChecks?: CrossCheck[];
  officialSteps?: OfficialStepRef[];
};

// One row of the audit trail. It never holds offer text or draft text.
export type AuditEvent = {
  timestamp: string;
  actor: "user" | "drafter";
  event: string;
  detail: string;
};

export const MAX_OFFER_CHARS = 20_000;
