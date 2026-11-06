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
export type TraceStep = {
  agent: string;
  status: TraceStatus;
  durationMs: number | null;
  summary: string;
};

export type AnalysisResult = {
  plan: string[];
  findings: Finding[];
  risk: RiskScore;
  trace: TraceStep[];
};

// One row of the audit trail. It never holds offer text or draft text.
export type AuditEvent = {
  timestamp: string;
  actor: "user" | "drafter";
  event: string;
  detail: string;
};

export const MAX_OFFER_CHARS = 20_000;
