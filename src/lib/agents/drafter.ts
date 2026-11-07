import type { Finding } from "../types";

// The draft is built only from fixed blocks chosen by rule id. No offer text, evidence quote or
// other string from a finding is ever copied in, so nothing the sender wrote can reach the reply.

export type BlockId =
  | "open-confirm"
  | "open-questions"
  | "open-clarify"
  | "acknowledge"
  | "credentials-decline"
  | "documents-hold"
  | "documents-ask"
  | "fee-decline"
  | "urgency-time"
  | "email-official"
  | "credentials-clarify"
  | "documents-clarify"
  | "fee-clarify"
  | "urgency-clarify"
  | "close-official"
  | "close-written"
  | "close-thanks";

const BLOCKS: Record<BlockId, string> = {
  "open-confirm":
    "Thank you for your message. Before I go further, I need to confirm this offer through the company's official channel.",
  "open-questions":
    "Thank you for your message. Before I go further, I have a few questions about the offer.",
  "open-clarify":
    "Thank you for your message. Before I go further, could you please clarify the following?",
  acknowledge:
    "Thank you for considering me for this role. Before I go further, could you please send me the written offer and the contract details?",
  "credentials-decline":
    "I will not share passwords, one-time codes, PINs, or card or bank login details.",
  "documents-hold":
    "I will send identity or bank documents only after I receive a written offer through the company's official channel.",
  "documents-ask":
    "Could you tell me which documents you will need from me, and at what stage of the hiring process?",
  "fee-decline": "I will not pay any fee, deposit or other charge to be hired or to receive a visa.",
  "urgency-time":
    "I will need enough time to read the full written offer before I reply. Could you confirm the deadline in writing?",
  "email-official": "Could you confirm the company's official email address for this role?",
  "credentials-clarify":
    "Could you confirm that I will never be asked for a password or one-time code?",
  "documents-clarify": "Could you confirm which documents you will need from me, and at what stage?",
  "fee-clarify": "Could you confirm in writing that I will not be asked to pay any fee at any stage?",
  "urgency-clarify": "Could you confirm the deadline for my reply?",
  "close-official":
    "Please send the written offer, with the employer's registered company name, through the company's official email. I will continue once I have it.",
  "close-written": "Please also send the written offer and the employer's registered company name.",
  "close-thanks": "Thank you.",
};

const GREETING = "Dear [Recipient name],";
const SIGN_OFF = "Kind regards,\n[Your name]";

type Tier = "high" | "medium";

// Rule ids in the fixed priority order. tier mirrors the rule's severity in redFlag.ts, and a test
// keeps the two in step. RF-003 is medium, but next to a high signal the reply declines to send
// documents rather than asking about them.
const RULE_BLOCKS: { id: string; tier: Tier; block: (high: boolean) => BlockId; warning?: BlockId }[] = [
  { id: "RF-002", tier: "high", block: () => "credentials-decline", warning: "credentials-clarify" },
  {
    id: "RF-003",
    tier: "medium",
    block: (high) => (high ? "documents-hold" : "documents-ask"),
    warning: "documents-clarify",
  },
  { id: "RF-001", tier: "high", block: () => "fee-decline", warning: "fee-clarify" },
  { id: "RF-004", tier: "medium", block: () => "urgency-time", warning: "urgency-clarify" },
  { id: "RF-005", tier: "medium", block: () => "email-official" },
];

export const DRAFTER_RULES: readonly { id: string; tier: Tier; hasWarning: boolean }[] =
  RULE_BLOCKS.map(({ id, tier, warning }) => ({ id, tier, hasWarning: warning !== undefined }));

const WARNING_SUFFIX = "-W";

// Picks the blocks from rule ids only. Unknown ids are ignored. A warning is skipped when its own
// rule also matched, because the rule's block already covers the topic.
export function planBlocks(findings: readonly Pick<Finding, "source">[] = []): BlockId[] {
  const sources = new Set(findings.map((finding) => finding.source));
  const matched = RULE_BLOCKS.filter((rule) => sources.has(rule.id));
  const warned = RULE_BLOCKS.filter(
    (rule) => rule.warning && !sources.has(rule.id) && sources.has(rule.id + WARNING_SUFFIX),
  );
  const high = matched.some((rule) => rule.tier === "high");

  if (matched.length === 0 && warned.length === 0) return ["acknowledge", "close-thanks"];

  const opening: BlockId = high ? "open-confirm" : matched.length > 0 ? "open-questions" : "open-clarify";
  const closing: BlockId = high ? "close-official" : matched.length > 0 ? "close-written" : "close-thanks";
  return [
    opening,
    ...matched.map((rule) => rule.block(high)),
    ...warned.map((rule) => rule.warning as BlockId),
    closing,
  ];
}

function sentences(text: string): string[] {
  return text.match(/[^.?!]+[.?!]+/g)?.map((sentence) => sentence.trim()) ?? [text];
}

// Joins the blocks and drops any sentence already used, so combined blocks never repeat a line.
export function renderBlocks(blocks: readonly BlockId[]): string {
  const used = new Set<string>();
  const paragraphs = blocks
    .map((id) =>
      sentences(BLOCKS[id])
        .filter((sentence) => !used.has(sentence) && used.add(sentence))
        .join(" "),
    )
    .filter((paragraph) => paragraph.length > 0);
  return [GREETING, ...paragraphs, SIGN_OFF].join("\n\n");
}

export function draftReply(findings: readonly Pick<Finding, "source">[] = []): string {
  return renderBlocks(planBlocks(findings));
}

let generated: Set<string> | null = null;

// True when the text is exactly a draft the drafter can produce, so the audit trail can tell a
// template draft from an edited one without storing either. There are only 2^9 rule-id sets.
export function isTemplateDraft(text: string): boolean {
  if (!generated) {
    const ids = DRAFTER_RULES.flatMap((rule) =>
      rule.hasWarning ? [rule.id, rule.id + WARNING_SUFFIX] : [rule.id],
    );
    generated = new Set<string>();
    for (let mask = 0; mask < 2 ** ids.length; mask += 1) {
      const sources = ids.filter((_id, bit) => mask & (2 ** bit)).map((source) => ({ source }));
      generated.add(draftReply(sources));
    }
  }
  return generated.has(text);
}
