import { CHECK_LABELS } from "./checkLabels";

// Rule IDs (RF-001 to RF-005, and RF-00n-W for a mention inside a warning) are not shown in the main
// views. They appear only in "How this was checked" and in the audit trail, as a small reference next
// to the plain name, so the score stays traceable. This maps each ID to its check, whose plain name
// is in checkLabels.ts. redFlag.ts stays out of client code, so a test keeps this map equal to RULES.
export const RULE_CHECKS: Readonly<Record<string, string>> = {
  "RF-001": "fee_requested",
  "RF-002": "credentials_requested",
  "RF-003": "identity_documents_requested",
  "RF-004": "urgency_pressure",
  "RF-005": "free_email_contact",
  "RF-001-W": "fee_mentioned_in_warning",
  "RF-002-W": "credentials_mentioned_in_warning",
  "RF-003-W": "documents_mentioned_in_warning",
  "RF-004-W": "urgency_mentioned_in_warning",
};

// The plain name for a rule ID, or the ID itself when it is not known.
export function ruleName(id: string): string {
  const check = RULE_CHECKS[id];
  return (check && CHECK_LABELS[check]) || id;
}
