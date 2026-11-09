// Roadmap Phase 2: the one typed registry of the pipeline steps and what is built today. The How it
// works diagram and its text list are drawn from this list only, and a test compares it with the
// steps runManager reports, so the page cannot disagree with the app.

export type PipelineStatus = "built" | "partial" | "not built";

export type PipelineNode = {
  id: string;
  label: string;
  status: PipelineStatus;
  description: string;
};

export const PIPELINE_STATUS_TEXT: Record<PipelineStatus, string> = {
  built: "Built",
  partial: "Partly built",
  "not built": "Not implemented yet",
};

export const PIPELINE: readonly PipelineNode[] = [
  {
    id: "manager",
    label: "Manager",
    status: "built",
    description: "Runs the steps in order and merges their results. It never sends, stores or contacts anyone.",
  },
  {
    id: "intake",
    label: "Intake",
    status: "partial",
    description: "Text cleaning only: removes hidden characters. It does not extract claims yet.",
  },
  {
    id: "red_flag",
    label: "Red-flag",
    status: "built",
    description: "Fixed rules look for warning signs in English text and quote the words that matched.",
  },
  {
    id: "verification",
    label: "Verification",
    status: "not built",
    description: "Would check the sender's email domain and the company. Not implemented yet.",
  },
  {
    id: "official_channel",
    label: "Official channel",
    status: "not built",
    description: "Would explain how to confirm an offer through an official channel. Not implemented yet.",
  },
  {
    id: "risk_aggregator",
    label: "Risk aggregator",
    status: "built",
    description: "Turns the findings into a score with fixed weights. No AI model is involved.",
  },
  {
    id: "explainer",
    label: "Explainer",
    status: "not built",
    description: "Would explain the findings in plain words. Not implemented yet.",
  },
  {
    id: "drafter",
    label: "Drafter",
    status: "built",
    description: "Fills a fixed reply template. It runs only after you ask for a draft.",
  },
  {
    id: "approval_gate",
    label: "Approval gate",
    status: "built",
    description: "A person approves a reply draft before it can be copied. Offer Check sends nothing.",
  },
  {
    id: "audit_trail",
    label: "Audit trail",
    status: "built",
    description: "Records each step in a hash-chained list, in page memory only, with no offer or draft text.",
  },
];
