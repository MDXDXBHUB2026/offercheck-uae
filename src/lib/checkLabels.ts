// Plain-language labels and notes for each rule check id. Shared by the results panel, the hero
// preview and the result view model (src/lib/resultView.ts), so the wording exists once.

export const CHECK_LABELS: Record<string, string> = {
  fee_requested: "Asks you to pay a fee or money",
  credentials_requested: "Asks for a code, password or card details",
  identity_documents_requested: "Asks for identity or bank documents",
  urgency_pressure: "Pressure to act quickly",
  free_email_contact: "Uses a free email address",
  fee_mentioned_in_warning: "Fee mentioned in a warning",
  credentials_mentioned_in_warning: "Code or password mentioned in a warning",
  documents_mentioned_in_warning: "Documents mentioned in a warning",
  urgency_mentioned_in_warning: "Urgency mentioned in a warning",
};

// One plain line on why each pattern matters. General guidance, not a finding about the sender.
export const CHECK_NOTES: Record<string, string> = {
  fee_requested: "Being asked to pay before you start work is a common pattern in recruitment scams.",
  credentials_requested: "An employer has no need for your passwords, one-time codes or card details.",
  identity_documents_requested:
    "Sending identity or bank documents before a verified written offer can expose you to fraud.",
  urgency_pressure: "Pressure to act fast leaves you less time to check the offer.",
  free_email_contact: "Recruiters for a registered company usually write from the company's own domain.",
};
